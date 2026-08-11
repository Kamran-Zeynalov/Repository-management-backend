using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Repository_management_backend.Models.DTOs.Users;
using Repository_management_backend.Services;

namespace Repository_management_backend.Controllers
{
    /// <summary>İşçi (User) idarəetməsi — yalnız Admin (ManageUsers policy).</summary>
    [ApiController]
    [Route("api/users")]
    [Authorize(Policy = "ManageUsers")]
    [Produces("application/json")]
    public class UsersController : ControllerBase
    {
        private readonly IUserService _service;

        public UsersController(IUserService service) => _service = service;

        // GET: /api/users
        [HttpGet]
        public async Task<ActionResult<List<UserDto>>> GetAll()
            => Ok(await _service.GetAllAsync());

        // GET: /api/users/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<UserDto>> GetById(int id)
        {
            var user = await _service.GetByIdAsync(id);
            return user == null ? NotFound(new { error = "İşçi tapılmadı." }) : Ok(user);
        }

        // POST: /api/users
        [HttpPost]
        public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserDto dto)
        {
            var result = await _service.CreateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
        }

        // PUT: /api/users/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult<UserDto>> Update(int id, [FromBody] UpdateUserDto dto)
        {
            dto.Id = id;
            var result = await _service.UpdateAsync(dto);
            if (!result.Success)
                return BadRequest(new { error = result.Error });

            return Ok(result.Data);
        }

        // POST: /api/users/5/password
        [HttpPost("{id:int}/password")]
        public async Task<IActionResult> ChangePassword(int id, [FromBody] ChangePasswordDto dto)
        {
            dto.Id = id;
            var result = await _service.ChangePasswordAsync(dto);
            return result.Success ? Ok(new { message = "Şifrə yeniləndi." })
                                  : BadRequest(new { error = result.Error });
        }

        // POST: /api/users/5/active
        [HttpPost("{id:int}/active")]
        public async Task<IActionResult> SetActive(int id, [FromBody] SetActiveRequest req)
        {
            var result = await _service.SetActiveAsync(id, req.IsActive);
            return result.Success ? Ok(new { message = "Status yeniləndi." })
                                  : BadRequest(new { error = result.Error });
        }

        // DELETE: /api/users/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result = await _service.DeleteAsync(id);
            return result.Success ? Ok(new { message = "İşçi silindi." })
                                  : BadRequest(new { error = result.Error });
        }

        public class SetActiveRequest
        {
            public bool IsActive { get; set; }
        }
    }
}
