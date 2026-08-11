using Repository_management_backend.Models.DTOs.Reports;

namespace Repository_management_backend.Services
{
    public interface IReportService
    {
        Task<InvoiceReportDto> GetInvoiceReportAsync(DateTime? from, DateTime? to, string? status, int? customerId);
        Task<PaymentReportDto> GetPaymentReportAsync(DateTime? from, DateTime? to);
        Task<DebtorReportDto> GetDebtorReportAsync();

        Task<byte[]> ExportInvoicesCsvAsync(DateTime? from, DateTime? to, string? status, int? customerId);
        Task<byte[]> ExportPaymentsCsvAsync(DateTime? from, DateTime? to);
        Task<byte[]> ExportDebtorsCsvAsync();
    }
}
