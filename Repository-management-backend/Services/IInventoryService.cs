using Repository_management_backend.Models.DTOs.Inventory;

namespace Repository_management_backend.Services
{
    public interface IInventoryService
    {
        Task<List<InventoryStockDto>> GetAllAsync();
        Task<InventoryStockDto?> GetByIdAsync(int id);
        Task<List<InventoryHolderDto>> GetHoldersAsync(int id);
        Task<List<RentedItemDto>> GetRentedItemsAsync();
        Task<ServiceResult<InventoryStockDto>> CreateAsync(CreateInventoryStockDto dto);
        Task<ServiceResult<InventoryStockDto>> UpdateAsync(UpdateInventoryStockDto dto);
        Task<ServiceResult> DeleteAsync(int id);
    }
}
