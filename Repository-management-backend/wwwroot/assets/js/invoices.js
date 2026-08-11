/* invoices.js — qaimələr siyahısı, axtarış/filter, rol-əsaslı düymələr */
(function () {
  "use strict";
  var D = window.DB;
  var tbody = document.getElementById("invoiceTable");
  var searchInput = document.getElementById("invoiceSearch");
  var statusSel = document.getElementById("statusFilter");
  var clearBtn = document.getElementById("clearFilters");

  function statusBadge(status) {
    var cls = status === "Aktiv" ? "blue" : status === "Gecikir" ? "amber" : "gray";
    return '<span class="badge ' + cls + '">' + status + "</span>";
  }

  function rowHtml(inv) {
    var c = D.getCustomer(inv.customerId) || {};
    var total = D.invoiceTotal(inv);
    var debt = D.invoiceDebt(inv);
    var debtCell = debt > 0
      ? '<span class="balance-negative">' + D.money(debt) + "</span>"
      : '<span class="balance-positive">0 ₼</span>';

    var actions = '<a class="action-btn view" href="invoice-detail.html?id=' + inv.id + '">Bax</a>';
    if (D.can("delete")) {
      actions += '<button class="action-btn delete" data-del="' + inv.id + '">Sil</button>';
    }

    return (
      "<tr>" +
      '<td><span class="inv-number">' + inv.number + "</span></td>" +
      "<td>" + (c.name || "—") + "</td>" +
      "<td>" + (c.phone || "—") + "</td>" +
      "<td>" + inv.date + "</td>" +
      "<td>" + inv.dueDate + "</td>" +
      "<td>" + D.money(total) + "</td>" +
      "<td>" + D.money(inv.paid) + "</td>" +
      "<td>" + debtCell + "</td>" +
      "<td>" + statusBadge(inv.status) + "</td>" +
      '<td><div class="action-cell">' + actions + "</div></td>" +
      "</tr>"
    );
  }

  function render() {
    var term = (searchInput.value || "").trim();
    var status = statusSel.value;
    var list = term ? D.searchInvoices(term) : D.getInvoices();
    if (status !== "all") list = list.filter(function (i) { return i.status === status; });

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="10">Heç bir qaimə tapılmadı.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(rowHtml).join("");

    tbody.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!D.can("delete")) return;
        var id = +b.getAttribute("data-del");
        if (!confirm("Qaimə silinsin? (mock — yalnız nümayiş)")) return;
        var idx = D.invoices.findIndex(function (x) { return x.id === id; });
        if (idx > -1) D.invoices.splice(idx, 1);
        render();
      });
    });
  }

  searchInput.addEventListener("input", render);
  statusSel.addEventListener("change", render);
  clearBtn.addEventListener("click", function () {
    searchInput.value = "";
    statusSel.value = "all";
    render();
  });

  // rol dəyişəndə düymələri yenilə
  document.addEventListener("rolechanged", render);

  render();
})();
