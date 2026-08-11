/* categories.js — kateqoriyalar (aylıq/günlük), ana/alt struktur, rol-gated CRUD */
(function () {
  "use strict";
  var D = window.DB;
  var tbody = document.getElementById("catTable");
  var addBtn = document.getElementById("addCatBtn");

  function typeBadge(t) {
    return t === "daily"
      ? '<span class="badge violet">Günlük</span>'
      : '<span class="badge blue">Aylıq</span>';
  }
  function productCount(catId) {
    return D.getProducts().filter(function (p) { return p.categoryId === catId; }).length;
  }

  function rowHtml(c) {
    var parent = c.parentId ? (D.getCategory(c.parentId) || {}).name : "—";
    var nameCls = c.parentId ? "cat-sub" : "cat-name";
    var actions = "";
    if (D.can("edit")) actions += '<button class="action-btn edit" data-edit="' + c.id + '">Düzəliş</button>';
    if (D.can("delete")) actions += '<button class="action-btn delete" data-del="' + c.id + '">Sil</button>';
    if (!actions) actions = '<span class="muted" style="font-size:12px">Yalnız baxış</span>';

    return (
      '<tr><td><span class="' + nameCls + '">' + (c.parentId ? "↳ " : "") + c.name + "</span></td>" +
      "<td>" + typeBadge(c.type) + "</td>" +
      "<td>" + parent + "</td>" +
      "<td>" + productCount(c.id) + "</td>" +
      "<td>" + (c.note || "—") + "</td>" +
      '<td><div class="action-cell">' + actions + "</div></td></tr>"
    );
  }

  // Ana kateqoriyalar, sonra altları — sıralı göstəririk
  function ordered() {
    var cats = D.getCategories();
    var tops = cats.filter(function (c) { return !c.parentId; });
    var out = [];
    tops.forEach(function (t) {
      out.push(t);
      cats.filter(function (c) { return c.parentId === t.id; }).forEach(function (s) { out.push(s); });
    });
    return out;
  }

  function render() {
    var data = ordered();
    tbody.innerHTML = data.length ? data.map(rowHtml).join("") : '<tr><td colspan="6">Kateqoriya yoxdur.</td></tr>';
    tbody.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () { openForm(D.getCategory(+b.getAttribute("data-edit"))); });
    });
    tbody.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!D.can("delete")) return;
        var id = +b.getAttribute("data-del");
        if (!confirm("Kateqoriya silinsin? (mock)")) return;
        var i = D.categories.findIndex(function (x) { return x.id === id; });
        if (i > -1) D.categories.splice(i, 1);
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
  function parentOptions(sel) {
    var opt = '<option value="">— Yoxdur (ana kateqoriya) —</option>';
    opt += D.getCategories().filter(function (c) { return !c.parentId; }).map(function (c) {
      return '<option value="' + c.id + '"' + (c.id === sel ? " selected" : "") + ">" + c.name + "</option>";
    }).join("");
    return opt;
  }

  function openForm(cat) {
    var editing = !!cat;
    if (editing ? !D.can("edit") : !D.can("create")) return;
    cat = cat || { name: "", type: "monthly", parentId: null, note: "" };
    var ov = modal(
      '<div class="modal-head"><h3>' + (editing ? "Kateqoriya düzəlişi" : "Yeni kateqoriya") + "</h3></div>" +
      '<div class="form-grid-2">' +
      '<div class="form-group full"><label>Ad</label><input id="mkName" value="' + cat.name + '" /></div>' +
      '<div class="form-group"><label>Növ</label><select id="mkType">' +
      '<option value="monthly"' + (cat.type === "monthly" ? " selected" : "") + ">Aylıq</option>" +
      '<option value="daily"' + (cat.type === "daily" ? " selected" : "") + ">Günlük</option></select></div>" +
      '<div class="form-group"><label>Ana kateqoriya</label><select id="mkParent">' + parentOptions(cat.parentId) + "</select></div>" +
      '<div class="form-group full"><label>Qeyd</label><input id="mkNote" value="' + (cat.note || "") + '" /></div></div>' +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn" id="mkSave">Yadda saxla</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#mkSave").addEventListener("click", function () {
      var name = document.getElementById("mkName").value.trim();
      if (!name) { alert("Ad daxil edin."); return; }
      var pv = document.getElementById("mkParent").value;
      var data = {
        name: name,
        type: document.getElementById("mkType").value,
        parentId: pv ? +pv : null,
        note: document.getElementById("mkNote").value.trim(),
      };
      if (editing) Object.assign(cat, data);
      else {
        var id = Math.max.apply(null, D.categories.map(function (x) { return x.id; }).concat(0)) + 1;
        D.categories.push(Object.assign({ id: id }, data));
      }
      ov.remove();
      render();
    });
  }

  if (addBtn) addBtn.addEventListener("click", function () { openForm(null); });
  document.addEventListener("rolechanged", render);
  render();
})();
