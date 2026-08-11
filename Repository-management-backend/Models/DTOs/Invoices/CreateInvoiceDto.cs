namespace Repository_management_backend.Models.DTOs.Invoices
{
    public class CreateInvoiceDto
    {
        public string? InvoiceNo { get; set; }
        public int CustomerId { get; set; }
        public string? Phone { get; set; }
        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Note { get; set; }

        public DateTime InvoiceDate { get; set; }
        public DateTime ReturnDate { get; set; }

        public decimal DepositAmount { get; set; }
        public decimal PaidAmount { get; set; }

        public List<CreateInvoiceItemDto> Items { get; set; } = new();
    }
}
