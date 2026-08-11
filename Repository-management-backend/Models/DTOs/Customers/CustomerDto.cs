namespace Repository_management_backend.Models.DTOs.Customers
{    public class CustomerDto
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
        public int ActiveInvoiceCount { get; set; }
    }
}
