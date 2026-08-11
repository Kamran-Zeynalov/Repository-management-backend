using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Dashboard;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Dashboard: statistikalar, bildirişlər, günlük mallar, vaxtı keçmiş mallar.
    /// Bütün məlumat cari filiala görə süzülür.</summary>
    [ApiController]
    [Route("api/dashboard")]
    [Authorize]
    [Produces("application/json")]
    public class DashboardController : ControllerBase
    {
        private readonly IDashboardService _service;

        public DashboardController(IDashboardService service) => _service = service;

        // GET: /api/dashboard/stats
        [HttpGet("stats")]
        public async Task<ActionResult<DashboardStatsDto>> GetStats()
            => Ok(await _service.GetStatsAsync());

        // GET: /api/dashboard/notifications
        [HttpGet("notifications")]
        public async Task<ActionResult<List<NotificationDto>>> GetNotifications()
            => Ok(await _service.GetNotificationsAsync());

        // GET: /api/dashboard/daily-items  (günlük mallar)
        [HttpGet("daily-items")]
        public async Task<ActionResult<List<DailyItemDto>>> GetDailyItems()
            => Ok(await _service.GetDailyItemsAsync());

        // GET: /api/dashboard/overdue  (vaxtı keçmiş qaimələr)
        [HttpGet("overdue")]
        public async Task<ActionResult<List<OverdueInvoiceDto>>> GetOverdue()
            => Ok(await _service.GetOverdueAsync());
    }
}
