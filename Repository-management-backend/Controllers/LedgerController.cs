using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Ledger;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Müştəri ledger-i: borc əlavə/ödə, depozit əlavə/çıx, tarixçə.
    /// Oxuma: bütün rollar. Əməliyyatlar: CanCreate. Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/ledger")]
    [Authorize]
    [Produces("application/json")]
    public class LedgerController : ControllerBase
    {
        private readonly ICustomerLedgerService _service;

        public LedgerController(ICustomerLedgerService service) => _service = service;

        // GET: /api/ledger/5  (cari borc/depozit + tarixçə)
        [HttpGet("{customerId:int}")]
        public async Task<ActionResult<CustomerLedgerDto>> Get(int customerId)
        {
            var l = await _service.GetLedgerAsync(customerId);
            return l == null ? NotFound(new { error = "Müştəri tapılmadı." }) : Ok(l);
        }

        // POST: /api/ledger/debt           (borc əlavə)
        [HttpPost("debt")]
        [Authorize(Policy = "CanCreate")]
        public Task<IActionResult> AddDebt([FromBody] LedgerTransactionDto dto)
            => Run(_service.AddDebtAsync(dto));

        // POST: /api/ledger/debt/pay       (borc ödə)
        [HttpPost("debt/pay")]
        [Authorize(Policy = "CanCreate")]
        public Task<IActionResult> PayDebt([FromBody] LedgerTransactionDto dto)
            => Run(_service.PayDebtAsync(dto));

        // POST: /api/ledger/deposit        (depozit əlavə)
        [HttpPost("deposit")]
        [Authorize(Policy = "CanCreate")]
        public Task<IActionResult> AddDeposit([FromBody] LedgerTransactionDto dto)
            => Run(_service.AddDepositAsync(dto));

        // POST: /api/ledger/deposit/withdraw  (depozit çıx)
        [HttpPost("deposit/withdraw")]
        [Authorize(Policy = "CanCreate")]
        public Task<IActionResult> WithdrawDeposit([FromBody] LedgerTransactionDto dto)
            => Run(_service.WithdrawDepositAsync(dto));

        private static async Task<IActionResult> Run(Task<ServiceResult<CustomerLedgerDto>> task)
        {
            var result = await task;
            return result.Success
                ? new OkObjectResult(result.Data)
                : new BadRequestObjectResult(new { error = result.Error });
        }
    }
}
