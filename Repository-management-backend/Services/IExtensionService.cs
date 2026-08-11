using Repository_management_backend.Models.DTOs.Extensions;

namespace Repository_management_backend.Services
{
    public interface IExtensionService
    {
        Task<List<ExtensionHistoryDto>> GetHistoryAsync(int invoiceId);
        Task<ExtensionPreviewDto?> PreviewAsync(int invoiceId, int periods, string? mode);
        Task<ServiceResult<ExtensionResultDto>> ExtendAsync(ExtendInvoiceDto dto);
    }
}
