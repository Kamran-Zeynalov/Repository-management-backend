namespace Repository_management_backend.Models.DTOs.Extensions
{    public class ExtensionResultDto
    {
        public int InvoiceId { get; set; }
        public DateTime NewReturnDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingDebt { get; set; }
        public ExtensionHistoryDto Entry { get; set; } = new();
    }
}
