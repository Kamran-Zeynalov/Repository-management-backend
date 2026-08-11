using AutoMapper;
using Repository_management_backend.Models.DTOs.Invoices;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Repositories;
using Repository_management_backend.Security;

namespace Repository_management_backend.Services
{
    public class InvoiceService : IInvoiceService
    {
        private readonly IInvoiceRepository _repo;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _current;

        public InvoiceService(IInvoiceRepository repo, IMapper mapper, ICurrentUserService current)
        {
            _repo = repo;
            _mapper = mapper;
            _current = current;
        }

        // ---- Oxuma ----

        public async Task<List<InvoiceListItemDto>> GetAllAsync(string? search, string? status)
        {
            var invoices = await _repo.GetAllAsync(search, closed: null);
            var list = new List<InvoiceListItemDto>();

            foreach (var inv in invoices)
            {
                var dto = _mapper.Map<InvoiceListItemDto>(inv);
                var (st, days) = ComputeStatus(inv);
                dto.Status = st;
                dto.DaysUntilReturn = days;
                dto.ItemCount = inv.Items.Count;
                list.Add(dto);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var f = status.Trim().ToLower();
                if (f == "open") list = list.Where(x => !x.IsClosed).ToList();
                else if (f == "closed") list = list.Where(x => x.IsClosed).ToList();
                else list = list.Where(x => x.Status == f).ToList();
            }

            // Təcililik üzrə sıralama: gecikən → bu gün → tezliklə → normal → bağlı
            return list
                .OrderBy(x => StatusOrder(x.Status))
                .ThenBy(x => x.ReturnDate)
                .ToList();
        }

        public async Task<InvoiceDetailDto?> GetByIdAsync(int id)
        {
            var inv = await _repo.GetByIdAsync(id);
            return inv == null ? null : ToDetail(inv);
        }

        public async Task<InvoicePrintDto?> GetForPrintAsync(int id)
        {
            var inv = await _repo.GetByIdAsync(id);
            if (inv == null) return null;

            return new InvoicePrintDto
            {
                CompanyName = "Kapital A.S. MMC",
                BranchName = inv.Branch?.Name,
                PrintedAt = DateTime.Now,
                Invoice = ToDetail(inv)
            };
        }

        public Task<string> GetNextInvoiceNoAsync() =>
            _repo.GenerateInvoiceNoAsync(_current.BranchId);

        // ---- Yaratma ----

        public async Task<ServiceResult<InvoiceDetailDto>> CreateAsync(CreateInvoiceDto dto)
        {
            if (_current.BranchId <= 0)
                return ServiceResult<InvoiceDetailDto>.Fail("Filial təyin olunmayıb. Yenidən daxil olun.");

            var customer = await _repo.GetCustomerAsync(dto.CustomerId);
            if (customer == null)
                return ServiceResult<InvoiceDetailDto>.Fail("Müştəri tapılmadı.");

            if (dto.Items == null || dto.Items.Count == 0)
                return ServiceResult<InvoiceDetailDto>.Fail("Ən azı bir mal əlavə edin.");

            if (dto.ReturnDate.Date < dto.InvoiceDate.Date)
                return ServiceResult<InvoiceDetailDto>.Fail("Qaytarma tarixi qaimə tarixindən əvvəl ola bilməz.");

            // Nömrə: boşdursa avtomatik yarat; verilibsə unikal olmalıdır
            var no = dto.InvoiceNo?.Trim();
            if (string.IsNullOrWhiteSpace(no))
                no = await _repo.GenerateInvoiceNoAsync(_current.BranchId);
            else if (await _repo.InvoiceNoExistsAsync(_current.BranchId, no))
                return ServiceResult<InvoiceDetailDto>.Fail($"'{no}' nömrəli qaimə bu filialda artıq mövcuddur.");

            var invoice = new Invoice
            {
                InvoiceNo = no!,
                BranchId = _current.BranchId,
                CustomerId = customer.Id,
                CustomerNameSnapshot = customer.Name,
                Phone = string.IsNullOrWhiteSpace(dto.Phone) ? customer.Phone : dto.Phone,
                ExtraPhone = string.IsNullOrWhiteSpace(dto.ExtraPhone) ? customer.ExtraPhone : dto.ExtraPhone,
                Address = string.IsNullOrWhiteSpace(dto.Address) ? customer.Address : dto.Address,
                Note = dto.Note,
                InvoiceDate = dto.InvoiceDate,
                ReturnDate = dto.ReturnDate,
                DepositAmount = dto.DepositAmount,
                PaidAmount = dto.PaidAmount,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsClosed = false
            };

            foreach (var itemDto in dto.Items)
                invoice.Items.Add(_mapper.Map<InvoiceItem>(itemDto));

            invoice.TotalAmount = invoice.Items.Sum(i => i.Subtotal);
            invoice.RemainingDebt = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);

            await _repo.AddAsync(invoice);
            await _repo.SaveChangesAsync();

            // Ledger: mal götürüb (borc + depozit)
            await _repo.AddLedgerAsync(new CustomerLedgerEntry
            {
                CustomerId = customer.Id,
                InvoiceId = invoice.Id,
                Date = DateTime.UtcNow,
                Type = $"Mal götürüb (qaimə #{invoice.InvoiceNo})",
                Amount = invoice.TotalAmount,
                DebtChange = invoice.RemainingDebt,
                DepositChange = invoice.DepositAmount,
                Source = "invoice"
            });
            await _repo.SaveChangesAsync();

            var created = await _repo.GetByIdAsync(invoice.Id);
            return ServiceResult<InvoiceDetailDto>.Ok(ToDetail(created!));
        }

        // ---- Redaktə ----

