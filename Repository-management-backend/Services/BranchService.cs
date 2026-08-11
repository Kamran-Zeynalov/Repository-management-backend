using Repository_management_backend.Models.DTOs.Branches;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class BranchService : IBranchService
    {
        private readonly IBranchRepository _repo;
        public BranchService(IBranchRepository repo) => _repo = repo;

        public async Task<List<BranchDto>> GetAllAsync()
        {
            var branches = await _repo.GetAllAsync();
            var list = new List<BranchDto>();
            foreach (var b in branches)
                list.Add(await ToDtoAsync(b));
            return list;
        }

        public async Task<BranchDto?> GetByIdAsync(int id)
        {
            var b = await _repo.GetByIdAsync(id);
            return b == null ? null : await ToDtoAsync(b);
        }

        public async Task<ServiceResult<BranchDto>> CreateAsync(CreateBranchDto dto)
        {
            var code = (dto.Code ?? "").Trim().ToLower();
            var name = (dto.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(code))
                return ServiceResult<BranchDto>.Fail("Filial kodu boş ola bilməz.");
            if (string.IsNullOrWhiteSpace(name))
                return ServiceResult<BranchDto>.Fail("Filial adı boş ola bilməz.");
            if (await _repo.CodeExistsAsync(code))
                return ServiceResult<BranchDto>.Fail($"'{code}' kodu artıq mövcuddur.");

            var branch = new Branch { Code = code, Name = name, IsActive = dto.IsActive };
            await _repo.AddAsync(branch);
            await _repo.SaveChangesAsync();
            return ServiceResult<BranchDto>.Ok(await ToDtoAsync(branch));
        }

        public async Task<ServiceResult<BranchDto>> UpdateAsync(UpdateBranchDto dto)
        {
            var branch = await _repo.GetByIdAsync(dto.Id);
            if (branch == null)
                return ServiceResult<BranchDto>.Fail("Filial tapılmadı.");

            var code = (dto.Code ?? "").Trim().ToLower();
            var name = (dto.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(code))
                return ServiceResult<BranchDto>.Fail("Filial kodu boş ola bilməz.");
            if (string.IsNullOrWhiteSpace(name))
                return ServiceResult<BranchDto>.Fail("Filial adı boş ola bilməz.");
            if (await _repo.CodeExistsAsync(code, branch.Id))
                return ServiceResult<BranchDto>.Fail($"'{code}' kodu artıq mövcuddur.");

            branch.Code = code;
            branch.Name = name;
            branch.IsActive = dto.IsActive;
            _repo.Update(branch);
            await _repo.SaveChangesAsync();
            return ServiceResult<BranchDto>.Ok(await ToDtoAsync(branch));
        }

        public async Task<ServiceResult> DeleteAsync(int id)
        {
            var branch = await _repo.GetByIdAsync(id);
            if (branch == null)
                return ServiceResult.Fail("Filial tapılmadı.");

            var users = await _repo.CountUsersAsync(id);
            var customers = await _repo.CountCustomersAsync(id);
            var invoices = await _repo.CountInvoicesAsync(id);
            var categories = await _repo.CountCategoriesAsync(id);
            var inventory = await _repo.CountInventoryAsync(id);
            if (users > 0 || customers > 0 || invoices > 0 || categories > 0 || inventory > 0)
                return ServiceResult.Fail($"Bu filialda məlumat var (işçi: {users}, müştəri: {customers}, qaimə: {invoices}, kateqoriya: {categories}, anbar: {inventory}). Əvvəlcə həmin məlumatları silin və ya başqa filiala köçürün.");

            _repo.Remove(branch);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        public async Task<ServiceResult> ForceDeleteAsync(int id)
        {
            var branch = await _repo.GetByIdAsync(id);
            if (branch == null)
                return ServiceResult.Fail("Filial tapılmadı.");

            await _repo.ForceDeleteAsync(id);
            return ServiceResult.Ok();
        }

        private async Task<BranchDto> ToDtoAsync(Branch b) => new BranchDto
        {
            Id = b.Id,
            Code = b.Code,
            Name = b.Name,
            IsActive = b.IsActive,
            UserCount = await _repo.CountUsersAsync(b.Id),
            CustomerCount = await _repo.CountCustomersAsync(b.Id),
            InvoiceCount = await _repo.CountInvoicesAsync(b.Id)
        };
    }
}
