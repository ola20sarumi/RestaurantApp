using backend.Data;
using backend.Dtos;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;

    public CategoriesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Category>>> GetCategories()
    {
        return await _context.Categories.OrderBy(c => c.Name).ToListAsync();
    }

    // Admin: add a category
    [HttpPost]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<Category>> CreateCategory(CategoryRequest request)
    {
        var name = request.Name.Trim();
        if (await _context.Categories.AnyAsync(c => c.Name == name))
        {
            return Conflict($"A category named \"{name}\" already exists.");
        }

        var category = new Category { Name = name, Description = Clean(request.Description) };
        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCategories), category);
    }

    // Admin: rename / redescribe a category
    [HttpPut("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<ActionResult<Category>> UpdateCategory(int id, CategoryRequest request)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        var name = request.Name.Trim();
        if (await _context.Categories.AnyAsync(c => c.Id != id && c.Name == name))
        {
            return Conflict($"A category named \"{name}\" already exists.");
        }

        category.Name = name;
        category.Description = Clean(request.Description);
        await _context.SaveChangesAsync();

        return category;
    }

    // Admin: delete an empty category. Deleting one with products would cascade-delete them (and their order history).
    [HttpDelete("{id}")]
    [Authorize(Roles = Roles.Admin)]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        if (await _context.Products.AnyAsync(p => p.CategoryId == id))
        {
            return Conflict($"\"{category.Name}\" still has products. Move or delete them first.");
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
