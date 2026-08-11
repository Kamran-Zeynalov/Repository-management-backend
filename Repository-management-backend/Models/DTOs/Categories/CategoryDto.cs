namespace Repository_management_backend.Models.DTOs.Categories
{    public class CategoryDto
    {
        public int Id { get; set; }
        public string Kind { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Info { get; set; }
        public decimal Price { get; set; }
        public string? Unit { get; set; }
        public string? Note { get; set; }
        public string RentType { get; set; } = string.Empty;

        public int? ParentId { get; set; }
        public string? ParentName { get; set; }
        public int ChildrenCount { get; set; }
    }
}
