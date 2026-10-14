namespace backend.Models;

public class Order
{
    public int Id { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";

    // Unguessable id the customer's confirmation page (/order/{reference}) uses instead of the sequential Id.
    public string Reference { get; set; } = string.Empty;

    public string FulfillmentType { get; set; } = "Takeout"; // "DineIn", "Takeout" or "Delivery"
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty; // Empty for eat-in orders, unless paid online by phone
    public string? CustomerEmail { get; set; }                // Online payments by email only (Paystack sends the receipt)
    public string? DeliveryAddress { get; set; }              // Only set for delivery orders

    public string PaymentMethod { get; set; } = PaymentMethods.Counter;
    public string PaymentStatus { get; set; } = PaymentStatuses.Unpaid;
    public DateTime? PaidAt { get; set; }                     // UTC
    // The latest Paystack transaction for this order ("{Reference}-{attempt}"); once paid, the one that succeeded.
    public string? PaystackReference { get; set; }

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}

public static class PaymentMethods
{
    public const string Online = "Online";   // Paid through Paystack before the kitchen sees the order
    public const string Counter = "Counter"; // Paid in person (cash/POS); the cashier marks it paid
    public static readonly string[] All = [Online, Counter];
}

public static class PaymentStatuses
{
    public const string Unpaid = "Unpaid";
    public const string Paid = "Paid";
}
