using Repository_management_backend.Models.DTOs.Customers;

namespace Repository_management_backend.Models.DTOs.Ledger
{    public class CustomerLedgerDto
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public decimal Debt { get; set; }
        public decimal Deposit { get; set; }
        public List<LedgerEntryDto> Entries { get; set; } = new();
    }
}
