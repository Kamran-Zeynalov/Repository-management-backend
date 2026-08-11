using AutoMapper;
using Repository_management_backend.Models.DTOs.Returns;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class ReturnService : IReturnService
    {
        private readonly IReturnRepository _repo;
        private readonly IMapper _mapper;

        public ReturnService(IReturnRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        public async Task<List<ReturnHistoryDto>> GetHistoryAsync(int invoiceId)
        {
            var history = await _repo.GetHistoryAsync(invoiceId);
            return _mapper.Map<List<ReturnHistoryDto>>(history);
        }

        // Qismən qaytarma — seçilmiş malların bir hissəsi geri alınır
        public async Task<ServiceResult<ReturnResultDto>> PartialReturnAsync(PartialReturnDto dto)
        {
            var invoice = await _repo.GetInvoiceTrackedAsync(dto.InvoiceId);
            if (invoice == null)
                return ServiceResult<ReturnResultDto>.Fail("Qaimə tapılmadı.");
            if (invoice.IsClosed)
                return ServiceResult<ReturnResultDto>.Fail("Bağlı qaimədə qaytarma edilə bilməz.");
            if (dto.Items == null || dto.Items.Count == 0)
                return ServiceResult<ReturnResultDto>.Fail("Qaytarılacaq mal seçilməyib.");
            if (dto.RefundAmount < 0)
                return ServiceResult<ReturnResultDto>.Fail("Qaytarılan depozit mənfi ola bilməz.");
            if (dto.RefundAmount > invoice.DepositAmount)
                return ServiceResult<ReturnResultDto>.Fail($"Qaytarılan depozit mövcud depozitdən ({invoice.DepositAmount}) çox ola bilməz.");

            foreach (var ret in dto.Items)
            {
                var item = invoice.Items.FirstOrDefault(i => i.Id == ret.InvoiceItemId);
                if (item == null)
                    return ServiceResult<ReturnResultDto>.Fail($"Mal tapılmadı (#{ret.InvoiceItemId}).");
                if (!item.IsReturnable)
                    return ServiceResult<ReturnResultDto>.Fail($"'{item.Category}' qaytarılan mal deyil.");
                if (ret.Quantity <= 0)
                    return ServiceResult<ReturnResultDto>.Fail("Qaytarılan say sıfırdan böyük olmalıdır.");
                if (item.ReturnedQuantity + ret.Quantity > item.Quantity)
                    return ServiceResult<ReturnResultDto>.Fail(
                        $"'{item.Category}' üçün qaytarılan say qalıqdan çoxdur (qalıq: {item.Quantity - item.ReturnedQuantity}).");
            }

            foreach (var ret in dto.Items)
            {
                var item = invoice.Items.First(i => i.Id == ret.InvoiceItemId);
                item.ReturnedQuantity += ret.Quantity;
            }

            return await ApplyReturnAsync(invoice, dto.RefundAmount, dto.Note, closeInvoice: false);
        }

        // Tam qaytarma — bütün qaytarılan mallar geri alınır, qaimə bağlanır
        public async Task<ServiceResult<ReturnResultDto>> FullReturnAsync(FullReturnDto dto)
        {
            var invoice = await _repo.GetInvoiceTrackedAsync(dto.InvoiceId);
            if (invoice == null)
                return ServiceResult<ReturnResultDto>.Fail("Qaimə tapılmadı.");
            if (invoice.IsClosed)
                return ServiceResult<ReturnResultDto>.Fail("Qaimə artıq bağlıdır.");
            if (dto.RefundAmount < 0)
                return ServiceResult<ReturnResultDto>.Fail("Qaytarılan depozit mənfi ola bilməz.");
            if (dto.RefundAmount > invoice.DepositAmount)
                return ServiceResult<ReturnResultDto>.Fail($"Qaytarılan depozit mövcud depozitdən ({invoice.DepositAmount}) çox ola bilməz.");

            foreach (var item in invoice.Items.Where(i => i.IsReturnable))
                item.ReturnedQuantity = item.Quantity;

            return await ApplyReturnAsync(invoice, dto.RefundAmount, dto.Note, closeInvoice: true);
        }

        private async Task<ServiceResult<ReturnResultDto>> ApplyReturnAsync(
            Invoice invoice, decimal refundAmount, string? note, bool closeInvoice)
        {
            // Depozit qaytarması
            if (refundAmount > 0)
                invoice.DepositAmount = Math.Max(0, invoice.DepositAmount - refundAmount);

            if (closeInvoice)
            {
                invoice.IsClosed = true;
                invoice.ClosedAt = DateTime.UtcNow;
            }
            invoice.UpdatedAt = DateTime.UtcNow;

            var entry = new ReturnHistory
            {
                InvoiceId = invoice.Id,
                Date = DateTime.UtcNow,
                RefundAmount = refundAmount,
                Note = note
            };
            await _repo.AddHistoryAsync(entry);

            if (refundAmount > 0)
            {
                await _repo.AddLedgerAsync(new CustomerLedgerEntry
                {
                    CustomerId = invoice.CustomerId,
                    InvoiceId = invoice.Id,
                    Date = entry.Date,
                    Type = $"Depozit qaytarıldı (qaimə #{invoice.InvoiceNo})",
                    Amount = refundAmount,
                    DebtChange = 0,
                    DepositChange = -refundAmount,
                    Source = "return"
                });
            }

            await _repo.SaveChangesAsync();

            bool fullyReturned = invoice.Items
                .Where(i => i.IsReturnable)
                .All(i => i.ReturnedQuantity >= i.Quantity);

            return ServiceResult<ReturnResultDto>.Ok(new ReturnResultDto
            {
                InvoiceId = invoice.Id,
                IsClosed = invoice.IsClosed,
                FullyReturned = fullyReturned,
                DepositAmount = invoice.DepositAmount,
                RemainingDebt = invoice.RemainingDebt,
                Entry = _mapper.Map<ReturnHistoryDto>(entry)
            });
        }
    }
}
