using Repository_management_backend.Models.DTOs.Users;

namespace Repository_management_backend.Services
{
    public interface IUserService
    {
        Task<List<UserDto>> GetAllAsync();
        Task<UserDto?> GetByIdAsync(int id);
        Task<ServiceResult<UserDto>> CreateAsync(CreateUserDto dto);
        Task<ServiceResult<UserDto>> UpdateAsync(UpdateUserDto dto);
        Task<ServiceResult> ChangePasswordAsync(ChangePasswordDto dto);
        Task<ServiceResult> SetActiveAsync(int id, bool isActive);
        Task<ServiceResult> DeleteAsync(int id);
    }
}
