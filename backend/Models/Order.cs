namespace backend.Models;

public class Order
{
    public int Id { get; set; }
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Pending";

    public string FulfillmentType { get; set; } = "Takeout"; // "DineIn", "Takeout" or "Delivery"
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerPhone { get; set; } = string.Empty; // Empty for eat-in orders
    public string? DeliveryAddress { get; set; }              // Only set for delivery orders

    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
}
