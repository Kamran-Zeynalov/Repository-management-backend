using AutoMapper;
using Repository_management_backend.Models.DTOs.Inventory;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class InventoryMappingProfile : Profile
    {
        public InventoryMappingProfile()
        {
            // RentedOut/FreeCount servisdə hesablanır
            CreateMap<InventoryStock, InventoryStockDto>()
                .ForMember(d => d.RentedOut, o => o.Ignore())
                .ForMember(d => d.FreeCount, o => o.Ignore());

            CreateMap<CreateInventoryStockDto, InventoryStock>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.BranchId, o => o.Ignore())
                .ForMember(d => d.Branch, o => o.Ignore());
        }
    }
}
