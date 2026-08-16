using FluentValidation;
using Repository_management_backend.Models.DTOs.Inventory;

namespace Repository_management_backend.Validators
{
    public class SellInventoryDtoValidator : AbstractValidator<SellInventoryDto>
    {
        public SellInventoryDtoValidator()
        {
            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Satılan say sıfırdan böyük olmalıdır.");
            RuleFor(x => x.UnitPrice)
                .GreaterThanOrEqualTo(0).WithMessage("Qiymət mənfi ola bilməz.");
            RuleFor(x => x.CustomerName).MaximumLength(200);
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
