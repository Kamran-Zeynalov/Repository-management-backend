using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Branches;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    [ApiController]
    [Route("api/branches")]
    [Authorize(Policy = "ManageUsers")]
    [Produces("application/json")]
    public class BranchesController : ControllerBase
    {
        private readonly IBranchService _service;
        public BranchesController(IBranchService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<List<BranchDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        [HttpGet("{id:int}")]
        public async Task<ActionResult<BranchDto>> GetById(int id)
        {
            var branch = await _service.GetByIdAsync(id);
            return branch == null ? NotFound(new { error = "Filial tapılmadı." }) : Ok(branch);
        }

        [HttpPost]
        public async Task<ActionResult<BranchDto>> Create([FromBody] CreateBranchDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<BranchDto>> Update(int id, [FromBody] UpdateBranchDto dto)
        {
            dto.Id = id;
            var result = await _service.UpdateAsync(dto);
            if (!result.Success) return BadRequest(new { error = result.Error });
            return Ok(result.Data);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(new { message = "Filial silindi." })
                                  : BadRequest(new { error = result.Error });
        }

        [HttpDelete("{id:int}/force")]
        public async Task<IActionResult> ForceDelete(int id)
        {
            var result = await _service.ForceDeleteAsync(id);
            return result.Success ? Ok(new { message = "Filial və bütün bağlı məlumatlar silindi." })
                                  : BadRequest(new { error = result.Error });
        }
    }
}
