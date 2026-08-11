/* customer-detail.js — müştəri xülasəsi + qaimə tarixçəsi */
(function () {
  "use strict";
  var D = window.DB;
  var root = document.getElementById("custRoot");
  var id = new URLSearchParams(window.location.search).get("id");
  var c = id ? D.getCustomer(id) : null;

  if (!c) {
    root.innerHTML = '<div class="no-access"><div class="icon">🔍</div><h2>Müştəri tapılmadı</h2><p>Belə müştəri mövcud deyil.</p></div>';
    return;
  }

  function statusBadge(s) {
    var cls = s === "Aktiv" ? "blue" : s === "Gecikir" ? "amber" : "gray";
    return '<span class="badge ' + cls + '">' + s + "</span>";
  }

  function render() {
    var debt = D.getCustomerDebt(c.id);
    var dep = D.getCustomerDeposit(c.id);
    var invs = D.getCustomerInvoices(c.id);
    var totalRented = invs.reduce(function (s, i) { return s + D.invoiceTotal(i); }, 0);

    var rows = invs.length
      ? invs.map(function (inv) {
          return (
            '<tr><td><a class="invoice-link-mini" href="invoice-detail.html?id=' + inv.id + '" style="font-size:14px;font-weight:700">' + inv.number + "</a></td>" +
            "<td>" + inv.date + "</td><td>" + inv.dueDate + "</td>" +
            "<td>" + D.money(D.invoiceTotal(inv)) + "</td>" +
            "<td>" + D.money(inv.paid) + "</td>" +
            '<td><span class="balance-negative">' + D.money(D.invoiceDebt(inv)) + "</span></td>" +
            "<td>" + statusBadge(inv.status) + "</td>" +
            '<td><a class="action-btn view" href="invoice-detail.html?id=' + inv.id + '">Bax</a></td></tr>'
          );
        }).join("")
      : '<tr><td colspan="8">Bu müştəriyə aid qaimə yoxdur.</td></tr>';

    root.innerHTML =
      '<div class="invoice-view-hero cust-head"><div><h2>' + c.name + "</h2>" +
      '<div class="muted">📞 ' + c.phone + "</div>" +
      '<div class="muted">📍 ' + (c.address || "—") + "</div>" +
      (c.note ? '<div class="muted">📝 ' + c.note + "</div>" : "") + "</div></div>" +

      '<div class="kpi-row">' +
      '<div class="kpi-card debt"><div class="label">Ümumi borc</div><div class="num">' + D.money(debt) + "</div></div>" +
      '<div class="kpi-card deposit"><div class="label">Depozit</div><div class="num">' + D.money(dep) + "</div></div>" +
      '<div class="kpi-card"><div class="label">Qaimə sayı</div><div class="num">' + invs.length + "</div></div>" +
      '<div class="kpi-card paid"><div class="label">Ümumi icarə</div><div class="num">' + D.money(totalRented) + "</div></div>" +
      "</div>" +

      '<div class="section-card"><div class="section-header"><div><h2>Qaimə tarixçəsi</h2>' +
      "<p>Bu müştərinin bütün qaimələri</p></div></div>" +
      '<div class="table-wrap"><table style="min-width:820px"><thead><tr>' +
      "<th>Qaimə №</th><th>Tarix</th><th>Qaytarma</th><th>Məbləğ</th><th>Ödənilən</th><th>Borc</th><th>Status</th><th></th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";
  }

  document.addEventListener("rolechanged", render);
  render();
})();
