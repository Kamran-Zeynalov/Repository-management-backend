namespace Repository_management_backend.Models.DTOs.Inventory
{    public class RentedItemDto
    {
        public string Category { get; set; } = string.Empty;
        public string? Size { get; set; }
        public string? Unit { get; set; }
        public decimal TotalOut { get; set; }
        public int InvoiceCount { get; set; }
    }
}
