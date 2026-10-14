using backend.Models;

namespace backend.Dtos;

// What the customer's confirmation page (/order/{reference}) sees. Anyone with the reference can read it,
// so it leaves out contact details (phone, email, address); staff get those from GET /api/orders.
public record OrderTracking(
    int Id,
    string Reference,
    DateTime OrderDate,
    string Status,
    string FulfillmentType,
    string CustomerName,
    decimal TotalAmount,
    string PaymentMethod,
    string PaymentStatus,
    List<OrderTrackingItem> Items)
{
    // `order.Items` must be loaded with their products.
    public static OrderTracking From(Order order) => new(
        order.Id,
        order.Reference,
        order.OrderDate,
        order.Status,
        order.FulfillmentType,
        order.CustomerName,
        order.TotalAmount,
        order.PaymentMethod,
        order.PaymentStatus,
        order.Items.Select(i => new OrderTrackingItem(i.Product.Name, i.Quantity, i.UnitPrice)).ToList());
}

public record OrderTrackingItem(string Name, int Quantity, decimal UnitPrice);

public record InitializePaymentResponse(string AuthorizationUrl);
