using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Invoices;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Qaimə idarəetməsi: yarat, redaktə, sil, çap, bağla, axtarış, statuslar.
    /// Oxuma: bütün rollar. Yazma: CanCreate/CanEdit/CanDelete. Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/invoices")]
    [Authorize]
    [Produces("application/json")]
    public class InvoicesController : ControllerBase
    {
        private readonly IInvoiceService _service;

        public InvoicesController(IInvoiceService service) => _service = service;

        // GET: /api/invoices?search=...&status=open|closed|overdue|today|soon|normal
        [HttpGet]
        public async Task<ActionResult<List<InvoiceListItemDto>>> GetAll(
            [FromQuery] string? search, [FromQuery] string? status)
            => Ok(await _service.GetAllAsync(search, status));

        // GET: /api/invoices/next-no  (cari filial üçün növbəti qaimə nömrəsi)
        [HttpGet("next-no")]
        public async Task<ActionResult<object>> GetNextNo()
            => Ok(new { invoiceNo = await _service.GetNextInvoiceNoAsync() });

        // GET: /api/invoices/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<InvoiceDetailDto>> GetById(int id)
        {
            var inv = await _service.GetByIdAsync(id);
            return inv == null ? NotFound(new { error = "Qaimə tapılmadı." }) : Ok(inv);
        }

        // GET: /api/invoices/5/print  (çap üçün hazır məlumat)
        [HttpGet("{id:int}/print")]
        public async Task<ActionResult<InvoicePrintDto>> GetForPrint(int id)
        {
            var data = await _service.GetForPrintAsync(id);
            return data == null ? NotFound(new { error = "Qaimə tapılmadı." }) : Ok(data);
        }

        // POST: /api/invoices
        [HttpPost]
        [Authorize(Policy = "CanCreate")]
        public async Task<ActionResult<InvoiceDetailDto>> Create([FromBody] CreateInvoiceDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        // PUT: /api/invoices/5
        [HttpPut("{id:int}")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<InvoiceDetailDto>> Update(int id, [FromBody] UpdateInvoiceDto dto)
        {
            dto.Id = id;
            var result = await _service.UpdateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return Ok(result.Data);
        }

        // POST: /api/invoices/5/close  (bağla)
        [HttpPost("{id:int}/close")]
        [Authorize(Policy = "CanEdit")]
        public async Task<IActionResult> Close(int id)
        {
            var result = await _service.CloseAsync(id);
            return result.Success ? Ok(new { message = "Qaimə bağlandı." })
                                  : BadRequest(new { error = result.Error });
        }

        // DELETE: /api/invoices/5
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "CanDelete")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(new { message = "Qaimə silindi." })
                                  : BadRequest(new { error = result.Error });
        }
    }
}
