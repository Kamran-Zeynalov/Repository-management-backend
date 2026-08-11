namespace Repository_management_backend.Models.DTOs.Branches
{
    public class BranchDto
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public int UserCount { get; set; }
        public int CustomerCount { get; set; }
        public int InvoiceCount { get; set; }
        public bool HasData => UserCount > 0 || CustomerCount > 0 || InvoiceCount > 0;
    }
}
