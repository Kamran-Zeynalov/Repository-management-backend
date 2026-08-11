using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Inventory;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Anbar idarəetməsi: ümumi qalıq, boş qalıq, icarədə olan mallar, kimdə olduğu.
    /// Oxuma: bütün rollar. Yazma: CanCreate/CanEdit/CanDelete. Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/inventory")]
    [Authorize]
    [Produces("application/json")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _service;

        public InventoryController(IInventoryService service) => _service = service;

        // GET: /api/inventory  (hər mal üçün: anbar qalığı, icarədə olan, boş qalıq)
        [HttpGet]
        public async Task<ActionResult<List<InventoryStockDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        // GET: /api/inventory/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<InventoryStockDto>> GetById(int id)
        {
            var s = await _service.GetByIdAsync(id);
            return s == null ? NotFound(new { error = "Anbar malı tapılmadı." }) : Ok(s);
        }

        // GET: /api/inventory/5/holders  (kimdə olduğu)
        [HttpGet("{id:int}/holders")]
        public async Task<ActionResult<List<InventoryHolderDto>>> GetHolders(int id)
            => Ok(await _service.GetHoldersAsync(id));

        // GET: /api/inventory/rented  (icarədə olan mallar — aqreqasiya)
        [HttpGet("rented")]
        public async Task<ActionResult<List<RentedItemDto>>> GetRented()
            => Ok(await _service.GetRentedItemsAsync());

        // POST: /api/inventory
        [HttpPost]
        [Authorize(Policy = "CanCreate")]
        public async Task<ActionResult<InventoryStockDto>> Create([FromBody] CreateInventoryStockDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        // PUT: /api/inventory/5
        [HttpPut("{id:int}")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<InventoryStockDto>> Update(int id, [FromBody] UpdateInventoryStockDto dto)
        {
            dto.Id = id;
            var result = await _service.UpdateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return Ok(result.Data);
        }

        // DELETE: /api/inventory/5
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "CanDelete")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(new { message = "Anbar malı silindi." })
                                  : BadRequest(new { error = result.Error });
        }
    }
}
