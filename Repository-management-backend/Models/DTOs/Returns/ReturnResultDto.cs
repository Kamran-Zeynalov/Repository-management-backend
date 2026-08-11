namespace Repository_management_backend.Models.DTOs.Returns
{    public class ReturnResultDto
    {
        public int InvoiceId { get; set; }
        public bool IsClosed { get; set; }
        public bool FullyReturned { get; set; }
        public decimal DepositAmount { get; set; }
        public decimal RemainingDebt { get; set; }
        public ReturnHistoryDto Entry { get; set; } = new();
    }
}
