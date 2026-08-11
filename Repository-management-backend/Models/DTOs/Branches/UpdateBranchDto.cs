namespace Repository_management_backend.Models.DTOs.Branches
{
    public class UpdateBranchDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
