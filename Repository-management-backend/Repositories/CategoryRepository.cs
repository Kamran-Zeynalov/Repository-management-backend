using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Repositories
{
    /// <summary>Category DbSet filial query filter ilə avtomatik süzülür.</summary>
    public class CategoryRepository : ICategoryRepository
    {
        private readonly AppDbContext _db;

        public CategoryRepository(AppDbContext db) => _db = db;

        public async Task<List<Category>> GetAllAsync(CategoryKind? kind = null)
        {
            var q = _db.Categories.AsNoTracking().Include(c => c.Parent).AsQueryable();
            if (kind.HasValue)
                q = q.Where(c => c.Kind == kind.Value);
            return await q.OrderBy(c => c.Name).ToListAsync();
        }

        public async Task<Category?> GetByIdAsync(int id) =>
            await _db.Categories.Include(c => c.Parent).FirstOrDefaultAsync(c => c.Id == id);

        public async Task<List<Category>> GetChildrenAsync(int parentId) =>
            await _db.Categories.AsNoTracking()
                .Where(c => c.ParentId == parentId)
                .OrderBy(c => c.Name)
                .ToListAsync();

        public async Task<bool> ExistsAsync(int id) =>
            await _db.Categories.AnyAsync(c => c.Id == id);

        public async Task<bool> HasChildrenAsync(int id) =>
            await _db.Categories.AnyAsync(c => c.ParentId == id);

        // PoleCategoryId InvoiceItem-də Category-yə loose istinaddır (FK yox)
        public async Task<bool> IsUsedByInvoiceItemsAsync(int id) =>
            await _db.InvoiceItems.AnyAsync(i => i.PoleCategoryId == id);

        public async Task<Dictionary<int, int>> GetChildrenCountsAsync()
        {
            var rows = await _db.Categories
                .Where(c => c.ParentId != null)
                .GroupBy(c => c.ParentId!.Value)
                .Select(g => new { ParentId = g.Key, Count = g.Count() })
                .ToListAsync();
            return rows.ToDictionary(r => r.ParentId, r => r.Count);
        }

        public async Task AddAsync(Category category) => await _db.Categories.AddAsync(category);

        public void Update(Category category) => _db.Categories.Update(category);

        public void Remove(Category category) => _db.Categories.Remove(category);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
