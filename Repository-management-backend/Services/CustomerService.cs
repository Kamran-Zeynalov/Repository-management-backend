using AutoMapper;
using Repository_management_backend.Models.DTOs.Customers;
using Repository_management_backend.Models.DTOs.Invoices;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;
using Repository_management_backend.Security;

namespace Repository_management_backend.Services
{
    public class CustomerService : ICustomerService
    {
        private readonly ICustomerRepository _repo;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _current;

        public CustomerService(ICustomerRepository repo, IMapper mapper, ICurrentUserService current)
        {
            _repo = repo;
            _mapper = mapper;
            _current = current;
        }

        public async Task<List<CustomerDto>> GetAllAsync()
        {
            var customers = await _repo.GetAllAsync();
            var balances = await _repo.GetBalancesAsync();
            var activeCounts = await _repo.GetActiveInvoiceCountsAsync();

            var list = _mapper.Map<List<CustomerDto>>(customers);
            foreach (var dto in list)
            {
                if (balances.TryGetValue(dto.Id, out var bal))
                {
                    dto.Debt = bal.Debt;
                    dto.Deposit = bal.Deposit;
                }
                dto.ActiveInvoiceCount = activeCounts.TryGetValue(dto.Id, out var c) ? c : 0;
            }
            return list;
        }

        public async Task<CustomerDto?> GetByIdAsync(int id)
        {
            var customer = await _repo.GetByIdAsync(id);
            if (customer == null) return null;

            var dto = _mapper.Map<CustomerDto>(customer);
            var bal = await _repo.GetBalanceAsync(id);
            dto.Debt = bal.Debt;
            dto.Deposit = bal.Deposit;
            var active = await _repo.GetInvoicesAsync(id, closed: false);
            dto.ActiveInvoiceCount = active.Count;
            return dto;
        }

        public async Task<CustomerProfileDto?> GetProfileAsync(int id)
        {
            var customer = await _repo.GetByIdAsync(id);
            if (customer == null) return null;

            var profile = _mapper.Map<CustomerProfileDto>(customer);

            var bal = await _repo.GetBalanceAsync(id);
            profile.Debt = bal.Debt;
            profile.Deposit = bal.Deposit;

            var invoices = await _repo.GetInvoicesAsync(id);
            profile.ActiveInvoices = _mapper.Map<List<InvoiceSummaryDto>>(invoices.Where(i => !i.IsClosed).ToList());
            profile.ClosedInvoices = _mapper.Map<List<InvoiceSummaryDto>>(invoices.Where(i => i.IsClosed).ToList());

            var ledger = await _repo.GetLedgerAsync(id);
            profile.Ledger = _mapper.Map<List<LedgerEntryDto>>(ledger);

            return profile;
        }

        public async Task<CustomerPrintDto?> GetInvoicesPrintAsync(int id)
        {
            var customer = await _repo.GetByIdAsync(id);
            if (customer == null) return null;

            var invoices = await _repo.GetInvoicesWithItemsAsync(id);
            return new CustomerPrintDto
            {
                CompanyName = "Kapital A.S. MMC",
                BranchName = invoices.FirstOrDefault()?.Branch?.Name,
                CustomerName = customer.Name,
                Phone = customer.Phone,
                PrintedAt = DateTime.Now,
                Invoices = _mapper.Map<List<InvoiceDetailDto>>(invoices)
            };
        }

        public async Task<List<InvoiceSummaryDto>> GetInvoicesAsync(int id, bool? closed)
        {
            var invoices = await _repo.GetInvoicesAsync(id, closed);
            return _mapper.Map<List<InvoiceSummaryDto>>(invoices);
        }

        public async Task<List<LedgerEntryDto>> GetLedgerAsync(int id)
        {
            var ledger = await _repo.GetLedgerAsync(id);
            return _mapper.Map<List<LedgerEntryDto>>(ledger);
        }

        public async Task<ServiceResult<CustomerDto>> CreateAsync(CreateCustomerDto dto)
        {
            if (_current.BranchId <= 0)
                return ServiceResult<CustomerDto>.Fail("Filial təyin olunmayıb. Yenidən daxil olun.");

            var customer = _mapper.Map<Customer>(dto);
            customer.Name = dto.Name.Trim();
            customer.BranchId = _current.BranchId;   // filial cari istifadəçidən
            customer.CreatedAt = DateTime.UtcNow;

            await _repo.AddAsync(customer);
            await _repo.SaveChangesAsync();

            return ServiceResult<CustomerDto>.Ok(_mapper.Map<CustomerDto>(customer));
        }

        public async Task<ServiceResult<CustomerDto>> UpdateAsync(UpdateCustomerDto dto)
        {
            var customer = await _repo.GetByIdAsync(dto.Id);
            if (customer == null)
                return ServiceResult<CustomerDto>.Fail("Müştəri tapılmadı.");

            customer.Name = dto.Name.Trim();
            customer.Phone = dto.Phone;
            customer.ExtraPhone = dto.ExtraPhone;
            customer.Address = dto.Address;
            customer.Note = dto.Note;
            customer.UpdatedAt = DateTime.UtcNow;

            _repo.Update(customer);
            await _repo.SaveChangesAsync();

            var dtoOut = _mapper.Map<CustomerDto>(customer);
            var bal = await _repo.GetBalanceAsync(customer.Id);
            dtoOut.Debt = bal.Debt;
            dtoOut.Deposit = bal.Deposit;
            return ServiceResult<CustomerDto>.Ok(dtoOut);
        }

        public async Task<ServiceResult> DeleteAsync(int id)
        {
            var customer = await _repo.GetByIdAsync(id);
            if (customer == null)
                return ServiceResult.Fail("Müştəri tapılmadı.");

            if (await _repo.HasInvoicesAsync(id))
                return ServiceResult.Fail("Bu müştərinin qaimələri var, silinə bilməz.");

            var bal = await _repo.GetBalanceAsync(id);
            if (bal.Debt != 0m || bal.Deposit != 0m)
                return ServiceResult.Fail("Borc və ya depozit qalığı olan müştəri silinə bilməz.");

            _repo.Remove(customer);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }
    }
}
