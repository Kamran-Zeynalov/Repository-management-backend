using AutoMapper;
using Repository_management_backend.Models.DTOs.Customers;
using Repository_management_backend.Models.DTOs.Ledger;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class CustomerLedgerService : ICustomerLedgerService
    {
        private readonly ICustomerLedgerRepository _repo;
        private readonly IMapper _mapper;

        public CustomerLedgerService(ICustomerLedgerRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        public async Task<CustomerLedgerDto?> GetLedgerAsync(int customerId)
        {
            var customer = await _repo.GetCustomerAsync(customerId);
            if (customer == null) return null;
            return await BuildLedgerDtoAsync(customer);
        }

        public Task<ServiceResult<CustomerLedgerDto>> AddDebtAsync(LedgerTransactionDto dto) =>
            ApplyAsync(dto, debtChange: dto.Amount, depositChange: 0, type: "Borc əlavə olundu");

        public Task<ServiceResult<CustomerLedgerDto>> PayDebtAsync(LedgerTransactionDto dto) =>
            ApplyAsync(dto, debtChange: -dto.Amount, depositChange: 0, type: "Borc ödədi", guard: GuardKind.Debt);

        public Task<ServiceResult<CustomerLedgerDto>> AddDepositAsync(LedgerTransactionDto dto) =>
            ApplyAsync(dto, debtChange: 0, depositChange: dto.Amount, type: "Depozit əlavə olundu");

        public Task<ServiceResult<CustomerLedgerDto>> WithdrawDepositAsync(LedgerTransactionDto dto) =>
            ApplyAsync(dto, debtChange: 0, depositChange: -dto.Amount, type: "Depozit çıxarıldı", guard: GuardKind.Deposit);

        private enum GuardKind { None, Debt, Deposit }

        private async Task<ServiceResult<CustomerLedgerDto>> ApplyAsync(
            LedgerTransactionDto dto, decimal debtChange, decimal depositChange, string type, GuardKind guard = GuardKind.None)
        {
            if (dto.Amount <= 0)
                return ServiceResult<CustomerLedgerDto>.Fail("Məbləğ sıfırdan böyük olmalıdır.");

            var customer = await _repo.GetCustomerAsync(dto.CustomerId);
            if (customer == null)
                return ServiceResult<CustomerLedgerDto>.Fail("Müştəri tapılmadı.");

            var balance = await _repo.GetBalanceAsync(dto.CustomerId);

            if (guard == GuardKind.Debt && dto.Amount > balance.Debt)
                return ServiceResult<CustomerLedgerDto>.Fail($"Ödəniş borcdan ({balance.Debt}) çox ola bilməz.");
            if (guard == GuardKind.Deposit && dto.Amount > balance.Deposit)
                return ServiceResult<CustomerLedgerDto>.Fail($"Çıxarış depozitdən ({balance.Deposit}) çox ola bilməz.");

            await _repo.AddAsync(new CustomerLedgerEntry
            {
                CustomerId = customer.Id,
                InvoiceId = null,
                Date = dto.Date ?? DateTime.UtcNow,
                Type = type,
                Amount = dto.Amount,
                DebtChange = debtChange,
                DepositChange = depositChange,
                Note = dto.Note,
                Source = "manual"
            });
            await _repo.SaveChangesAsync();

            return ServiceResult<CustomerLedgerDto>.Ok(await BuildLedgerDtoAsync(customer));
        }

        private async Task<CustomerLedgerDto> BuildLedgerDtoAsync(Customer customer)
        {
            var balance = await _repo.GetBalanceAsync(customer.Id);
            var entries = await _repo.GetEntriesAsync(customer.Id);
            return new CustomerLedgerDto
            {
                CustomerId = customer.Id,
                CustomerName = customer.Name,
                Debt = balance.Debt,
                Deposit = balance.Deposit,
                Entries = _mapper.Map<List<LedgerEntryDto>>(entries)
            };
        }
    }
}
