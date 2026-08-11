using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Models.DTOs.Users
{    public class CreateUserDto
    {
        public string Name { get; set; } = string.Empty;
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.User;
        public string? Phone { get; set; }
        public int BranchId { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
