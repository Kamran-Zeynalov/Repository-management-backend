using FluentValidation;
using Repository_management_backend.Models.DTOs.Returns;

namespace Repository_management_backend.Validators
{
    public class FullReturnDtoValidator : AbstractValidator<FullReturnDto>
    {
        public FullReturnDtoValidator()
        {
            RuleFor(x => x.RefundAmount).GreaterThanOrEqualTo(0).WithMessage("Qaytarılan depozit mənfi ola bilməz.");
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
