using AutoMapper;
using Repository_management_backend.Models.DTOs.Users;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Repositories;
using Repository_management_backend.Security;

namespace Repository_management_backend.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repo;
        private readonly IMapper _mapper;
        private readonly IPasswordHasher _hasher;

        public UserService(IUserRepository repo, IMapper mapper, IPasswordHasher hasher)
        {
            _repo = repo;
            _mapper = mapper;
            _hasher = hasher;
        }

        public async Task<List<UserDto>> GetAllAsync()
        {
            var users = await _repo.GetAllAsync();
            var list = _mapper.Map<List<UserDto>>(users);
            foreach (var u in list) u.IsOnline = ComputeOnline(u.LastLoginAt, u.LastLogoutAt);
            return list;
        }

        public async Task<UserDto?> GetByIdAsync(int id)
        {
            var user = await _repo.GetByIdAsync(id);
            if (user == null) return null;
            var dto = _mapper.Map<UserDto>(user);
            dto.IsOnline = ComputeOnline(dto.LastLoginAt, dto.LastLogoutAt);
            return dto;
        }

        // Online = son giriş var, çıxışdan sonradır və cookie sessiya pəncərəsindədir (8 saat)
        private static bool ComputeOnline(DateTime? login, DateTime? logout)
        {
            if (login == null) return false;
            if (logout != null && logout >= login) return false;
            return login.Value >= DateTime.UtcNow.AddHours(-8);
        }

        public async Task<ServiceResult<UserDto>> CreateAsync(CreateUserDto dto)
        {
            if (await _repo.UsernameExistsAsync(dto.Username))
                return ServiceResult<UserDto>.Fail("Bu istifadəçi adı artıq mövcuddur.");

            if (!await _repo.BranchExistsAsync(dto.BranchId))
                return ServiceResult<UserDto>.Fail("Seçilmiş filial mövcud deyil.");

            var user = _mapper.Map<User>(dto);
            user.Username = dto.Username.Trim();
            user.PasswordHash = _hasher.Hash(dto.Password.Trim());
            user.CreatedAt = DateTime.UtcNow;

            await _repo.AddAsync(user);
            await _repo.SaveChangesAsync();

            var created = await _repo.GetByIdAsync(user.Id);
            return ServiceResult<UserDto>.Ok(_mapper.Map<UserDto>(created!));
        }

        public async Task<ServiceResult<UserDto>> UpdateAsync(UpdateUserDto dto)
        {
            var user = await _repo.GetByIdAsync(dto.Id);
            if (user == null)
                return ServiceResult<UserDto>.Fail("İşçi tapılmadı.");

            if (!await _repo.BranchExistsAsync(dto.BranchId))
                return ServiceResult<UserDto>.Fail("Seçilmiş filial mövcud deyil.");

            // Son aktiv admini admin olmaqdan / aktivlikdən çıxarmağa qoyma
            bool losingAdmin = user.Role == UserRole.Admin &&
                               (dto.Role != UserRole.Admin || !dto.IsActive);
            if (losingAdmin && await _repo.CountAdminsAsync(excludeId: user.Id) == 0)
                return ServiceResult<UserDto>.Fail("Sistemdə ən azı bir aktiv admin qalmalıdır.");

            user.Name = dto.Name.Trim();
            user.Role = dto.Role;
            user.Phone = dto.Phone;
            user.BranchId = dto.BranchId;
            user.IsActive = dto.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            _repo.Update(user);
            await _repo.SaveChangesAsync();

            var updated = await _repo.GetByIdAsync(user.Id);
            return ServiceResult<UserDto>.Ok(_mapper.Map<UserDto>(updated!));
        }

        public async Task<ServiceResult> ChangePasswordAsync(ChangePasswordDto dto)
        {
            var user = await _repo.GetByIdAsync(dto.Id);
            if (user == null)
                return ServiceResult.Fail("İşçi tapılmadı.");

            user.PasswordHash = _hasher.Hash(dto.NewPassword.Trim());
            user.UpdatedAt = DateTime.UtcNow;

            _repo.Update(user);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        public async Task<ServiceResult> SetActiveAsync(int id, bool isActive)
        {
            var user = await _repo.GetByIdAsync(id);
            if (user == null)
                return ServiceResult.Fail("İşçi tapılmadı.");

            if (!isActive && user.Role == UserRole.Admin &&
                await _repo.CountAdminsAsync(excludeId: user.Id) == 0)
                return ServiceResult.Fail("Sistemdə ən azı bir aktiv admin qalmalıdır.");

            user.IsActive = isActive;
            user.UpdatedAt = DateTime.UtcNow;

            _repo.Update(user);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        public async Task<ServiceResult> DeleteAsync(int id)
        {
            var user = await _repo.GetByIdAsync(id);
            if (user == null)
                return ServiceResult.Fail("İşçi tapılmadı.");

            if (user.Role == UserRole.Admin && await _repo.CountAdminsAsync(excludeId: user.Id) == 0)
                return ServiceResult.Fail("Son aktiv admini silmək olmaz.");

            _repo.Remove(user);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }
    }
}
