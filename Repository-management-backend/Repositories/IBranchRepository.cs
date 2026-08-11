using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IBranchRepository
    {
        Task<List<Branch>> GetAllAsync();
        Task<Branch?> GetByIdAsync(int id);
        Task<bool> CodeExistsAsync(string code, int? excludeId = null);
        Task<int> CountUsersAsync(int branchId);
        Task<int> CountCustomersAsync(int branchId);
        Task<int> CountInvoicesAsync(int branchId);
        Task<int> CountCategoriesAsync(int branchId);
        Task<int> CountInventoryAsync(int branchId);
        Task AddAsync(Branch branch);
        void Update(Branch branch);
        void Remove(Branch branch);
        Task ForceDeleteAsync(int branchId);
        Task<int> SaveChangesAsync();
    }
}
