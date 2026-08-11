using AutoMapper;
using Repository_management_backend.Models.DTOs.Categories;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Repositories;
using Repository_management_backend.Security;

namespace Repository_management_backend.Services
{
    public class CategoryService : ICategoryService
    {
        private readonly ICategoryRepository _repo;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _current;

        public CategoryService(ICategoryRepository repo, IMapper mapper, ICurrentUserService current)
        {
            _repo = repo;
            _mapper = mapper;
            _current = current;
        }

        public async Task<List<CategoryDto>> GetAllAsync(CategoryKind? kind)
        {
            var categories = await _repo.GetAllAsync(kind);
            var counts = await _repo.GetChildrenCountsAsync();
            var list = _mapper.Map<List<CategoryDto>>(categories);
            foreach (var dto in list)
                dto.ChildrenCount = counts.TryGetValue(dto.Id, out var c) ? c : 0;
            return list;
        }

        public async Task<CategoryDto?> GetByIdAsync(int id)
        {
            var category = await _repo.GetByIdAsync(id);
            return category == null ? null : _mapper.Map<CategoryDto>(category);
        }

        public async Task<List<CategoryDto>> GetChildrenAsync(int parentId)
        {
            var children = await _repo.GetChildrenAsync(parentId);
            return _mapper.Map<List<CategoryDto>>(children);
        }

        public async Task<ServiceResult<CategoryDto>> CreateAsync(CreateCategoryDto dto)
        {
            if (_current.BranchId <= 0)
                return ServiceResult<CategoryDto>.Fail("Filial təyin olunmayıb. Yenidən daxil olun.");

            if (dto.Price < 0)
                return ServiceResult<CategoryDto>.Fail("Qiymət mənfi ola bilməz.");

            if (dto.ParentId.HasValue && !await _repo.ExistsAsync(dto.ParentId.Value))
                return ServiceResult<CategoryDto>.Fail("Ana kateqoriya tapılmadı.");

            var category = _mapper.Map<Category>(dto);
            category.Name = dto.Name.Trim();
            category.BranchId = _current.BranchId;

            await _repo.AddAsync(category);
            await _repo.SaveChangesAsync();

            var created = await _repo.GetByIdAsync(category.Id);
            return ServiceResult<CategoryDto>.Ok(_mapper.Map<CategoryDto>(created!));
        }

        public async Task<ServiceResult<CategoryDto>> UpdateAsync(UpdateCategoryDto dto)
        {
            var category = await _repo.GetByIdAsync(dto.Id);
            if (category == null)
                return ServiceResult<CategoryDto>.Fail("Kateqoriya tapılmadı.");

            if (dto.Price < 0)
                return ServiceResult<CategoryDto>.Fail("Qiymət mənfi ola bilməz.");

            if (dto.ParentId.HasValue)
            {
                if (dto.ParentId.Value == dto.Id)
                    return ServiceResult<CategoryDto>.Fail("Kateqoriya öz-özünə ana ola bilməz.");
                if (!await _repo.ExistsAsync(dto.ParentId.Value))
                    return ServiceResult<CategoryDto>.Fail("Ana kateqoriya tapılmadı.");
            }

            category.Kind = dto.Kind;
            category.Name = dto.Name.Trim();
            category.Info = dto.Info;
            category.Price = dto.Price;
            category.Unit = dto.Unit;
            category.Note = dto.Note;
            category.RentType = dto.RentType;
            category.ParentId = dto.ParentId;

            _repo.Update(category);
            await _repo.SaveChangesAsync();

            var updated = await _repo.GetByIdAsync(category.Id);
            return ServiceResult<CategoryDto>.Ok(_mapper.Map<CategoryDto>(updated!));
        }

        public async Task<ServiceResult> DeleteAsync(int id)
        {
            var category = await _repo.GetByIdAsync(id);
            if (category == null)
                return ServiceResult.Fail("Kateqoriya tapılmadı.");

            if (await _repo.HasChildrenAsync(id))
                return ServiceResult.Fail("Bu kateqoriyanın alt-kateqoriyaları var, əvvəlcə onları silin.");

            if (await _repo.IsUsedByInvoiceItemsAsync(id))
                return ServiceResult.Fail("Bu kateqoriya qaimələrdə istifadə olunub, silinə bilməz.");

            _repo.Remove(category);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }
    }
}
