using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Models.Entities
{
    public class Payment
    {
        public int Id { get; set; }

        public int InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }

        public decimal Amount { get; set; }
        public PaymentDirection Direction { get; set; } = PaymentDirection.In;
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string? Note { get; set; }
    }
}
