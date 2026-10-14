using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using backend.Data;
using backend.Dtos;
using backend.Models;
using backend.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace backend.Controllers;

// Online payment with Paystack. The customer creates the order first (POST /api/orders with PaymentMethod "Online"),
// then starts a payment here and is sent to Paystack. An order only becomes Paid when Paystack itself confirms it,
// either through /verify (which asks Paystack) or through the signed webhook — never on the browser's word.
[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PaystackClient _paystack;
    private readonly PaystackOptions _options;
    private readonly ILogger<PaymentsController> _logger;

    public PaymentsController(
        AppDbContext context, PaystackClient paystack, IOptions<PaystackOptions> options, ILogger<PaymentsController> logger)
    {
        _context = context;
        _paystack = paystack;
        _options = options.Value;
        _logger = logger;
    }

    // Customer: start (or retry) paying for an online order; returns the Paystack checkout URL.
    [HttpPost("{reference}/initialize")]
    public async Task<ActionResult<InitializePaymentResponse>> Initialize(string reference, CancellationToken cancellationToken)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Reference == reference, cancellationToken);
        if (order == null) return NotFound();

        if (order.PaymentMethod != PaymentMethods.Online)
        {
            return Problem(detail: "This order is paid at the counter.", statusCode: StatusCodes.Status409Conflict);
        }
        if (order.PaymentStatus == PaymentStatuses.Paid)
        {
            return Problem(detail: "This order has already been paid.", statusCode: StatusCodes.Status409Conflict);
        }
        if (order.Status == "Cancelled")
        {
            return Problem(detail: "This order was cancelled.", statusCode: StatusCodes.Status409Conflict);
        }
        if (!_options.IsConfigured)
        {
            return Problem(detail: "Online payment isn't available right now. Please pay at the counter.",
                statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        // Paystack rejects a reused reference, so every attempt gets its own; the prefix still identifies the order.
        var transactionReference = $"{order.Reference}-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        var callbackUrl = _options.CallbackUrl.Replace("{reference}", order.Reference);
        string authorizationUrl;
        try
        {
            authorizationUrl = await _paystack.InitializeAsync(
                transactionReference, PayerEmail(order), ToSubunits(order.TotalAmount), callbackUrl, order.Id, cancellationToken);
        }
        catch (PaystackException ex)
        {
            _logger.LogError(ex, "Could not start a Paystack payment for order {OrderId}", order.Id);
            return Problem(detail: "We couldn't start the payment. Please try again in a moment.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        order.PaystackReference = transactionReference;
        await _context.SaveChangesAsync(cancellationToken);
        return new InitializePaymentResponse(authorizationUrl);
    }

    // Customer: the confirmation page calls this when Paystack sends the customer back (with ?trxref=...),
    // or on a reload. It asks Paystack about the transaction and returns the order as it now stands.
    [HttpPost("{reference}/verify")]
    public async Task<ActionResult<OrderTracking>> Verify(string reference, [FromQuery] string? trxref, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(o => o.Reference == reference, cancellationToken);
        if (order == null) return NotFound();

        var transactionReference = trxref ?? order.PaystackReference;
        if (order.PaymentMethod == PaymentMethods.Online
            && order.PaymentStatus == PaymentStatuses.Unpaid
            && transactionReference != null
            && OrderReferenceOf(transactionReference) == order.Reference
            && _options.IsConfigured)
        {
            try
            {
                var transaction = await _paystack.VerifyAsync(transactionReference, cancellationToken);
                if (TryMarkPaid(order, transaction))
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (PaystackException ex)
            {
                // The page shows the order as unpaid and offers to retry; the webhook can still mark it paid later.
                _logger.LogWarning(ex, "Could not verify Paystack transaction {Reference}", transactionReference);
            }
        }

        return OrderTracking.From(order);
    }

    // Paystack → API: notifies about payments even when the customer closes the tab before coming back.
    // Set this URL (https://<api-host>/api/payments/webhook) in the Paystack dashboard under Settings → API Keys & Webhooks.
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(CancellationToken cancellationToken)
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        var body = await reader.ReadToEndAsync(cancellationToken);

        if (!_options.IsConfigured || !HasValidSignature(body, Request.Headers["x-paystack-signature"].ToString()))
        {
            return Problem(detail: "Invalid signature.", statusCode: StatusCodes.Status401Unauthorized);
        }

        PaystackEvent? paystackEvent;
        try
        {
            paystackEvent = JsonSerializer.Deserialize<PaystackEvent>(body, PaystackClient.Json);
        }
        catch (JsonException)
        {
            return Problem(detail: "Malformed event.", statusCode: StatusCodes.Status400BadRequest);
        }

        // Other events (transfers, refunds, ...) are acknowledged and ignored; Paystack retries anything that isn't 200.
        if (paystackEvent is { Event: "charge.success", Data.Reference: not null })
        {
            var orderReference = OrderReferenceOf(paystackEvent.Data.Reference);
            var order = await _context.Orders.FirstOrDefaultAsync(o => o.Reference == orderReference, cancellationToken);
            if (order == null)
            {
                _logger.LogWarning("Paystack charge {Reference} doesn't match any order", paystackEvent.Data.Reference);
            }
            else if (TryMarkPaid(order, paystackEvent.Data))
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        return Ok();
    }

    // Marks the order paid if the transaction succeeded for exactly the order's total. Safe to call more than once
    // (verify and the webhook usually both report the same payment).
    private bool TryMarkPaid(Order order, PaystackTransaction transaction)
    {
        if (!transaction.IsSuccessful || OrderReferenceOf(transaction.Reference) != order.Reference) return false;

        if (transaction.Amount != ToSubunits(order.TotalAmount)
            || !string.Equals(transaction.Currency, _options.Currency, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning(
                "Paystack transaction {Reference} paid {Amount} {Currency}, but order {OrderId} costs {Expected} {ExpectedCurrency}; not marking it paid",
                transaction.Reference, transaction.Amount, transaction.Currency, order.Id, ToSubunits(order.TotalAmount), _options.Currency);
            return false;
        }

        if (order.PaymentStatus == PaymentStatuses.Paid)
        {
            if (order.PaystackReference != transaction.Reference)
            {
                _logger.LogWarning(
                    "Order {OrderId} was paid twice ({First} and {Second}); refund one of them in the Paystack dashboard",
                    order.Id, order.PaystackReference, transaction.Reference);
            }
            return false;
        }

        order.PaymentStatus = PaymentStatuses.Paid;
        order.PaidAt = DateTime.UtcNow;
        order.PaystackReference = transaction.Reference;
        return true;
    }

    // Paystack signs the raw body with HMAC-SHA512 using the secret key.
    private bool HasValidSignature(string body, string signature)
    {
        byte[] expected = HMACSHA512.HashData(Encoding.UTF8.GetBytes(_options.SecretKey), Encoding.UTF8.GetBytes(body));
        try
        {
            return CryptographicOperations.FixedTimeEquals(expected, Convert.FromHexString(signature));
        }
        catch (FormatException)
        {
            return false;
        }
    }

    // Transaction references are "{order reference}-{attempt}".
    private static string OrderReferenceOf(string transactionReference) => transactionReference.Split('-')[0];

    // Paystack amounts are in the subunit (kobo); order totals have 2 decimals.
    // Paystack requires an email; customers who paid by phone get a placeholder built from their number.
    private string PayerEmail(Order order) => order.CustomerEmail
        ?? $"{new string(order.CustomerPhone.Where(char.IsDigit).ToArray())}@{_options.PhoneOnlyEmailDomain}";

    private static long ToSubunits(decimal amount) => (long)decimal.Round(amount * 100, MidpointRounding.AwayFromZero);

    private record PaystackEvent(string Event, PaystackTransaction? Data);
}
