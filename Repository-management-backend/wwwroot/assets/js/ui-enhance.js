/* =====================================================================
   UI təkmilləşdirmələri — mobil naviqasiya, drawer, yükləmə overlay-i.
   Bu fayl əsas dashboard.js məntiqinə toxunmur, yalnız üzərinə əlavə edir.
   ===================================================================== */
(function () {
  "use strict";

  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const toggle = document.getElementById("menuToggle");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("show");
    document.body.style.overflow = "";
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      if (sidebar && sidebar.classList.contains("open")) closeSidebar();
      else openSidebar();
    });
  }

  if (overlay) overlay.addEventListener("click", closeSidebar);

  // Naviqasiya linkinə basanda mobil drawer-i bağla
  document.querySelectorAll(".nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      if (window.matchMedia("(max-width: 1050px)").matches) closeSidebar();
    });
  });

  // ESC ilə bağla
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeSidebar();
  });

  // Ekran böyüyəndə drawer vəziyyətini sıfırla
  window.addEventListener("resize", function () {
    if (!window.matchMedia("(max-width: 1050px)").matches) closeSidebar();
  });

  // İlk yükləmə overlay-ini gizlət
  function hideLoader() {
    const loader = document.getElementById("appLoader");
    if (!loader) return;
    loader.classList.add("hide");
    setTimeout(function () {
      loader.style.display = "none";
    }, 450);
  }

  if (document.readyState === "complete") {
    setTimeout(hideLoader, 250);
  } else {
    window.addEventListener("load", function () {
      setTimeout(hideLoader, 250);
    });
  }
})();
