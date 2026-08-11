/* =====================================================================
   dashboard-roles.js — Dashboard SPA üçün rol/icazə qatı.
   dashboard.js-ə TOXUNMUR. data.js (window.DB) əvvəlcədən yüklənməlidir.

   Rol SEÇİLMİR — giriş edən istifadəçinin rolundan götürülür.
   Header-də yalnız istifadəçi adı + rol etiketi göstərilir.

   Menyu bölmələri rola görə göstərilir/gizlədilir:
     Admin   — bütün bölmələr (+ İstifadəçilər).
     Manager — İstifadəçilərdən başqa hamısı.
     User    — yalnız Dashboard və Qaimələr.
   Düymələr də icazəyə görə gizlədilir (yalnız UX — əsl yoxlama backend-də).
   ===================================================================== */
(function () {
  "use strict";

  var DB = window.DB;
  if (!DB) { console.warn("dashboard-roles: data.js (DB) tapılmadı"); return; }

  // Giriş edən istifadəçinin rolu (seçici yoxdur)
  var user = DB.getCurrentUser ? DB.getCurrentUser() : null;
  var role = user ? user.role : DB.getCurrentRole();
  if (DB.setRole) DB.setRole(role); // DB.can() ilə sinxron

  var branchesCache = [];

  // Hansı rol hansı menyu bölməsini görür
  var SECTION_ACCESS = {
    dashboardSection: ["admin", "manager", "user"],
    invoicesSection: ["admin", "manager", "user"],
    debtsSection: ["admin", "manager", "user"],
    depositsSection: ["admin", "manager", "user"],
    customersSection: ["admin", "manager"],
    inventorySection: ["admin", "manager"],
    productsSection: ["admin", "manager"],
    reportsSection: ["admin", "manager"],
    usersSection: ["admin"],
    branchesSection: ["admin"],
  };

  function canSeeSection(sec) {
    return (SECTION_ACCESS[sec] || ["admin", "manager", "user"]).indexOf(role) !== -1;
  }

  // İcazəyə görə gizlədiləcək STATİK düymələr (unikal id/selector)
  var GATED = [
    { sel: '#newInvoiceLink', perm: "create" },
    { sel: "#addCustomerQuickBtn", perm: "create" },
    { sel: "#addExtraCategoryBtn", perm: "create" },
    { sel: "#addServiceCategoryBtn", perm: "create" },
    { sel: "#addPoleCategoryBtn", perm: "create" },
    { sel: "#addInventoryItemBtn", perm: "create" },
    { sel: "#exportBackupBtn", perm: "create" },
    { sel: "#importBackupBtn", perm: "create" },
    { sel: "#addUserBtn", perm: "manageUsers" },
  ];

  function applyPermissions() {
    GATED.forEach(function (g) {
      document.querySelectorAll(g.sel).forEach(function (el) {
        el.classList.toggle("perm-hidden", !DB.can(g.perm));
      });
    });
    document.body.classList.remove("role-admin", "role-manager", "role-user");
    document.body.classList.add("role-" + role);
  }

  // Menyu (nav) bölmələrini rola görə göstər/gizlət
  function applyMenuVisibility() {
    document.querySelectorAll(".nav-link[data-section]").forEach(function (link) {
      var sec = link.getAttribute("data-section");
      var allowed = canSeeSection(sec);
      link.classList.toggle("perm-hidden", !allowed);
      var section = document.getElementById(sec);
      // İcazəsi olmayan bölmə aktivdirsə → Dashboard-a keç
      if (!allowed && section && section.classList.contains("active-section")) {
        var dashLink = document.querySelector('.nav-link[data-section="dashboardSection"]');
        if (typeof window.switchSection === "function" && dashLink) {
          window.switchSection("dashboardSection", dashLink);
        }
      }
    });
  }

  function buildUserChip() {
    var right = document.querySelector(".header-right");
    if (!right || document.getElementById("currentUserChip")) return;

    var ctx = document.getElementById("branchContext");
    var curBranchId = ctx ? (ctx.getAttribute("data-branch-id") || "") : "";
    var curBranchName = ctx ? (ctx.getAttribute("data-branch-name") || "") : "";
    var isAdminUser = ctx ? (String(ctx.getAttribute("data-role")).toLowerCase() === "admin") : (role === "admin");

    if (isAdminUser) {
      var sel = document.createElement("select");
      sel.className = "current-user branch-select";
      sel.id = "branchSwitchSelect";
      sel.title = "Aktiv filial — dəyişmək üçün seçin";
      sel.style.cursor = "pointer";
      sel.style.font = "inherit";
      sel.style.fontWeight = "600";
      sel.innerHTML = '<option value="' + esc(curBranchId) + '">\u{1F3E2} ' + esc(curBranchName || "Filial") + "</option>";
      right.insertBefore(sel, right.firstChild);
      if (window.API && API.branches) {
        API.branches.list().then(function (list) {
          sel.innerHTML = (list || []).map(function (b) {
            return '<option value="' + b.id + '"' + (String(b.id) === String(curBranchId) ? " selected" : "") + '>\u{1F3E2} ' + esc(b.name) + "</option>";
          }).join("");
        }).catch(function () {});
      }
      sel.addEventListener("change", function () {
        var newId = sel.value;
        if (!newId || String(newId) === String(curBranchId)) return;
        sel.disabled = true;
        API.account.switchBranch(newId)
          .then(function () { window.location.reload(); })
          .catch(function (e) { alert(e.message || "Filial dəyişmədi."); sel.disabled = false; });
      });
    } else if (curBranchName || DB.getCurrentBranchName) {
      var branchChip = document.createElement("span");
      branchChip.className = "current-user branch-chip";
      branchChip.id = "currentBranchChip";
      branchChip.title = "Aktiv filial";
      branchChip.textContent = "\u{1F3E2} " + (curBranchName || DB.getCurrentBranchName());
      right.insertBefore(branchChip, right.firstChild);
    }

    var chip = document.createElement("span");
    chip.className = "current-user";
    chip.id = "currentUserChip";
    chip.title = "Daxil olmuş işçi";
    var name = user ? user.name : "Qonaq";
    chip.textContent = "\u{1F464} " + name + " · " + DB.roleLabel(role);
    right.insertBefore(chip, right.firstChild);
  }

  // İstifadəçilər bölməsi (yalnız Admin görür)
  async function renderUsers() {
    var tbody = document.getElementById("usersTableBody");
    if (!tbody || !window.API) return;
    tbody.innerHTML = '<tr><td colspan="7">Yüklənir…</td></tr>';
    var users;
    try { users = await API.users.list(); }
    catch (e) { tbody.innerHTML = '<tr><td colspan="7">Xəta: ' + esc(e.message || "") + "</td></tr>"; return; }
    var roleLbl = { Admin: "Admin", Manager: "Menecer", User: "İşçi" };
    tbody.innerHTML = users.map(function (u) {
      var status = u.isOnline
        ? '<span class="inventory-positive">Aktiv</span>'
        : '<span class="inventory-low">Deaktiv</span>';
      return (
        "<tr>" +
        "<td><strong>" + esc(u.name) + "</strong></td>" +
        "<td>" + esc(u.username) + "</td>" +
        "<td>" + esc(roleLbl[u.role] || u.role) + "</td>" +
        "<td>" + esc(u.branchName || "-") + "</td>" +
        "<td>" + esc(u.phone || "-") + "</td>" +
        "<td>" + status + "</td>" +
        '<td><div class="action-cell"><button class="action-btn delete" data-del-user="' + u.id + '">Sil</button></div></td>' +
        "</tr>"
      );
    }).join("");

    tbody.querySelectorAll("[data-del-user]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-del-user");
        if (!confirm("İşçi silinsin?")) return;
        API.users.remove(id).then(function () { renderUsers(); })
          .catch(function (e) { alert(e.message || "Silinmədi."); });
      });
    });

    var grid = document.getElementById("usersSummaryGrid");
    if (grid) {
      var total = users.length;
      var active = users.filter(function (u) { return u.isOnline; }).length;
      var admins = users.filter(function (u) { return u.role === "Admin"; }).length;
      grid.innerHTML =
        '<div class="report-box"><h4>Ümumi işçi</h4><p>' + total + "</p></div>" +
        '<div class="report-box"><h4>Aktiv</h4><p>' + active + "</p></div>" +
        '<div class="report-box"><h4>Adminlər</h4><p>' + admins + "</p></div>";
    }
  }

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // Filial select-ini canlı API siyahısı ilə doldurur (yeni filiallar da görünür)
  function populateBranchSelect(sel, selectedId) {
    if (!sel) return;
    function fill(list) {
      sel.innerHTML = (list || []).map(function (b) {
        return '<option value="' + b.id + '"' + (selectedId != null && String(selectedId) === String(b.id) ? " selected" : "") + ">" + esc(b.name) + "</option>";
      }).join("") || '<option value="">Filial yoxdur</option>';
    }
    if (branchesCache && branchesCache.length) { fill(branchesCache); return; }
    if (window.API && API.branches) {
      API.branches.list()
        .then(function (list) { branchesCache = list; fill(list); })
        .catch(function () { fill(DB.getBranches ? DB.getBranches() : []); });
    } else {
      fill(DB.getBranches ? DB.getBranches() : []);
    }
  }

  // Yeni işçi əlavə et modalı (yalnız Admin)
  function showUserModal() {
    if (!DB.can("manageUsers")) return;
    if (document.getElementById("userModalOverlay")) return;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "userModalOverlay";
    overlay.innerHTML =
      '<div class="modal-card small-modal">' +
      '  <div class="modal-head"><h3>Yeni işçi</h3>' +
      '    <button type="button" class="secondary-btn" id="nuClose">Bağla</button></div>' +
      '  <div class="form-grid-2">' +
      '    <div class="form-group full"><label>Ad Soyad</label><input type="text" id="nuName" /></div>' +
      '    <div class="form-group"><label>İstifadəçi adı</label><input type="text" id="nuUsername" /></div>' +
      '    <div class="form-group"><label>Şifrə</label><input type="text" id="nuPassword" /></div>' +
      '    <div class="form-group"><label>Rol</label><select id="nuRole">' +
      '      <option value="admin">Admin</option><option value="manager">Menecer</option>' +
      '      <option value="user" selected>İşçi</option></select></div>' +
      '    <div class="form-group"><label>Filial</label><select id="nuBranch"><option value="">Yüklənir…</option></select></div>' +
      '    <div class="form-group"><label>Telefon</label><input type="text" id="nuPhone" /></div>' +
      '    <div class="form-group full"><label><input type="checkbox" id="nuActive" checked /> Aktiv</label></div>' +
      '  </div>' +
      '  <div class="modal-actions"><button type="button" class="primary-btn" id="nuSave">Yadda saxla</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    populateBranchSelect(document.getElementById("nuBranch"));
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.getElementById("nuClose").onclick = close;
    document.getElementById("nuSave").onclick = function () {
      var branchEl = document.getElementById("nuBranch");
      var roleMap = { admin: "Admin", manager: "Manager", user: "User" };
      var dto = {
        name: document.getElementById("nuName").value.trim(),
        username: document.getElementById("nuUsername").value.trim(),
        password: document.getElementById("nuPassword").value,
        role: roleMap[document.getElementById("nuRole").value] || "User",
        branchId: branchEl ? (Number(branchEl.value) || 0) : 0,
        phone: document.getElementById("nuPhone").value.trim(),
        isActive: document.getElementById("nuActive").checked,
      };
      API.users.create(dto)
        .then(function () { close(); renderUsers(); })
        .catch(function (e) { alert(e.message || "Yadda saxlanmadı."); });
    };
    var nameEl = document.getElementById("nuName");
    if (nameEl) nameEl.focus();
  }

  // ===== Filialların idarə edilməsi (yalnız Admin) =====
  async function renderBranches() {
    var tbody = document.getElementById("branchesTableBody");
    if (!tbody || !window.API) return;
    tbody.innerHTML = '<tr><td colspan="7">Yüklənir…</td></tr>';
    var branches;
    try { branches = await API.branches.list(); }
    catch (e) { tbody.innerHTML = '<tr><td colspan="7">Xəta: ' + esc(e.message || "") + "</td></tr>"; return; }
    branchesCache = branches;
    tbody.innerHTML = branches.map(function (b) {
      var status = b.isActive
        ? '<span class="inventory-positive">Aktiv</span>'
        : '<span class="inventory-low">Deaktiv</span>';
      return (
        "<tr>" +
        "<td><strong>" + esc(b.code) + "</strong></td>" +
        "<td>" + esc(b.name) + "</td>" +
        "<td>" + status + "</td>" +
        "<td>" + (b.userCount || 0) + "</td>" +
        "<td>" + (b.customerCount || 0) + "</td>" +
        "<td>" + (b.invoiceCount || 0) + "</td>" +
        '<td><div class="action-cell">' +
        '<button class="action-btn edit" data-edit-branch="' + b.id + '">Edit</button>' +
        '<button class="action-btn delete" data-del-branch="' + b.id + '">Sil</button>' +
        "</div></td>" +
        "</tr>"
      );
    }).join("") || '<tr><td colspan="7">Filial yoxdur</td></tr>';

    tbody.querySelectorAll("[data-edit-branch]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var b = branches.filter(function (x) { return String(x.id) === String(btn.getAttribute("data-edit-branch")); })[0];
        if (b) showBranchModal(b);
      });
    });
    tbody.querySelectorAll("[data-del-branch]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var b = branches.filter(function (x) { return String(x.id) === String(btn.getAttribute("data-del-branch")); })[0];
        if (b) confirmBranchDelete(b);
      });
    });

    var grid = document.getElementById("branchesSummaryGrid");
    if (grid) {
      var total = branches.length;
      var active = branches.filter(function (b) { return b.isActive; }).length;
      grid.innerHTML =
        '<div class="report-box"><h4>Ümumi filial</h4><p>' + total + "</p></div>" +
        '<div class="report-box"><h4>Aktiv</h4><p>' + active + "</p></div>" +
        '<div class="report-box"><h4>Deaktiv</h4><p>' + (total - active) + "</p></div>";
    }
  }

  function showBranchModal(branch) {
    if (!DB.can("manageUsers")) return;
    var stale = document.getElementById("branchModalOverlay");
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    var isEdit = branch && branch.id;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "branchModalOverlay";
    overlay.innerHTML =
      '<div class="modal-card small-modal">' +
      '  <div class="modal-head"><h3>' + (isEdit ? "Filialı redaktə et" : "Yeni filial") + "</h3>" +
      '    <button type="button" class="secondary-btn" id="nbClose">Bağla</button></div>' +
      '  <div class="form-grid-2">' +
      '    <div class="form-group full"><label>Filial adı</label><input type="text" id="nbName" value="' + (isEdit ? esc(branch.name) : "") + '" /></div>' +
      '    <div class="form-group full"><label>Kod (unikal, kiçik hərf)</label><input type="text" id="nbCode" value="' + (isEdit ? esc(branch.code) : "") + '" placeholder="məs: sumqayit" /></div>' +
      '    <div class="form-group full"><label><input type="checkbox" id="nbActive" ' + (!isEdit || branch.isActive ? "checked" : "") + " /> Aktiv</label></div>" +
      "  </div>" +
      '  <div class="modal-actions"><button type="button" class="primary-btn" id="nbSave">Yadda saxla</button></div>' +
      "</div>";
    document.body.appendChild(overlay);
    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.getElementById("nbClose").onclick = close;
    document.getElementById("nbSave").onclick = function () {
      var dto = {
        code: document.getElementById("nbCode").value.trim().toLowerCase(),
        name: document.getElementById("nbName").value.trim(),
        isActive: document.getElementById("nbActive").checked,
      };
      if (!dto.name) return alert("Filial adını yaz.");
      if (!dto.code) return alert("Filial kodunu yaz.");
      var p = isEdit ? API.branches.update(branch.id, dto) : API.branches.create(dto);
      p.then(function () { close(); renderBranches(); })
       .catch(function (e) { alert(e.message || "Yadda saxlanmadı."); });
    };
    var nameEl = document.getElementById("nbName");
    if (nameEl) nameEl.focus();
  }

  function confirmBranchDelete(branch) {
    if (!DB.can("manageUsers")) return;
    var staleDel = document.getElementById("branchDeleteOverlay");
    if (staleDel && staleDel.parentNode) staleDel.parentNode.removeChild(staleDel);
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "branchDeleteOverlay";

    function renderStep1() {
      overlay.innerHTML =
        '<div class="modal-card small-modal">' +
        '  <div class="modal-head"><h3>⚠️ Filialı silmək</h3>' +
        '    <button type="button" class="secondary-btn" id="bdCancel">Ləğv et</button></div>' +
        '  <div class="close-helper-box">' +
        "    <p><strong>" + esc(branch.name) + "</strong> (" + esc(branch.code) + ") filialı silinəcək.</p>" +
        '    <p style="color:#b91c1c">Bu əməliyyat <strong>geri qaytarıla bilməz</strong>. Filiala bağlı işçi, müştəri və ya qaimə varsa silinmə bloklanacaq.</p>' +
        "  </div>" +
        '  <div class="modal-actions">' +
        '    <button type="button" class="primary-btn danger-outline" id="bdNext">Davam et</button>' +
        "  </div>" +
        "</div>";
      document.getElementById("bdCancel").onclick = close;
      document.getElementById("bdNext").onclick = renderStep2;
    }

    function renderStep2() {
      overlay.innerHTML =
        '<div class="modal-card small-modal">' +
        '  <div class="modal-head"><h3>Son təsdiq</h3>' +
        '    <button type="button" class="secondary-btn" id="bdCancel">Ləğv et</button></div>' +
        '  <div style="padding:2px">' +
        '    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px">' +
        '      <div style="flex:0 0 auto;width:42px;height:42px;border-radius:50%;background:#fee2e2;color:#dc2626;display:flex;align-items:center;justify-content:center;font-size:20px">🗑️</div>' +
        '      <div style="font-size:13.5px;color:#475569;line-height:1.55">Silinmə geri qaytarıla bilməz. Təsdiq üçün aşağıya filialın kodunu <strong style="color:#0f172a">eyni ilə</strong> yazın.</div>' +
        '    </div>' +
        '    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">' +
        '      <span style="font-size:13px;color:#64748b">Filial kodu:</span>' +
        '      <code style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;padding:3px 10px;font-size:14px;font-weight:700;color:#0f172a;letter-spacing:.5px">' + esc(branch.code) + "</code>" +
        "    </div>" +
        '    <input type="text" id="bdConfirmInput" autocomplete="off" spellcheck="false" placeholder="Kodu bura yazın…" style="width:100%;box-sizing:border-box;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:15px;outline:none;transition:border-color .15s, box-shadow .15s" />' +
        '    <div id="bdHint" style="font-size:12px;margin-top:7px;min-height:16px;color:#94a3b8"></div>' +
        "  </div>" +
        '  <div class="modal-actions">' +
        '    <button type="button" class="secondary-btn" id="bdBack">Geri</button>' +
        '    <button type="button" class="primary-btn danger-outline" id="bdConfirm" disabled>Sil</button>' +
        "  </div>" +
        "</div>";
      document.getElementById("bdCancel").onclick = close;
      document.getElementById("bdBack").onclick = renderStep1;
      var input = document.getElementById("bdConfirmInput");
      var btn = document.getElementById("bdConfirm");
      var hint = document.getElementById("bdHint");
      input.addEventListener("input", function () {
        var ok = input.value.trim().toLowerCase() === String(branch.code).toLowerCase();
        btn.disabled = !ok;
        if (!input.value) {
          input.style.borderColor = "#e2e8f0";
          input.style.boxShadow = "none";
          hint.textContent = "";
        } else if (ok) {
          input.style.borderColor = "#16a34a";
          input.style.boxShadow = "0 0 0 3px rgba(22,163,74,.15)";
          hint.textContent = "✓ Kod uyğundur";
          hint.style.color = "#16a34a";
        } else {
          input.style.borderColor = "#f87171";
          input.style.boxShadow = "0 0 0 3px rgba(239,68,68,.12)";
          hint.textContent = "Kod uyğun deyil";
          hint.style.color = "#ef4444";
        }
      });
      btn.onclick = function () {
        if (input.value.trim().toLowerCase() !== String(branch.code).toLowerCase()) return;
        btn.disabled = true;
        API.branches.remove(branch.id)
          .then(function () { close(); renderBranches(); })
          .catch(function (e) {
            hint.textContent = e.message || "Silinmədi.";
            hint.style.color = "#ef4444";
            btn.disabled = false;
            showForceButton();
          });
      };

      function showForceButton() {
        if (document.getElementById("bdForce")) return;
        var actions = overlay.querySelector(".modal-actions");
        if (!actions) return;
        var fbtn = document.createElement("button");
        fbtn.type = "button";
        fbtn.id = "bdForce";
        fbtn.className = "primary-btn";
        fbtn.style.background = "#dc2626";
        fbtn.style.borderColor = "#dc2626";
        fbtn.style.color = "#fff";
        fbtn.textContent = "Force sil (hər şeyi sil)";
        fbtn.onclick = function () {
          fbtn.disabled = true;
          fbtn.textContent = "Silinir…";
          API.branches.forceRemove(branch.id)
            .then(function () { close(); renderBranches(); })
            .catch(function (err) {
              hint.textContent = err.message || "Silinmədi.";
              hint.style.color = "#ef4444";
              fbtn.disabled = false;
              fbtn.textContent = "Force sil (hər şeyi sil)";
            });
        };
        actions.appendChild(fbtn);
      }

      input.focus();
    }

    function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    renderStep1();
  }

  function init() {
    buildUserChip();
    renderUsers();
    renderBranches();
    var addUserBtn = document.getElementById("addUserBtn");
    if (addUserBtn) addUserBtn.addEventListener("click", showUserModal);
    // "+ Filial əlavə et" — delegation ilə (listener itmir, təkrarlanmır)
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest ? e.target.closest("#addBranchBtn") : null;
      if (t) { e.preventDefault(); showBranchModal(null); }
    });
    applyPermissions();
    applyMenuVisibility();
    // Bölmə dəyişdikdə statik düymələr yenidən görünə bilər — yenidən tətbiq
    document.addEventListener("click", function (e) {
      if (e.target && e.target.closest && e.target.closest(".nav-link")) {
        setTimeout(applyPermissions, 0);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
