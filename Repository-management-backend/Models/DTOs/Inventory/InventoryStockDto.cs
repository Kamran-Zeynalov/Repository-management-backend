namespace Repository_management_backend.Models.DTOs.Inventory
{    public class InventoryStockDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal TotalCount { get; set; }
        public decimal RentedOut { get; set; }
        public decimal FreeCount { get; set; }
    }
}
