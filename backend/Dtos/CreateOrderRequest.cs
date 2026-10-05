using System.ComponentModel.DataAnnotations;

namespace backend.Dtos;

// What a customer sends to place an order. Prices and the total are looked up / calculated
// on the server, so the client cannot set them.
public class CreateOrderRequest
{
    [Required, MinLength(1)]
    public List<CreateOrderItemRequest> Items { get; set; } = new();
}

public class CreateOrderItemRequest
{
    public int ProductId { get; set; }

    [Range(1, 100)]
    public int Quantity { get; set; }
}
