namespace Repository_management_backend.Models.Entities
{
    public class Invoice
    {
        public int Id { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;

        public int CustomerId { get; set; }
        public Customer? Customer { get; set; }
        public string CustomerNameSnapshot { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Note { get; set; }

        public DateTime InvoiceDate { get; set; }
        public DateTime ReturnDate { get; set; }

        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal DepositAmount { get; set; }
        public decimal RemainingDebt { get; set; }

        public bool IsClosed { get; set; }
        public DateTime? ClosedAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public int BranchId { get; set; }
        public Branch? Branch { get; set; }

        public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
        public ICollection<ExtensionHistory> ExtensionHistory { get; set; } = new List<ExtensionHistory>();
        public ICollection<ReturnHistory> ReturnHistory { get; set; } = new List<ReturnHistory>();
    }
}
