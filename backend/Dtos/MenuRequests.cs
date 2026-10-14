using System.ComponentModel.DataAnnotations;

namespace backend.Dtos;

// Bodies for creating/updating menu items from the admin page. Ids come from the route, never the body.

public class CategoryRequest
{
    [Required(ErrorMessage = "Category name is required."), StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(300)]
    public string? Description { get; set; }
}

public class ProductRequest
{
    [Required(ErrorMessage = "Product name is required."), StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(0.01, 1000000, ErrorMessage = "Price must be between 0.01 and 1,000,000.")]
    public decimal Price { get; set; }

    [StringLength(500), Url(ErrorMessage = "Image URL must be a valid http(s) URL.")]
    public string? ImageUrl { get; set; }

    public bool IsAvailable { get; set; } = true;

    [Range(1, int.MaxValue, ErrorMessage = "Choose a category.")]
    public int CategoryId { get; set; }
}
