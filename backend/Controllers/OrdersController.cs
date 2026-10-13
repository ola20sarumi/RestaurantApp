using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private static readonly string[] AllowedStatuses = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];

    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    // Customer: Submit a new order
    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(CreateOrderRequest request)
    {
        var productIds = request.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id) && p.IsAvailable)
            .ToDictionaryAsync(p => p.Id);

        var missing = productIds.Where(id => !products.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            return Problem(detail: $"Products not found or unavailable: {string.Join(", ", missing)}", statusCode: StatusCodes.Status400BadRequest);
        }

        var isDineIn = request.FulfillmentType == CreateOrderRequest.DineIn;
        var order = new Order
        {
            OrderDate = DateTime.UtcNow,
            Status = "Pending",
            FulfillmentType = request.FulfillmentType,
            CustomerName = request.CustomerName.Trim(),
            // Eat-in orders only take a name; phone is kept for takeout/delivery.
            CustomerPhone = isDineIn ? string.Empty : request.CustomerPhone!.Trim(),
            DeliveryAddress = request.FulfillmentType == CreateOrderRequest.Delivery ? request.DeliveryAddress!.Trim() : null,
            Items = request.Items.Select(i => new OrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = products[i.ProductId].Price
            }).ToList()
        };
        order.TotalAmount = order.Items.Sum(i => i.UnitPrice * i.Quantity);

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOrderById), new { id = order.Id }, order);
    }

    // Cashier: Get specific order details (staff only, since orders hold customer names, phones and addresses)
    [HttpGet("{id}")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<Order>> GetOrderById(int id)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.Product)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order == null) return NotFound();

        return order;
    }

    // Cashier: Get all orders (with optional status filter)
    [HttpGet]
    [Authorize(Roles = Roles.Staff)]
    public async Task<ActionResult<IEnumerable<Order>>> GetOrders([FromQuery] string? status)
    {
        var query = _context.Orders
            .Include(o => o.Items)
            .ThenInclude(oi => oi.Product)
            .AsQueryable();

        if (!string.IsNullOrEmpty(status))
        {
            query = query.Where(o => o.Status == status);
        }

        return await query.OrderByDescending(o => o.OrderDate).ToListAsync();
    }

    // Admin: sales report for finished orders placed between `from` and `to` (inclusive calendar days, default today).
    // `timeZone` is an IANA id such as "Europe/Oslo" (the browser's), so days start at local midnight; OrderDate is UTC.
    [HttpGet("report")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<OrderReport>> GetReport(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? timeZone)
    {
        TimeZoneInfo zone;
        try
        {
            zone = string.IsNullOrWhiteSpace(timeZone) ? TimeZoneInfo.Utc : TimeZoneInfo.FindSystemTimeZoneById(timeZone);
        }
        catch (TimeZoneNotFoundException)
        {
            return Problem(detail: $"Unknown time zone \"{timeZone}\".", statusCode: StatusCodes.Status400BadRequest);
        }

        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, zone));
        var firstDay = from ?? to ?? today;
        var lastDay = to ?? from ?? today;
        if (lastDay < firstDay)
        {
            return Problem(detail: "The end date must be on or after the start date.", statusCode: StatusCodes.Status400BadRequest);
        }
        if (lastDay.DayNumber - firstDay.DayNumber >= MaxReportDays)
        {
            return Problem(detail: $"Pick a range of at most {MaxReportDays} days.", statusCode: StatusCodes.Status400BadRequest);
        }

        var startUtc = LocalMidnightToUtc(firstDay, zone);
        var endUtc = LocalMidnightToUtc(lastDay.AddDays(1), zone);

        var orders = await _context.Orders
            .Where(o => o.OrderDate >= startUtc && o.OrderDate < endUtc
                        && (o.Status == "Completed" || o.Status == "Cancelled"))
            .Select(o => new { o.OrderDate, o.Status, o.FulfillmentType, o.TotalAmount })
            .ToListAsync();

        var products = await _context.OrderItems
            .Where(i => i.Order.OrderDate >= startUtc && i.Order.OrderDate < endUtc && i.Order.Status == "Completed")
            .GroupBy(i => new { i.ProductId, i.Product.Name })
            .Select(g => new ProductSales(g.Key.ProductId, g.Key.Name, g.Sum(i => i.Quantity), g.Sum(i => i.UnitPrice * i.Quantity)))
            .ToListAsync();

        var completed = orders.Where(o => o.Status == "Completed").ToList();

        var byFulfillment = new[] { CreateOrderRequest.DineIn, CreateOrderRequest.Takeout, CreateOrderRequest.Delivery }
            .Select(type => new FulfillmentSummary(
                type,
                completed.Count(o => o.FulfillmentType == type),
                orders.Count(o => o.Status == "Cancelled" && o.FulfillmentType == type),
                completed.Where(o => o.FulfillmentType == type).Sum(o => o.TotalAmount)))
            .ToList();

        var byDay = orders.ToLookup(o => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(o.OrderDate, zone)));
        var days = Enumerable.Range(0, lastDay.DayNumber - firstDay.DayNumber + 1)
            .Select(offset =>
            {
                var day = firstDay.AddDays(offset);
                var dayOrders = byDay[day].ToList();
                return new DaySummary(
                    day,
                    dayOrders.Count(o => o.Status == "Completed"),
                    dayOrders.Count(o => o.Status == "Cancelled"),
                    dayOrders.Where(o => o.Status == "Completed").Sum(o => o.TotalAmount));
            })
            .ToList();

        return new OrderReport(
            firstDay,
            lastDay,
            completed.Count,
            orders.Count - completed.Count,
            completed.Sum(o => o.TotalAmount),
            products.Sum(p => p.Quantity),
            byFulfillment,
            days,
            products.OrderByDescending(p => p.Quantity).ThenBy(p => p.Name).ToList());
    }

    private const int MaxReportDays = 366;

    // OrderDate is stored as UTC (DateTime.UtcNow), so day boundaries are converted from the requested time zone.
    private static DateTime LocalMidnightToUtc(DateOnly day, TimeZoneInfo zone)
    {
        var local = day.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        // A midnight skipped by a DST change doesn't exist locally; the first valid time is an hour later.
        if (zone.IsInvalidTime(local)) local = local.AddHours(1);
        return TimeZoneInfo.ConvertTimeToUtc(local, zone);
    }

    // Cashier: Update status (e.g., mark as "Completed")
    [HttpPut("{id}/status")]
    [Authorize(Roles = Roles.Staff)]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string status)
    {
        if (!AllowedStatuses.Contains(status))
        {
            return Problem(detail: $"Status must be one of: {string.Join(", ", AllowedStatuses)}", statusCode: StatusCodes.Status400BadRequest);
        }

        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound();

        order.Status = status;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
