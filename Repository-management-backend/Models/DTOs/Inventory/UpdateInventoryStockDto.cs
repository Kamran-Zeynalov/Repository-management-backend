namespace Repository_management_backend.Models.DTOs.Inventory
{
    public class UpdateInventoryStockDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal TotalCount { get; set; }
    }
}
