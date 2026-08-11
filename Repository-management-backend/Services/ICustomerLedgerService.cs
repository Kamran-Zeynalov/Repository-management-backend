using Repository_management_backend.Models.DTOs.Ledger;

namespace Repository_management_backend.Services
{
    public interface ICustomerLedgerService
    {
        Task<CustomerLedgerDto?> GetLedgerAsync(int customerId);
        Task<ServiceResult<CustomerLedgerDto>> AddDebtAsync(LedgerTransactionDto dto);
        Task<ServiceResult<CustomerLedgerDto>> PayDebtAsync(LedgerTransactionDto dto);
        Task<ServiceResult<CustomerLedgerDto>> AddDepositAsync(LedgerTransactionDto dto);
        Task<ServiceResult<CustomerLedgerDto>> WithdrawDepositAsync(LedgerTransactionDto dto);
    }
}
