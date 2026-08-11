using Repository_management_backend.Models.DTOs.Dashboard;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class DashboardService : IDashboardService
    {
        private readonly IDashboardRepository _repo;

        public DashboardService(IDashboardRepository repo) => _repo = repo;

        public async Task<DashboardStatsDto> GetStatsAsync()
        {
            var invoices = await _repo.GetInvoicesWithItemsAsync();
            var totals = await _repo.GetLedgerTotalsAsync();
            var customerCount = await _repo.CustomerCountAsync();
            var inventoryCount = await _repo.InventoryCountAsync();

            var open = invoices.Where(i => !i.IsClosed).ToList();

            return new DashboardStatsDto
            {
                CustomerCount = customerCount,
                InvoiceCount = invoices.Count,
                OpenInvoiceCount = open.Count,
                ClosedInvoiceCount = invoices.Count(i => i.IsClosed),
                OverdueCount = open.Count(i => Status(i) == "overdue"),
                DueTodayCount = open.Count(i => Status(i) == "today"),
                DueSoonCount = open.Count(i => Status(i) == "soon"),
                TotalDebt = totals.Debt,
                TotalDeposit = totals.Deposit,
                TotalPaid = invoices.Sum(i => i.PaidAmount),
                InventoryItemCount = inventoryCount
            };
        }

        public async Task<List<NotificationDto>> GetNotificationsAsync()
        {
            var invoices = await _repo.GetInvoicesWithItemsAsync();
            var open = invoices.Where(i => !i.IsClosed).ToList();
            var today = DateTime.Today;
            var list = new List<NotificationDto>();

            foreach (var inv in open)
            {
                var status = Status(inv);
                var days = (inv.ReturnDate.Date - today).Days;
                if (status == "overdue")
                    list.Add(Note("overdue", $"Qaimə #{inv.InvoiceNo} vaxtı {Math.Abs(days)} gün keçib.", inv));
                else if (status == "today")
                    list.Add(Note("today", $"Qaimə #{inv.InvoiceNo} bu gün qaytarılmalıdır.", inv));
                else if (status == "soon")
                    list.Add(Note("soon", $"Qaimə #{inv.InvoiceNo} {days} gün sonra qaytarılmalıdır.", inv));

                // Günlük malların vaxtı bitməsi
                foreach (var it in inv.Items.Where(IsDaily))
                {
                    if (it.DueDate.HasValue && it.DueDate.Value.Date < today)
                    {
                        var od = (today - it.DueDate.Value.Date).Days;
                        list.Add(Note("daily-due",
                            $"Günlük mal '{it.Category}' (qaimə #{inv.InvoiceNo}) vaxtı {od} gün bitib.", inv));
                    }
                }
            }

            return list.OrderBy(n => NoteOrder(n.Type)).ThenBy(n => n.Date).ToList();
        }

        public async Task<List<DailyItemDto>> GetDailyItemsAsync()
        {
            var invoices = await _repo.GetInvoicesWithItemsAsync();
            var today = DateTime.Today;
            var list = new List<DailyItemDto>();

            foreach (var inv in invoices.Where(i => !i.IsClosed))
            {
                foreach (var it in inv.Items.Where(IsDaily))
                {
                    var overdueDays = it.DueDate.HasValue ? (today - it.DueDate.Value.Date).Days : 0;
                    list.Add(new DailyItemDto
                    {
                        InvoiceId = inv.Id,
                        InvoiceNo = inv.InvoiceNo,
                        CustomerName = inv.CustomerNameSnapshot,
                        Category = it.Category,
                        Size = it.Size,
                        DueDate = it.DueDate,
                        DayCount = it.DayCount,
                        DaysOverdue = overdueDays > 0 ? overdueDays : 0,
                        IsOverdue = it.DueDate.HasValue && it.DueDate.Value.Date < today
                    });
                }
            }

            return list.OrderByDescending(x => x.IsOverdue).ThenBy(x => x.DueDate).ToList();
        }

        public async Task<List<OverdueInvoiceDto>> GetOverdueAsync()
        {
            var invoices = await _repo.GetInvoicesWithItemsAsync();
            var today = DateTime.Today;

            return invoices
                .Where(i => !i.IsClosed && i.ReturnDate.Date < today)
                .Select(i => new OverdueInvoiceDto
                {
                    InvoiceId = i.Id,
                    InvoiceNo = i.InvoiceNo,
                    CustomerName = i.CustomerNameSnapshot,
                    Phone = i.Phone,
                    ReturnDate = i.ReturnDate,
                    DaysOverdue = (today - i.ReturnDate.Date).Days,
                    RemainingDebt = i.RemainingDebt
                })
                .OrderByDescending(x => x.DaysOverdue)
                .ToList();
        }

        // ---- köməkçilər ----

        private static bool IsDaily(InvoiceItem it) =>
            (it.RentMode != null && it.RentMode.Trim().ToLower() == "daily") || it.DueDate.HasValue;

        private static string Status(Invoice i)
        {
            if (i.IsClosed) return "closed";
            var days = (i.ReturnDate.Date - DateTime.Today).Days;
            if (days < 0) return "overdue";
            if (days == 0) return "today";
            if (days <= 3) return "soon";
            return "normal";
        }

        private static NotificationDto Note(string type, string message, Invoice inv) => new()
        {
            Type = type,
            Message = message,
            InvoiceId = inv.Id,
            InvoiceNo = inv.InvoiceNo,
            CustomerName = inv.CustomerNameSnapshot,
            Date = DateTime.Now
        };

        private static int NoteOrder(string type) => type switch
        {
            "overdue" => 0,
            "daily-due" => 1,
            "today" => 2,
            "soon" => 3,
            _ => 4
        };
    }
}
