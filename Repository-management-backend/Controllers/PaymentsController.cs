using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Payments;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Ödəniş sistemi: tarixçə, borc hesablaması, ödəniş əlavə etmə.
    /// Oxuma: bütün rollar. Ödəniş əlavə: CanCreate. Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/payments")]
    [Authorize]
    [Produces("application/json")]
    public class PaymentsController : ControllerBase
    {
        private readonly IPaymentService _service;

        public PaymentsController(IPaymentService service) => _service = service;

        // GET: /api/payments/invoice/5  (qaimə üzrə ödəniş tarixçəsi)
        [HttpGet("invoice/{invoiceId:int}")]
        public async Task<ActionResult<List<PaymentDto>>> GetByInvoice(int invoiceId)
            => Ok(await _service.GetByInvoiceAsync(invoiceId));

        // GET: /api/payments/customer/5  (müştəri üzrə bütün ödənişlər)
        [HttpGet("customer/{customerId:int}")]
        public async Task<ActionResult<List<PaymentDto>>> GetByCustomer(int customerId)
            => Ok(await _service.GetByCustomerAsync(customerId));

        // GET: /api/payments/invoice/5/summary  (borc hesablaması + tarixçə)
        [HttpGet("invoice/{invoiceId:int}/summary")]
        public async Task<ActionResult<InvoicePaymentSummaryDto>> GetSummary(int invoiceId)
        {
            var s = await _service.GetInvoiceSummaryAsync(invoiceId);
            return s == null ? NotFound(new { error = "Qaimə tapılmadı." }) : Ok(s);
        }

        // POST: /api/payments  (ödəniş əlavə et)
        [HttpPost]
        [Authorize(Policy = "CanCreate")]
        public async Task<ActionResult<PaymentDto>> Add([FromBody] CreatePaymentDto dto)
        {
            var result = await _service.AddPaymentAsync(dto);
            return result.Success ? Ok(result.Data)
                                  : BadRequest(new { error = result.Error });
        }
    }
}
