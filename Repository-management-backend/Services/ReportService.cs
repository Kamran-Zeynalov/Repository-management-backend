using System.Globalization;
using System.Text;
using Repository_management_backend.Models.DTOs.Reports;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Repositories;

namespace Repository_management_backend.Services
{
    public class ReportService : IReportService
    {
        private readonly IReportRepository _repo;

        public ReportService(IReportRepository repo) => _repo = repo;

        // ---- Hesabatlar ----

        public async Task<InvoiceReportDto> GetInvoiceReportAsync(DateTime? from, DateTime? to, string? status, int? customerId)
        {
            var closed = ClosedFromStatus(status);
            var invoices = await _repo.GetInvoicesAsync(from, to, closed, customerId);

            var rows = invoices.Select(i => new InvoiceReportRowDto
            {
                InvoiceNo = i.InvoiceNo,
                CustomerName = i.CustomerNameSnapshot,
                InvoiceDate = i.InvoiceDate,
                ReturnDate = i.ReturnDate,
                TotalAmount = i.TotalAmount,
                PaidAmount = i.PaidAmount,
                RemainingDebt = i.RemainingDebt,
                DepositAmount = i.DepositAmount,
                Status = Status(i),
                IsClosed = i.IsClosed
            });

            // overdue/today/soon/normal kimi hesablanan status filtri
            if (!string.IsNullOrWhiteSpace(status) && closed == null)
            {
                var f = status.Trim().ToLower();
                rows = rows.Where(r => r.Status == f);
            }

            var list = rows.ToList();
            return new InvoiceReportDto
            {
                Rows = list,
                Count = list.Count,
                TotalAmount = list.Sum(r => r.TotalAmount),
                TotalPaid = list.Sum(r => r.PaidAmount),
                TotalDebt = list.Sum(r => r.RemainingDebt),
                TotalDeposit = list.Sum(r => r.DepositAmount)
            };
        }

        public async Task<PaymentReportDto> GetPaymentReportAsync(DateTime? from, DateTime? to)
        {
            var payments = await _repo.GetPaymentsAsync(from, to);
            var rows = payments.Select(p => new PaymentReportRowDto
            {
                Date = p.Date,
                InvoiceNo = p.Invoice?.InvoiceNo,
                CustomerName = p.Invoice?.CustomerNameSnapshot,
                Amount = p.Amount,
                Direction = p.Direction.ToString(),
                Note = p.Note
            }).ToList();

            var totalIn = payments.Where(p => p.Direction == PaymentDirection.In).Sum(p => p.Amount);
            var totalOut = payments.Where(p => p.Direction == PaymentDirection.Out).Sum(p => p.Amount);

            return new PaymentReportDto
            {
                Rows = rows,
                Count = rows.Count,
                TotalIn = totalIn,
                TotalOut = totalOut,
                Net = totalIn - totalOut
            };
        }

        public async Task<DebtorReportDto> GetDebtorReportAsync()
        {
            var customers = await _repo.GetCustomersAsync();
            var balances = await _repo.GetBalancesAsync();

            var rows = customers
                .Select(c =>
                {
                    balances.TryGetValue(c.Id, out var bal);
                    return new DebtorRowDto
                    {
                        CustomerId = c.Id,
                        CustomerName = c.Name,
                        Phone = c.Phone,
                        Debt = bal?.Debt ?? 0m,
                        Deposit = bal?.Deposit ?? 0m
                    };
                })
                .Where(r => r.Debt != 0m)
                .OrderByDescending(r => r.Debt)
                .ToList();

            return new DebtorReportDto
            {
                Rows = rows,
                Count = rows.Count,
                TotalDebt = rows.Sum(r => r.Debt),
                TotalDeposit = rows.Sum(r => r.Deposit)
            };
        }

        // ---- Export (CSV) ----

