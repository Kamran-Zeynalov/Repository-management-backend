using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IDashboardRepository
    {
        Task<int> CustomerCountAsync();
        Task<int> InventoryCountAsync();
        Task<List<Invoice>> GetInvoicesWithItemsAsync();   // filial-filtered
        Task<CustomerBalance> GetLedgerTotalsAsync();      // Σ debt / Σ deposit (filial)
    }
}
