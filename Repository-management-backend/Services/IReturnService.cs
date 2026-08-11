using Repository_management_backend.Models.DTOs.Returns;

namespace Repository_management_backend.Services
{
    public interface IReturnService
    {
        Task<List<ReturnHistoryDto>> GetHistoryAsync(int invoiceId);
        Task<ServiceResult<ReturnResultDto>> PartialReturnAsync(PartialReturnDto dto);
        Task<ServiceResult<ReturnResultDto>> FullReturnAsync(FullReturnDto dto);
    }
}
