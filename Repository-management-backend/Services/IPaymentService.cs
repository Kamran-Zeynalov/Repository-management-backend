using Repository_management_backend.Models.DTOs.Payments;

namespace Repository_management_backend.Services
{
    public interface IPaymentService
    {
        Task<List<PaymentDto>> GetByInvoiceAsync(int invoiceId);
        Task<List<PaymentDto>> GetByCustomerAsync(int customerId);
        Task<InvoicePaymentSummaryDto?> GetInvoiceSummaryAsync(int invoiceId);
        Task<ServiceResult<PaymentDto>> AddPaymentAsync(CreatePaymentDto dto);
    }
}
