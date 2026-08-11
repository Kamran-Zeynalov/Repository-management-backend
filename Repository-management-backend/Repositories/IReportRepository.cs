using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IReportRepository
    {
        Task<List<Invoice>> GetInvoicesAsync(DateTime? from, DateTime? to, bool? closed, int? customerId);
        Task<List<Payment>> GetPaymentsAsync(DateTime? from, DateTime? to);
        Task<List<Customer>> GetCustomersAsync();
        Task<Dictionary<int, CustomerBalance>> GetBalancesAsync();
    }
}
