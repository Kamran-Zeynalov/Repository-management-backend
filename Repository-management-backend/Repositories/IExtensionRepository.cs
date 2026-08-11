using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IExtensionRepository
    {
        Task<Invoice?> GetInvoiceTrackedAsync(int invoiceId);       // mallar daxil
        Task<Invoice?> GetInvoiceWithItemsAsync(int invoiceId);     // oxuma (preview)
        Task<List<ExtensionHistory>> GetHistoryAsync(int invoiceId);
        Task AddHistoryAsync(ExtensionHistory entry);
        Task AddLedgerAsync(CustomerLedgerEntry entry);
        Task<int> SaveChangesAsync();
    }
}
