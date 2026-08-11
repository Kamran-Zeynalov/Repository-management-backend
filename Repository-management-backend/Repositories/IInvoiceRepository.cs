using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IInvoiceRepository
    {
        Task<List<Invoice>> GetAllAsync(string? search, bool? closed);
        Task<Invoice?> GetByIdAsync(int id);            // mallar daxil
        Task<Invoice?> GetByIdTrackedAsync(int id);     // redaktə/silmə üçün (tracked, mallar daxil)
        Task<string> GenerateInvoiceNoAsync(int branchId);
        Task<bool> InvoiceNoExistsAsync(int branchId, string invoiceNo);
        Task<Customer?> GetCustomerAsync(int customerId);
        Task RemoveLedgerForInvoiceAsync(int invoiceId);
        Task AddLedgerAsync(CustomerLedgerEntry entry);
        Task AddAsync(Invoice invoice);
        void Update(Invoice invoice);
        void RemoveItems(IEnumerable<InvoiceItem> items);
        void Remove(Invoice invoice);
        Task<int> SaveChangesAsync();
    }
}
