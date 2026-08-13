using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>InventoryStock və Invoice DbSet-ləri filial query filter ilə avtomatik süzülür.</summary>
    public class InventoryRepository : IInventoryRepository
    {
        private readonly AppDbContext _db;

        public InventoryRepository(AppDbContext db) => _db = db;

        public async Task<List<InventoryStock>> GetAllAsync() =>
            await _db.InventoryStocks.AsNoTracking().OrderBy(s => s.Name).ToListAsync();

        public async Task<InventoryStock?> GetByIdAsync(int id) =>
            await _db.InventoryStocks.FirstOrDefaultAsync(s => s.Id == id);

        public async Task<bool> NameExistsAsync(string name, int branchId, int? excludeId = null)
        {
            var n = name.Trim().ToLower();
            // IgnoreQueryFilters + BranchId: yoxlama yalnız hədəf filiala aiddir (admin də daxil)
            return await _db.InventoryStocks.IgnoreQueryFilters().AnyAsync(s =>
                s.BranchId == branchId && s.Name.ToLower() == n && (excludeId == null || s.Id != excludeId));
        }

        // Açıq qaimələrdə qaytarılan (IsReturnable) və hələ tam qaytarılmamış mallar.
        // Invoice query filter tətbiq olunduğu üçün yalnız cari filial.
        public async Task<List<RentedRow>> GetOpenRentedRowsAsync()
        {
            // 1) Əvvəlcə xam invoice+item cütlərini yaddaşa çəkirik
            //    (çünki aşağıdakı genişləndirmə məntiqi EF-də SQL-ə çevrilə bilməz)
            var raw = await _db.Invoices
                .Where(i => !i.IsClosed)
                .SelectMany(i => i.Items
                    .Where(it => it.IsReturnable && (it.Quantity - it.ReturnedQuantity) > 0)
                    .Select(it => new { Invoice = i, Item = it }))
                .ToListAsync();

            var rows = new List<RentedRow>();

            foreach (var x in raw)
            {
                var i = x.Invoice;
                var it = x.Item;

                void Add(string category, string? size, decimal qty)
                {
                    if (qty <= 0) return;
                    rows.Add(new RentedRow
                    {
                        InvoiceId = i.Id,
                        InvoiceNo = i.InvoiceNo,
                        CustomerName = i.CustomerNameSnapshot,
                        Phone = i.Phone,
                        ReturnDate = i.ReturnDate,
                        Category = category,
                        Size = size,
                        Unit = it.Unit,
                        Remaining = qty
                    });
                }

                // DÜZƏLİŞ: "Lesa" (adi) və "60-lıq Lesa" artıq Anbarda AYRI-AYRI mallar kimi izlənir.
                if (string.Equals(it.Category, "Lesa", StringComparison.OrdinalIgnoreCase))
                {
                    Add("Lesa başlıq", null, it.LesaHeadCount ?? 0);
                    Add("Lesa uzun çubuq", null, it.LesaLongRodCount ?? 0);
                    Add("Lesa balaca çubuq", null, it.LesaShortRodCount ?? 0);
                    Add("Lesa taxta 5/15 3.00", null, it.LesaFreeTaxtaCount ?? 0);
                    Add("Lesa əlavə taxta 5/15 3.00", null, it.LesaExtraTaxtaCount ?? 0);
                }
                else if (string.Equals(it.Category, "60-lıq Lesa", StringComparison.OrdinalIgnoreCase))
                {
                    Add("60-lıq Lesa başlıq", null, it.LesaHeadCount ?? 0);
                    Add("60-lıq Lesa uzun çubuq", null, it.LesaLongRodCount ?? 0);
                    Add("60-lıq Lesa balaca çubuq", null, it.LesaShortRodCount ?? 0);
                    Add("60-lıq Lesa taxta 5/15 3.00", null, it.LesaFreeTaxtaCount ?? 0);
                    Add("60-lıq Lesa əlavə taxta 5/15 3.00", null, it.LesaExtraTaxtaCount ?? 0);
                }
                else if (string.Equals(it.Category, "Təkərli lesa", StringComparison.OrdinalIgnoreCase))
                {
                    Add("Təkərli lesa başlıq", null, it.HeadCount ?? 0);
                    Add("Təkərli lesa çubuq", null, it.RodCount ?? 0);
                    Add("Təkərli lesa vilka", null, it.VilkaCount ?? 0);
                    Add("Təkərli lesa taxta", null, it.BoardCount ?? 0);
                    Add("Təkərli lesa əlavə taxta", null, it.ExtraBoardCount ?? 0);
                }
                else if (string.Equals(it.Category, "Dəmir dirək", StringComparison.OrdinalIgnoreCase))
                {
                    // Əsas dirək sətri — Category+Size ilə uyğunlaşdırma (əvvəlki kimi)
                    Add("Dəmir dirək", it.Size, it.Quantity - it.ReturnedQuantity);
                    // Pales ayrıca izlənən mal olduğu üçün ayrıca sətir
                    if ((it.PalesCount ?? 0) > 0) Add("Pales", null, it.PalesCount ?? 0);
                }
                else
                {
                    // Digər bütün adi mallar — köhnə davranış eynən qalır
                    Add(it.Category, it.Size, it.Quantity - it.ReturnedQuantity);
                }
            }

            return rows;
        }

        public async Task AddAsync(InventoryStock stock) => await _db.InventoryStocks.AddAsync(stock);

        public void Update(InventoryStock stock) => _db.InventoryStocks.Update(stock);

        public void Remove(InventoryStock stock) => _db.InventoryStocks.Remove(stock);

        public async Task<int> SaveChangesAsync() => await _db.SaveChangesAsync();
    }
}
