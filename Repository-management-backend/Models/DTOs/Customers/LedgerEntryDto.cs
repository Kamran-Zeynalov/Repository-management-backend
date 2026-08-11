namespace Repository_management_backend.Models.DTOs.Customers
{    public class LedgerEntryDto
    {
        public int Id { get; set; }
        public DateTime Date { get; set; }
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal DebtChange { get; set; }
        public decimal DepositChange { get; set; }
        public string? Note { get; set; }
        public string? Source { get; set; }
        public int? InvoiceId { get; set; }
        public string? InvoiceNo { get; set; }
    }
}
