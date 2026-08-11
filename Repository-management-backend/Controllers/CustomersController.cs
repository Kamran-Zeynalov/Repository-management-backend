using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Customers;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Müştəri idarəetməsi. Oxuma: bütün rollar. Yazma: CanCreate/CanEdit/CanDelete policy-ləri.
    /// Filial izolyasiyası DbContext query filter ilə avtomatikdir.</summary>
    [ApiController]
    [Route("api/customers")]
    [Authorize]
    [Produces("application/json")]
    public class CustomersController : ControllerBase
    {
        private readonly ICustomerService _service;

        public CustomersController(ICustomerService service) => _service = service;

        // GET: /api/customers
        [HttpGet]
        public async Task<ActionResult<List<CustomerDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        // GET: /api/customers/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CustomerDto>> GetById(int id)
        {
            var c = await _service.GetByIdAsync(id);
            return c == null ? NotFound(new { error = "Müştəri tapılmadı." }) : Ok(c);
        }

        // GET: /api/customers/5/profile  (məlumat + borc/depozit + aktiv/köhnə qaimələr + tarixçə)
        [HttpGet("{id:int}/profile")]
        public async Task<ActionResult<CustomerProfileDto>> GetProfile(int id)
        {
            var p = await _service.GetProfileAsync(id);
            return p == null ? NotFound(new { error = "Müştəri tapılmadı." }) : Ok(p);
        }

        // GET: /api/customers/5/invoices/print  (müştərinin BÜTÜN qaimələri — bir çap sənədi)
        [HttpGet("{id:int}/invoices/print")]
        public async Task<ActionResult<CustomerPrintDto>> GetInvoicesPrint(int id)
        {
            var p = await _service.GetInvoicesPrintAsync(id);
            return p == null ? NotFound(new { error = "Müştəri tapılmadı." }) : Ok(p);
        }

        // GET: /api/customers/5/invoices?closed=false  (aktiv) | true (köhnə) | yoxdursa hamısı
        [HttpGet("{id:int}/invoices")]
        public async Task<ActionResult<List<InvoiceSummaryDto>>> GetInvoices(int id, [FromQuery] bool? closed)
            => Ok(await _service.GetInvoicesAsync(id, closed));

        // GET: /api/customers/5/ledger  (tarixçə)
        [HttpGet("{id:int}/ledger")]
        public async Task<ActionResult<List<LedgerEntryDto>>> GetLedger(int id)
            => Ok(await _service.GetLedgerAsync(id));

        // POST: /api/customers
        [HttpPost]
        [Authorize(Policy = "CanCreate")]
        public async Task<ActionResult<CustomerDto>> Create([FromBody] CreateCustomerDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        // PUT: /api/customers/5
        [HttpPut("{id:int}")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<CustomerDto>> Update(int id, [FromBody] UpdateCustomerDto dto)
        {
            dto.Id = id;
            var result = await _service.UpdateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return Ok(result.Data);
        }

        // DELETE: /api/customers/5
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "CanDelete")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(new { message = "Müştəri silindi." })
                                  : BadRequest(new { error = result.Error });
        }
    }
}
