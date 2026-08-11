namespace Repository_management_backend.Models.DTOs.Dashboard
{    public class DailyItemDto
    {
        public int InvoiceId { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Size { get; set; }
        public DateTime? DueDate { get; set; }
        public int? DayCount { get; set; }
        public int DaysOverdue { get; set; }
        public bool IsOverdue { get; set; }
    }
}
