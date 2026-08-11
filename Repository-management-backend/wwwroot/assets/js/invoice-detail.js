/* invoice-detail.js — bir qaimənin detalı + ödəniş/uzatma/bağlama modalları + çap */
(function () {
  "use strict";
  var D = window.DB;
  var root = document.getElementById("detailRoot");

  function qid() {
    var m = new URLSearchParams(window.location.search).get("id");
    return m ? +m : null;
  }
  var invId = qid();
  var inv = invId ? D.getInvoice(invId) : null;

  if (!inv) {
    root.innerHTML =
      '<div class="no-access"><div class="icon">🔍</div>' +
      "<h2>Qaimə tapılmadı</h2><p>Belə bir qaimə mövcud deyil və ya silinib.</p></div>";
    return;
  }

  // Aylıq icarə (mallardan hesablanır) — uzatmada SABİT baza
  function monthlyRent() {
    return D.getInvoiceItems(inv.id).reduce(function (s, it) { return s + it.qty * it.price; }, 0);
  }
  function addMonth(dateStr) {
    var d = new Date(dateStr);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  }
  function statusBadge(s) {
    var cls = s === "Aktiv" ? "blue" : s === "Gecikir" ? "amber" : "gray";
    return '<span class="badge ' + cls + '">' + s + "</span>";
  }

  function render() {
    var c = D.getCustomer(inv.customerId) || {};
    var items = D.getInvoiceItems(inv.id);
    var pays = D.getInvoicePayments(inv.id);
    var total = D.invoiceTotal(inv);
    var debt = D.invoiceDebt(inv);

    var itemsRows = items.length
      ? items.map(function (it) {
          var p = D.getProduct(it.productId) || {};
          return (
            "<tr><td>" + (p.name || "—") + "</td><td>" + it.qty + "</td><td>" +
            D.money(it.price) + "</td><td>" + D.money(it.qty * it.price) + "</td><td>" +
            (it.note || "—") + "</td></tr>"
          );
        }).join("")
      : '<tr><td colspan="5">Mal yoxdur.</td></tr>';

    var payRows = pays.length
      ? pays.map(function (p) {
          return (
            '<div class="invoice-payment-item"><div class="invoice-payment-top">' +
            "<strong>" + D.money(p.amount) + "</strong>" +
            '<span class="invoice-payment-meta">' + p.date + "</span></div>" +
            '<div class="invoice-payment-note">' + (p.note || "—") + "</div></div>"
          );
        }).join("")
      : '<div class="empty-history">Ödəniş tarixçəsi yoxdur.</div>';

    // Rol-əsaslı düymələr
    var btns = '<button class="secondary-btn" id="printBtn">🖨️ Çap et</button>';
    if (D.can("addPayment") && inv.status !== "Bağlanıb")
      btns += '<button class="primary-btn" id="payBtn">+ Ödəniş əlavə et</button>';
    if (D.can("edit") && inv.status !== "Bağlanıb")
      btns += '<button class="secondary-btn" id="extendBtn">📅 Vaxtı artır</button>';
    if (D.can("edit") && inv.status !== "Bağlanıb")
      btns += '<button class="secondary-btn danger-outline" id="closeBtn">Bağla</button>';

    root.innerHTML =
      '<div class="print-only print-head"><h2>Kapital A.S. MMC — Qaimə ' + inv.number + "</h2>" +
      "<p>" + (c.name || "") + " · " + (c.phone || "") + "</p></div>" +

      '<div class="invoice-view-hero">' +
      "<div><h2>" + inv.number + "</h2>" +
      '<div class="muted">' + (c.name || "—") + " · " + (c.phone || "—") + "</div>" +
      '<div class="muted">Tarix: ' + inv.date + " · Qaytarma: " + inv.dueDate + "</div></div>" +
      '<div class="invoice-view-badges">' + statusBadge(inv.status) +
      '<div class="detail-actions no-print">' + btns + "</div></div></div>" +

      '<div class="kpi-row">' +
      '<div class="kpi-card"><div class="label">Ümumi məbləğ</div><div class="num">' + D.money(total) + "</div></div>" +
      '<div class="kpi-card paid"><div class="label">Ödənilən</div><div class="num">' + D.money(inv.paid) + "</div></div>" +
      '<div class="kpi-card deposit"><div class="label">Depozit</div><div class="num">' + D.money(inv.deposit) + "</div></div>" +
      '<div class="kpi-card debt"><div class="label">Qalan borc</div><div class="num">' + D.money(debt) + "</div></div>" +
      "</div>" +

      '<div class="section-card items-table-card"><div class="section-header"><div>' +
      "<h2>Mallar</h2><p>Aylıq icarə: " + D.money(monthlyRent()) + " (nəqliyyat və əlavə xidmət ayrıca)</p></div></div>" +
      '<div class="table-wrap"><table style="min-width:640px"><thead><tr>' +
      "<th>Məhsul</th><th>Say</th><th>Qiymət</th><th>Cəmi</th><th>Qeyd</th></tr></thead>" +
      "<tbody>" + itemsRows + "</tbody></table></div>" +
      '<div class="invoice-view-total" style="padding:14px 16px">' +
      '<span class="total-pill">Nəqliyyat: ' + D.money(inv.transport) + "</span>" +
      '<span class="total-pill">Əlavə xidmət: ' + D.money(inv.extraService) + "</span>" +
      '<span class="total-pill">Ümumi: ' + D.money(total) + "</span></div></div>" +

      '<div class="section-card pay-history"><div class="section-header"><div>' +
      "<h2>Ödəniş tarixçəsi</h2><p>Bu qaimə üzrə ödənişlər</p></div></div>" +
      '<div class="invoice-payment-history-list">' + payRows + "</div></div>";

    wire();
  }

  function wire() {
    var pr = document.getElementById("printBtn");
    if (pr) pr.addEventListener("click", function () { window.print(); });
    var pay = document.getElementById("payBtn");
    if (pay) pay.addEventListener("click", openPay);
    var ext = document.getElementById("extendBtn");
    if (ext) ext.addEventListener("click", openExtend);
    var cl = document.getElementById("closeBtn");
    if (cl) cl.addEventListener("click", openClose);
  }

  /* --------------------------------------------------------------- Modal köməkçi */
  function modal(html) {
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = '<div class="modal-card small-modal">' + html + "</div>";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    return ov;
  }

  function openPay() {
    if (!D.can("addPayment")) return;
    var debt = D.invoiceDebt(inv);
    var ov = modal(
      '<div class="modal-head"><h3>Ödəniş əlavə et</h3></div>' +
      '<div class="form-grid-2">' +
      '<div class="form-group"><label>Məbləğ (₼)</label><input type="number" id="mPayAmount" min="0" value="' + debt + '" /></div>' +
      '<div class="form-group"><label>Tarix</label><input type="date" id="mPayDate" value="' + new Date().toISOString().slice(0,10) + '" /></div>' +
      '<div class="form-group full"><label>Qeyd</label><input type="text" id="mPayNote" placeholder="(istəyə bağlı)" /></div></div>' +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn" id="mPaySave">Yadda saxla</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#mPaySave").addEventListener("click", function () {
      var amt = +document.getElementById("mPayAmount").value || 0;
      if (amt <= 0) { alert("Məbləğ daxil edin."); return; }
      var id = Math.max.apply(null, D.payments.map(function (p) { return p.id; }).concat(0)) + 1;
      D.payments.push({ id: id, invoiceId: inv.id, amount: amt, date: document.getElementById("mPayDate").value, note: document.getElementById("mPayNote").value });
      inv.paid += amt;
      if (D.invoiceDebt(inv) === 0 && inv.status === "Gecikir") inv.status = "Aktiv";
      ov.remove();
      render();
    });
  }

  function openExtend() {
    if (!D.can("edit")) return;
    var rent = monthlyRent();
    var newDue = addMonth(inv.dueDate);
    // QEYD: nəqliyyat və əlavə xidmət BURADA göstərilmir və yenidən hesablanmır.
    var ov = modal(
      '<div class="modal-head"><h3>Vaxtı artır (+1 ay)</h3></div>' +
      '<div class="extension-summary-grid">' +
      '<div class="extension-summary-card"><span>Aylıq icarə borcu</span><strong>' + D.money(rent) + "</strong></div>" +
      '<div class="extension-summary-card"><span>Cari qaytarma</span><strong>' + inv.dueDate + "</strong></div>" +
      '<div class="extension-summary-card"><span>Yeni qaytarma</span><strong>' + newDue + "</strong></div></div>" +
      '<div class="close-helper-box">Nəqliyyat və əlavə xidmət <strong>yenidən hesablanmır</strong> — yalnız aylıq icarə əlavə olunur.</div>' +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn" id="mExtSave">Təsdiqlə</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#mExtSave").addEventListener("click", function () {
      inv.monthlyTotal += rent;       // yalnız aylıq icarə əlavə olunur
      inv.dueDate = newDue;           // qaytarma 1 ay irəli
      ov.remove();
      render();
    });
  }

  function openClose() {
    if (!D.can("edit")) return;
    var ov = modal(
      '<div class="modal-head"><h3>Qaiməni bağla</h3></div>' +
      '<div class="close-helper-box">Qaimə <strong>Bağlanıb</strong> statusuna keçəcək. Qalan borc: ' +
      D.money(D.invoiceDebt(inv)) + "</div>" +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn danger-outline" id="mCloseSave">Bağla</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#mCloseSave").addEventListener("click", function () {
      inv.status = "Bağlanıb";
      ov.remove();
      render();
    });
  }

  document.addEventListener("rolechanged", render);
  render();
})();
