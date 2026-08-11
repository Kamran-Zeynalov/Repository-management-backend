namespace Repository_management_backend.Models.DTOs.Dashboard
{    public class DashboardStatsDto
    {
        public int CustomerCount { get; set; }
        public int InvoiceCount { get; set; }
        public int OpenInvoiceCount { get; set; }
        public int ClosedInvoiceCount { get; set; }

        public int OverdueCount { get; set; }
        public int DueTodayCount { get; set; }
        public int DueSoonCount { get; set; }

        public decimal TotalDebt { get; set; }
        public decimal TotalDeposit { get; set; }
        public decimal TotalPaid { get; set; }

        public int InventoryItemCount { get; set; }
    }
}
