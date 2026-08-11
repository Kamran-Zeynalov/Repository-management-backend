using AutoMapper;
using Repository_management_backend.Models.DTOs.Payments;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class PaymentService : IPaymentService
    {
        private readonly IPaymentRepository _repo;
        private readonly IMapper _mapper;

        public PaymentService(IPaymentRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        public async Task<List<PaymentDto>> GetByInvoiceAsync(int invoiceId)
        {
            var payments = await _repo.GetByInvoiceAsync(invoiceId);
            return _mapper.Map<List<PaymentDto>>(payments);
        }

        public async Task<List<PaymentDto>> GetByCustomerAsync(int customerId)
        {
            var payments = await _repo.GetByCustomerAsync(customerId);
            return _mapper.Map<List<PaymentDto>>(payments);
        }

        public async Task<InvoicePaymentSummaryDto?> GetInvoiceSummaryAsync(int invoiceId)
        {
            var invoice = await _repo.GetInvoiceAsync(invoiceId);
            if (invoice == null) return null;

            var payments = await _repo.GetByInvoiceAsync(invoiceId);

            return new InvoicePaymentSummaryDto
            {
                InvoiceId = invoice.Id,
                InvoiceNo = invoice.InvoiceNo,
                TotalAmount = invoice.TotalAmount,
                PaidAmount = invoice.PaidAmount,
                RemainingDebt = invoice.RemainingDebt,
                DepositAmount = invoice.DepositAmount,
                IsClosed = invoice.IsClosed,
                Payments = _mapper.Map<List<PaymentDto>>(payments)
            };
        }

        public async Task<ServiceResult<PaymentDto>> AddPaymentAsync(CreatePaymentDto dto)
        {
            if (dto.Amount <= 0)
                return ServiceResult<PaymentDto>.Fail("Məbləğ sıfırdan böyük olmalıdır.");

            var invoice = await _repo.GetInvoiceTrackedAsync(dto.InvoiceId);
            if (invoice == null)
                return ServiceResult<PaymentDto>.Fail("Qaimə tapılmadı.");

            var oldRemaining = invoice.RemainingDebt;

            // PaidAmount = Σ(In) − Σ(Out)
            if (dto.Direction == PaymentDirection.In)
                invoice.PaidAmount += dto.Amount;
            else
                invoice.PaidAmount = Math.Max(0, invoice.PaidAmount - dto.Amount);

            invoice.RemainingDebt = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);
            invoice.UpdatedAt = DateTime.UtcNow;

            var delta = invoice.RemainingDebt - oldRemaining;   // borcdakı dəyişiklik (ledger üçün)

            var payment = new Payment
            {
                InvoiceId = invoice.Id,
                Amount = dto.Amount,
                Direction = dto.Direction,
                Date = dto.Date ?? DateTime.UtcNow,
                Note = dto.Note
            };
            await _repo.AddAsync(payment);

            await _repo.AddLedgerAsync(new CustomerLedgerEntry
            {
                CustomerId = invoice.CustomerId,
                InvoiceId = invoice.Id,
                Date = payment.Date,
                Type = dto.Direction == PaymentDirection.In
                    ? $"Borc ödədi (qaimə #{invoice.InvoiceNo})"
                    : $"Ödəniş düzəlişi (qaimə #{invoice.InvoiceNo})",
                Amount = dto.Amount,
                DebtChange = delta,
                DepositChange = 0,
                Source = "payment"
            });

            await _repo.SaveChangesAsync();

            var outDto = _mapper.Map<PaymentDto>(payment);
            outDto.InvoiceNo = invoice.InvoiceNo;
            return ServiceResult<PaymentDto>.Ok(outDto);
        }
    }
}
