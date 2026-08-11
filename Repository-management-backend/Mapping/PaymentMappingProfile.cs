using AutoMapper;
using Repository_management_backend.Models.DTOs.Payments;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class PaymentMappingProfile : Profile
    {
        public PaymentMappingProfile()
        {
            CreateMap<Payment, PaymentDto>()
                .ForMember(d => d.Direction, o => o.MapFrom(s => s.Direction.ToString()))
                .ForMember(d => d.InvoiceNo, o => o.MapFrom(s => s.Invoice != null ? s.Invoice.InvoiceNo : null));
        }
    }
}
