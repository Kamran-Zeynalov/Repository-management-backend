using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Customer/Invoice DbSet-ləri filial query filter ilə avtomatik süzülür.</summary>
    public class CustomerRepository : ICustomerRepository
    {
        private readonly AppDbContext _db;

        public CustomerRepository(AppDbContext db) => _db = db;

        public async Task<List<Customer>> GetAllAsync() =>
            await _db.Customers.AsNoTracking().OrderBy(c => c.Name).ToListAsync();

        public async Task<Customer?> GetByIdAsync(int id) =>
            await _db.Customers.FirstOrDefaultAsync(c => c.Id == id);

        public async Task<List<Invoice>> GetInvoicesAsync(int customerId, bool? closed = null)
        {
            var q = _db.Invoices.AsNoTracking().Where(i => i.CustomerId == customerId);
            if (closed.HasValue)
                q = q.Where(i => i.IsClosed == closed.Value);
            return await q.OrderByDescending(i => i.InvoiceDate).ToListAsync();
        }

        public async Task<List<Invoice>> GetInvoicesWithItemsAsync(int customerId) =>
            await _db.Invoices.AsNoTracking()
                .Include(i => i.Items)
                .Include(i => i.Branch)
                .Where(i => i.CustomerId == customerId)
                .OrderByDescending(i => i.InvoiceDate)
                .ToListAsync();

        public async Task<List<CustomerLedgerEntry>> GetLedgerAsync(int customerId) =>
            await _db.CustomerLedgerEntries
                .AsNoTracking()
                .Include(l => l.Invoice)
                .Where(l => l.CustomerId == customerId)
                .OrderByDescending(l => l.Date)
                .ToListAsync();

        public async Task<CustomerBalance> GetBalanceAsync(int customerId)
        {
            var q = _db.CustomerLedgerEntries.Where(l => l.CustomerId == customerId);
            // (decimal?) cast: sətir olmadıqda SQL SUM NULL qaytarır, ?? 0 ilə qoruyuruq
            var debt = await q.SumAsync(x => (decimal?)x.DebtChange) ?? 0m;
            var deposit = await q.SumAsync(x => (decimal?)x.DepositChange) ?? 0m;
            return new CustomerBalance(debt, deposit);
        }

        public async Task<Dictionary<int, CustomerBalance>> GetBalancesAsync()
        {
            // Yalnız cari filialın müştəriləri (query filter Customer-də tətbiq olunur)
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

        public async Task<Dictionary<int, int>> GetActiveInvoiceCountsAsync()
        {
            var rows = await _db.Invoices
                .Where(i => !i.IsClosed)
                .GroupBy(i => i.CustomerId)
                .Select(g => new { CustomerId = g.Key, Count = g.Count() })
                .ToListAsync();

            return rows.ToDictionary(r => r.CustomerId, r => r.Count);
        }

        public async Task<bool> HasInvoicesAsync(int customerId) =>
            await _db.Invoices.AnyAsync(i => i.CustomerId == customerId);

        public async Task AddAsync(Customer customer) => await _db.Customers.AddAsync(customer);

        public void Update(Customer customer) => _db.Customers.Update(customer);

        public void Remove(Customer customer) => _db.Customers.Remove(customer);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
