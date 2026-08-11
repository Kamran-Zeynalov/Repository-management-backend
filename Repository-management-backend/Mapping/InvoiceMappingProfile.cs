using AutoMapper;
using Repository_management_backend.Models.DTOs.Invoices;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class InvoiceMappingProfile : Profile
    {
        public InvoiceMappingProfile()
        {
            CreateMap<InvoiceItem, InvoiceItemDto>();

            CreateMap<CreateInvoiceItemDto, InvoiceItem>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.InvoiceId, o => o.Ignore())
                .ForMember(d => d.Invoice, o => o.Ignore())
                .ForMember(d => d.ReturnedQuantity, o => o.Ignore());

            CreateMap<Invoice, InvoiceListItemDto>()
                .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.CustomerNameSnapshot))
                .ForMember(d => d.Status, o => o.Ignore())
                .ForMember(d => d.DaysUntilReturn, o => o.Ignore())
                .ForMember(d => d.ItemCount, o => o.Ignore());

            CreateMap<Invoice, InvoiceDetailDto>()
                .ForMember(d => d.CustomerName, o => o.MapFrom(s => s.CustomerNameSnapshot))
                .ForMember(d => d.Status, o => o.Ignore())
                .ForMember(d => d.DaysUntilReturn, o => o.Ignore());
        }
    }
}
