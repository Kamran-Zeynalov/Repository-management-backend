namespace Repository_management_backend.Models.Entities
{
    public class ExtensionHistory
    {
        public int Id { get; set; }

        public int InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string? Mode { get; set; }
        public decimal AddedAmount { get; set; }
        public decimal PaidNow { get; set; }
        public string? Note { get; set; }
    }
}
