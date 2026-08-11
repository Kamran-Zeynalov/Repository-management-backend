using FluentValidation;
using Repository_management_backend.Models.DTOs.Users;

namespace Repository_management_backend.Validators
{
    public class CreateUserDtoValidator : AbstractValidator<CreateUserDto>
    {
        public CreateUserDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Ad boş ola bilməz.")
                .MaximumLength(100);

            RuleFor(x => x.Username)
                .NotEmpty().WithMessage("İstifadəçi adı boş ola bilməz.")
                .MinimumLength(3).WithMessage("İstifadəçi adı ən azı 3 simvol olmalıdır.")
                .MaximumLength(50)
                .Matches("^[a-zA-Z0-9_.]+$").WithMessage("İstifadəçi adı yalnız hərf, rəqəm, '_' və '.' ola bilər.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Şifrə boş ola bilməz.")
                .MinimumLength(6).WithMessage("Şifrə ən azı 6 simvol olmalıdır.");

            RuleFor(x => x.Role)
                .IsInEnum().WithMessage("Rol düzgün deyil.");

            RuleFor(x => x.BranchId)
                .GreaterThan(0).WithMessage("Filial seçilməlidir.");

            RuleFor(x => x.Phone)
                .MaximumLength(30);
        }
    }
}
