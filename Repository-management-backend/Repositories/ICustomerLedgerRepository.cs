using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface ICustomerLedgerRepository
    {
        Task<Customer?> GetCustomerAsync(int customerId);
        Task<List<CustomerLedgerEntry>> GetEntriesAsync(int customerId);
        Task<CustomerBalance> GetBalanceAsync(int customerId);
        Task AddAsync(CustomerLedgerEntry entry);
        Task<int> SaveChangesAsync();
    }
}
