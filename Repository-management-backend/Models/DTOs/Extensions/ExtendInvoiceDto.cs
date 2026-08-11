namespace Repository_management_backend.Models.DTOs.Extensions
{    public class ExtendInvoiceDto
    {
        public int InvoiceId { get; set; }
        public DateTime NewReturnDate { get; set; }
        public decimal AddedAmount { get; set; }
        public decimal PaidNow { get; set; }
        public string? Mode { get; set; }
        public string? Note { get; set; }
    }
}
