using FluentValidation;
using Repository_management_backend.Models.DTOs.Ledger;

namespace Repository_management_backend.Validators
{
    public class LedgerTransactionDtoValidator : AbstractValidator<LedgerTransactionDto>
    {
        public LedgerTransactionDtoValidator()
        {
            RuleFor(x => x.CustomerId).GreaterThan(0).WithMessage("Müştəri seçilməlidir.");
            RuleFor(x => x.Amount).GreaterThan(0).WithMessage("Məbləğ sıfırdan böyük olmalıdır.");
            RuleFor(x => x.Note).MaximumLength(500);
        }
    }
}
