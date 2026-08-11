using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Invoice filter-li; ReturnHistory invoiceId ilə (filial-yoxlamalı) sorğulanır.</summary>
    public class ReturnRepository : IReturnRepository
    {
        private readonly AppDbContext _db;

        public ReturnRepository(AppDbContext db) => _db = db;

        public async Task<Invoice?> GetInvoiceTrackedAsync(int invoiceId) =>
            await _db.Invoices.Include(i => i.Items).FirstOrDefaultAsync(i => i.Id == invoiceId);

        public async Task<List<ReturnHistory>> GetHistoryAsync(int invoiceId) =>
            await _db.ReturnHistories.AsNoTracking()
                .Where(r => r.InvoiceId == invoiceId && _db.Invoices.Any(i => i.Id == r.InvoiceId))
                .OrderByDescending(r => r.Date)
                .ToListAsync();

        public async Task AddHistoryAsync(ReturnHistory entry) =>
            await _db.ReturnHistories.AddAsync(entry);

        public async Task AddLedgerAsync(CustomerLedgerEntry entry) =>
            await _db.CustomerLedgerEntries.AddAsync(entry);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
