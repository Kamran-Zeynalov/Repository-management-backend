namespace Repository_management_backend.Models.Entities
{
    public class InventoryStock
    {
        public int Id { get; set; }

        public int BranchId { get; set; }
        public Branch? Branch { get; set; }

        public string Name { get; set; } = string.Empty;
        public decimal TotalCount { get; set; }
    }
}
