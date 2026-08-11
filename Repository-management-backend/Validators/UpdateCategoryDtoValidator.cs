using FluentValidation;
using Repository_management_backend.Models.DTOs.Categories;

namespace Repository_management_backend.Validators
{
    public class UpdateCategoryDtoValidator : AbstractValidator<UpdateCategoryDto>
    {
        public UpdateCategoryDtoValidator()
        {
            RuleFor(x => x.Id).GreaterThan(0).WithMessage("Kateqoriya ID-si düzgün deyil.");
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
