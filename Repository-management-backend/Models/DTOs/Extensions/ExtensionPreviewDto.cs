namespace Repository_management_backend.Models.DTOs.Extensions
{    public class ExtensionPreviewDto
    {
        public int InvoiceId { get; set; }
        public string Mode { get; set; } = "month";
        public int Periods { get; set; }
        public decimal RecurringBase { get; set; }
        public decimal SuggestedAmount { get; set; }
        public DateTime CurrentReturnDate { get; set; }
        public DateTime NewReturnDate { get; set; }
    }
}
