using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Returns;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Qaytarma: qismən və tam. Oxuma: bütün rollar. Əməliyyat: CanEdit.
    /// Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/invoices")]
    [Authorize]
    [Produces("application/json")]
    public class ReturnController : ControllerBase
    {
        private readonly IReturnService _service;

        public ReturnController(IReturnService service) => _service = service;

        // GET: /api/invoices/5/returns  (qaytarma tarixçəsi)
        [HttpGet("{invoiceId:int}/returns")]
        public async Task<ActionResult<List<ReturnHistoryDto>>> GetHistory(int invoiceId)
            => Ok(await _service.GetHistoryAsync(invoiceId));

        // POST: /api/invoices/5/return/partial  (qismən qaytarma)
        [HttpPost("{invoiceId:int}/return/partial")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<ReturnResultDto>> PartialReturn(int invoiceId, [FromBody] PartialReturnDto dto)
        {
            dto.InvoiceId = invoiceId;
            var result = await _service.PartialReturnAsync(dto);
            return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
        }

        // POST: /api/invoices/5/return/full  (tam qaytarma → qaimə bağlanır)
        [HttpPost("{invoiceId:int}/return/full")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<ReturnResultDto>> FullReturn(int invoiceId, [FromBody] FullReturnDto dto)
        {
            dto.InvoiceId = invoiceId;
            var result = await _service.FullReturnAsync(dto);
            return result.Success ? Ok(result.Data) : BadRequest(new { error = result.Error });
        }
    }
}
