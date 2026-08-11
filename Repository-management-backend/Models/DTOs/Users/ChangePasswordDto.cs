namespace Repository_management_backend.Models.DTOs.Users
{    public class ChangePasswordDto
    {
        public int Id { get; set; }
        public string NewPassword { get; set; } = string.Empty;
    }
}
