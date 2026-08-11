using AutoMapper;
using Repository_management_backend.Models.DTOs.Categories;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class CategoryMappingProfile : Profile
    {
        public CategoryMappingProfile()
        {
            CreateMap<Category, CategoryDto>()
                .ForMember(d => d.Kind, o => o.MapFrom(s => s.Kind.ToString()))
                .ForMember(d => d.RentType, o => o.MapFrom(s => s.RentType.ToString()))
                .ForMember(d => d.ParentName, o => o.MapFrom(s => s.Parent != null ? s.Parent.Name : null))
                .ForMember(d => d.ChildrenCount, o => o.Ignore());

            CreateMap<CreateCategoryDto, Category>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.BranchId, o => o.Ignore())
                .ForMember(d => d.Branch, o => o.Ignore())
                .ForMember(d => d.Parent, o => o.Ignore())
                .ForMember(d => d.Children, o => o.Ignore());
        }
    }
}
