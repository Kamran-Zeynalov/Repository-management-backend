using Repository_management_backend.Models.DTOs.Invoices;

namespace Repository_management_backend.Services
{
    public interface IInvoiceService
    {
        Task<List<InvoiceListItemDto>> GetAllAsync(string? search, string? status);
        Task<InvoiceDetailDto?> GetByIdAsync(int id);
        Task<InvoicePrintDto?> GetForPrintAsync(int id);
        Task<string> GetNextInvoiceNoAsync();
        Task<ServiceResult<InvoiceDetailDto>> CreateAsync(CreateInvoiceDto dto);
        Task<ServiceResult<InvoiceDetailDto>> UpdateAsync(UpdateInvoiceDto dto);
        Task<ServiceResult> CloseAsync(int id);
        Task<ServiceResult> DeleteAsync(int id);
    }
}
