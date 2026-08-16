namespace Repository_management_backend.Models.DTOs.Inventory
{
    public class InventorySaleDto
    {
        public int Id { get; set; }
        public int InventoryStockId { get; set; }
        public string StockName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public string? CustomerName { get; set; }
        public string? Note { get; set; }
        public string? SoldByUserName { get; set; }
        public DateTime SoldAt { get; set; }
    }
}
