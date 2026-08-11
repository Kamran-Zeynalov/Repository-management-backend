namespace Repository_management_backend.Models.DTOs.Returns
{
    public class ReturnHistoryDto
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public DateTime Date { get; set; }
        public decimal RefundAmount { get; set; }
        public string? Note { get; set; }
    }
}
