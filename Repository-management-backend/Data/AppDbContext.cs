using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using System.Security.Claims;

namespace Repository_management_backend.Data
{
    public class AppDbContext : DbContext
    {
        private readonly int _currentBranchId;
        private readonly bool _isAdmin;

        public AppDbContext(DbContextOptions<AppDbContext> options,
                            IHttpContextAccessor? httpContextAccessor = null) : base(options)
        {
            var user = httpContextAccessor?.HttpContext?.User;
            var raw = user?.FindFirst("BranchId")?.Value;
            _currentBranchId = int.TryParse(raw, out var b) ? b : 0;
            var role = user?.FindFirst(ClaimTypes.Role)?.Value;
            _isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
        }

        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<User> Users => Set<User>();
        public DbSet<Customer> Customers => Set<Customer>();
        public DbSet<Invoice> Invoices => Set<Invoice>();
        public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
        public DbSet<Payment> Payments => Set<Payment>();
        public DbSet<CustomerLedgerEntry> CustomerLedgerEntries => Set<CustomerLedgerEntry>();
        public DbSet<Category> Categories => Set<Category>();
        public DbSet<InventoryStock> InventoryStocks => Set<InventoryStock>();
        public DbSet<ExtensionHistory> ExtensionHistories => Set<ExtensionHistory>();
        public DbSet<ReturnHistory> ReturnHistories => Set<ReturnHistory>();

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
        }

