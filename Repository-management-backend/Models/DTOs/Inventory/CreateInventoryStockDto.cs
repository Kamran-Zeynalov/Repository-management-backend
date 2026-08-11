namespace Repository_management_backend.Models.DTOs.Inventory
{
    public class CreateInventoryStockDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal TotalCount { get; set; }
    }
}
