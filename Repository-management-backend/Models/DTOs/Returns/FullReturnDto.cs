namespace Repository_management_backend.Models.DTOs.Returns
{    public class FullReturnDto
    {
        public int InvoiceId { get; set; }
        public decimal RefundAmount { get; set; }
        public string? Note { get; set; }
    }
}
