using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Repositories
{
    /// <summary>Açıq qaimədə hələ qaytarılmamış mal sətri (icarədə olan).</summary>
    public class RentedRow
    {
        public int InvoiceId { get; set; }
        public string InvoiceNo { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public DateTime ReturnDate { get; set; }
        public string Category { get; set; } = string.Empty;
        public string? Size { get; set; }
        public string? Unit { get; set; }
        public decimal Remaining { get; set; }
    }

    public interface IInventoryRepository
    {
        Task<List<InventoryStock>> GetAllAsync();
        Task<InventoryStock?> GetByIdAsync(int id);
        Task<bool> NameExistsAsync(string name, int branchId, int? excludeId = null);
        Task<List<RentedRow>> GetOpenRentedRowsAsync();
        Task AddAsync(InventoryStock stock);
        void Update(InventoryStock stock);
        void Remove(InventoryStock stock);
        Task<int> SaveChangesAsync();
    }
}
