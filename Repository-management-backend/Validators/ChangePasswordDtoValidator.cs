using FluentValidation;
using Repository_management_backend.Models.DTOs.Users;

namespace Repository_management_backend.Validators
{
    public class ChangePasswordDtoValidator : AbstractValidator<ChangePasswordDto>
    {
        public ChangePasswordDtoValidator()
        {
            RuleFor(x => x.Id)
                .GreaterThan(0).WithMessage("İşçi ID-si düzgün deyil.");

            RuleFor(x => x.NewPassword)
                .NotEmpty().WithMessage("Yeni şifrə boş ola bilməz.")
                .MinimumLength(6).WithMessage("Şifrə ən azı 6 simvol olmalıdır.");
        }
    }
}
