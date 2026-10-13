using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    // The customer menu gets available products only; the admin page passes includeUnavailable=true (admins only).
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Product>>> GetProducts(bool includeUnavailable = false)
    {
        if (includeUnavailable && !User.IsInRole(Roles.Admin))
        {
            return Forbid();
        }

        var query = _context.Products.Include(p => p.Category).AsQueryable();
        if (!includeUnavailable)
        {
            query = query.Where(p => p.IsAvailable);
        }

        return await query.OrderBy(p => p.Name).ToListAsync();
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Product>> GetProductById(int id)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id);

        return product == null ? NotFound() : product;
    }

    // Admin: add a product
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<Product>> CreateProduct(ProductRequest request)
    {
        if (!await _context.Categories.AnyAsync(c => c.Id == request.CategoryId))
        {
            return BadRequest($"Category {request.CategoryId} does not exist.");
        }

        var product = new Product();
        Apply(product, request);
        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProductById), new { id = product.Id }, product);
    }

    // Admin: edit a product (also used to toggle IsAvailable). Past orders keep their own UnitPrice.
    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<Product>> UpdateProduct(int id, ProductRequest request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        if (!await _context.Categories.AnyAsync(c => c.Id == request.CategoryId))
        {
            return BadRequest($"Category {request.CategoryId} does not exist.");
        }

        Apply(product, request);
        await _context.SaveChangesAsync();

        return product;
    }

    // Admin: delete a product that has never been ordered. Deleting an ordered one would cascade-delete
    // its order items and change past order totals, so those should be marked unavailable instead.
    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        if (await _context.OrderItems.AnyAsync(i => i.ProductId == id))
        {
            return Conflict($"\"{product.Name}\" appears in past orders, so it can't be deleted. Mark it unavailable instead.");
        }

        _context.Products.Remove(product);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static void Apply(Product product, ProductRequest request)
    {
        product.Name = request.Name.Trim();
        product.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        product.Price = request.Price;
        product.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
        product.IsAvailable = request.IsAvailable;
        product.CategoryId = request.CategoryId;
    }
}
