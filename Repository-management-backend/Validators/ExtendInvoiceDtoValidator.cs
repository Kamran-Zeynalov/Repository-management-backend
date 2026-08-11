using FluentValidation;
using Repository_management_backend.Models.DTOs.Extensions;

namespace Repository_management_backend.Validators
{
    public class ExtendInvoiceDtoValidator : AbstractValidator<ExtendInvoiceDto>
    {
        public ExtendInvoiceDtoValidator()
        {
            RuleFor(x => x.NewReturnDate).NotEmpty().WithMessage("Yeni qaytarma tarixi tələb olunur.");
            RuleFor(x => x.AddedAmount).GreaterThanOrEqualTo(0).WithMessage("Əlavə məbləğ mənfi ola bilməz.");
            RuleFor(x => x.PaidNow).GreaterThanOrEqualTo(0).WithMessage("Ödəniş mənfi ola bilməz.");
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
