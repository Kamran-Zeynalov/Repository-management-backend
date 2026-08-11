using AutoMapper;
using Repository_management_backend.Models.DTOs.Customers;
using Repository_management_backend.Models.Entities;

namespace Repository_management_backend.Mapping
{
    public class CustomerProfile : Profile
    {
        public CustomerProfile()
        {
            // Borc/Deposit/ActiveInvoiceCount servisdə hesablanır
            CreateMap<Customer, CustomerDto>();
            CreateMap<Customer, CustomerProfileDto>();

            CreateMap<CreateCustomerDto, Customer>()
                .ForMember(d => d.Id, o => o.Ignore())
                .ForMember(d => d.CreatedAt, o => o.Ignore())
                .ForMember(d => d.UpdatedAt, o => o.Ignore())
                .ForMember(d => d.BranchId, o => o.Ignore())
                .ForMember(d => d.Branch, o => o.Ignore())
                .ForMember(d => d.Invoices, o => o.Ignore())
                .ForMember(d => d.LedgerEntries, o => o.Ignore());

            CreateMap<Invoice, InvoiceSummaryDto>();

            CreateMap<CustomerLedgerEntry, LedgerEntryDto>()
                .ForMember(d => d.InvoiceNo, o => o.MapFrom(s => s.Invoice != null ? s.Invoice.InvoiceNo : null));
        }
    }
}
