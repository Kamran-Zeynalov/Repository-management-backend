using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Reports;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Hesabatlar + filtrlər + CSV export. Bütün məlumat cari filiala görə süzülür.</summary>
    [ApiController]
    [Route("api/reports")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportsController(IReportService service) => _service = service;

        // GET: /api/reports/invoices?from=&to=&status=&customerId=
        [HttpGet("invoices")]
        [Produces("application/json")]
        public async Task<ActionResult<InvoiceReportDto>> Invoices(
            [FromQuery] DateTime? from, [FromQuery] DateTime? to,
            [FromQuery] string? status, [FromQuery] int? customerId)
            => Ok(await _service.GetInvoiceReportAsync(from, to, status, customerId));

        // GET: /api/reports/payments?from=&to=
        [HttpGet("payments")]
        [Produces("application/json")]
        public async Task<ActionResult<PaymentReportDto>> Payments(
            [FromQuery] DateTime? from, [FromQuery] DateTime? to)
            => Ok(await _service.GetPaymentReportAsync(from, to));

        // GET: /api/reports/debtors
        [HttpGet("debtors")]
        [Produces("application/json")]
        public async Task<ActionResult<DebtorReportDto>> Debtors()
            => Ok(await _service.GetDebtorReportAsync());

        // ---- Export (CSV) ----

        // GET: /api/reports/invoices/export?from=&to=&status=&customerId=
        [HttpGet("invoices/export")]
        public async Task<IActionResult> ExportInvoices(
            [FromQuery] DateTime? from, [FromQuery] DateTime? to,
            [FromQuery] string? status, [FromQuery] int? customerId)
        {
            var bytes = await _service.ExportInvoicesCsvAsync(from, to, status, customerId);
            return File(bytes, "text/csv", $"qaimeler_{DateTime.Now:yyyyMMdd}.csv");
        }

        // GET: /api/reports/payments/export?from=&to=
        [HttpGet("payments/export")]
        public async Task<IActionResult> ExportPayments([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var bytes = await _service.ExportPaymentsCsvAsync(from, to);
            return File(bytes, "text/csv", $"odenisler_{DateTime.Now:yyyyMMdd}.csv");
        }

        // GET: /api/reports/debtors/export
        [HttpGet("debtors/export")]
        public async Task<IActionResult> ExportDebtors()
        {
            var bytes = await _service.ExportDebtorsCsvAsync();
            return File(bytes, "text/csv", $"borclular_{DateTime.Now:yyyyMMdd}.csv");
        }
    }
}
