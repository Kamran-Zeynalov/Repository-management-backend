namespace Repository_management_backend.Models.DTOs.Invoices
{
    public class InvoiceListItemDto
    {
        public int Id { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime InvoiceDate { get; set; }
        public DateTime ReturnDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal DepositAmount { get; set; }
        public decimal RemainingDebt { get; set; }
        public bool IsClosed { get; set; }
        public string Status { get; set; } = "normal";
        public int DaysUntilReturn { get; set; }
        public int ItemCount { get; set; }
    }
}
