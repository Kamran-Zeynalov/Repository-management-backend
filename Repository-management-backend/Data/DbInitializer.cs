using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Security;

namespace Repository_management_backend.Data
{
    public static class DbInitializer
    {
        public static void Seed(AppDbContext db, IPasswordHasher hasher)
        {
            db.Database.Migrate();

            if (!db.Branches.Any())
            {
                db.Branches.AddRange(
                    new Branch { Code = "merdekan", Name = "Mərdəkan filialı", IsActive = true },
                    new Branch { Code = "pirsagi",  Name = "Pirşağı filialı",  IsActive = true },
                    new Branch { Code = "baku",     Name = "Bakı Mərkəz filialı", IsActive = true }
                );
                db.SaveChanges();
            }

            if (!db.Users.Any())
            {
                int Bid(string code) => db.Branches.First(b => b.Code == code).Id;

                db.Users.AddRange(
                    new User { Name = "Kapital MMC",Username = "admin.kapital", PasswordHash = hasher.Hash("Kapital@2026!"), Role = UserRole.Admin,   BranchId = Bid("merdekan"), Phone = "+994 50 111 22 33", IsActive = true }
                   
                );
                db.SaveChanges();
            }

            var legacyAdmin = db.Users.FirstOrDefault(u => u.Username == "elmar");
            if (legacyAdmin != null)
            {
                legacyAdmin.Username = "admin.kapital";
                legacyAdmin.PasswordHash = hasher.Hash("Kapital@2026!");
                db.SaveChanges();
            }

            var standardGoods = new (string Name, decimal Price, string Unit, RentType Rent)[]
            {
                ("Lesa",                 50m, "ədəd", RentType.Monthly),
                ("60-lıq Lesa",          50m, "ədəd", RentType.Monthly),
                ("Təkərli lesa",          5m, "ədəd", RentType.Daily),
                ("Taxta",                10m, "ədəd", RentType.Monthly),
                ("Dəmir dirək",          30m, "ədəd", RentType.Monthly),
                ("Bir tərəfli boy dikt",  3m, "m²",   RentType.Monthly),
                ("Boy dikt",              6m, "ədəd", RentType.Monthly),
                ("Kəsok dikt",            3m, "m²",   RentType.Monthly),
            };
            var allowedNames = standardGoods.Select(g => g.Name).ToList();

            var changed = false;
            foreach (var branchId in db.Branches.Select(x => x.Id).ToList())
            {
                foreach (var g in standardGoods)
                {
                    var exists = db.Categories.IgnoreQueryFilters()
                        .Any(c => c.BranchId == branchId && c.Kind == CategoryKind.Standard && c.Name == g.Name);
                    if (!exists)
                    {
                        db.Categories.Add(new Category
                        {
                            BranchId = branchId,
                            Kind = CategoryKind.Standard,
                            Name = g.Name,
                            Price = g.Price,
                            Unit = g.Unit,
                            RentType = g.Rent
                        });
                        changed = true;
                    }
                }
            }

            var strayStandard = db.Categories.IgnoreQueryFilters()
                .Where(c => c.Kind == CategoryKind.Standard && !allowedNames.Contains(c.Name))
                .ToList();
            if (strayStandard.Count > 0)
            {
                db.Categories.RemoveRange(strayStandard);
                changed = true;
            }

            if (changed)
                db.SaveChanges();
        }
    }
}
