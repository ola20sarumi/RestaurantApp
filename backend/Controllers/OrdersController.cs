using backend.Data;
using backend.Dtos;
using backend.Models;
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
            return BadRequest($"Products not found or unavailable: {string.Join(", ", missing)}");
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

    // Customer / Cashier: Get specific order details
    [HttpGet("{id}")]
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

    // Cashier: Update status (e.g., mark as "Completed")
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] string status)
    {
        if (!AllowedStatuses.Contains(status))
        {
            return BadRequest($"Status must be one of: {string.Join(", ", AllowedStatuses)}");
        }

        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound();

        order.Status = status;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
