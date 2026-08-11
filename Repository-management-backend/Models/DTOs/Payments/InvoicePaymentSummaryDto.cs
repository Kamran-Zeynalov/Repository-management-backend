namespace Repository_management_backend.Models.DTOs.Payments
{    public class InvoicePaymentSummaryDto
    {
        public int InvoiceId { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingDebt { get; set; }
        public decimal DepositAmount { get; set; }
        public bool IsClosed { get; set; }
        public List<PaymentDto> Payments { get; set; } = new();
    }
}
