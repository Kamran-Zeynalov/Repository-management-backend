/* users.js — yalnız Admin (manageUsers); istifadəçi idarəetməsi */
(function () {
  "use strict";
  var D = window.DB;
  var root = document.getElementById("usersRoot");

  function roleBadge(r) {
    var cls = r === "admin" ? "blue" : r === "manager" ? "violet" : "gray";
    return '<span class="badge ' + cls + '">' + D.roleLabel(r) + "</span>";
  }

  function render() {
    if (!D.can("manageUsers")) {
      root.innerHTML =
        '<div class="no-access"><div class="icon">🔒</div><h2>Giriş yoxdur</h2>' +
        "<p>İstifadəçi idarəetməsi yalnız <strong>Admin</strong> rolu üçün əlçatandır. " +
        "Yuxarıdakı rol seçicidən «Admin» seçin.</p></div>";
      return;
    }

    var rows = D.getUsers().map(function (u) {
      return (
        '<tr><td><span class="uname">' + u.name + '</span><div class="phone-mini">@' + u.username + "</div></td>" +
        "<td>" + roleBadge(u.role) + "</td>" +
        "<td>" + u.phone + "</td>" +
        "<td>" + (u.active ? '<span class="badge green">Aktiv</span>' : '<span class="badge gray">Deaktiv</span>') + "</td>" +
        "<td>" + u.created + "</td>" +
        '<td><div class="action-cell">' +
        '<button class="action-btn edit" data-edit="' + u.id + '">Düzəliş</button>' +
        '<button class="action-btn close" data-toggle="' + u.id + '">' + (u.active ? "Deaktiv et" : "Aktiv et") + "</button>" +
        '<button class="action-btn delete" data-del="' + u.id + '">Sil</button>' +
        "</div></td></tr>"
      );
    }).join("");

    root.innerHTML =
      '<div class="section-card"><div class="section-header"><div>' +
      "<h2>İstifadəçilər</h2><p>Rol və status idarəetməsi</p></div>" +
      '<div class="toolbar-row"><button class="primary-btn" id="addUserBtn">+ İstifadəçi əlavə et</button></div></div>' +
      '<div class="table-wrap"><table style="min-width:760px"><thead><tr>' +
      "<th>Ad</th><th>Rol</th><th>Telefon</th><th>Status</th><th>Yaradılıb</th><th>Əməliyyat</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div></div>";

    document.getElementById("addUserBtn").addEventListener("click", function () { openForm(null); });
    root.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var u = D.getUsers().find(function (x) { return x.id === +b.getAttribute("data-edit"); });
        openForm(u);
      });
    });
    root.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", function () {
        var u = D.users.find(function (x) { return x.id === +b.getAttribute("data-toggle"); });
        if (u) u.active = !u.active;
        render();
      });
    });
    root.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = +b.getAttribute("data-del");
        if (!confirm("İstifadəçi silinsin? (mock)")) return;
        var i = D.users.findIndex(function (x) { return x.id === id; });
        if (i > -1) D.users.splice(i, 1);
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

  function openForm(u) {
    if (!D.can("manageUsers")) return;
    var editing = !!u;
    u = u || { name: "", username: "", role: "user", phone: "", active: true };
    function ro(r, lbl) { return '<option value="' + r + '"' + (u.role === r ? " selected" : "") + ">" + lbl + "</option>"; }
    var ov = modal(
      '<div class="modal-head"><h3>' + (editing ? "İstifadəçi düzəlişi" : "Yeni istifadəçi") + "</h3></div>" +
      '<div class="form-grid-2">' +
      '<div class="form-group full"><label>Ad Soyad</label><input id="muName" value="' + u.name + '" /></div>' +
      '<div class="form-group"><label>İstifadəçi adı</label><input id="muUser" value="' + u.username + '" /></div>' +
      '<div class="form-group"><label>Rol</label><select id="muRole">' + ro("admin", "Admin") + ro("manager", "Menecer") + ro("user", "İstifadəçi") + "</select></div>" +
      '<div class="form-group full"><label>Telefon</label><input id="muPhone" value="' + u.phone + '" /></div></div>' +
      '<div class="modal-actions"><button class="secondary-btn" data-cancel>Ləğv et</button>' +
      '<button class="primary-btn" id="muSave">Yadda saxla</button></div>'
    );
    ov.querySelector("[data-cancel]").addEventListener("click", function () { ov.remove(); });
    ov.querySelector("#muSave").addEventListener("click", function () {
      var name = document.getElementById("muName").value.trim();
      if (!name) { alert("Ad daxil edin."); return; }
      var data = {
        name: name,
        username: document.getElementById("muUser").value.trim(),
        role: document.getElementById("muRole").value,
        phone: document.getElementById("muPhone").value.trim(),
      };
      if (editing) Object.assign(u, data);
      else {
        var id = Math.max.apply(null, D.users.map(function (x) { return x.id; }).concat(0)) + 1;
        D.users.push(Object.assign({ id: id, active: true, created: new Date().toISOString().slice(0, 10) }, data));
      }
      ov.remove();
      render();
    });
  }

  document.addEventListener("rolechanged", render);
  render();
})();
