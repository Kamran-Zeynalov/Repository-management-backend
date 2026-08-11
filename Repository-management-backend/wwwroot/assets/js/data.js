/* =====================================================================
   data.js — Giriş (login) + rol/icazə + işçi (user) idarəetməsi.
   Kanonik tətbiq Dashboard SPA-dır; biznes datası sessionStorage-dadır
   (seed-data.js + dashboard.js). Bu fayl işçi hesablarını, rol
   etiketlərini və icazələri saxlayır. İşçilər sessionStorage-da
   ('kapital_users') yalnız cari sessiya üçün saxlanılır — brauzer bağlananda
   ilkin hesablara qayıdır (qalıcı saxlama yoxdur).
   ===================================================================== */
(function (global) {
  "use strict";

  /* ----------------------------------------------------------------- Rol/icazə */
  const ROLE_KEY = "kapital_role";
  const USER_KEY = "kapital_user";
  const USERS_KEY = "kapital_users";
  const ROLE_LABELS = { admin: "Admin", manager: "Menecer", user: "İşçi" };

  // İcazə cədvəli (yalnız UX üçün — düymə/menyu gizlətmək)
  const PERMISSIONS = {
    admin:   ["view", "create", "edit", "delete", "addPayment", "print", "manageUsers"],
    manager: ["view", "create", "edit", "delete", "addPayment", "print"],
    user:    ["view", "print", "addPayment"],
  };

  function getCurrentRole() {
    let r = null;
    try { r = global.sessionStorage.getItem(ROLE_KEY); } catch (e) { r = null; }
    if (!r || !PERMISSIONS[r]) r = "admin";
    return r;
  }
  function setRole(role) {
    if (!PERMISSIONS[role]) return;
    try { global.sessionStorage.setItem(ROLE_KEY, role); } catch (e) {}
  }
  function roleLabel(role) { return ROLE_LABELS[role] || role; }
  function can(action) { return PERMISSIONS[getCurrentRole()].indexOf(action) !== -1; }

  /* ----------------------------------------------------------------- Filiallar
     Bütün biznes datası filiala görə ayrılır. Giriş zamanı filial seçilir,
     sessiya boyu aktiv kontekst kimi saxlanılır. */
  const BRANCH_KEY = "kapital_branch";
  const BRANCHES = [
    { id: "merdekan", name: "Mərdəkan filialı" },
    { id: "pirsagi",  name: "Pirşağı filialı" },
    { id: "baku",     name: "Bakı Mərkəz filialı" },
  ];
  function getBranches() { return BRANCHES.slice(); }
  function getCurrentBranch() {
    let b = null;
    try { b = global.sessionStorage.getItem(BRANCH_KEY); } catch (e) { b = null; }
    if (!b || !BRANCHES.some(function (x) { return x.id === b; })) b = BRANCHES[0].id;
    return b;
  }
  function setCurrentBranch(id) {
    if (!BRANCHES.some(function (x) { return x.id === id; })) return;
    try { global.sessionStorage.setItem(BRANCH_KEY, id); } catch (e) {}
  }
  function branchLabel(id) {
    var b = BRANCHES.find(function (x) { return x.id === id; });
    return b ? b.name : id;
  }
  function getCurrentBranchName() { return branchLabel(getCurrentBranch()); }

  /* ----------------------------------------------------------------- İşçi hesabları */
  // Hər işçi bir filiala bağlıdır. Giriş zamanı aktiv filial işçinin filialından təyin olunur.
  const DEFAULT_USERS = [
    { id: 1, name: "Elmar Əliyev",   username: "elmar",   password: "admin123",   role: "admin",   branch: "merdekan", phone: "+994 50 111 22 33", active: true,  created: "2025-01-10" },
    { id: 2, name: "Rəşad Quliyev",  username: "rashad",  password: "manager123", role: "manager", branch: "merdekan", phone: "+994 55 222 33 44", active: true,  created: "2025-02-04" },
    { id: 3, name: "Nigar Hüseynova",username: "nigar",   password: "user123",    role: "user",    branch: "pirsagi",  phone: "+994 70 333 44 55", active: true,  created: "2025-03-18" },
    { id: 4, name: "Tural Məmmədov", username: "tural",   password: "user123",    role: "user",    branch: "pirsagi",  phone: "+994 51 444 55 66", active: false, created: "2025-04-22" },
    { id: 5, name: "Səbinə Vəliyeva",username: "sebine",  password: "manager123", role: "manager", branch: "pirsagi",  phone: "+994 55 777 88 99", active: true,  created: "2025-05-06" },
    { id: 6, name: "Kamran İsmayılov",username: "kamran", password: "user123",    role: "user",    branch: "baku",     phone: "+994 50 222 33 44", active: true,  created: "2025-05-20" },
  ];

  function loadUsers() {
    try {
      const raw = global.sessionStorage.getItem(USERS_KEY);
      const arr = raw ? JSON.parse(raw) : null;
      if (Array.isArray(arr) && arr.length) return arr;
    } catch (e) {}
    return DEFAULT_USERS.map(function (u) { return Object.assign({}, u); });
  }
  let users = loadUsers();
  function saveUsers() {
    try { global.sessionStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch (e) {}
  }

  function getUsers() { return users.slice(); }
  function getUser(id) { return users.find(function (u) { return String(u.id) === String(id); }) || null; }

  // Yeni işçi yarat (Admin)
  function addUser(data) {
    const uname = (data.username || "").trim().toLowerCase();
    if (!data.name || !uname || !data.password) return { ok: false, reason: "missing" };
    if (users.some(function (u) { return u.username.toLowerCase() === uname; }))
      return { ok: false, reason: "duplicate" };
    const nextId = users.reduce(function (m, u) { return Math.max(m, Number(u.id) || 0); }, 0) + 1;
    const user = {
      id: nextId,
      name: String(data.name).trim(),
      username: String(data.username).trim(),
      password: String(data.password),
      role: PERMISSIONS[data.role] ? data.role : "user",
      branch: BRANCHES.some(function (b) { return b.id === data.branch; }) ? data.branch : BRANCHES[0].id,
      phone: String(data.phone || "").trim(),
      active: data.active !== false,
      created: new Date().toISOString().slice(0, 10),
    };
    users.unshift(user);
    saveUsers();
    return { ok: true, user: user };
  }

  // İşçini sil (Admin) — cari sessiya istifadəçisini silməyə icazə vermir
  function deleteUser(id) {
    const cur = getCurrentUser();
    if (cur && String(cur.id) === String(id)) return { ok: false, reason: "self" };
    const before = users.length;
    users = users.filter(function (u) { return String(u.id) !== String(id); });
    if (users.length === before) return { ok: false, reason: "notfound" };
    saveUsers();
    return { ok: true };
  }

  // İşçini yenilə (Admin)
  function updateUser(id, data) {
    const idx = users.findIndex(function (u) { return String(u.id) === String(id); });
    if (idx === -1) return { ok: false, reason: "notfound" };
    const uname = (data.username || users[idx].username).trim().toLowerCase();
    if (users.some(function (u) { return String(u.id) !== String(id) && u.username.toLowerCase() === uname; }))
      return { ok: false, reason: "duplicate" };
    users[idx] = Object.assign({}, users[idx], {
      name: data.name != null ? String(data.name).trim() : users[idx].name,
      username: data.username != null ? String(data.username).trim() : users[idx].username,
      password: data.password ? String(data.password) : users[idx].password,
      role: PERMISSIONS[data.role] ? data.role : users[idx].role,
      branch: BRANCHES.some(function (b) { return b.id === data.branch; }) ? data.branch : (users[idx].branch || BRANCHES[0].id),
      phone: data.phone != null ? String(data.phone).trim() : users[idx].phone,
      active: data.active != null ? !!data.active : users[idx].active,
    });
    saveUsers();
    return { ok: true, user: users[idx] };
  }

  /* ----------------------------------------------------------------- Giriş / sessiya */
  function setCurrentUser(id) {
    try { global.sessionStorage.setItem(USER_KEY, String(id)); } catch (e) {}
  }
  function getCurrentUser() {
    let id = null;
    try { id = global.sessionStorage.getItem(USER_KEY); } catch (e) { id = null; }
    if (!id) return null;
    return users.find(function (u) { return String(u.id) === String(id); }) || null;
  }
  function logout() {
    try { global.sessionStorage.removeItem(USER_KEY); } catch (e) {}
  }
  // İşçi adı + şifrə yoxlanışı (mock). Uğurda rol və sessiya təyin olunur.
  function authenticate(username, password) {
    const uname = (username || "").trim().toLowerCase();
    const user = users.find(function (u) { return u.username.toLowerCase() === uname; });
    if (!user || user.password !== password) return { ok: false, reason: "invalid" };
    if (!user.active) return { ok: false, reason: "inactive" };
    setRole(user.role);
    setCurrentUser(user.id);
    // Filial işçinin öz filialından avtomatik təyin olunur
    if (user.branch) setCurrentBranch(user.branch);
    return { ok: true, user: user };
  }

  /* ----------------------------------------------------------------- İxrac */
  global.DB = {
    // rol/icazə
    getCurrentRole: getCurrentRole, setRole: setRole, can: can,
    roleLabel: roleLabel, ROLE_LABELS: ROLE_LABELS,
    // giriş/sessiya
    authenticate: authenticate, setCurrentUser: setCurrentUser,
    getCurrentUser: getCurrentUser, logout: logout,
    // işçilər (idarəetmə)
    users: users, getUsers: getUsers, getUser: getUser,
    addUser: addUser, deleteUser: deleteUser, updateUser: updateUser,
    // filiallar
    getBranches: getBranches, getCurrentBranch: getCurrentBranch,
    setCurrentBranch: setCurrentBranch, getCurrentBranchName: getCurrentBranchName,
    branchLabel: branchLabel,
  };
})(window);
