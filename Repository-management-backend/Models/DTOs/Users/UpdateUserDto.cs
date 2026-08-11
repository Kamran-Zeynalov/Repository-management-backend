using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Models.DTOs.Users
{    public class UpdateUserDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public UserRole Role { get; set; } = UserRole.User;
        public string? Phone { get; set; }
        public int BranchId { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
