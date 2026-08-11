using FluentValidation;
using Repository_management_backend.Models.DTOs.Customers;

namespace Repository_management_backend.Validators
{
    public class UpdateCustomerDtoValidator : AbstractValidator<UpdateCustomerDto>
    {
        public UpdateCustomerDtoValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("Müştəri ID-si düzgün deyil.");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Müştəri adı boş ola bilməz.")
                .MaximumLength(150);

            RuleFor(x => x.Phone).MaximumLength(30);
            RuleFor(x => x.ExtraPhone).MaximumLength(30);
            RuleFor(x => x.Address).MaximumLength(300);
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
