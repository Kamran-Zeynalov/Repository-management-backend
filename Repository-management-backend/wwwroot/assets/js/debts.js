/* debts.js — yalnız borcu >0 olan müştərilər */
(function () {
  "use strict";
  var D = window.DB;
  var tbody = document.getElementById("debtTable");
  var kpi = document.getElementById("debtKpi");
  var search = document.getElementById("debtSearch");

  function overdueCount(custId) {
    return D.getCustomerInvoices(custId).filter(function (i) {
      return i.status === "Gecikir" && D.invoiceDebt(i) > 0;
    }).length;
  }

  function render() {
    var term = (search.value || "").trim().toLowerCase();
    var debtors = D.getDebtors().filter(function (x) {
      return !term || x.customer.name.toLowerCase().indexOf(term) !== -1;
    });

    var totalDebt = D.getDebtors().reduce(function (s, x) { return s + x.debt; }, 0);
    kpi.innerHTML =
      '<div class="kpi-card debt"><div class="label">Ümumi borc</div><div class="num">' + D.money(totalDebt) + "</div></div>" +
      '<div class="kpi-card"><div class="label">Borclu müştəri</div><div class="num">' + D.getDebtors().length + "</div></div>";

    if (!debtors.length) {
      tbody.innerHTML = '<tr><td colspan="5">Borclu müştəri yoxdur. 🎉</td></tr>';
      return;
    }
    tbody.innerHTML = debtors.map(function (x) {
      var c = x.customer;
      var oc = overdueCount(c.id);
      var rowCls = x.debt > 800 ? "row-risk-high" : x.debt > 300 ? "row-risk-medium" : "row-risk-low";
      return (
        '<tr class="' + rowCls + '"><td><strong>' + c.name + "</strong></td>" +
        "<td>" + c.phone + "</td>" +
        "<td>" + (oc ? '<span class="badge amber">' + oc + " gecikən</span>" : '<span class="badge gray">—</span>') + "</td>" +
        '<td><span class="balance-negative">' + D.money(x.debt) + "</span></td>" +
        '<td><a class="action-btn view" href="customer-detail.html?id=' + c.id + '">Bax</a></td></tr>'
      );
    }).join("");
  }

  search.addEventListener("input", render);
  document.addEventListener("rolechanged", render);
  render();
})();
