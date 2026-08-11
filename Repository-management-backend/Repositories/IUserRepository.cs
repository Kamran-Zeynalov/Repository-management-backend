using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    public interface IUserRepository
    {
        Task<List<User>> GetAllAsync();
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByUsernameAsync(string username);
        Task<bool> UsernameExistsAsync(string username, int? excludeId = null);
        Task<bool> BranchExistsAsync(int branchId);
        Task<int> CountAdminsAsync(int? excludeId = null);
        Task AddAsync(User user);
        void Update(User user);
        void Remove(User user);
        Task<int> SaveChangesAsync();
    }
}