        public async Task<ServiceResult<InvoiceDetailDto>> UpdateAsync(UpdateInvoiceDto dto)
        {
            var invoice = await _repo.GetByIdTrackedAsync(dto.Id);
            if (invoice == null)
                return ServiceResult<InvoiceDetailDto>.Fail("Qaimə tapılmadı.");

            if (invoice.IsClosed)
                return ServiceResult<InvoiceDetailDto>.Fail("Bağlı qaimə redaktə oluna bilməz.");

            if (dto.Items == null || dto.Items.Count == 0)
                return ServiceResult<InvoiceDetailDto>.Fail("Ən azı bir mal əlavə edin.");

            if (dto.ReturnDate.Date < dto.InvoiceDate.Date)
                return ServiceResult<InvoiceDetailDto>.Fail("Qaytarma tarixi qaimə tarixindən əvvəl ola bilməz.");

            var customer = await _repo.GetCustomerAsync(dto.CustomerId);
            if (customer == null)
                return ServiceResult<InvoiceDetailDto>.Fail("Müştəri tapılmadı.");

            invoice.CustomerId = customer.Id;
            invoice.CustomerNameSnapshot = customer.Name;
            invoice.Phone = string.IsNullOrWhiteSpace(dto.Phone) ? customer.Phone : dto.Phone;
            invoice.ExtraPhone = string.IsNullOrWhiteSpace(dto.ExtraPhone) ? customer.ExtraPhone : dto.ExtraPhone;
            invoice.Address = string.IsNullOrWhiteSpace(dto.Address) ? customer.Address : dto.Address;
            invoice.Note = dto.Note;
            invoice.InvoiceDate = dto.InvoiceDate;
            invoice.ReturnDate = dto.ReturnDate;
            invoice.DepositAmount = dto.DepositAmount;
            invoice.PaidAmount = dto.PaidAmount;
            invoice.UpdatedAt = DateTime.UtcNow;

            // Malları tam əvəz et
            _repo.RemoveItems(invoice.Items.ToList());
            invoice.Items.Clear();
            foreach (var itemDto in dto.Items)
                invoice.Items.Add(_mapper.Map<InvoiceItem>(itemDto));

            invoice.TotalAmount = invoice.Items.Sum(i => i.Subtotal);
            invoice.RemainingDebt = Math.Max(0, invoice.TotalAmount - invoice.PaidAmount);

            // Ledger-i yenidən qur
            await _repo.RemoveLedgerForInvoiceAsync(invoice.Id);
            await _repo.AddLedgerAsync(new CustomerLedgerEntry
            {
                CustomerId = customer.Id,
                InvoiceId = invoice.Id,
                Date = DateTime.UtcNow,
                Type = $"Qaimə yeniləndi (#{invoice.InvoiceNo})",
                Amount = invoice.TotalAmount,
                DebtChange = invoice.RemainingDebt,
                DepositChange = invoice.DepositAmount,
                Source = "invoice"
            });

            await _repo.SaveChangesAsync();

            var updated = await _repo.GetByIdAsync(invoice.Id);
            return ServiceResult<InvoiceDetailDto>.Ok(ToDetail(updated!));
        }

        // ---- Bağla ----

        public async Task<ServiceResult> CloseAsync(int id)
        {
            var invoice = await _repo.GetByIdTrackedAsync(id);
            if (invoice == null)
                return ServiceResult.Fail("Qaimə tapılmadı.");

            if (invoice.IsClosed)
                return ServiceResult.Fail("Qaimə artıq bağlıdır.");

            // DÜZƏLİŞ: əvvəllər burada _repo.Remove(invoice) çağırılırdı — yəni "Bağla"
            // düyməsi qaiməni SİLİRDİ, tarixçəni həmişəlik itirirdi. İndi sadəcə
            // IsClosed=true təyin olunur ki, qaimə tarixçədə qalsın və Anbar
            // hesablamasından (yalnız açıq qaimələr sayılır) avtomatik çıxsın.
            invoice.IsClosed = true;
            invoice.ClosedAt = DateTime.UtcNow;
            _repo.Update(invoice);
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        // ---- Sil ----

        public async Task<ServiceResult> DeleteAsync(int id)
        {
            var invoice = await _repo.GetByIdTrackedAsync(id);
            if (invoice == null)
                return ServiceResult.Fail("Qaimə tapılmadı.");

            // Invoice→Ledger Restrict olduğu üçün əvvəlcə ledger sətirləri silinir
            await _repo.RemoveLedgerForInvoiceAsync(id);
            _repo.Remove(invoice);   // mallar/ödənişlər/tarixçə cascade ilə silinir
            await _repo.SaveChangesAsync();
            return ServiceResult.Ok();
        }

        // ---- Köməkçilər ----

        private InvoiceDetailDto ToDetail(Invoice inv)
        {
            var dto = _mapper.Map<InvoiceDetailDto>(inv);
            var (st, days) = ComputeStatus(inv);
            dto.Status = st;
            dto.DaysUntilReturn = days;
            return dto;
        }

        // overdue (qırmızı) / today (yaşıl) / soon ≤3 gün (sarı) / normal (boz) / closed
        private static (string status, int days) ComputeStatus(Invoice i)
        {
            if (i.IsClosed) return ("closed", 0);
            var days = (i.ReturnDate.Date - DateTime.Today).Days;
            if (days < 0) return ("overdue", days);
            if (days == 0) return ("today", 0);
            if (days <= 3) return ("soon", days);
            return ("normal", days);
        }

        private static int StatusOrder(string status) => status switch
        {
            "overdue" => 0,
            "today" => 1,
            "soon" => 2,
            "normal" => 3,
            "closed" => 4,
            _ => 5
        };
    }
}
