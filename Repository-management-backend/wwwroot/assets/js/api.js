/* =====================================================================
   api.js — Backend API klienti (window.API).
   Bütün modullar SQL Server datasına bu vasitə ilə çıxır. Cookie auth
   avtomatik göndərilir (credentials: 'same-origin'). 401 olduqda login-ə
   yönləndirir. Heç bir sessionStorage/mock istifadə olunmur.
   ===================================================================== */
(function (global) {
  "use strict";

  async function request(method, url, body) {
    const opts = {
      method: method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Accept": "application/json" }
    };
    if (body !== undefined && body !== null) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(url, opts);
    } catch (networkErr) {
      throw new ApiError("Şəbəkə xətası — serverə qoşulmaq mümkün olmadı.", 0, null);
    }

    // Cookie sessiyası bitibsə login-ə qaytar
    if (res.status === 401) {
      global.location.href = "/Account/Login";
      throw new ApiError("Sessiya bitib. Yenidən daxil olun.", 401, null);
    }

    const text = await res.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (e) { data = text; }
    }

    if (!res.ok) {
      let msg;
      if (data && data.errors && typeof data.errors === "object") {
        // ASP.NET ModelState / FluentValidation ProblemDetails — sahə xətalarını göstər
        const all = [];
        Object.keys(data.errors).forEach(function (k) {
          const v = data.errors[k];
          if (Array.isArray(v)) v.forEach(x => all.push(x)); else all.push(String(v));
        });
        msg = all.join("\n");
      } else if (data && data.error) {
        msg = data.error;
      } else if (data && data.title) {
        msg = data.title;
      } else {
        msg = "Xəta baş verdi (" + res.status + ")";
      }
      throw new ApiError(msg, res.status, data);
    }
    return data;
  }

  function ApiError(message, status, data) {
    this.name = "ApiError";
    this.message = message;
    this.status = status;
    this.data = data;
  }
  ApiError.prototype = Object.create(Error.prototype);

  const get = (u) => request("GET", u);
  const post = (u, b) => request("POST", u, b);
  const put = (u, b) => request("PUT", u, b);
  const del = (u) => request("DELETE", u);
  const qs = (params) => {
    const p = new URLSearchParams();
    Object.keys(params || {}).forEach(function (k) {
      const v = params[k];
      if (v !== undefined && v !== null && v !== "") p.append(k, v);
    });
    const s = p.toString();
    return s ? ("?" + s) : "";
  };

  global.API = {
    ApiError: ApiError,

    dashboard: {
      stats:        () => get("/api/dashboard/stats"),
      notifications:() => get("/api/dashboard/notifications"),
      dailyItems:   () => get("/api/dashboard/daily-items"),
      overdue:      () => get("/api/dashboard/overdue"),
    },

    customers: {
      list:    ()        => get("/api/customers"),
      get:     (id)      => get("/api/customers/" + id),
      profile: (id)      => get("/api/customers/" + id + "/profile"),
      invoices:(id, cl)  => get("/api/customers/" + id + "/invoices" + qs({ closed: cl })),
      invoicesPrint:(id) => get("/api/customers/" + id + "/invoices/print"),
      ledger:  (id)      => get("/api/customers/" + id + "/ledger"),
      create:  (dto)     => post("/api/customers", dto),
      update:  (id, dto) => put("/api/customers/" + id, dto),
      remove:  (id)      => del("/api/customers/" + id),
    },

    categories: {
      list:    (kind)    => get("/api/categories" + qs({ kind: kind })),
      get:     (id)      => get("/api/categories/" + id),
      children:(id)      => get("/api/categories/" + id + "/children"),
      create:  (dto)     => post("/api/categories", dto),
      update:  (id, dto) => put("/api/categories/" + id, dto),
      remove:  (id)      => del("/api/categories/" + id),
    },

    inventory: {
      list:    ()        => get("/api/inventory"),
      get:     (id)      => get("/api/inventory/" + id),
      holders: (id)      => get("/api/inventory/" + id + "/holders"),
      rented:  ()        => get("/api/inventory/rented"),
      create:  (dto)     => post("/api/inventory", dto),
      update:  (id, dto) => put("/api/inventory/" + id, dto),
      remove:  (id)      => del("/api/inventory/" + id),
    },

    invoices: {
      list:    (search, status) => get("/api/invoices" + qs({ search: search, status: status })),
      nextNo:  ()        => get("/api/invoices/next-no"),
      get:     (id)      => get("/api/invoices/" + id),
      print:   (id)      => get("/api/invoices/" + id + "/print"),
      create:  (dto)     => post("/api/invoices", dto),
      update:  (id, dto) => put("/api/invoices/" + id, dto),
      close:   (id)      => post("/api/invoices/" + id + "/close"),
      remove:  (id)      => del("/api/invoices/" + id),
    },

    payments: {
      byInvoice: (invoiceId)  => get("/api/payments/invoice/" + invoiceId),
      byCustomer:(customerId) => get("/api/payments/customer/" + customerId),
      summary:   (invoiceId)  => get("/api/payments/invoice/" + invoiceId + "/summary"),
      add:       (dto)        => post("/api/payments", dto),
    },

    ledger: {
      get:             (customerId) => get("/api/ledger/" + customerId),
      addDebt:         (dto) => post("/api/ledger/debt", dto),
      payDebt:         (dto) => post("/api/ledger/debt/pay", dto),
      addDeposit:      (dto) => post("/api/ledger/deposit", dto),
      withdrawDeposit: (dto) => post("/api/ledger/deposit/withdraw", dto),
    },

    extensions: {
      history: (invoiceId)            => get("/api/invoices/" + invoiceId + "/extensions"),
      preview: (invoiceId, periods, mode) => get("/api/invoices/" + invoiceId + "/extension-preview" + qs({ periods: periods, mode: mode })),
      extend:  (invoiceId, dto)       => post("/api/invoices/" + invoiceId + "/extend", dto),
    },

    returns: {
      history: (invoiceId)      => get("/api/invoices/" + invoiceId + "/returns"),
      partial: (invoiceId, dto) => post("/api/invoices/" + invoiceId + "/return/partial", dto),
      full:    (invoiceId, dto) => post("/api/invoices/" + invoiceId + "/return/full", dto),
    },

    users: {
      list:     ()        => get("/api/users"),
      get:      (id)      => get("/api/users/" + id),
      create:   (dto)     => post("/api/users", dto),
      update:   (id, dto) => put("/api/users/" + id, dto),
      password: (id, dto) => post("/api/users/" + id + "/password", dto),
      setActive:(id, val) => post("/api/users/" + id + "/active", { isActive: val }),
      remove:   (id)      => del("/api/users/" + id),
    },

    account: {
      switchBranch: (branchId) => post("/Account/SwitchBranch?branchId=" + branchId),
    },

    branches: {
      list:        ()        => get("/api/branches"),
      get:         (id)      => get("/api/branches/" + id),
      create:      (dto)     => post("/api/branches", dto),
      update:      (id, dto) => put("/api/branches/" + id, dto),
      remove:      (id)      => del("/api/branches/" + id),
      forceRemove: (id)      => del("/api/branches/" + id + "/force"),
    },

    reports: {
      invoices: (params) => get("/api/reports/invoices" + qs(params)),
      payments: (params) => get("/api/reports/payments" + qs(params)),
      debtors:  ()       => get("/api/reports/debtors"),
      // Export — fayl yükləmək üçün birbaşa URL (yeni tab/link ilə açılır)
      invoicesExportUrl: (params) => "/api/reports/invoices/export" + qs(params),
      paymentsExportUrl: (params) => "/api/reports/payments/export" + qs(params),
      debtorsExportUrl:  ()       => "/api/reports/debtors/export",
    },
  };
})(window);
