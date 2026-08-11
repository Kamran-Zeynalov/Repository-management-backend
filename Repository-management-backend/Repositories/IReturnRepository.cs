using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IReturnRepository
    {
        Task<Invoice?> GetInvoiceTrackedAsync(int invoiceId);   // mallar daxil
        Task<List<ReturnHistory>> GetHistoryAsync(int invoiceId);
        Task AddHistoryAsync(ReturnHistory entry);
        Task AddLedgerAsync(CustomerLedgerEntry entry);
        Task<int> SaveChangesAsync();
    }
}
