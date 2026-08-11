using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Repository_management_backend.Controllers
{
    [Authorize(Policy = "CanCreate")]
    public class InvoiceController : Controller
    {
        // GET: /Invoice/Create
        public IActionResult Create()
        {
            return View();
        }
    }
}
