namespace Repository_management_backend.Models.DTOs.Ledger
{    public class LedgerTransactionDto
    {
        public int CustomerId { get; set; }
        public decimal Amount { get; set; }
        public DateTime? Date { get; set; }
        public string? Note { get; set; }
    }
}
