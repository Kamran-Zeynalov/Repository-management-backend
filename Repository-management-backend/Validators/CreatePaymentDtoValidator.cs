using FluentValidation;
using Repository_management_backend.Models.DTOs.Payments;

namespace Repository_management_backend.Validators
{
    public class CreatePaymentDtoValidator : AbstractValidator<CreatePaymentDto>
    {
        public CreatePaymentDtoValidator()
        {
            RuleFor(x => x.InvoiceId).GreaterThan(0).WithMessage("Qaimə seçilməlidir.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Məbləğ sıfırdan böyük olmalıdır.");
            RuleFor(x => x.Direction).IsInEnum().WithMessage("Ödəniş istiqaməti düzgün deyil.");
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
