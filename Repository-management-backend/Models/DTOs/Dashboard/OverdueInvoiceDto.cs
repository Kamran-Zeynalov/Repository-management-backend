namespace Repository_management_backend.Models.DTOs.Dashboard
{    public class OverdueInvoiceDto
    {
        public int InvoiceId { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime ReturnDate { get; set; }
        public int DaysOverdue { get; set; }
        public decimal RemainingDebt { get; set; }
    }
}
