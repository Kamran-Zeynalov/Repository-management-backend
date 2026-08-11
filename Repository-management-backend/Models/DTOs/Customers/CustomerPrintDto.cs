using Repository_management_backend.Models.DTOs.Invoices;

namespace Repository_management_backend.Models.DTOs.Customers
{    public class CustomerPrintDto
    {
        public string CompanyName { get; set; } = "Kapital A.S. MMC";
        public string? BranchName { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime PrintedAt { get; set; } = DateTime.Now;
        public List<InvoiceDetailDto> Invoices { get; set; } = new();
    }
}
