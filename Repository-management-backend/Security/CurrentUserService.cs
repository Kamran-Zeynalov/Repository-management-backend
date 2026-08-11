using System.Security.Claims;

namespace Repository_management_backend.Security
{
    public interface ICurrentUserService
    {
        bool IsAuthenticated { get; }
        int UserId { get; }
        int BranchId { get; }
        string? BranchCode { get; }
        string? Role { get; }
        string? Name { get; }
    }

    public class CurrentUserService : ICurrentUserService
    {
        private readonly IHttpContextAccessor _http;
        public CurrentUserService(IHttpContextAccessor http) => _http = http;

        private ClaimsPrincipal? Principal => _http.HttpContext?.User;

        public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated ?? false;
        public int UserId => int.TryParse(Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var v) ? v : 0;
        public int BranchId => int.TryParse(Principal?.FindFirst("BranchId")?.Value, out var v) ? v : 0;
        public string? BranchCode => Principal?.FindFirst("BranchCode")?.Value;
        public string? Role => Principal?.FindFirst(ClaimTypes.Role)?.Value;
        public string? Name => Principal?.FindFirst(ClaimTypes.Name)?.Value;
    }
}