        protected override void OnModelCreating(ModelBuilder b)
        {
            base.OnModelCreating(b);

            b.Entity<Branch>(e =>
            {
                e.Property(x => x.Code).HasMaxLength(50).IsRequired();
                e.Property(x => x.Name).HasMaxLength(150).IsRequired();
                e.HasIndex(x => x.Code).IsUnique();
            });

            b.Entity<User>(e =>
            {
                e.Property(x => x.Name).HasMaxLength(150).IsRequired();
                e.Property(x => x.Username).HasMaxLength(100).IsRequired();
                e.Property(x => x.PasswordHash).HasMaxLength(256).IsRequired();
                e.Property(x => x.Phone).HasMaxLength(50);
                e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
                e.HasIndex(x => x.Username).IsUnique();
                e.HasOne(x => x.Branch).WithMany(x => x.Users)
                    .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
            });

            b.Entity<Customer>(e =>
            {
                e.Property(x => x.Name).HasMaxLength(200).IsRequired();
                e.Property(x => x.Phone).HasMaxLength(50);
                e.Property(x => x.ExtraPhone).HasMaxLength(50);
                e.Property(x => x.Address).HasMaxLength(400);
                e.Property(x => x.Note).HasMaxLength(1000);
                e.HasIndex(x => new { x.BranchId, x.Phone });
                e.HasOne(x => x.Branch).WithMany(x => x.Customers)
                    .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
            });

            b.Entity<Invoice>(e =>
            {
                e.Property(x => x.InvoiceNo).HasMaxLength(60).IsRequired();
                e.Property(x => x.CustomerNameSnapshot).HasMaxLength(200);
                e.Property(x => x.Phone).HasMaxLength(50);
                e.Property(x => x.ExtraPhone).HasMaxLength(50);
                e.Property(x => x.Address).HasMaxLength(400);
                e.Property(x => x.Note).HasMaxLength(1000);
                e.HasIndex(x => new { x.BranchId, x.InvoiceNo }).IsUnique();
                e.HasOne(x => x.Branch).WithMany(x => x.Invoices)
                    .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Customer).WithMany(x => x.Invoices)
                    .HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Restrict);
            });

            b.Entity<InvoiceItem>(e =>
            {
                e.Property(x => x.Category).HasMaxLength(80).IsRequired();
                e.Property(x => x.Label).HasMaxLength(150);
                e.Property(x => x.VariantId).HasMaxLength(80);
                e.Property(x => x.Size).HasMaxLength(120);
                e.Property(x => x.Unit).HasMaxLength(30);
                e.Property(x => x.Note).HasMaxLength(1000);
                e.Property(x => x.RentMode).HasMaxLength(20);
                e.HasOne(x => x.Invoice).WithMany(x => x.Items)
                    .HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
            });

            b.Entity<Payment>(e =>
            {
                e.Property(x => x.Direction).HasConversion<string>().HasMaxLength(10);
                e.Property(x => x.Note).HasMaxLength(500);
                e.HasOne(x => x.Invoice).WithMany(x => x.Payments)
                    .HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
            });

            b.Entity<CustomerLedgerEntry>(e =>
            {
                e.Property(x => x.Type).HasMaxLength(80).IsRequired();
                e.Property(x => x.Note).HasMaxLength(1000);
                e.Property(x => x.Source).HasMaxLength(20);
                e.HasOne(x => x.Customer).WithMany(x => x.LedgerEntries)
                    .HasForeignKey(x => x.CustomerId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.Invoice).WithMany()
                    .HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Restrict);
            });

            b.Entity<Category>(e =>
            {
                e.Property(x => x.Name).HasMaxLength(150).IsRequired();
                e.Property(x => x.Info).HasMaxLength(500);
                e.Property(x => x.Unit).HasMaxLength(30);
                e.Property(x => x.Note).HasMaxLength(500);
                e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(20);
                e.Property(x => x.RentType).HasConversion<string>().HasMaxLength(20);
                e.HasOne(x => x.Branch).WithMany(x => x.Categories)
                    .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Parent).WithMany(x => x.Children)
                    .HasForeignKey(x => x.ParentId).OnDelete(DeleteBehavior.Restrict);
            });

            b.Entity<InventoryStock>(e =>
            {
                e.Property(x => x.Name).HasMaxLength(150).IsRequired();
                e.HasIndex(x => new { x.BranchId, x.Name }).IsUnique();
                e.HasOne(x => x.Branch).WithMany(x => x.InventoryStocks)
                    .HasForeignKey(x => x.BranchId).OnDelete(DeleteBehavior.Restrict);
            });

            b.Entity<ExtensionHistory>(e =>
            {
                e.Property(x => x.Mode).HasMaxLength(20);
                e.Property(x => x.Note).HasMaxLength(500);
                e.HasOne(x => x.Invoice).WithMany(x => x.ExtensionHistory)
                    .HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
            });

            b.Entity<ReturnHistory>(e =>
            {
                e.Property(x => x.Note).HasMaxLength(500);
                e.HasOne(x => x.Invoice).WithMany(x => x.ReturnHistory)
                    .HasForeignKey(x => x.InvoiceId).OnDelete(DeleteBehavior.Cascade);
            });

            b.Entity<Customer>().HasQueryFilter(e => e.BranchId == _currentBranchId);
            b.Entity<Invoice>().HasQueryFilter(e => e.BranchId == _currentBranchId);
            b.Entity<Category>().HasQueryFilter(e => e.BranchId == _currentBranchId);
            b.Entity<InventoryStock>().HasQueryFilter(e => e.BranchId == _currentBranchId);

            b.Entity<Branch>().HasData(
                new Branch { Id = 1, Code = "merdekan", Name = "Mərdəkan filialı", IsActive = true },
                new Branch { Id = 2, Code = "pirsagi", Name = "Pirşağı filialı", IsActive = true },
                new Branch { Id = 3, Code = "baku", Name = "Bakı Mərkəz filialı", IsActive = true }
            );

            var standardGoods = new (string Name, decimal Price, string Unit, RentType Rent)[]
            {
                ("Lesa",          50m, "ədəd", RentType.Monthly),
                ("Təkərli lesa",   5m, "ədəd", RentType.Daily),
                ("Dəmir dirək",   30m, "ədəd", RentType.Monthly),
                ("Taxta",         10m, "ədəd", RentType.Monthly),
                ("Vibrator",       8m, "ədəd", RentType.Daily),
            };
            var categorySeed = new List<Category>();
            for (int branch = 1; branch <= 3; branch++)
                for (int j = 0; j < standardGoods.Length; j++)
                {
                    var g = standardGoods[j];
                    categorySeed.Add(new Category
                    {
                        Id = (branch - 1) * standardGoods.Length + j + 1,
                        BranchId = branch,
                        Kind = CategoryKind.Standard,
                        Name = g.Name,
                        Price = g.Price,
                        Unit = g.Unit,
                        RentType = g.Rent
                    });
                }
            b.Entity<Category>().HasData(categorySeed);

            //b.Entity<InventoryStock>().HasData(
            //    new InventoryStock { Id = 1, BranchId = 1, Name = "Lesa", TotalCount = 20m },
            //    new InventoryStock { Id = 2, BranchId = 1, Name = "Taxta", TotalCount = 100m }
            //);

            //var seedDate = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            //b.Entity<Customer>().HasData(
            //    new Customer { Id = 1, BranchId = 1, Name = "Test Müştəri 1", Phone = "+994 50 100 10 01", CreatedAt = seedDate },
            //    new Customer { Id = 2, BranchId = 1, Name = "Test Müştəri 2", Phone = "+994 50 100 10 02", CreatedAt = seedDate },
            //    new Customer { Id = 3, BranchId = 2, Name = "Test Müştəri 3", Phone = "+994 50 100 10 03", CreatedAt = seedDate },
            //    new Customer { Id = 4, BranchId = 2, Name = "Test Müştəri 4", Phone = "+994 50 100 10 04", CreatedAt = seedDate },
            //    new Customer { Id = 5, BranchId = 3, Name = "Test Müştəri 5", Phone = "+994 50 100 10 05", CreatedAt = seedDate },
            //    new Customer { Id = 6, BranchId = 3, Name = "Test Müştəri 6", Phone = "+994 50 100 10 06", CreatedAt = seedDate }
            //);

            //var invDate = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc);
            //var retDate = new DateTime(2025, 7, 1, 0, 0, 0, DateTimeKind.Utc);
            //b.Entity<Invoice>().HasData(new Invoice
            //{
            //    Id = 1,
            //    InvoiceNo = "0001",
            //    BranchId = 1,
            //    CustomerId = 1,
            //    CustomerNameSnapshot = "Test Müştəri 1",
            //    Phone = "+994 50 100 10 01",
            //    InvoiceDate = invDate,
            //    ReturnDate = retDate,
            //    TotalAmount = 500m,
            //    PaidAmount = 200m,
            //    DepositAmount = 100m,
            //    RemainingDebt = 300m,
            //    IsClosed = false,
            //    CreatedAt = invDate,
            //    UpdatedAt = invDate
            //});

            //b.Entity<InvoiceItem>().HasData(
            //    new InvoiceItem { Id = 1, InvoiceId = 1, Category = "Lesa", Unit = "ədəd", Quantity = 5m, CustomPrice = 50m, Subtotal = 250m, IsReturnable = true, IsRecurring = true, IsFixedFee = false, ReturnedQuantity = 0m },
            //    new InvoiceItem { Id = 2, InvoiceId = 1, Category = "Taxta", Unit = "ədəd", Quantity = 25m, CustomPrice = 10m, Subtotal = 250m, IsReturnable = true, IsRecurring = true, IsFixedFee = false, ReturnedQuantity = 0m }
            //);

            //b.Entity<CustomerLedgerEntry>().HasData(new CustomerLedgerEntry
            //{
            //    Id = 1,
            //    CustomerId = 1,
            //    InvoiceId = 1,
            //    Date = invDate,
            //    Type = "Mal götürüb (qaimə #0001)",
            //    Amount = 500m,
            //    DebtChange = 300m,
            //    DepositChange = 100m,
            //    Source = "invoice"
            //});
        }
    }
}
