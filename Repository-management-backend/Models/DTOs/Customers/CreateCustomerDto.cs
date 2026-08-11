namespace Repository_management_backend.Models.DTOs.Customers
{
    public class CreateCustomerDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? ExtraPhone { get; set; }
        public string? Address { get; set; }
        public string? Note { get; set; }
    }
}
