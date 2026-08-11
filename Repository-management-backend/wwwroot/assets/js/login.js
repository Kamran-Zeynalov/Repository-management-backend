/* login.js — istifadəçi adı + şifrə + filial ilə giriş.
   İşçi yalnız ÖZ filialı ilə daxil ola bilər (seçim hesaba uyğun olmalıdır). */
(function () {
  "use strict";
  var form = document.getElementById("loginForm");
  var userEl = document.getElementById("username");
  var passEl = document.getElementById("password");
  var branchEl = document.getElementById("branch");
  var errEl = document.getElementById("loginError");

  function showError(msg) {
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
  }
  function clearError() { errEl.classList.add("hidden"); }

  // Filial siyahısını doldur
  if (branchEl && window.DB && window.DB.getBranches) {
    window.DB.getBranches().forEach(function (b) {
      var opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      branchEl.appendChild(opt);
    });
  }

  userEl.addEventListener("input", clearError);
  passEl.addEventListener("input", clearError);
  if (branchEl) branchEl.addEventListener("change", clearError);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();
    var u = userEl.value.trim();
    var p = passEl.value.trim();
    var branch = branchEl ? branchEl.value : "";
    if (!u || !p) { showError("İstifadəçi adı və şifrəni daxil edin."); return; }
    if (!branch) { showError("Filial seçin."); return; }

    var res = window.DB.authenticate(u, p);
    if (!res.ok) {
      showError(res.reason === "inactive"
        ? "Bu hesab deaktivdir. Admin ilə əlaqə saxlayın."
        : "İstifadəçi adı və ya şifrə yanlışdır.");
      return;
    }
    // Seçilmiş filial işçinin öz filialı ilə uyğun olmalıdır
    if (res.user.branch && res.user.branch !== branch) {
      if (window.DB.logout) window.DB.logout();
      var bname = window.DB.branchLabel ? window.DB.branchLabel(res.user.branch) : res.user.branch;
      showError("Bu işçi " + bname + "-na aiddir. Düzgün filialı seçin.");
      return;
    }
    // authenticate() filialı onsuz da işçinin filialından təyin edib
    window.location.href = "/Home/Index";
  });
})();
