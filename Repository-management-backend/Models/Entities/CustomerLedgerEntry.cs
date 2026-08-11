namespace Repository_management_backend.Models.Entities
{
    public class CustomerLedgerEntry
    {
        public int Id { get; set; }

        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }

        public int? InvoiceId { get; set; }
        public Invoice? Invoice { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string Type { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public decimal DebtChange { get; set; }
        public decimal DepositChange { get; set; }
        public string? Note { get; set; }
        public string? Source { get; set; }
    }
}
