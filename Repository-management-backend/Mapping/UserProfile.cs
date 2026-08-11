using AutoMapper;
using Repository_management_backend.Models.DTOs.Users;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class UserProfile : Profile
    {
        public UserProfile()
        {
            // Entity -> DTO (şifrə hash-i göndərilmir)
            CreateMap<User, UserDto>()
                .ForMember(d => d.Role, o => o.MapFrom(s => s.Role.ToString()))
                .ForMember(d => d.BranchName, o => o.MapFrom(s => s.Branch != null ? s.Branch.Name : null));

            // CreateDto -> Entity (PasswordHash servisdə hash olunur)
            CreateMap<CreateUserDto, User>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.PasswordHash, o => o.Ignore())
                .ForMember(d => d.CreatedAt, o => o.Ignore())
                .ForMember(d => d.UpdatedAt, o => o.Ignore())
                .ForMember(d => d.Branch, o => o.Ignore());
        }
    }
}
