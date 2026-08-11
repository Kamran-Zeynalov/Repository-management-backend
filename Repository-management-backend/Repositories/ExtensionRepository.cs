using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Invoice filter-li; ExtensionHistory invoiceId ilə (filial-yoxlamalı) sorğulanır.</summary>
    public class ExtensionRepository : IExtensionRepository
    {
        private readonly AppDbContext _db;

        public ExtensionRepository(AppDbContext db) => _db = db;

        public async Task<Invoice?> GetInvoiceTrackedAsync(int invoiceId) =>
            await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == invoiceId);

        public async Task<Invoice?> GetInvoiceWithItemsAsync(int invoiceId) =>
            await _db.Invoices.AsNoTracking().Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == invoiceId);

        public async Task<List<ExtensionHistory>> GetHistoryAsync(int invoiceId) =>
            await _db.ExtensionHistories.AsNoTracking()
                .Where(e => e.InvoiceId == invoiceId && _db.Invoices.Any(i => i.Id == e.InvoiceId))
                .OrderByDescending(e => e.Date)
                .ToListAsync();

        public async Task AddHistoryAsync(ExtensionHistory entry) =>
            await _db.ExtensionHistories.AddAsync(entry);

        public async Task AddLedgerAsync(CustomerLedgerEntry entry) =>
            await _db.CustomerLedgerEntries.AddAsync(entry);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
