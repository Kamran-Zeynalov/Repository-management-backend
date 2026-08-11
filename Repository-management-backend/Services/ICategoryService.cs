using Repository_management_backend.Models.DTOs.Categories;
using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Services
{
    public interface ICategoryService
    {
        Task<List<CategoryDto>> GetAllAsync(CategoryKind? kind);
        Task<CategoryDto?> GetByIdAsync(int id);
        Task<List<CategoryDto>> GetChildrenAsync(int parentId);
        Task<ServiceResult<CategoryDto>> CreateAsync(CreateCategoryDto dto);
        Task<ServiceResult<CategoryDto>> UpdateAsync(UpdateCategoryDto dto);
        Task<ServiceResult> DeleteAsync(int id);
    }
}
