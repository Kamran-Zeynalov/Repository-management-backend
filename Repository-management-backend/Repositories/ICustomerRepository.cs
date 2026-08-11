using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public record CustomerBalance(decimal Debt, decimal Deposit);

    public interface ICustomerRepository
    {
        Task<List<Customer>> GetAllAsync();
        Task<Customer?> GetByIdAsync(int id);
        Task<List<Invoice>> GetInvoicesAsync(int customerId, bool? closed = null);
        Task<List<Invoice>> GetInvoicesWithItemsAsync(int customerId);   // çap üçün (mallar + filial)
        Task<List<CustomerLedgerEntry>> GetLedgerAsync(int customerId);
        Task<CustomerBalance> GetBalanceAsync(int customerId);
        Task<Dictionary<int, CustomerBalance>> GetBalancesAsync();
        Task<Dictionary<int, int>> GetActiveInvoiceCountsAsync();
        Task<bool> HasInvoicesAsync(int customerId);
        Task AddAsync(Customer customer);
        void Update(Customer customer);
        void Remove(Customer customer);
        Task<int> SaveChangesAsync();
    }
}
