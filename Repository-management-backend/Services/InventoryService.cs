using AutoMapper;
using Repository_management_backend.Models.DTOs.Inventory;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;
using Repository_management_backend.Security;

namespace Repository_management_backend.Services
{
    public class InventoryService : IInventoryService
    {
        private readonly IInventoryRepository _repo;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _current;

        public InventoryService(IInventoryRepository repo, IMapper mapper, ICurrentUserService current)
        {
            _repo = repo;
            _mapper = mapper;
            _current = current;
        }

        public async Task<List<InventoryStockDto>> GetAllAsync()
        {
            var stocks = await _repo.GetAllAsync();
            var rented = await _repo.GetOpenRentedRowsAsync();

            var list = _mapper.Map<List<InventoryStockDto>>(stocks);
            for (int i = 0; i < list.Count; i++)
            {
                var rentedOut = rented.Where(r => Matches(stocks[i].Name, r)).Sum(r => r.Remaining);
                list[i].RentedOut = rentedOut;
                list[i].FreeCount = stocks[i].TotalCount - rentedOut;
            }
            return list;
        }

        public async Task<InventoryStockDto?> GetByIdAsync(int id)
        {
            var stock = await _repo.GetByIdAsync(id);
            if (stock == null) return null;

            var rented = await _repo.GetOpenRentedRowsAsync();
            var rentedOut = rented.Where(r => Matches(stock.Name, r)).Sum(r => r.Remaining);

            var dto = _mapper.Map<InventoryStockDto>(stock);
            dto.RentedOut = rentedOut;
            dto.FreeCount = stock.TotalCount - rentedOut;
            return dto;
        }

        // Kimdə olduğu — bu malın adına uyğun açıq qaimələr (qaimə üzrə qruplanmış)
        public async Task<List<InventoryHolderDto>> GetHoldersAsync(int id)
        {
            var stock = await _repo.GetByIdAsync(id);
            if (stock == null) return new List<InventoryHolderDto>();

            var rented = await _repo.GetOpenRentedRowsAsync();
            return rented
                .Where(r => Matches(stock.Name, r))
                .GroupBy(r => new { r.InvoiceId, r.InvoiceNo, r.CustomerName, r.Phone, r.ReturnDate })
                .Select(g => new InventoryHolderDto
                {
                    InvoiceId = g.Key.InvoiceId,
                    InvoiceNo = g.Key.InvoiceNo,
                    CustomerName = g.Key.CustomerName,
                    Phone = g.Key.Phone,
                    ReturnDate = g.Key.ReturnDate,
                    Quantity = g.Sum(x => x.Remaining)
                })
                .OrderBy(h => h.ReturnDate)
                .ToList();
        }

        // İcarədə olan mallar — açıq qaimələrdən kateqoriya+ölçü üzrə aqreqasiya
        public async Task<List<RentedItemDto>> GetRentedItemsAsync()
        {
            var rented = await _repo.GetOpenRentedRowsAsync();
            return rented
                .GroupBy(r => new { r.Category, r.Size, r.Unit })
                .Select(g => new RentedItemDto
                {
                    Category = g.Key.Category,
                    Size = g.Key.Size,
                    Unit = g.Key.Unit,
                    TotalOut = g.Sum(x => x.Remaining),
                    InvoiceCount = g.Select(x => x.InvoiceId).Distinct().Count()
                })
                .OrderBy(x => x.Category).ThenBy(x => x.Size)
                .ToList();
        }

        public async Task<ServiceResult<InventoryStockDto>> CreateAsync(CreateInventoryStockDto dto)
        {
            if (_current.BranchId <= 0)
                return ServiceResult<InventoryStockDto>.Fail("Filial təyin olunmayıb. Yenidən daxil olun.");
            if (dto.TotalCount < 0)
                return ServiceResult<InventoryStockDto>.Fail("Say mənfi ola bilməz.");
            if (await _repo.NameExistsAsync(dto.Name, _current.BranchId))
                return ServiceResult<InventoryStockDto>.Fail("Bu adda anbar malı artıq var.");

            var stock = _mapper.Map<InventoryStock>(dto);
            stock.Name = dto.Name.Trim();
            stock.BranchId = _current.BranchId;

            await _repo.AddAsync(stock);
            await _repo.SaveChangesAsync();

            var created = _mapper.Map<InventoryStockDto>(stock);
            created.FreeCount = stock.TotalCount; // yeni malda icarədə olan = 0
            return ServiceResult<InventoryStockDto>.Ok(created);
        }

        public async Task<ServiceResult<InventoryStockDto>> UpdateAsync(UpdateInventoryStockDto dto)
        {
            var stock = await _repo.GetByIdAsync(dto.Id);
            if (stock == null)
                return ServiceResult<InventoryStockDto>.Fail("Anbar malı tapılmadı.");
            if (dto.TotalCount < 0)
                return ServiceResult<InventoryStockDto>.Fail("Say mənfi ola bilməz.");
            if (await _repo.NameExistsAsync(dto.Name, stock.BranchId, excludeId: dto.Id))
                return ServiceResult<InventoryStockDto>.Fail("Bu adda anbar malı artıq var.");

            stock.Name = dto.Name.Trim();
            stock.TotalCount = dto.TotalCount;

            _repo.Update(stock);
            await _repo.SaveChangesAsync();

            var rented = await _repo.GetOpenRentedRowsAsync();
            var rentedOut = rented.Where(r => Matches(stock.Name, r)).Sum(r => r.Remaining);
            var outDto = _mapper.Map<InventoryStockDto>(stock);
            outDto.RentedOut = rentedOut;
            outDto.FreeCount = stock.TotalCount - rentedOut;
            return ServiceResult<InventoryStockDto>.Ok(outDto);
        }

        public async Task<ServiceResult> DeleteAsync(int id)
        {
            var stock = await _repo.GetByIdAsync(id);
            if (stock == null)
                return ServiceResult.Fail("Anbar malı tapılmadı.");

            var rented = await _repo.GetOpenRentedRowsAsync();
            if (rented.Any(r => Matches(stock.Name, r)))
                return ServiceResult.Fail("Bu mal hazırda icarədədir, silinə bilməz.");

            _repo.Remove(stock);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        // Anbar adını qaimə malına uyğunlaşdırma (best-effort — FK yoxdur).
        // 1) ad == kateqoriya, 2) ad == "kateqoriya ölçü", 3) ad kateqoriyanı (və varsa ölçünü) əhatə edir.
        private static bool Matches(string stockName, RentedRow r)
        {
            const StringComparison ci = StringComparison.OrdinalIgnoreCase;
            var name = (stockName ?? string.Empty).Trim();
            var cat = (r.Category ?? string.Empty).Trim();
            var size = (r.Size ?? string.Empty).Trim();
            if (name.Length == 0 || cat.Length == 0) return false;

            if (string.Equals(name, cat, ci)) return true;

            var combined = (cat + " " + size).Trim();
            if (string.Equals(name, combined, ci)) return true;

            if (name.Contains(cat, ci) && (size.Length == 0 || name.Contains(size, ci)))
                return true;

            return false;
        }
    }
}
