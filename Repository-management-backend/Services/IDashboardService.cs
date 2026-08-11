using Repository_management_backend.Models.DTOs.Dashboard;

namespace Repository_management_backend.Services
{
    public interface IDashboardService
    {
        Task<DashboardStatsDto> GetStatsAsync();
        Task<List<NotificationDto>> GetNotificationsAsync();
        Task<List<DailyItemDto>> GetDailyItemsAsync();
        Task<List<OverdueInvoiceDto>> GetOverdueAsync();
    }
}
