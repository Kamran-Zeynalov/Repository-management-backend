using FluentValidation;
using Repository_management_backend.Models.DTOs.Users;

namespace Repository_management_backend.Validators
{
    public class UpdateUserDtoValidator : AbstractValidator<UpdateUserDto>
    {
        public UpdateUserDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("İşçi ID-si düzgün deyil.");

            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Ad boş ola bilməz.")
                .MaximumLength(100);

            RuleFor(x => x.Role)
                .IsInEnum().WithMessage("Rol düzgün deyil.");

            RuleFor(x => x.BranchId)
                .GreaterThan(0).WithMessage("Filial seçilməlidir.");

            RuleFor(x => x.Phone)
                .MaximumLength(30);
        }
    }
}
