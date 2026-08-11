using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IPaymentRepository
    {
        Task<Invoice?> GetInvoiceAsync(int invoiceId);          // oxuma (branch-filtered)
        Task<Invoice?> GetInvoiceTrackedAsync(int invoiceId);   // ödəniş üçün tracked
        Task<List<Payment>> GetByInvoiceAsync(int invoiceId);
        Task<List<Payment>> GetByCustomerAsync(int customerId);
        Task AddAsync(Payment payment);
        Task AddLedgerAsync(CustomerLedgerEntry entry);
        Task<int> SaveChangesAsync();
    }
}
