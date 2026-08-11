namespace Repository_management_backend.Models.DTOs.Invoices
{    public class InvoiceDetailDto
    {
        public int Id { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
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
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string Status { get; set; } = "normal";
        public int DaysUntilReturn { get; set; }

        public List<InvoiceItemDto> Items { get; set; } = new();
    }
}