        public async Task<byte[]> ExportInvoicesCsvAsync(DateTime? from, DateTime? to, string? status, int? customerId)
        {
            var report = await GetInvoiceReportAsync(from, to, status, customerId);
            var sb = new StringBuilder();
            sb.AppendLine(CsvRow("Qaimə", "Müştəri", "Tarix", "Qaytarma", "Cəm", "Ödənilib", "Qalıq borc", "Depozit", "Status"));
            foreach (var r in report.Rows)
                sb.AppendLine(CsvRow(r.InvoiceNo, r.CustomerName, D(r.InvoiceDate), D(r.ReturnDate),
                    N(r.TotalAmount), N(r.PaidAmount), N(r.RemainingDebt), N(r.DepositAmount), r.Status));
            sb.AppendLine(CsvRow("CƏMİ", "", "", "", N(report.TotalAmount), N(report.TotalPaid), N(report.TotalDebt), N(report.TotalDeposit), ""));
            return ToBytes(sb);
        }

        public async Task<byte[]> ExportPaymentsCsvAsync(DateTime? from, DateTime? to)
        {
            var report = await GetPaymentReportAsync(from, to);
            var sb = new StringBuilder();
            sb.AppendLine(CsvRow("Tarix", "Qaimə", "Müştəri", "Məbləğ", "İstiqamət", "Qeyd"));
            foreach (var r in report.Rows)
                sb.AppendLine(CsvRow(D(r.Date), r.InvoiceNo ?? "", r.CustomerName ?? "", N(r.Amount), r.Direction, r.Note ?? ""));
            sb.AppendLine(CsvRow("CƏMİ (In)", "", "", N(report.TotalIn), "", ""));
            sb.AppendLine(CsvRow("CƏMİ (Out)", "", "", N(report.TotalOut), "", ""));
            sb.AppendLine(CsvRow("NET", "", "", N(report.Net), "", ""));
            return ToBytes(sb);
        }

        public async Task<byte[]> ExportDebtorsCsvAsync()
        {
            var report = await GetDebtorReportAsync();
            var sb = new StringBuilder();
            sb.AppendLine(CsvRow("Müştəri", "Telefon", "Borc", "Depozit"));
            foreach (var r in report.Rows)
                sb.AppendLine(CsvRow(r.CustomerName, r.Phone ?? "", N(r.Debt), N(r.Deposit)));
            sb.AppendLine(CsvRow("CƏMİ", "", N(report.TotalDebt), N(report.TotalDeposit)));
            return ToBytes(sb);
        }

        // ---- köməkçilər ----

        private static bool? ClosedFromStatus(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return null;
            return status.Trim().ToLower() switch
            {
                "open" => false,
                "closed" => true,
                _ => null
            };
        }

        private static string Status(Invoice i)
        {
            if (i.IsClosed) return "closed";
            var days = (i.ReturnDate.Date - DateTime.Today).Days;
            if (days < 0) return "overdue";
            if (days == 0) return "today";
            if (days <= 3) return "soon";
            return "normal";
        }

        private static string D(DateTime d) => d.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        private static string N(decimal v) => v.ToString("0.00", CultureInfo.InvariantCulture);

        private static string CsvRow(params string[] cells) =>
            string.Join(",", cells.Select(Escape));

        private static string Escape(string? cell)
        {
            cell ??= "";
            if (cell.Contains(',') || cell.Contains('"') || cell.Contains('\n'))
                return "\"" + cell.Replace("\"", "\"\"") + "\"";
            return cell;
        }

        // UTF-8 BOM — Excel-də Azərbaycan hərflərinin düzgün açılması üçün
        private static byte[] ToBytes(StringBuilder sb)
        {
            var preamble = Encoding.UTF8.GetPreamble();
            var body = Encoding.UTF8.GetBytes(sb.ToString());
            var result = new byte[preamble.Length + body.Length];
            Buffer.BlockCopy(preamble, 0, result, 0, preamble.Length);
            Buffer.BlockCopy(body, 0, result, preamble.Length, body.Length);
            return result;
        }
    }
}
