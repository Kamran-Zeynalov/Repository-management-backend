using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Repositories
{
    public interface ICategoryRepository
    {
        Task<List<Category>> GetAllAsync(CategoryKind? kind = null);
        Task<Category?> GetByIdAsync(int id);
        Task<List<Category>> GetChildrenAsync(int parentId);
        Task<bool> ExistsAsync(int id);
        Task<bool> HasChildrenAsync(int id);
        Task<bool> IsUsedByInvoiceItemsAsync(int id);
        Task<Dictionary<int, int>> GetChildrenCountsAsync();
        Task AddAsync(Category category);
        void Update(Category category);
        void Remove(Category category);
        Task<int> SaveChangesAsync();
    }
}
