using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository_management_backend.Data;
using Repository_management_backend.Models.Entities;
using Repository_management_backend.Models.Enums;
using Repository_management_backend.Models.ViewModels;
using Repository_management_backend.Security;
using System.Security.Claims;

namespace Repository_management_backend.Controllers
{
    public class AccountController : Controller
    {
        private readonly AppDbContext _db;
        private readonly IPasswordHasher _hasher;

        public AccountController(AppDbContext db, IPasswordHasher hasher)
        {
            _db = db;
            _hasher = hasher;
        }

        // GET: /Account/Login
        [AllowAnonymous]
        public async Task<IActionResult> Login()
        {
            await PopulateBranchesAsync();
            return View(new LoginViewModel());
        }

        // POST: /Account/Login
        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                await PopulateBranchesAsync();
                return View(model);
            }

            var uname = model.Username.Trim().ToLower();
            var pwd = (model.Password ?? string.Empty).Trim();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == uname);

            if (user == null || !_hasher.Verify(pwd, user.PasswordHash))
            {
                ModelState.AddModelError(string.Empty, "İstifadəçi adı və ya şifrə yanlışdır.");
                await PopulateBranchesAsync();
                return View(model);
            }

            if (!user.IsActive)
            {
                ModelState.AddModelError(string.Empty, "Bu hesab deaktivdir. Admin ilə əlaqə saxlayın.");
                await PopulateBranchesAsync();
                return View(model);
            }

            Branch? branch;
            if (user.Role == UserRole.Admin)
            {
                // Admin üçün filial seçimi tələb olunmur — seçilibsə onunla, yoxdursa öz filialı ilə daxil olur
                branch = !string.IsNullOrWhiteSpace(model.BranchCode)
                    ? await _db.Branches.FirstOrDefaultAsync(b => b.Code == model.BranchCode)
                    : null;
                branch ??= await _db.Branches.FirstOrDefaultAsync(b => b.Id == user.BranchId);
                if (branch == null)
                {
                    ModelState.AddModelError(string.Empty, "Filial tapılmadı. Admin ilə əlaqə saxlayın.");
                    await PopulateBranchesAsync();
                    return View(model);
                }
            }
            else
            {
                // İşçi/Menecer üçün filial məcburidir və yalnız öz filialı ilə girə bilər
                if (string.IsNullOrWhiteSpace(model.BranchCode))
                {
                    ModelState.AddModelError(string.Empty, "Filial seçin.");
                    await PopulateBranchesAsync();
                    return View(model);
                }
                branch = await _db.Branches.FirstOrDefaultAsync(b => b.Code == model.BranchCode);
                if (branch == null)
                {
                    ModelState.AddModelError(string.Empty, "Filial seçin.");
                    await PopulateBranchesAsync();
                    return View(model);
                }
                if (branch.Id != user.BranchId)
                {
                    ModelState.AddModelError(string.Empty, "Bu işçi seçilmiş filiala aid deyil.");
                    await PopulateBranchesAsync();
                    return View(model);
                }
            }

            // Status üçün: uğurlu girişdə son giriş vaxtı SQL-ə yazılır
            user.LastLoginAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name, user.Name),
                new(ClaimTypes.Role, user.Role.ToString()),
                new("BranchId", branch.Id.ToString()),
                new("BranchCode", branch.Code),
                new("BranchName", branch.Name),
                new("Username", user.Username)
            };

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity),
                new AuthenticationProperties { IsPersistent = false });

            return RedirectToAction("Index", "Home");
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SwitchBranch([FromQuery] int branchId)
        {
            var branch = await _db.Branches.FirstOrDefaultAsync(b => b.Id == branchId);
            if (branch == null)
                return NotFound(new { error = "Filial tapılmadı." });

            var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(idStr, out var uid))
                return Unauthorized(new { error = "Sessiya tapılmadı." });

            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == uid);
            if (user == null)
                return Unauthorized(new { error = "İstifadəçi tapılmadı." });

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new(ClaimTypes.Name, user.Name),
                new(ClaimTypes.Role, user.Role.ToString()),
                new("BranchId", branch.Id.ToString()),
                new("BranchCode", branch.Code),
                new("BranchName", branch.Name),
                new("Username", user.Username)
            };
            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            await HttpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                new ClaimsPrincipal(identity),
                new AuthenticationProperties { IsPersistent = false });

            return Ok(new { branchId = branch.Id, branchName = branch.Name, branchCode = branch.Code });
        }

        // GET: /Account/Logout  (sadə keçid üçün GET; istəsəniz POST-a keçirin)
        public async Task<IActionResult> Logout()
        {
            // Status üçün: çıxışda son çıxış vaxtı SQL-ə yazılır
            var idStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(idStr, out var uid))
            {
                var current = await _db.Users.FirstOrDefaultAsync(u => u.Id == uid);
                if (current != null)
                {
                    current.LastLogoutAt = DateTime.UtcNow;
                    await _db.SaveChangesAsync();
                }
            }
            await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return RedirectToAction("Login");
        }

        [AllowAnonymous]
        public IActionResult AccessDenied()
        {
            return View();
        }

        private async Task PopulateBranchesAsync()
        {
            ViewBag.Branches = await _db.Branches
                .Where(b => b.IsActive)
                .OrderBy(b => b.Name)
                .ToListAsync();
        }
    }
}
