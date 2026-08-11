namespace Repository_management_backend.Models.DTOs.Customers
{    public class CustomerProfileDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Note { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }

        public decimal Debt { get; set; }
        public decimal Deposit { get; set; }

        public List<InvoiceSummaryDto> ActiveInvoices { get; set; } = new();
        public List<InvoiceSummaryDto> ClosedInvoices { get; set; } = new();
        public List<LedgerEntryDto> Ledger { get; set; } = new();
    }
}
