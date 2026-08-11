namespace Repository_management_backend.Models.DTOs.Extensions
{
    public class ExtensionHistoryDto
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public DateTime Date { get; set; }
        public string? Mode { get; set; }
        public decimal AddedAmount { get; set; }
        public decimal PaidNow { get; set; }
        public string? Note { get; set; }
    }
}
