using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Categories;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>Kateqoriya idarəetməsi (Standard / Extra / Service / Pole).
    /// Oxuma: bütün rollar. Yazma: CanCreate/CanEdit/CanDelete. Filial izolyasiyası avtomatikdir.</summary>
    [ApiController]
    [Route("api/categories")]
    [Authorize]
    [Produces("application/json")]
    public class CategoriesController : ControllerBase
    {
        private readonly ICategoryService _service;

        public CategoriesController(ICategoryService service) => _service = service;

        // GET: /api/categories?kind=Standard|Extra|Service|Pole  (kind ixtiyari)
        [HttpGet]
        public async Task<ActionResult<List<CategoryDto>>> GetAll([FromQuery] CategoryKind? kind)
            => Ok(await _service.GetAllAsync(kind));

        // GET: /api/categories/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<CategoryDto>> GetById(int id)
        {
            var c = await _service.GetByIdAsync(id);
            return c == null ? NotFound(new { error = "Kateqoriya tapılmadı." }) : Ok(c);
        }

        // GET: /api/categories/5/children  (Pole alt-kateqoriyaları)
        [HttpGet("{id:int}/children")]
        public async Task<ActionResult<List<CategoryDto>>> GetChildren(int id)
            => Ok(await _service.GetChildrenAsync(id));

        // POST: /api/categories
        [HttpPost]
        [Authorize(Policy = "CanCreate")]
        public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        // PUT: /api/categories/5
        [HttpPut("{id:int}")]
        [Authorize(Policy = "CanEdit")]
        public async Task<ActionResult<CategoryDto>> Update(int id, [FromBody] UpdateCategoryDto dto)
        {
            dto.Id = id;
            var result = await _service.UpdateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return Ok(result.Data);
        }

        // DELETE: /api/categories/5
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "CanDelete")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(new { message = "Kateqoriya silindi." })
                                  : BadRequest(new { error = result.Error });
        }
    }
}
