using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Extensions;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Müddət artırma və təkrar hesablamalar.
    /// Oxuma: bütün rollar. Artırma: CanEdit. Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/invoices")]
    [Authorize]
    [Produces("application/json")]
    public class ExtensionController : ControllerBase
    {
        private readonly IExtensionService _service;

        public ExtensionController(IExtensionService service) => _service = service;

        // GET: /api/invoices/5/extensions  (tarixçə)
        [HttpGet("{invoiceId:int}/extensions")]
        public async Task<ActionResult<List<ExtensionHistoryDto>>> GetHistory(int invoiceId)
            => Ok(await _service.GetHistoryAsync(invoiceId));

        // GET: /api/invoices/5/extension-preview?periods=1&mode=month|half  (təkrar hesablama)
        [HttpGet("{invoiceId:int}/extension-preview")]
        public async Task<ActionResult<ExtensionPreviewDto>> Preview(
            int invoiceId, [FromQuery] int periods = 1, [FromQuery] string? mode = "month")
        {
            var p = await _service.PreviewAsync(invoiceId, periods, mode);
            return p == null ? NotFound(new { error = "Qaimə tapılmadı." }) : Ok(p);
        }

        // POST: /api/invoices/5/extend  (müddət artırma)
        [HttpPost("{invoiceId:int}/extend")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<ExtensionResultDto>> Extend(int invoiceId, [FromBody] ExtendInvoiceDto dto)
        {
            dto.InvoiceId = invoiceId;
            var result = await _service.ExtendAsync(dto);
            return result.Success ? Ok(result.Data)
                                  : BadRequest(new { error = result.Error });
        }
    }
}
