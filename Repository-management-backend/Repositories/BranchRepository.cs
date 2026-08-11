using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public class BranchRepository : IBranchRepository
    {
        private readonly AppDbContext _db;
        public BranchRepository(AppDbContext db) => _db = db;

        public async Task<List<Branch>> GetAllAsync() =>
            await _db.Branches.AsNoTracking().OrderBy(x => x.Id).ToListAsync();

        public async Task<Branch?> GetByIdAsync(int id) =>
            await _db.Branches.FirstOrDefaultAsync(x => x.Id == id);

        public async Task<bool> CodeExistsAsync(string code, int? excludeId = null) =>
            await _db.Branches.AnyAsync(x => x.Code == code && (excludeId == null || x.Id != excludeId));

        public Task<int> CountUsersAsync(int branchId) =>
            _db.Users.IgnoreQueryFilters().CountAsync(x => x.BranchId == branchId);

        public Task<int> CountCustomersAsync(int branchId) =>
            _db.Customers.IgnoreQueryFilters().CountAsync(x => x.BranchId == branchId);

        public Task<int> CountInvoicesAsync(int branchId) =>
            _db.Invoices.IgnoreQueryFilters().CountAsync(x => x.BranchId == branchId);

        public Task<int> CountCategoriesAsync(int branchId) =>
            _db.Categories.IgnoreQueryFilters().CountAsync(x => x.BranchId == branchId);

        public Task<int> CountInventoryAsync(int branchId) =>
            _db.InventoryStocks.IgnoreQueryFilters().CountAsync(x => x.BranchId == branchId);

        public async Task AddAsync(Branch branch) => await _db.Branches.AddAsync(branch);
        public void Update(Branch branch) => _db.Branches.Update(branch);
        public void Remove(Branch branch) => _db.Branches.Remove(branch);
        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();

        public async Task ForceDeleteAsync(int branchId)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var customerIds = await _db.Customers.IgnoreQueryFilters()
                .Where(c => c.BranchId == branchId).Select(c => c.Id).ToListAsync();
            var invoiceIds = await _db.Invoices.IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId).Select(i => i.Id).ToListAsync();

            var ledger = await _db.CustomerLedgerEntries
                .Where(l => customerIds.Contains(l.CustomerId) || (l.InvoiceId != null && invoiceIds.Contains(l.InvoiceId.Value)))
                .ToListAsync();
            if (ledger.Count > 0) _db.CustomerLedgerEntries.RemoveRange(ledger);
            await _db.SaveChangesAsync();

            var invoices = await _db.Invoices.IgnoreQueryFilters()
                .Where(i => i.BranchId == branchId).ToListAsync();
            if (invoices.Count > 0) _db.Invoices.RemoveRange(invoices);
            await _db.SaveChangesAsync();

            var customers = await _db.Customers.IgnoreQueryFilters()
                .Where(c => c.BranchId == branchId).ToListAsync();
            if (customers.Count > 0) _db.Customers.RemoveRange(customers);
            await _db.SaveChangesAsync();

            var childCategories = await _db.Categories.IgnoreQueryFilters()
                .Where(c => c.BranchId == branchId && c.ParentId != null).ToListAsync();
            if (childCategories.Count > 0) _db.Categories.RemoveRange(childCategories);
            await _db.SaveChangesAsync();

            var parentCategories = await _db.Categories.IgnoreQueryFilters()
                .Where(c => c.BranchId == branchId).ToListAsync();
            if (parentCategories.Count > 0) _db.Categories.RemoveRange(parentCategories);
            await _db.SaveChangesAsync();

            var inventory = await _db.InventoryStocks.IgnoreQueryFilters()
                .Where(s => s.BranchId == branchId).ToListAsync();
            if (inventory.Count > 0) _db.InventoryStocks.RemoveRange(inventory);
            await _db.SaveChangesAsync();

            var users = await _db.Users.Where(u => u.BranchId == branchId).ToListAsync();
            if (users.Count > 0) _db.Users.RemoveRange(users);
            await _db.SaveChangesAsync();

            var branch = await _db.Branches.FirstOrDefaultAsync(x => x.Id == branchId);
            if (branch != null) _db.Branches.Remove(branch);
            await _db.SaveChangesAsync();

            await tx.CommitAsync();
        }
    }
}
