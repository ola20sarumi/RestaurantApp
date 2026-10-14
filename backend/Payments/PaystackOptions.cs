namespace backend.Payments;

// Bound from the "Paystack" config section. Never commit the secret key: in development set it with
// `dotnet user-secrets set "Paystack:SecretKey" "sk_test_..."`, elsewhere through Paystack__SecretKey.
// Without it, online payment is switched off (customers can still pay at the counter).
public class PaystackOptions
{
    public const string SectionName = "Paystack";

    public string SecretKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.paystack.co/";
    public string Currency { get; set; } = "NGN";

    // Where Paystack sends the customer after paying; "{reference}" is replaced with the order's reference.
    // Comes from config (never from the request) so the payment page can't be made to redirect elsewhere.
    public string CallbackUrl { get; set; } = string.Empty;

    // Paystack requires an email, so a customer who gave only a phone number is sent as "<digits>@<this domain>".
    // Paystack's receipt to that address goes nowhere; set it to a domain the restaurant owns.
    public string PhoneOnlyEmailDomain { get; set; } = "example.com";

    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(CallbackUrl);
}
