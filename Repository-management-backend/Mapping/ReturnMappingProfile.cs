using AutoMapper;
using Repository_management_backend.Models.DTOs.Returns;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class ReturnMappingProfile : Profile
    {
        public ReturnMappingProfile()
        {
            CreateMap<ReturnHistory, ReturnHistoryDto>();
        }
    }
}
