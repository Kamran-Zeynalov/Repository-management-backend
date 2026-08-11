namespace Repository_management_backend.Models.Entities
{
    public class ReturnHistory
    {
        public int Id { get; set; }

        public int InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;
        public decimal RefundAmount { get; set; }
        public string? Note { get; set; }
    }
}
