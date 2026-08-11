namespace Repository_management_backend.Models.DTOs.Reports
{
    public class PaymentReportRowDto
    {
        public DateTime Date { get; set; }
        public string? InvoiceNo { get; set; }
        public string? CustomerName { get; set; }
        public decimal Amount { get; set; }
        public string Direction { get; set; } = "In";
        public string? Note { get; set; }
    }

    public class PaymentReportDto
    {
        public List<PaymentReportRowDto> Rows { get; set; } = new();
        public int Count { get; set; }
        public decimal TotalIn { get; set; }
        public decimal TotalOut { get; set; }
        public decimal Net { get; set; }
    }
}
