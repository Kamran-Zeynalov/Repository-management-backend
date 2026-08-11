using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Customer filter-ə görə filiala bağlıdır; ledger sətirləri customerId ilə sorğulanır.</summary>
    public class CustomerLedgerRepository : ICustomerLedgerRepository
    {
        private readonly AppDbContext _db;

        public CustomerLedgerRepository(AppDbContext db) => _db = db;

        public async Task<Customer?> GetCustomerAsync(int customerId) =>
            await _db.Customers.FirstOrDefaultAsync(c => c.Id == customerId);

        public async Task<List<CustomerLedgerEntry>> GetEntriesAsync(int customerId) =>
            await _db.CustomerLedgerEntries.AsNoTracking()
                .Include(l => l.Invoice)
                .Where(l => l.CustomerId == customerId)
                .OrderByDescending(l => l.Date)
                .ToListAsync();

        public async Task<CustomerBalance> GetBalanceAsync(int customerId)
        {
            var q = _db.CustomerLedgerEntries.Where(l => l.CustomerId == customerId);
            var debt = await q.SumAsync(x => (decimal?)x.DebtChange) ?? 0m;
            var deposit = await q.SumAsync(x => (decimal?)x.DepositChange) ?? 0m;
            return new CustomerBalance(debt, deposit);
        }

        public async Task AddAsync(CustomerLedgerEntry entry) =>
            await _db.CustomerLedgerEntries.AddAsync(entry);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
