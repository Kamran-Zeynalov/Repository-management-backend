using FluentValidation;
using Repository_management_backend.Models.DTOs.Returns;

namespace Repository_management_backend.Validators
{
    public class PartialReturnDtoValidator : AbstractValidator<PartialReturnDto>
    {
        public PartialReturnDtoValidator()
        {
            RuleFor(x => x.Items).NotEmpty().WithMessage("Qaytarılacaq mal seçilməlidir.");
            RuleForEach(x => x.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.InvoiceItemId).GreaterThan(0).WithMessage("Mal ID-si düzgün deyil.");
                item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Qaytarılan say sıfırdan böyük olmalıdır.");
            });
            RuleFor(x => x.RefundAmount).GreaterThanOrEqualTo(0).WithMessage("Qaytarılan depozit mənfi ola bilməz.");
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
