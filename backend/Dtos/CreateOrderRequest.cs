using System.ComponentModel.DataAnnotations;
using backend.Models;

namespace backend.Dtos;

// What a customer sends to place an order. Prices and the total are looked up / calculated
// on the server, so the client cannot set them.
public class CreateOrderRequest : IValidatableObject
{
    public const string DineIn = "DineIn";
    public const string Takeout = "Takeout";
    public const string Delivery = "Delivery";
    public static readonly string[] FulfillmentTypes = [DineIn, Takeout, Delivery];

    [Required]
    public string FulfillmentType { get; set; } = DineIn;

    // Name is needed for every order; phone and address depend on the order type (see Validate).
    [Required(ErrorMessage = "Your name is required."), StringLength(100)]
    public string CustomerName { get; set; } = string.Empty;

    [StringLength(30), RegularExpression(@"^[0-9+()\-\s]{7,30}$", ErrorMessage = "Enter a valid phone number.")]
    public string? CustomerPhone { get; set; }

    [StringLength(300)]
    public string? DeliveryAddress { get; set; }

    // "Online" (Paystack) or "Counter" (cash/POS in person). Delivery orders must be paid online.
    [Required]
    public string PaymentMethod { get; set; } = PaymentMethods.Online;

    // Online payments need an email or a phone number. Paystack emails the receipt to the email; with only a phone,
    // the server gives Paystack a placeholder address (see PaystackOptions.PhoneOnlyEmailDomain).
    [StringLength(254), EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string? CustomerEmail { get; set; }

    [Required, MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!FulfillmentTypes.Contains(FulfillmentType))
        {
            yield return new ValidationResult(
                $"Fulfillment type must be one of: {string.Join(", ", FulfillmentTypes)}",
                [nameof(FulfillmentType)]);
            yield break;
        }

        if (!PaymentMethods.All.Contains(PaymentMethod))
        {
            yield return new ValidationResult(
                $"Payment method must be one of: {string.Join(", ", PaymentMethods.All)}",
                [nameof(PaymentMethod)]);
        }
        else if (PaymentMethod == PaymentMethods.Online
            && string.IsNullOrWhiteSpace(CustomerEmail) && string.IsNullOrWhiteSpace(CustomerPhone))
        {
            yield return new ValidationResult("An email address or phone number is required to pay online.", [nameof(CustomerEmail)]);
        }
        else if (FulfillmentType == Delivery && PaymentMethod != PaymentMethods.Online)
        {
            yield return new ValidationResult("Delivery orders must be paid online.", [nameof(PaymentMethod)]);
        }

        // CustomerName is checked by [Required] for every order type.
        if (FulfillmentType == DineIn) yield break; // Eat-in orders only need a name (plus email or phone to pay online).

        if (string.IsNullOrWhiteSpace(CustomerPhone))
        {
            yield return new ValidationResult("A phone number is required for takeout and delivery orders.", [nameof(CustomerPhone)]);
        }

        if (FulfillmentType == Delivery && string.IsNullOrWhiteSpace(DeliveryAddress))
        {
            yield return new ValidationResult("A delivery address is required for delivery orders.", [nameof(DeliveryAddress)]);
        }
    }
}

public class CreateOrderItemRequest
{
    public int ProductId { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; }
}
