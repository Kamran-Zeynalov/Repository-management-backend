/* deposits.js — yalnız >0 depozitlər; qaytarma (edit gated) */
(function () {
  "use strict";
  var D = window.DB;
  var tbody = document.getElementById("depTable");
  var kpi = document.getElementById("depKpi");

  function render() {
    var list = D.getActiveDeposits();
    var total = list.reduce(function (s, d) { return s + d.amount; }, 0);
    kpi.innerHTML =
      '<div class="kpi-card deposit"><div class="label">Ümumi depozit</div><div class="num">' + D.money(total) + "</div></div>" +
      '<div class="kpi-card"><div class="label">Depozit sayı</div><div class="num">' + list.length + "</div></div>";

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6">Aktiv depozit yoxdur.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (d) {
      var c = D.getCustomer(d.customerId) || {};
      var inv = D.getInvoice(d.invoiceId) || {};
      var actions = '<a class="action-btn view" href="invoice-detail.html?id=' + d.invoiceId + '">Qaimə</a>';
      if (D.can("edit")) actions += '<button class="action-btn return" data-ret="' + d.id + '">Qaytar</button>';
      return (
        '<tr><td><strong>' + (c.name || "—") + "</strong></td>" +
        "<td>" + (inv.number || "—") + "</td>" +
        '<td><span class="balance-positive" style="color:#6d28d9">' + D.money(d.amount) + "</span></td>" +
        "<td>" + d.date + "</td>" +
        '<td><span class="badge violet">' + d.status + "</span></td>" +
        '<td><div class="action-cell">' + actions + "</div></td></tr>"
      );
    }).join("");

    tbody.querySelectorAll("[data-ret]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!D.can("edit")) return;
        var id = +b.getAttribute("data-ret");
        if (!confirm("Depozit qaytarılsın? (mock)")) return;
        var dep = D.deposits.find(function (x) { return x.id === id; });
        if (dep) { dep.amount = 0; dep.status = "Qaytarılıb"; }
        render();
      });
    });
  }

  document.addEventListener("rolechanged", render);
  render();
})();
