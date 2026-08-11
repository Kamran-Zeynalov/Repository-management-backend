namespace Repository_management_backend.Models.DTOs.Reports
{
    public class InvoiceReportRowDto
    {
        public string InvoiceNo { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public DateTime InvoiceDate { get; set; }
        public DateTime ReturnDate { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal RemainingDebt { get; set; }
        public decimal DepositAmount { get; set; }
        public string Status { get; set; } = "normal";
        public bool IsClosed { get; set; }
    }

    public class InvoiceReportDto
    {
        public List<InvoiceReportRowDto> Rows { get; set; } = new();
        public int Count { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TotalPaid { get; set; }
        public decimal TotalDebt { get; set; }
        public decimal TotalDeposit { get; set; }
    }
}
