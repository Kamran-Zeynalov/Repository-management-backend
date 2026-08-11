using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Bütün sorğular Customer/Invoice/InventoryStock filter-ləri ilə filiala bağlıdır.</summary>
    public class DashboardRepository : IDashboardRepository
    {
        private readonly AppDbContext _db;

        public DashboardRepository(AppDbContext db) => _db = db;

        public async Task<int> CustomerCountAsync() => await _db.Customers.CountAsync();

        public async Task<int> InventoryCountAsync() => await _db.InventoryStocks.CountAsync();

        public async Task<List<Invoice>> GetInvoicesWithItemsAsync() =>
            await _db.Invoices.AsNoTracking().Include(i => i.Items).ToListAsync();

        public async Task<CustomerBalance> GetLedgerTotalsAsync()
        {
            // Yalnız cari filialın müştəriləri (Customer filter subquery-də tətbiq olunur)
            var q = _db.CustomerLedgerEntries.Where(l => _db.Customers.Any(c => c.Id == l.CustomerId));
            var debt = await q.SumAsync(x => (decimal?)x.DebtChange) ?? 0m;
            var deposit = await q.SumAsync(x => (decimal?)x.DepositChange) ?? 0m;
            return new CustomerBalance(debt, deposit);
        }
    }
}
