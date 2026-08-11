namespace Repository_management_backend.Models.DTOs.Branches
{
    public class CreateBranchDto
    {
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
    }
}
