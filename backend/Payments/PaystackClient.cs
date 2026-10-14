using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace backend.Payments;

// Thin wrapper over the two Paystack endpoints the app needs (https://paystack.com/docs/api/transaction/).
// Amounts are in the currency's subunit (kobo for NGN).
public class PaystackClient
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    private readonly HttpClient _http;
    private readonly PaystackOptions _options;

    public PaystackClient(HttpClient http, IOptions<PaystackOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    /// <summary>Starts a transaction and returns the Paystack checkout URL to send the customer to.</summary>
    public async Task<string> InitializeAsync(
        string reference, string email, long amount, string callbackUrl, int orderId, CancellationToken cancellationToken)
    {
        var body = new
        {
            Reference = reference,
            Email = email,
            Amount = amount,
            Currency = _options.Currency,
            CallbackUrl = callbackUrl,
            Metadata = new { OrderId = orderId }
        };
        using var request = CreateRequest(HttpMethod.Post, "transaction/initialize");
        request.Content = JsonContent.Create(body, options: Json);
        var data = await SendAsync<InitializeData>(request, cancellationToken);
        return data.AuthorizationUrl;
    }

    /// <summary>Asks Paystack for the outcome of a transaction (the source of truth for whether it was paid).</summary>
    public async Task<PaystackTransaction> VerifyAsync(string reference, CancellationToken cancellationToken)
    {
        using var request = CreateRequest(HttpMethod.Get, $"transaction/verify/{Uri.EscapeDataString(reference)}");
        return await SendAsync<PaystackTransaction>(request, cancellationToken);
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path)
    {
        var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.SecretKey);
        return request;
    }

    private async Task<T> SendAsync<T>(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _http.SendAsync(request, cancellationToken);
            var envelope = await response.Content.ReadFromJsonAsync<Envelope<T>>(Json, cancellationToken);
            if (!response.IsSuccessStatusCode || envelope is not { Status: true, Data: not null })
            {
                throw new PaystackException($"Paystack returned {(int)response.StatusCode}: {envelope?.Message}");
            }
            return envelope.Data;
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException or TaskCanceledException)
        {
            throw new PaystackException($"Could not reach Paystack: {ex.Message}", ex);
        }
    }

    private record Envelope<T>(bool Status, string? Message, T? Data);

    private record InitializeData(string AuthorizationUrl);
}

// The fields of a Paystack transaction the app checks; also the `data` of a charge.success webhook event.
public record PaystackTransaction(string Reference, string Status, long Amount, string Currency)
{
    [JsonIgnore]
    public bool IsSuccessful => Status == "success";
}

public class PaystackException(string message, Exception? inner = null) : Exception(message, inner);
