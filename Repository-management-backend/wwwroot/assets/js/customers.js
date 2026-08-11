/* customers.js — müştəri siyahısı, axtarış, əlavə/edit/sil (rol-gated) */
(function () {
  "use strict";
  var D = window.DB;
  var list = document.getElementById("custList");
  var search = document.getElementById("custSearch");
  var addBtn = document.getElementById("addCustBtn");

  function cardHtml(c) {
    var debt = D.getCustomerDebt(c.id);
    var dep = D.getCustomerDeposit(c.id);
    var actions = '<a class="action-btn view" href="customer-detail.html?id=' + c.id + '">Bax</a>';
    if (D.can("edit")) actions += '<button class="action-btn edit" data-edit="' + c.id + '">Düzəliş</button>';
    if (D.can("delete")) actions += '<button class="action-btn delete" data-del="' + c.id + '">Sil</button>';

    return (
      '<div class="customer-row-card"><div class="customer-row-top">' +
      '<div class="customer-main-info">' +
      '<div class="customer-name-line"><h3>' + c.name + "</h3></div>" +
      '<div class="customer-mini-meta"><span>📞 ' + c.phone + "</span><span>📍 " + (c.address || "—") + "</span></div>" +
      '<div class="customer-mini-pills">' +
      '<span class="customer-mini-pill debt">Borc: ' + D.money(debt) + "</span>" +
      '<span class="customer-mini-pill deposit">Depozit: ' + D.money(dep) + "</span></div></div>" +
      '<div class="customer-row-actions">' + actions + "</div></div></div>"
    );
  }

  function render() {
    var term = (search.value || "").trim().toLowerCase();
    var data = D.getCustomers().filter(function (c) {
      if (!term) return true;
      return (
        c.name.toLowerCase().indexOf(term) !== -1 ||
        (c.phone || "").toLowerCase().indexOf(term) !== -1 ||
        (c.address || "").toLowerCase().indexOf(term) !== -1
      );
    });
    list.innerHTML = data.length
      ? data.map(cardHtml).join("")
      : '<div class="empty">Müştəri tapılmadı.</div>';

    list.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openForm(D.getCustomer(+b.getAttribute("data-edit"))); });
    });
    list.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!D.can("delete")) return;
        var id = +b.getAttribute("data-del");
        if (!confirm("Müştəri silinsin? (mock)")) return;
        var i = D.customers.findIndex(function (x) { return x.id === id; });
        if (i > -1) D.customers.splice(i, 1);
        render();
      });
    });
  }

  function modal(html) {
    var ov = document.createElement("div");
    ov.className = "modal-overlay";
    ov.innerHTML = '<div class="modal-card small-modal">' + html + "</div>";
    document.body.appendChild(ov);
    ov.addEventListener("click", function (e) { if (e.target === ov) ov.remove(); });
    return ov;
  }

  function openForm(cust) {
    var editing = !!cust;
    if (editing ? !D.can("edit") : !D.can("create")) return;
    cust = cust || { name: "", phone: "", address: "", note: "" };
    var ov = modal(
      '<div class="modal-head"><h3>' + (editing ? "Müştəri düzəlişi" : "Yeni müştəri") + "</h3></div>" +
      '<div class="form-grid-2">' +
      '<div class="form-group full"><label>Ad / Şirkət</label><input id="mcName" value="' + cust.name + '" /></div>' +
      '<div class="form-group"><label>Telefon</label><input id="mcPhone" value="' + cust.phone + '" /></div>' +
      '<div class="form-group"><label>Qeyd</label><input id="mcNote" value="' + (cust.note || "") + '" /></div>' +
      '<div class="form-group full"><label>Ünvan</label><input id="mcAddr" value="' + (cust.address || "") + '" /></div></div>' +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn" id="mcSave">Yadda saxla</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#mcSave").addEventListener("click", function () {
      var name = document.getElementById("mcName").value.trim();
      if (!name) { alert("Ad daxil edin."); return; }
      var data = {
        name: name,
        phone: document.getElementById("mcPhone").value.trim(),
        address: document.getElementById("mcAddr").value.trim(),
        note: document.getElementById("mcNote").value.trim(),
      };
      if (editing) {
        Object.assign(cust, data);
      } else {
        var id = Math.max.apply(null, D.customers.map(function (x) { return x.id; }).concat(0)) + 1;
        D.customers.push(Object.assign({ id: id }, data));
      }
      ov.remove();
      render();
    });
  }

  if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });
  search.addEventListener("input", render);
  document.addEventListener("rolechanged", render);
  render();
})();
