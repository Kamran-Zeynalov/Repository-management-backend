/* warehouse.js — anbar; sıfır-stok xəbərdarlığı (blok etmir); rol-gated CRUD */
(function () {
  "use strict";
  var D = window.DB;
  var tbody = document.getElementById("whTable");
  var warn = document.getElementById("zeroWarn");
  var search = document.getElementById("whSearch");
  var addBtn = document.getElementById("addProdBtn");

  function stockState(p) {
    if (p.stock === 0) return '<span class="badge red">Stok bitib</span>';
    if (p.stock <= p.min) return '<span class="badge amber">Az qalıb</span>';
    return '<span class="badge green">Kifayət</span>';
  }

  function rowHtml(p) {
    var cat = D.getCategory(p.categoryId) || {};
    var stockCls = p.stock === 0 ? "inventory-low" : p.stock <= p.min ? "inventory-low" : "inventory-positive";
    var actions = "";
    if (D.can("edit")) actions += '<button class="action-btn edit" data-edit="' + p.id + '">Düzəliş</button>';
    if (D.can("delete")) actions += '<button class="action-btn delete" data-del="' + p.id + '">Sil</button>';
    if (!actions) actions = '<span class="muted" style="font-size:12px">Yalnız baxış</span>';

    return (
      '<tr><td><span class="prod-name">' + p.name + "</span></td>" +
      "<td>" + (cat.name || "—") + "</td>" +
      '<td><span class="' + stockCls + '">' + p.stock + " " + p.unit + "</span></td>" +
      "<td>" + p.rented + " " + p.unit + "</td>" +
      "<td>" + p.min + "</td>" +
      "<td>" + D.money(p.price) + "</td>" +
      "<td>" + stockState(p) + "</td>" +
      '<td><div class="action-cell">' + actions + "</div></td></tr>"
    );
  }

  function render() {
    var term = (search.value || "").trim().toLowerCase();
    var data = D.getProducts().filter(function (p) {
      return !term || p.name.toLowerCase().indexOf(term) !== -1;
    });

    var zeros = D.getProducts().filter(function (p) { return p.stock === 0; });
    warn.innerHTML = zeros.length
      ? '<div class="warn-banner">⚠️ ' + zeros.length + " məhsulun stoku bitib: " +
        zeros.map(function (p) { return p.name; }).join(", ") +
        ". Qaimə yaratmaq mümkündür (bloklanmır).</div>"
      : "";

    tbody.innerHTML = data.length ? data.map(rowHtml).join("") : '<tr><td colspan="8">Məhsul tapılmadı.</td></tr>';

    tbody.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openForm(D.getProduct(+b.getAttribute("data-edit"))); });
    });
    tbody.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!D.can("delete")) return;
        var pid = +b.getAttribute("data-del");
        if (!confirm("Məhsul silinsin? (mock)")) return;
        var i = D.products.findIndex(function (x) { return x.id === pid; });
        if (i > -1) D.products.splice(i, 1);
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

  function catOptions(sel) {
    return D.getCategories().map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + c.name + "</option>";
    }).join("");
  }

  function openForm(prod) {
    var editing = !!prod;
    if (editing ? !D.can("edit") : !D.can("create")) return;
    prod = prod || { name: "", categoryId: D.getCategories()[0].id, stock: 0, rented: 0, min: 0, price: 0, unit: "ədəd" };
    var ov = modal(
      '<div class="modal-head"><h3>' + (editing ? "Məhsul düzəlişi" : "Yeni məhsul") + "</h3></div>" +
      '<div class="form-grid-2">' +
      '<div class="form-group full"><label>Ad</label><input id="mpName" value="' + prod.name + '" /></div>' +
      '<div class="form-group full"><label>Kateqoriya</label><select id="mpCat">' + catOptions(prod.categoryId) + "</select></div>" +
      '<div class="form-group"><label>Anbarda</label><input id="mpStock" type="number" value="' + prod.stock + '" /></div>' +
      '<div class="form-group"><label>İcarədə</label><input id="mpRented" type="number" value="' + prod.rented + '" /></div>' +
      '<div class="form-group"><label>Minimum</label><input id="mpMin" type="number" value="' + prod.min + '" /></div>' +
      '<div class="form-group"><label>Qiymət (₼)</label><input id="mpPrice" type="number" value="' + prod.price + '" /></div></div>' +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn" id="mpSave">Yadda saxla</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#mpSave").addEventListener("click", function () {
      var name = document.getElementById("mpName").value.trim();
      if (!name) { alert("Ad daxil edin."); return; }
      var data = {
        name: name,
        categoryId: +document.getElementById("mpCat").value,
        stock: +document.getElementById("mpStock").value || 0,
        rented: +document.getElementById("mpRented").value || 0,
        min: +document.getElementById("mpMin").value || 0,
        price: +document.getElementById("mpPrice").value || 0,
        unit: prod.unit || "ədəd",
      };
      if (editing) Object.assign(prod, data);
      else {
        var id = Math.max.apply(null, D.products.map(function (x) { return x.id; }).concat(0)) + 1;
        D.products.push(Object.assign({ id: id }, data));
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
