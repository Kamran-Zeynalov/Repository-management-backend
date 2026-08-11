namespace Repository_management_backend.Models.DTOs.Reports
{
    public class DebtorRowDto
    {
        public int CustomerId { get; set; }
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public decimal Debt { get; set; }
        public decimal Deposit { get; set; }
    }

    public class DebtorReportDto
    {
        public List<DebtorRowDto> Rows { get; set; } = new();
        public int Count { get; set; }
        public decimal TotalDebt { get; set; }
        public decimal TotalDeposit { get; set; }
    }
}
