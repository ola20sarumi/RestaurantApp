namespace backend.Dtos;

// Response of GET /api/orders/report: finished orders (Completed or Cancelled) placed between From and To
// (inclusive calendar days in the requested time zone). Revenue and items sold count completed orders only.
public record OrderReport(
    DateOnly From,
    DateOnly To,
    int CompletedOrders,
    int CancelledOrders,
    decimal Revenue,
    int ItemsSold,
    IReadOnlyList<FulfillmentSummary> ByFulfillment,
    IReadOnlyList<DaySummary> Days,
    IReadOnlyList<ProductSales> Products);

public record FulfillmentSummary(string FulfillmentType, int CompletedOrders, int CancelledOrders, decimal Revenue);

// One row per calendar day in the range, including days without orders.
public record DaySummary(DateOnly Date, int CompletedOrders, int CancelledOrders, decimal Revenue);

// Products sold in completed orders, most sold first; revenue uses the price each item was sold at.
public record ProductSales(int ProductId, string Name, int Quantity, decimal Revenue);
