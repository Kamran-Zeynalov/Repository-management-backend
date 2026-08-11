using FluentValidation;
using Repository_management_backend.Models.DTOs.Invoices;

namespace Repository_management_backend.Validators
{
    public class CreateInvoiceItemDtoValidator : AbstractValidator<CreateInvoiceItemDto>
    {
        public CreateInvoiceItemDtoValidator()
        {
            RuleFor(x => x.Category)
                .NotEmpty().WithMessage("Mal kateqoriyası boş ola bilməz.")
                .MaximumLength(150);
            RuleFor(x => x.Quantity).GreaterThanOrEqualTo(0).WithMessage("Say mənfi ola bilməz.");
            RuleFor(x => x.CustomPrice).GreaterThanOrEqualTo(0).WithMessage("Qiymət mənfi ola bilməz.");
            RuleFor(x => x.Subtotal).GreaterThanOrEqualTo(0).WithMessage("Cəm mənfi ola bilməz.");
        }
    }
}
