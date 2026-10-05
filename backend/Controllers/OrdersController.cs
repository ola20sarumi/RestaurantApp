using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly AppDbContext _context;

    public OrdersController(AppDbContext context)
    {
        _context = context;
    }

    // Customer: Submit a new order
    [HttpPost]
    public async Task<ActionResult<Order>> CreateOrder(Order order)
    {
        order.OrderDate = DateTime.UtcNow;
        order.Status = "Pending";
        
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
        var order = await _context.Orders.FindAsync(id);
        if (order == null) return NotFound();

        order.Status = status;
        await _context.SaveChangesAsync();

        return NoContent();
    }
}