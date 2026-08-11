using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Models.DTOs.Payments
{
    public class CreatePaymentDto
    {
        public int InvoiceId { get; set; }
        public decimal Amount { get; set; }
        public PaymentDirection Direction { get; set; } = PaymentDirection.In;
        public DateTime? Date { get; set; }
        public string? Note { get; set; }
    }
}
