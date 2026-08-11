using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Bütün sorğular filial query filter-ləri ilə avtomatik süzülür.</summary>
    public class ReportRepository : IReportRepository
    {
        private readonly AppDbContext _db;

        public ReportRepository(AppDbContext db) => _db = db;

        public async Task<List<Invoice>> GetInvoicesAsync(DateTime? from, DateTime? to, bool? closed, int? customerId)
        {
            var q = _db.Invoices.AsNoTracking().AsQueryable();
            if (from.HasValue) q = q.Where(i => i.InvoiceDate >= from.Value);
            if (to.HasValue) q = q.Where(i => i.InvoiceDate <= to.Value);
            if (closed.HasValue) q = q.Where(i => i.IsClosed == closed.Value);
            if (customerId.HasValue) q = q.Where(i => i.CustomerId == customerId.Value);
            return await q.OrderByDescending(i => i.InvoiceDate).ToListAsync();
        }

        public async Task<List<Payment>> GetPaymentsAsync(DateTime? from, DateTime? to)
        {
            var q = _db.Payments.AsNoTracking()
                .Include(p => p.Invoice)
                .Where(p => _db.Invoices.Any(i => i.Id == p.InvoiceId));   // filial-scoped
            if (from.HasValue) q = q.Where(p => p.Date >= from.Value);
            if (to.HasValue) q = q.Where(p => p.Date <= to.Value);
            return await q.OrderByDescending(p => p.Date).ToListAsync();
        }

        public async Task<List<Customer>> GetCustomersAsync() =>
            await _db.Customers.AsNoTracking().OrderBy(c => c.Name).ToListAsync();

        public async Task<Dictionary<int, CustomerBalance>> GetBalancesAsync()
        {
            var rows = await _db.CustomerLedgerEntries
                .Where(l => _db.Customers.Any(c => c.Id == l.CustomerId))
                .GroupBy(l => l.CustomerId)
                .Select(g => new
                {
                    CustomerId = g.Key,
                    Debt = g.Sum(x => x.DebtChange),
                    Deposit = g.Sum(x => x.DepositChange)
                })
                .ToListAsync();
            return rows.ToDictionary(r => r.CustomerId, r => new CustomerBalance(r.Debt, r.Deposit));
        }
    }
}
