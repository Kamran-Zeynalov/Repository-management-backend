namespace Repository_management_backend.Models.DTOs.Inventory
{    public class InventoryHolderDto
    {
        public int InvoiceId { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime ReturnDate { get; set; }
        public decimal Quantity { get; set; }
    }
}
