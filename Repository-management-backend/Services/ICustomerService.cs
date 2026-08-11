using Repository_management_backend.Models.DTOs.Customers;

namespace Repository_management_backend.Services
{
    public interface ICustomerService
    {
        Task<List<CustomerDto>> GetAllAsync();
        Task<CustomerDto?> GetByIdAsync(int id);
        Task<CustomerProfileDto?> GetProfileAsync(int id);
        Task<CustomerPrintDto?> GetInvoicesPrintAsync(int id);
        Task<List<InvoiceSummaryDto>> GetInvoicesAsync(int id, bool? closed);
        Task<List<LedgerEntryDto>> GetLedgerAsync(int id);
        Task<ServiceResult<CustomerDto>> CreateAsync(CreateCustomerDto dto);
        Task<ServiceResult<CustomerDto>> UpdateAsync(UpdateCustomerDto dto);
        Task<ServiceResult> DeleteAsync(int id);
    }
}
