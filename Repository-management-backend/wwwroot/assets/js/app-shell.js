/* =====================================================================
   app-shell.js — paylaşılan sidebar + header injektoru + rol seçici.
   Hər yeni səhifə yalnız body[data-page/data-title/data-subtitle] verir.
   Rol seçimi dəyişəndə düymə/menyu DƏRHAL göstərilir/gizlədilir
   (səhifə yenilənmədən). DB (data.js) əvvəlcədən yüklənməlidir.
   ===================================================================== */
(function (global) {
  "use strict";

  var NAV = [
    { page: "dashboard",  href: "dashboard.html",      icon: "🏠", label: "Dashboard" },
    { page: "invoices",   href: "invoices.html",       icon: "📄", label: "Qaimələr" },
    { page: "customers",  href: "customers.html",      icon: "👥", label: "Müştərilər" },
    { page: "debts",      href: "debts.html",          icon: "💸", label: "Borclar" },
    { page: "deposits",   href: "deposits.html",       icon: "🏦", label: "Depozitlər" },
    { page: "warehouse",  href: "warehouse.html",      icon: "📦", label: "Anbar" },
    { page: "categories", href: "categories.html",     icon: "🗂️", label: "Kateqoriyalar" },
    { page: "users",      href: "users.html",          icon: "👤", label: "İstifadəçilər", perm: "manageUsers" },
  ];

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function buildSidebar(active) {
    var links = NAV.map(function (n) {
      var cls = "nav-link" + (n.page === active ? " active" : "");
      var perm = n.perm ? ' data-perm="' + n.perm + '"' : "";
      return '<a href="' + n.href + '" class="' + cls + '"' + perm + '>' + n.icon + " " + n.label + "</a>";
    }).join("");

    return (
      '<aside class="sidebar">' +
      '  <div class="sidebar-header brand-header">' +
      '    <div class="small">İCARƏ İDARƏETMƏ</div>' +
      '    <img src="img/kapital-logo.png" alt="Kapital A.S. MMC" class="sidebar-brand-image" />' +
      '    <p>Qaimə, müştəri, nəqliyyat və xidmət nəzarəti</p>' +
      "  </div>" +
      '  <nav class="nav">' + links + "</nav>" +
      '  <div class="sidebar-footer">' +
      '    <button id="logoutBtn" class="logout-btn">Çıxış</button>' +
      "  </div>" +
      "</aside>"
    );
  }

  function buildHeader(title, subtitle, showNewInvoice) {
    var role = global.DB.getCurrentRole();
    var opts = ["admin", "manager", "user"].map(function (r) {
      var sel = r === role ? " selected" : "";
      return '<option value="' + r + '"' + sel + ">" + global.DB.roleLabel(r) + "</option>";
    }).join("");

    var cu = global.DB.getCurrentUser ? global.DB.getCurrentUser() : null;
    var userChip = cu ? '<span class="current-user" title="Daxil olmuş istifadəçi">\u{1F464} ' + cu.name + "</span>" : "";

    var newBtn = showNewInvoice
      ? '<a class="primary-btn link-btn" data-perm="create" href="new-invoice.html">+ Yeni qaimə</a>'
      : "";

    return (
      '<header class="header">' +
      '  <div class="header-left">' +
      '    <button type="button" class="menu-toggle" id="menuToggle" aria-label="Menyu"><span></span></button>' +
      "    <div>" +
      '      <h1 id="pageTitle">' + title + "</h1>" +
      '      <p id="pageSubtitle">' + (subtitle || "") + "</p>" +
      "    </div>" +
      "  </div>" +
      '  <div class="header-right">' +
      userChip +
      '    <div class="role-selector">' +
      '      <span class="role-selector-label">Rol</span>' +
      '      <select id="roleSelect" class="toolbar-input">' + opts + "</select>" +
      "    </div>" +
      newBtn +
      "  </div>" +
      "</header>"
    );
  }

  // [data-perm] elementlərini cari icazəyə görə göstər/gizlət
  function applyPermissions(root) {
    root = root || document;
    root.querySelectorAll("[data-perm]").forEach(function (node) {
      var ok = global.DB.can(node.getAttribute("data-perm"));
      node.classList.toggle("hidden", !ok);
    });
  }

  // Çıxış təsdiq modalını göstər
  function showLogoutConfirm() {
    if (document.getElementById("logoutConfirmOverlay")) return;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "logoutConfirmOverlay";
    overlay.innerHTML =
      '<div class="modal-card logout-modal-card" role="dialog" aria-modal="true" aria-labelledby="logoutConfirmTitle">' +
      '  <div class="logout-modal-icon">\u{1F6AA}</div>' +
      '  <h3 id="logoutConfirmTitle">Çıxış etmək istəyirsiniz?</h3>' +
      '  <p>Sessiyanız bağlanacaq və yenidən giriş etməli olacaqsınız.</p>' +
      '  <div class="modal-actions">' +
      '    <button type="button" class="secondary-btn" id="logoutCancelBtn">Ləğv et</button>' +
      '    <button type="button" class="primary-btn logout-confirm-btn" id="logoutConfirmBtn">Bəli, çıx</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(overlay);

    function close() {
      document.removeEventListener("keydown", onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    function onKey(ev) { if (ev.key === "Escape") close(); }

    overlay.addEventListener("click", function (ev) { if (ev.target === overlay) close(); });
    document.addEventListener("keydown", onKey);
    document.getElementById("logoutCancelBtn").addEventListener("click", close);
    document.getElementById("logoutConfirmBtn").addEventListener("click", function () {
      if (global.DB && global.DB.logout) global.DB.logout();
      global.location.href = "login.html";
    });
    var cancelBtn = document.getElementById("logoutCancelBtn");
    if (cancelBtn) cancelBtn.focus();
  }

  function init() {
    if (!global.DB) { console.error("data.js yüklənməyib"); return; }

    var body = document.body;
    var page = body.getAttribute("data-page") || "";
    var title = body.getAttribute("data-title") || "";
    var subtitle = body.getAttribute("data-subtitle") || "";
    var showNewInvoice = body.getAttribute("data-new-invoice") !== "false";

    // Sidebar
    var sidebarMount = document.querySelector("[data-shell-sidebar]");
    if (sidebarMount) sidebarMount.replaceWith(el(buildSidebar(page)));

    // Header
    var headerMount = document.querySelector("[data-shell-header]");
    if (headerMount) headerMount.replaceWith(el(buildHeader(title, subtitle, showNewInvoice)));

    // Rol seçici
    var roleSelect = document.getElementById("roleSelect");
    if (roleSelect) {
      roleSelect.addEventListener("change", function () {
        global.DB.setRole(roleSelect.value);
        applyPermissions(document);
        // səhifələr öz cədvəllərini yenidən qursun
        document.dispatchEvent(new CustomEvent("rolechanged", { detail: { role: roleSelect.value } }));
      });
    }

    // Çıxış → təsdiq modalı → login
    var logout = document.getElementById("logoutBtn");
    if (logout) logout.addEventListener("click", function (e) { e.preventDefault(); showLogoutConfirm(); });

    applyPermissions(document);

    // səhifə özünü qurmaq istəsə
    document.dispatchEvent(new CustomEvent("shellready", { detail: { page: page } }));
  }

  // ui-enhance.js sidebar-ı document-dən axtarır; biz sidebar-ı inject etdiyimizə görə
  // app-shell-i ui-enhance-dən ƏVVƏL yükləyirik (HTML sırası ilə təmin olunur).
  global.AppShell = { applyPermissions: applyPermissions };

  // Skriptlər body-nin sonunda, mount nöqtələrindən SONRA yerləşir — ona görə
  // dərhal inject edirik ki, ardınca yüklənən ui-enhance.js #menuToggle/.sidebar tapsın.
  var mountExists = document.querySelector("[data-shell-sidebar]") || document.querySelector("[data-shell-header]");
  if (mountExists) {
    init();
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
