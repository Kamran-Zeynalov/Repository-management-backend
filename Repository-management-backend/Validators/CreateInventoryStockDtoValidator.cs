using FluentValidation;
using Repository_management_backend.Models.DTOs.Inventory;

namespace Repository_management_backend.Validators
{
    public class CreateInventoryStockDtoValidator : AbstractValidator<CreateInventoryStockDto>
    {
        public CreateInventoryStockDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Mal adı boş ola bilməz.")
                .MaximumLength(150);
            RuleFor(x => x.TotalCount)
                .GreaterThanOrEqualTo(0).WithMessage("Say mənfi ola bilməz.");
        }
    }
}
