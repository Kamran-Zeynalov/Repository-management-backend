using AutoMapper;
using Repository_management_backend.Models.DTOs.Extensions;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class ExtensionService : IExtensionService
    {
        private readonly IExtensionRepository _repo;
        private readonly IMapper _mapper;

        public ExtensionService(IExtensionRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        public async Task<List<ExtensionHistoryDto>> GetHistoryAsync(int invoiceId)
        {
            var history = await _repo.GetHistoryAsync(invoiceId);
            return _mapper.Map<List<ExtensionHistoryDto>>(history);
        }

        // Təkrar hesablama önizləməsi: təkrarlanan malların cəmi × faktor × dövr sayı.
        public async Task<ExtensionPreviewDto?> PreviewAsync(int invoiceId, int periods, string? mode)
        {
            var invoice = await _repo.GetInvoiceWithItemsAsync(invoiceId);
            if (invoice == null) return null;
            if (periods < 1) periods = 1;

            var m = (mode ?? "month").Trim().ToLower();
            var recurringBase = invoice.Items
                .Where(i => i.IsRecurring && !i.IsFixedFee)
                .Sum(i => i.Subtotal);

            var factor = m == "half" ? 0.5m : 1m;
            var suggested = recurringBase * factor * periods;
            var newReturn = m == "half"
                ? invoice.ReturnDate.AddDays(15 * periods)
                : invoice.ReturnDate.AddMonths(periods);

            return new ExtensionPreviewDto
            {
                InvoiceId = invoice.Id,
                Mode = m,
                Periods = periods,
                RecurringBase = recurringBase,
                SuggestedAmount = suggested,
                CurrentReturnDate = invoice.ReturnDate,
                NewReturnDate = newReturn
            };
        }

        public async Task<ServiceResult<ExtensionResultDto>> ExtendAsync(ExtendInvoiceDto dto)
        {
            var invoice = await _repo.GetInvoiceTrackedAsync(dto.InvoiceId);
            if (invoice == null)
                return ServiceResult<ExtensionResultDto>.Fail("Qaimə tapılmadı.");
            if (invoice.IsClosed)
                return ServiceResult<ExtensionResultDto>.Fail("Bağlı qaimənin müddəti artırıla bilməz.");
            if (dto.AddedAmount < 0 || dto.PaidNow < 0)
                return ServiceResult<ExtensionResultDto>.Fail("Məbləğ mənfi ola bilməz.");
            if (dto.NewReturnDate.Date <= invoice.ReturnDate.Date)
                return ServiceResult<ExtensionResultDto>.Fail("Yeni qaytarma tarixi cari tarixdən sonra olmalıdır.");

            var oldRemaining = invoice.RemainingDebt;

            invoice.ReturnDate = dto.NewReturnDate;
            invoice.TotalAmount += dto.AddedAmount;
            invoice.PaidAmount += dto.PaidNow;
            invoice.RemainingDebt = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);
            invoice.UpdatedAt = DateTime.UtcNow;

            var delta = invoice.RemainingDebt - oldRemaining;

            var entry = new ExtensionHistory
            {
                InvoiceId = invoice.Id,
                Date = DateTime.UtcNow,
                Mode = dto.Mode,
                AddedAmount = dto.AddedAmount,
                PaidNow = dto.PaidNow,
                Note = dto.Note
            };
            await _repo.AddHistoryAsync(entry);

            await _repo.AddLedgerAsync(new CustomerLedgerEntry
            {
                CustomerId = invoice.CustomerId,
                InvoiceId = invoice.Id,
                Date = entry.Date,
                Type = $"Müddət artırıldı (qaimə #{invoice.InvoiceNo})",
                Amount = dto.AddedAmount,
                DebtChange = delta,
                DepositChange = 0,
                Source = "extension"
            });

            await _repo.SaveChangesAsync();

            return ServiceResult<ExtensionResultDto>.Ok(new ExtensionResultDto
            {
                InvoiceId = invoice.Id,
                NewReturnDate = invoice.ReturnDate,
                TotalAmount = invoice.TotalAmount,
                PaidAmount = invoice.PaidAmount,
                RemainingDebt = invoice.RemainingDebt,
                Entry = _mapper.Map<ExtensionHistoryDto>(entry)
            });
        }
    }
}
