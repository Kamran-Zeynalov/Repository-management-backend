using Repository_management_backend.Models.DTOs.Branches;

namespace Repository_management_backend.Services
{
    public interface IBranchService
    {
        Task<List<BranchDto>> GetAllAsync();
        Task<BranchDto?> GetByIdAsync(int id);
        Task<ServiceResult<BranchDto>> CreateAsync(CreateBranchDto dto);
        Task<ServiceResult<BranchDto>> UpdateAsync(UpdateBranchDto dto);
        Task<ServiceResult> DeleteAsync(int id);
        Task<ServiceResult> ForceDeleteAsync(int id);
    }
}
