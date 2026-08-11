using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Payment-in birbaşa filter-i yoxdur; filial izolyasiyası
    /// Invoice (filter-li) ilə join/subquery vasitəsilə təmin olunur.</summary>
    public class PaymentRepository : IPaymentRepository
    {
        private readonly AppDbContext _db;

        public PaymentRepository(AppDbContext db) => _db = db;

        public async Task<Invoice?> GetInvoiceAsync(int invoiceId) =>
            await _db.Invoices.AsNoTracking().FirstOrDefaultAsync(i => i.Id == invoiceId);

        public async Task<Invoice?> GetInvoiceTrackedAsync(int invoiceId) =>
            await _db.Invoices.FirstOrDefaultAsync(i => i.Id == invoiceId);

        public async Task<List<Payment>> GetByInvoiceAsync(int invoiceId) =>
            await _db.Payments.AsNoTracking()
                .Include(p => p.Invoice)
                .Where(p => p.InvoiceId == invoiceId && _db.Invoices.Any(i => i.Id == p.InvoiceId))
                .OrderByDescending(p => p.Date)
                .ToListAsync();

        public async Task<List<Payment>> GetByCustomerAsync(int customerId) =>
            await _db.Payments.AsNoTracking()
                .Include(p => p.Invoice)
                .Where(p => _db.Invoices.Any(i => i.Id == p.InvoiceId && i.CustomerId == customerId))
                .OrderByDescending(p => p.Date)
                .ToListAsync();

        public async Task AddAsync(Payment payment) => await _db.Payments.AddAsync(payment);

        public async Task AddLedgerAsync(CustomerLedgerEntry entry) =>
            await _db.CustomerLedgerEntries.AddAsync(entry);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
