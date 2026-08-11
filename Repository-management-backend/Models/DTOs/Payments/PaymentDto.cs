namespace Repository_management_backend.Models.DTOs.Payments
{
    public class PaymentDto
    {
        public int Id { get; set; }
        public int InvoiceId { get; set; }
        public string? InvoiceNo { get; set; }
        public decimal Amount { get; set; }
        public string Direction { get; set; } = "In";
        public DateTime Date { get; set; }
        public string? Note { get; set; }
    }
}
