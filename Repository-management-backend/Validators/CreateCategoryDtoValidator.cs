using FluentValidation;
using Repository_management_backend.Models.DTOs.Categories;

namespace Repository_management_backend.Validators
{
    public class CreateCategoryDtoValidator : AbstractValidator<CreateCategoryDto>
    {
        public CreateCategoryDtoValidator()
        {
            RuleFor(x => x.Kind).IsInEnum().WithMessage("Kateqoriya növü düzgün deyil.");
            RuleFor(x => x.RentType).IsInEnum().WithMessage("İcarə tipi düzgün deyil.");
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Ad boş ola bilməz.")
                .MaximumLength(150);
            RuleFor(x => x.Price).GreaterThanOrEqualTo(0).WithMessage("Qiymət mənfi ola bilməz.");
            RuleFor(x => x.Unit).MaximumLength(30);
            RuleFor(x => x.Info).MaximumLength(300);
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
