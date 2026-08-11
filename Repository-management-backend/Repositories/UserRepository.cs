using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AppDbContext _db;

        public UserRepository(AppDbContext db) => _db = db;

        public async Task<List<User>> GetAllAsync() =>
            await _db.Users
                .Include(u => u.Branch)
                .AsNoTracking()
                .OrderBy(u => u.Name)
                .ToListAsync();

        public async Task<User?> GetByIdAsync(int id) =>
            await _db.Users
                .Include(u => u.Branch)
                .FirstOrDefaultAsync(u => u.Id == id);

        public async Task<User?> GetByUsernameAsync(string username)
        {
            var uname = username.Trim().ToLower();
            return await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == uname);
        }

        public async Task<bool> UsernameExistsAsync(string username, int? excludeId = null)
        {
            var uname = username.Trim().ToLower();
            return await _db.Users.AnyAsync(u =>
                u.Username.ToLower() == uname && (excludeId == null || u.Id != excludeId));
        }

        public async Task<bool> BranchExistsAsync(int branchId) =>
            await _db.Branches.AnyAsync(b => b.Id == branchId);

        public async Task<int> CountAdminsAsync(int? excludeId = null) =>
            await _db.Users.CountAsync(u =>
                u.Role == UserRole.Admin && u.IsActive && (excludeId == null || u.Id != excludeId));

        public async Task AddAsync(User user) => await _db.Users.AddAsync(user);

        public void Update(User user) => _db.Users.Update(user);

        public void Remove(User user) => _db.Users.Remove(user);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
