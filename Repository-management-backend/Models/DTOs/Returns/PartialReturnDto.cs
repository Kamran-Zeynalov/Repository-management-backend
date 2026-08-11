namespace Repository_management_backend.Models.DTOs.Returns
{    public class PartialReturnDto
    {
        public int InvoiceId { get; set; }
        public List<ReturnItemDto> Items { get; set; } = new();
        public decimal RefundAmount { get; set; }
        public string? Note { get; set; }
    }
}
