namespace Repository_management_backend.Models.DTOs.Inventory
{
    public class SellInventoryDto
    {
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? CustomerName { get; set; }
        public string? Note { get; set; }
    }
}
