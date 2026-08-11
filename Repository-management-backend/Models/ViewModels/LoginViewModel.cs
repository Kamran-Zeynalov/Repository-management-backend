using System.ComponentModel.DataAnnotations;

namespace Repository_management_backend.Models.ViewModels
{
    public class LoginViewModel
    {
        [Required(ErrorMessage = "İstifadəçi adını daxil edin.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "Şifrəni daxil edin.")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        // Filial yalnız İşçi/Menecer üçün məcburidir — yoxlama controller-də rola görə aparılır.
        public string? BranchCode { get; set; }
    }
}
