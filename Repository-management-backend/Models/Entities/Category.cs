using Repository_management_backend.Models.Enums;

namespace Repository_management_backend.Models.Entities
{
    public class Category
    {
        public int Id { get; set; }

        public int BranchId { get; set; }
        public Branch? Branch { get; set; }

        public CategoryKind Kind { get; set; } = CategoryKind.Extra;
        public string Name { get; set; } = string.Empty;
        public string? Info { get; set; }
        public decimal Price { get; set; }
        public string? Unit { get; set; }
        public string? Note { get; set; }
        public RentType RentType { get; set; } = RentType.Monthly;

        public int? ParentId { get; set; }
        public Category? Parent { get; set; }
        public ICollection<Category> Children { get; set; } = new List<Category>();
    }
}
