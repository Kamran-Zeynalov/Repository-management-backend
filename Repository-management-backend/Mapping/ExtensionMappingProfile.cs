using AutoMapper;
using Repository_management_backend.Models.DTOs.Extensions;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class ExtensionMappingProfile : Profile
    {
        public ExtensionMappingProfile()
        {
            CreateMap<ExtensionHistory, ExtensionHistoryDto>();
        }
    }
}
