using FluentValidation;
using Repository_management_backend.Models.DTOs.Inventory;

namespace Repository_management_backend.Validators
{
    public class UpdateInventoryStockDtoValidator : AbstractValidator<UpdateInventoryStockDto>
    {
        public UpdateInventoryStockDtoValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("Mal ID-si düzgün deyil.");
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Mal adı boş ola bilməz.")
                .MaximumLength(150);
            RuleFor(x => x.TotalCount)
                .GreaterThanOrEqualTo(0).WithMessage("Say mənfi ola bilməz.");
        }
    }
}
