using FluentValidation;
using Repository_management_backend.Models.DTOs.Invoices;

namespace Repository_management_backend.Validators
{
    public class UpdateInvoiceDtoValidator : AbstractValidator<UpdateInvoiceDto>
    {
        public UpdateInvoiceDtoValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("Qaimə ID-si düzgün deyil.");
            RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage("Müştəri seçilməlidir.");
            RuleFor(x => x.InvoiceDate).NotEmpty().WithMessage("Qaimə tarixi tələb olunur.");
            RuleFor(x => x.ReturnDate)
                .GreaterThanOrEqualTo(x => x.InvoiceDate)
                .WithMessage("Qaytarma tarixi qaimə tarixindən əvvəl ola bilməz.");
            RuleFor(x => x.DepositAmount).GreaterThanOrEqualTo(0).WithMessage("Depozit mənfi ola bilməz.");
            RuleFor(x => x.PaidAmount).GreaterThanOrEqualTo(0).WithMessage("Ödəniş mənfi ola bilməz.");
            RuleFor(x => x.Items).NotEmpty().WithMessage("Ən azı bir mal əlavə edin.");
            RuleForEach(x => x.Items).SetValidator(new CreateInvoiceItemDtoValidator());
        }
    }
}
