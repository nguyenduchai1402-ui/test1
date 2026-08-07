// Supabase Client Initialization
const SUPABASE_URL = "https://xdxdeggyrdifnrcyaqmu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeGRlZ2d5cmRpZm5yY3lhcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjc4NDUsImV4cCI6MjEwMTY0Mzg0NX0.9T8L9azWQMTRHxqubLcwjvbni9IIIWS-OHptiJmlJ1g";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Management for Locker Webapp
let db = {
  departments: [],
  users: [],
  employees: [], // Nhân sự sử dụng tủ đồ (không có tài khoản đăng nhập)
  lockers: [],
  history: [],
  lobbyNames: { A: "Sảnh A", B: "Sảnh B" },
  settings: {
    rows: 7,  // Mặc định hiển thị 7 dãy tủ (7 dãy * 13 cột * 6 tầng = 546 tủ mỗi sảnh)
    cols: 13  // 13 cột mỗi dãy, mỗi cột cao 6 tầng (tương ứng 78 tủ/dãy)
  },
  currentUser: null,  // Current logged-in user
  isLoggedIn: false   // Login authentication state
};

// LocalStorage Keys
const STORAGE_KEY = "smart_locker_db_v7";

// Default Seed Data
const DEFAULT_DEPARTMENTS = [
  { id: "dept-kt", name: "Kỹ thuật", description: "Bộ phận hỗ trợ kỹ thuật và bảo trì" },
  { id: "dept-ns", name: "Nhân sự", description: "Quản lý nhân sự và chế độ phúc lợi" },
  { id: "dept-sx", name: "Sản xuất", description: "Công nhân và tổ trưởng dây chuyền sản xuất" },
  { id: "dept-kd", name: "Kinh doanh", description: "Bộ phận bán hàng và chăm sóc khách hàng" }
];

const DEFAULT_USERS = [
  { id: "user-admin", username: "admin", fullname: "Quản trị viên", departmentId: "dept-ns", role: "admin", password: "admin" },
  { id: "user-manager", username: "manager", fullname: "Người quản lý", departmentId: "dept-ns", role: "manager", password: "123" }
];

const DEFAULT_EMPLOYEES = [
  { code: "annan", fullname: "Nguyễn Văn An", departmentId: "dept-kt" },
  { code: "binhtran", fullname: "Trần Thị Bình", departmentId: "dept-sx" },
  { code: "cuongle", fullname: "Lê Minh Cường", departmentId: "dept-kt" },
  { code: "dungpham", fullname: "Phạm Hoàng Dung", departmentId: "dept-kd" }
];

// Pagination Configuration for Locker List view
let lockerListCurrentPage = 1;
const lockerListItemsPerPage = 20;

// Pagination Configuration for History view
let historyCurrentPage = 1;
const historyItemsPerPage = 20;

// PERSISTENCE HELPER FUNCTIONS FOR SUPABASE SYNC
async function supabaseSync(table, idValue, data) {
  try {
    if (table === 'lockers') {
      const { error } = await supabaseClient.from('lockers').update({
        status: data.status,
        user_id: data.userId,
        notes: data.notes,
        assigned_at: data.assignedAt
      }).eq('id', idValue);
      if (error) throw error;
    } else if (table === 'employees') {
      const { error } = await supabaseClient.from('employees').upsert({
        code: idValue,
        fullname: data.fullname,
        department_id: data.departmentId
      });
      if (error) throw error;
    } else if (table === 'departments') {
      const { error } = await supabaseClient.from('departments').upsert({
        id: idValue,
        name: data.name,
        description: data.description
      });
      if (error) throw error;
    } else if (table === 'profiles') {
      const { error } = await supabaseClient.from('profiles').update({
        fullname: data.fullname,
        username: data.username,
        department_id: data.departmentId,
        role: data.role
      }).eq('id', idValue);
      if (error) throw error;
    } else if (table === 'settings') {
      const { error } = await supabaseClient.from('settings').upsert({
        id: 'global',
        rows: data.rows,
        cols: data.cols
      });
      if (error) throw error;
    }
  } catch (err) {
    console.error(`Error syncing ${table} (${idValue}) to Supabase:`, err);
    showToast("Lỗi đồng bộ dữ liệu lên Supabase!", "error");
  }
}

async function supabaseDelete(table, idValue) {
  try {
    const idColumn = table === 'employees' ? 'code' : 'id';
    const { error } = await supabaseClient.from(table).delete().eq(idColumn, idValue);
    if (error) throw error;
  } catch (err) {
    console.error(`Error deleting from ${table} (${idValue}):`, err);
    showToast("Lỗi xóa dữ liệu trên Supabase!", "error");
  }
}

async function seedSupabaseUsers() {
  try {
    const { data, error } = await supabaseClient.from('profiles').select('id').limit(1);
    if (error) {
      console.error("Error checking profiles:", error);
      return;
    }
    if (data.length === 0) {
      console.log("Seeding default users to Supabase...");
      
      // Sign up default admin (username: admin, password: admin)
      const { error: adminErr } = await supabaseClient.auth.signUp({
        email: 'admin@internal.locker',
        password: 'admin',
        options: {
          data: {
            fullname: 'Quản trị viên',
            role: 'admin',
            department_id: 'dept-ns'
          }
        }
      });
      if (adminErr) console.error("Error seeding admin:", adminErr);
      
      // Sign up default manager (username: manager, password: admin123)
      const { error: managerErr } = await supabaseClient.auth.signUp({
        email: 'manager@internal.locker',
        password: 'admin123',
        options: {
          data: {
            fullname: 'Người quản lý',
            role: 'manager',
            department_id: 'dept-ns'
          }
        }
      });
      if (managerErr) console.error("Error seeding manager:", managerErr);

      await supabaseClient.auth.signOut();
    }
  } catch (err) {
    console.error("Seeding exception:", err);
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  await seedSupabaseUsers();
  await loadDatabase();
  setupAuth();
  setupNavigation();
  setupEventListeners();
  populateDropdowns();
  
  // Check active Supabase session
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && session.user) {
    db.isLoggedIn = true;
    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', session.user.id).single();
    db.currentUser = {
      id: session.user.id,
      email: session.user.email,
      fullname: profile ? profile.fullname : 'Người dùng',
      role: profile ? profile.role : 'manager',
      departmentId: profile ? profile.department_id : null
    };
    showAppScreen();
  } else {
    db.isLoggedIn = false;
    db.currentUser = null;
    showLoginScreen();
  }
}

// ==========================================
// AUTHENTICATION MANAGEMENT
// ==========================================

function setupAuth() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      let emailInput = document.getElementById("login-username").value.trim().toLowerCase();
      const passwordInput = document.getElementById("login-password").value.trim();
      
      if (!emailInput || !passwordInput) {
        showToast("Vui lòng điền đầy đủ tên đăng nhập và mật khẩu!", "error");
        return;
      }
      
      // Auto-append domain if simple username is entered
      if (!emailInput.includes("@")) {
        emailInput = emailInput + "@internal.locker";
      }
      
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: emailInput,
        password: passwordInput
      });
      
      if (error) {
        showToast("Sai tên đăng nhập hoặc mật khẩu!", "error");
        return;
      }
      
      const { user } = data;
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        db.isLoggedIn = true;
        db.currentUser = {
          id: user.id,
          email: user.email,
          fullname: profile.fullname,
          role: profile.role,
          departmentId: profile.department_id
        };
        document.getElementById("login-username").value = "";
        document.getElementById("login-password").value = "";
        
        await loadDatabase();
        showAppScreen();
        showToast(`Đăng nhập thành công! Chào mừng ${profile.fullname}`, "success");
      } else {
        showToast("Không tìm thấy thông tin tài khoản!", "error");
      }
    });
  }
  
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      confirmAction("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?", async () => {
        await supabaseClient.auth.signOut();
        db.isLoggedIn = false;
        db.currentUser = null;
        saveDatabase();
        showLoginScreen();
        showToast("Đã đăng xuất thành công!", "info");
      }, "Đăng xuất");
    });
  }
}

function showLoginScreen() {
  document.getElementById("login-container").classList.remove("hidden");
  document.getElementById("app-container").classList.add("hidden");
}

function showAppScreen() {
  document.getElementById("login-container").classList.add("hidden");
  document.getElementById("app-container").classList.remove("hidden");
  
  applyPermissions();
  populateDropdowns();
  
  renderLockerMap();
  renderDepartments();
  renderUsers();
  renderLockerList();
  renderHistory();
  renderStatistics();
}

// ==========================================
// DATABASE OPERATIONS
// ==========================================

async function loadDatabase() {
  try {
    const { data: depts, error: deptErr } = await supabaseClient.from('departments').select('*').range(0, 4999);
    if (deptErr) throw deptErr;
    db.departments = depts || [];
    
    const { data: profiles, error: profErr } = await supabaseClient.from('profiles').select('*').range(0, 4999);
    if (profErr) throw profErr;
    db.users = (profiles || []).map(p => ({
      id: p.id,
      username: p.username || '',
      fullname: p.fullname,
      departmentId: p.department_id,
      role: p.role,
      password: '***'
    }));

    const { data: emps, error: empErr } = await supabaseClient.from('employees').select('*').range(0, 4999);
    if (empErr) throw empErr;
    db.employees = (emps || []).map(e => ({
      code: e.code,
      fullname: e.fullname,
      departmentId: e.department_id
    }));

    const { data: lockers, error: lockErr } = await supabaseClient.from('lockers').select('*').range(0, 4999);
    if (lockErr) throw lockErr;
    db.lockers = (lockers || []).map(l => ({
      id: l.id,
      lobby: l.lobby,
      row: l.row,
      col: l.col,
      tier: l.tier,
      number: l.number,
      status: l.status,
      userId: l.user_id,
      notes: l.notes || '',
      assignedAt: l.assigned_at
    }));

    const { data: history, error: histErr } = await supabaseClient.from('history').select('*').order('timestamp', { ascending: false }).range(0, 4999);
    if (histErr) throw histErr;
    db.history = (history || []).map(h => ({
      id: h.id,
      lockerId: h.locker_id,
      lockerNumber: h.locker_number,
      lobbyName: h.lobby_name,
      action: h.action,
      userId: h.user_id,
      username: h.username,
      fullname: h.fullname,
      departmentName: h.department_name,
      operatorId: h.operator_id,
      operatorName: h.operator_name,
      timestamp: h.timestamp,
      note: h.note || ''
    }));

    const { data: settings, error: settErr } = await supabaseClient.from('settings').select('*').eq('id', 'global').single();
    if (settErr && settErr.code !== 'PGRST116') throw settErr;
    if (settings) {
      db.settings = {
        rows: settings.rows,
        cols: settings.cols
      };
    }
    
    // Clear unsaved layout state on successful reload
    if (typeof clearUnsavedLayoutChanges === "function") {
      clearUnsavedLayoutChanges();
    }
  } catch (err) {
    console.error("Error loading database from Supabase:", err);
    showToast("Không thể kết nối cơ sở dữ liệu Supabase!", "error");
  }
}

function saveDatabase() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Generate lockers based on settings (height is always 6 tiers)
function generateLockers() {
  const newLockers = [];
  const oldLockers = db.lockers || [];
  
  const rowsCount = db.settings.rows;
  const colsCount = db.settings.cols;
  const tiersCount = 6; // Always 6 tiers high
  
  let count = 0;
  let lobbyAFinished = false;
  
  // Generate Lobby A (1 to 546)
  for (let r = 1; r <= rowsCount; r++) {
    const rowName = `Dãy ${r}`;
    for (let c = 1; c <= colsCount; c++) {
      for (let t = tiersCount; t >= 1; t--) {
        count++;
        const id = `A-R${r}-C${c}-T${t}`;
        const formattedNumber = String(count).padStart(2, '0');
        
        const existing = oldLockers.find(l => l.id === id);
        if (existing) {
          existing.lobby = "A";
          existing.row = rowName;
          existing.col = c;
          existing.tier = t;
          existing.number = formattedNumber;
          newLockers.push(existing);
        } else {
          newLockers.push({
            id: id,
            lobby: "A",
            row: rowName,
            col: c,
            tier: t,
            number: formattedNumber,
            status: "available",
            userId: null,
            notes: "",
            assignedAt: null
          });
        }
        
        if (count === 546) {
          lobbyAFinished = true;
          break;
        }
      }
      if (lobbyAFinished) break;
    }
    if (lobbyAFinished) break;
  }
  
  // Generate Lobby B (547 to 1092)
  let lobbyBFinished = false;
  for (let r = 1; r <= rowsCount; r++) {
    const rowName = `Dãy ${r}`;
    for (let c = 1; c <= colsCount; c++) {
      for (let t = tiersCount; t >= 1; t--) {
        count++;
        if (count > 1092) {
          lobbyBFinished = true;
          break;
        }
        
        const id = `B-R${r}-C${c}-T${t}`;
        const formattedNumber = String(count).padStart(2, '0');
        
        const existing = oldLockers.find(l => l.id === id);
        if (existing) {
          existing.lobby = "B";
          existing.row = rowName;
          existing.col = c;
          existing.tier = t;
          existing.number = formattedNumber;
          newLockers.push(existing);
        } else {
          newLockers.push({
            id: id,
            lobby: "B",
            row: rowName,
            col: c,
            tier: t,
            number: formattedNumber,
            status: "available",
            userId: null,
            notes: "",
            assignedAt: null
          });
        }
      }
      if (lobbyBFinished) break;
    }
    if (lobbyBFinished) break;
  }
  
  db.lockers = newLockers;
}

function seedHistory() {
  db.history = [
    {
      id: "hist-1",
      lockerId: "A-R1-C1-T6",
      lockerNumber: "01",
      lobbyName: "Sảnh A",
      action: "Cấp tủ",
      userId: "annan",
      username: "annan",
      fullname: "Nguyễn Văn An",
      departmentName: "Kỹ thuật",
      operatorId: "user-admin",
      operatorName: "Quản trị viên",
      timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
      note: "Cấp phát khi vào làm"
    },
    {
      id: "hist-2",
      lockerId: "B-R1-C2-T3",
      lockerNumber: "790",
      lobbyName: "Sảnh B",
      action: "Cấp tủ",
      userId: "binhtran",
      username: "binhtran",
      fullname: "Trần Thị Bình",
      departmentName: "Sản xuất",
      operatorId: "user-admin",
      operatorName: "Quản trị viên",
      timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
      note: "Cấp phát đầu ca"
    },
    {
      id: "hist-3",
      lockerId: "A-R2-C3-T5",
      lockerNumber: "92",
      lobbyName: "Sảnh A",
      action: "Báo hỏng",
      userId: null,
      username: "",
      fullname: "",
      departmentName: "",
      operatorId: "user-an",
      operatorName: "Nguyễn Văn An",
      timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
      note: "Kẹt khóa không mở được bằng chìa"
    }
  ];
  
  // Set the statuses of seeded lockers
  const anLocker = db.lockers.find(l => l.id === "A-R1-C1-T6");
  if (anLocker) {
    anLocker.status = "in_use";
    anLocker.userId = "user-an";
    anLocker.assignedAt = new Date(Date.now() - 3600000 * 24 * 2).toISOString();
  }
  
  const binhLocker = db.lockers.find(l => l.id === "B-R1-C2-T3");
  if (binhLocker) {
    binhLocker.status = "in_use";
    binhLocker.userId = "user-binh";
    binhLocker.assignedAt = new Date(Date.now() - 3600000 * 24).toISOString();
  }
  
  const brokenLocker = db.lockers.find(l => l.id === "A-R2-C3-T5");
  if (brokenLocker) {
    brokenLocker.status = "broken";
    brokenLocker.notes = "Kẹt khóa không mở được bằng chìa";
    brokenLocker.assignedAt = null;
  }
}

// Log a transaction in history
function logTransaction(lockerId, action, userId, note = "") {
  const locker = db.lockers.find(l => l.id === lockerId);
  const emp = db.employees ? db.employees.find(e => e.code === userId) : null;
  const sysUser = !emp ? db.users.find(u => u.id === userId || u.username === userId) : null;
  
  const deptId = emp ? emp.departmentId : (sysUser ? sysUser.departmentId : null);
  const dept = deptId ? db.departments.find(d => d.id === deptId) : null;
  const operator = db.currentUser;
  
  const lobbyDisplayName = locker ? (db.lobbyNames[locker.lobby] || `Sảnh ${locker.lobby}`) : "Hệ thống";
  const numberText = locker ? locker.number : "-";
  
  const entry = {
    id: "hist-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
    lockerId: locker ? locker.id : lockerId,
    lockerNumber: numberText,
    lobbyName: lobbyDisplayName,
    action: action,
    userId: emp ? emp.code : (sysUser ? sysUser.id : userId),
    username: emp ? emp.code : (sysUser ? sysUser.username : ""),
    fullname: emp ? emp.fullname : (sysUser ? sysUser.fullname : ""),
    departmentName: dept ? dept.name : "",
    operatorId: operator ? operator.id : "system",
    operatorName: operator ? operator.fullname : "Hệ thống",
    timestamp: new Date().toISOString(),
    note: note
  };
  
  db.history.unshift(entry); // Add to beginning of log
  saveDatabase();
  
  // Asynchronously insert into Supabase history
  supabaseClient.from('history').insert({
    locker_id: entry.lockerId,
    locker_number: entry.lockerNumber,
    lobby_name: entry.lobbyName,
    action: entry.action,
    user_id: entry.userId,
    username: entry.username,
    fullname: entry.fullname,
    department_name: entry.departmentName,
    operator_id: (entry.operatorId && entry.operatorId !== 'system') ? entry.operatorId : null,
    operator_name: entry.operatorName,
    timestamp: entry.timestamp,
    note: entry.note
  }).then(({error}) => {
    if (error) console.error("Error inserting history:", error);
  });

  renderHistory();
  renderStatistics();
}

// ==========================================
// SPA NAVIGATION
// ==========================================

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const viewName = item.dataset.view;
      
      // Update sidebar active menu
      navItems.forEach(nav => nav.classList.remove("active"));
      item.classList.add("active");
      
      // Update visible view
      const views = document.querySelectorAll(".app-view");
      views.forEach(view => view.classList.remove("active"));
      
      const targetView = document.getElementById(`view-${viewName}`);
      if (targetView) {
        targetView.classList.add("active");
      }
      
      // Refresh views accordingly on tab switch
      if (viewName === "statistics") {
        renderStatistics();
      } else if (viewName === "locker-list") {
        lockerListCurrentPage = 1;
        renderLockerList();
      }
    });
  });
}

// ==========================================
// AUTH & PERMISSIONS ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

function applyPermissions() {
  if (!db.currentUser) return;
  const isLockerAdmin = db.currentUser.role === "admin";
  
  // Show / Hide admin elements
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(el => {
    if (isLockerAdmin) {
      el.classList.remove("hidden");
      if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "BUTTON") {
        el.removeAttribute("disabled");
      }
    } else {
      el.classList.add("hidden");
      if (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "BUTTON") {
        el.setAttribute("disabled", "true");
      }
    }
  });

  // Update UI sidebar user badge
  const roleBadge = document.getElementById("current-user-role-badge");
  const roleIcon = document.getElementById("current-user-role-icon");
  const fullNameLabel = document.getElementById("current-user-fullname");
  
  fullNameLabel.innerText = db.currentUser.fullname;
  roleBadge.innerText = db.currentUser.role === "admin" ? "Quản trị" : "Nhân viên";
  roleBadge.className = `role-badge ${db.currentUser.role}`;
  
  if (db.currentUser.role === "admin") {
    roleIcon.className = "fa-solid fa-user-shield text-blue";
  } else {
    roleIcon.className = "fa-solid fa-user text-green";
  }
}

// ==========================================
// RENDER VIEWS
// ==========================================

// Global state variables for layout view
let activeLobby = "A";
let selectedLockerIdForModal = null;
let mapSearchQuery = "";

// 1. LOCKER MAP GRID RENDER
function renderLockerMap() {
  const container = document.getElementById("lockers-grid-container");
  container.innerHTML = "";
  
  const isAdmin = db.currentUser && db.currentUser.role === "admin";
  const lobbyLockers = db.lockers.filter(l => l.lobby === activeLobby);
  
  // Group by row
  const rows = {};
  lobbyLockers.forEach(l => {
    if (!rows[l.row]) rows[l.row] = [];
    rows[l.row].push(l);
  });
  
  // Sort row keys (e.g. Dãy 1, Dãy 2, ..., Dãy 10) numerically or alphabetically
  const sortedRowKeys = Object.keys(rows).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  
  if (sortedRowKeys.length === 0) {
    container.innerHTML = `
      <div class="glass-card text-center" style="padding: 40px;">
        <i class="fa-solid fa-box-open" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 12px;"></i>
        <p style="color: var(--text-secondary);">Chưa có dữ liệu tủ đồ ở sảnh này. Vui lòng bấm "Thêm Tủ Đồ" để khởi tạo.</p>
      </div>
    `;
    return;
  }
  
  // Display stats count summary for this lobby
  updateLobbyStatsSummary(lobbyLockers);
  
  // Render rows
  sortedRowKeys.forEach(rowKey => {
    const rowLockers = rows[rowKey];
    
    // Find unique columns in this row
    const cols = {};
    rowLockers.forEach(l => {
      if (!cols[l.col]) cols[l.col] = [];
      cols[l.col].push(l);
    });
    const sortedColKeys = Object.keys(cols).sort((a,b) => Number(a) - Number(b));
    
    const rowElement = document.createElement("div");
    rowElement.className = "locker-row";
    rowElement.innerHTML = `
      <div class="locker-row-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 class="locker-row-title"><i class="fa-solid fa-layer-group"></i> ${rowKey}</h3>
          ${isAdmin ? `
            <button class="btn-icon delete btn-delete-row" data-row="${rowKey}" title="Xóa dãy" style="color: var(--accent-red); font-size: 0.75rem; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: var(--border-radius-sm); border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); cursor: pointer;">
              <i class="fa-solid fa-trash"></i> Xóa Dãy
            </button>
          ` : ""}
        </div>
        <span class="badge" style="font-size: 0.7rem; font-weight:600;">Tổng số: ${rowLockers.length} tủ</span>
      </div>
    `;
    
    const colsContainer = document.createElement("div");
    colsContainer.className = "locker-row-cols";
    
    // Render columns
    sortedColKeys.forEach(colKey => {
      const colLockers = cols[colKey];
      
      const colElement = document.createElement("div");
      colElement.className = "locker-col";
      colElement.innerHTML = `<div class="locker-col-label">Cột ${colKey}</div>`;
      
      // Sort lockers in column: Tier 6 (top) down to Tier 1 (bottom)
      const sortedTiers = colLockers.sort((a,b) => b.tier - a.tier);
      
      sortedTiers.forEach(locker => {
        const cell = document.createElement("div");
        
        let searchClass = "";
        if (mapSearchQuery) {
          const isMatch = isLockerMatch(locker, mapSearchQuery);
          searchClass = isMatch ? " highlighted" : " dimmed";
        }
        
        cell.className = `locker-cell state-${locker.status}${searchClass}`;
        cell.dataset.id = locker.id;
        
        let holderName = "";
        let employeeCode = "";
        if (locker.status === "in_use" && locker.userId) {
          const emp = db.employees.find(e => e.code === locker.userId);
          holderName = emp ? emp.fullname : "Không rõ";
          employeeCode = emp ? emp.code : locker.userId;
        } else if (locker.status === "broken") {
          holderName = "HỎNG";
        } else if (locker.status === "error") {
          holderName = "LỖI";
        } else if (locker.status === "maintenance") {
          holderName = "BẢO TRÌ";
        } else {
          holderName = "Trống";
        }
        
        let cornerText = "";
        if (locker.status === "in_use" && employeeCode) {
          cornerText = employeeCode.toUpperCase();
        }
        
        cell.innerHTML = `
          <div class="locker-cell-number" title="${locker.number}">${locker.number}</div>
          <div class="locker-cell-holder" title="${holderName}">${holderName}</div>
          <div class="locker-cell-tier" style="font-size: 0.65rem; font-weight: 700;">${cornerText}</div>
        `;
        
        cell.addEventListener("click", () => openLockerModal(locker.id));
        colElement.appendChild(cell);
      });
      
      colsContainer.appendChild(colElement);
    });
    
    rowElement.appendChild(colsContainer);
    container.appendChild(rowElement);
  });

  // Attach event handlers for deleting rows
  if (isAdmin) {
    container.querySelectorAll(".btn-delete-row").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const rowName = btn.dataset.row;
        deleteRow(rowName);
      });
    });
  }
}

function updateLobbyStatsSummary(lobbyLockers) {
  const total = lobbyLockers.length;
  const available = lobbyLockers.filter(l => l.status === "available").length;
  const inUse = lobbyLockers.filter(l => l.status === "in_use").length;
  const broken = lobbyLockers.filter(l => ["broken", "error", "maintenance"].includes(l.status)).length;
  
  const currentLobbyName = db.lobbyNames[activeLobby] || `Sảnh ${activeLobby}`;
  document.getElementById("lobby-stats-summary").innerText = 
    `${currentLobbyName} - Tổng: ${total} | Trống: ${available} | Đang dùng: ${inUse} | Sự cố: ${broken}`;
  
  document.getElementById("input-lobby-rename").value = currentLobbyName;
  
  // Update dashboard quick stats cards (for the entire system, i.e., all lobbies)
  const systemTotal = db.lockers.length;
  const systemAvailable = db.lockers.filter(l => l.status === "available").length;
  const systemInUse = db.lockers.filter(l => l.status === "in_use").length;
  const systemBroken = db.lockers.filter(l => ["broken", "error", "maintenance"].includes(l.status)).length;
  
  const elTotal = document.getElementById("map-stats-total");
  const elAvailable = document.getElementById("map-stats-available");
  const elInUse = document.getElementById("map-stats-in-use");
  const elBroken = document.getElementById("map-stats-broken");
  
  if (elTotal) elTotal.innerText = systemTotal;
  if (elAvailable) elAvailable.innerText = systemAvailable;
  if (elInUse) elInUse.innerText = systemInUse;
  if (elBroken) elBroken.innerText = systemBroken;
}

// 2. DEPARTMENTS CRUD RENDER
function renderDepartments() {
  const tbody = document.getElementById("department-table-body");
  tbody.innerHTML = "";
  
  if (!db.currentUser) return;
  const isAdmin = db.currentUser.role === "admin";
  
  if (db.departments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 3 : 2}" class="text-center" style="color: var(--text-secondary); padding: 24px;">Chưa có bộ phận nào.</td></tr>`;
    return;
  }
  
  db.departments.forEach(dept => {
    const employeeCount = db.employees ? db.employees.filter(e => e.departmentId === dept.id).length : 0;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${escapeHtml(dept.name)}</strong> <span class="badge" style="font-size: 0.65rem; margin-left: 6px;">${employeeCount} nhân sự</span></td>
      <td style="color: var(--text-secondary); font-size: 0.85rem;">${escapeHtml(dept.description || "Không có mô tả")}</td>
      ${isAdmin ? `
        <td class="text-center">
          <div class="table-actions">
            <button class="btn-icon btn-edit-dept" data-id="${dept.id}" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-icon delete btn-delete-dept" data-id="${dept.id}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      ` : ""}
    `;
    tbody.appendChild(tr);
  });
  
  if (isAdmin) {
    tbody.querySelectorAll(".btn-edit-dept").forEach(btn => {
      btn.addEventListener("click", () => editDepartment(btn.dataset.id));
    });
    tbody.querySelectorAll(".btn-delete-dept").forEach(btn => {
      btn.addEventListener("click", () => deleteDepartment(btn.dataset.id));
    });
  }
}

// 3. USERS CRUD RENDER (ACCOUNT MANAGEMENT)
function renderUsers() {
  const tbody = document.getElementById("user-table-body");
  tbody.innerHTML = "";
  
  if (!db.currentUser) return;
  const filterDeptId = document.getElementById("filter-user-dept").value;
  const isAdmin = db.currentUser.role === "admin";
  
  // Only display system operators (admin and manager) in the accounts view
  let filteredUsers = db.users.filter(u => u.role === "admin" || u.role === "manager");
  if (filterDeptId) {
    filteredUsers = filteredUsers.filter(u => u.departmentId === filterDeptId);
  }
  
  if (filteredUsers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isAdmin ? 6 : 5}" class="text-center" style="color: var(--text-secondary); padding: 24px;">Không tìm thấy tài khoản quản trị/quản lý nào.</td></tr>`;
    return;
  }
  
  filteredUsers.forEach(user => {
    const dept = db.departments.find(d => d.id === user.departmentId);
    const deptName = dept ? dept.name : "Không rõ";
    
    let roleText = "Người dùng";
    let roleClass = "badge";
    if (user.role === "admin") {
      roleText = "Quản trị";
      roleClass = "badge status-badge-Cập";
    } else if (user.role === "manager") {
      roleText = "Quản lý";
      roleClass = "badge status-badge-Báo";
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div style="font-weight: 700;">${escapeHtml(user.fullname)}</div>
      </td>
      <td style="font-family: monospace; color: var(--accent-blue); font-weight: 700;">${escapeHtml(user.username.toUpperCase())}</td>
      <td style="font-family: monospace; font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(user.password || "123456")}</td>
      <td><span class="badge" style="background: rgba(255,255,255,0.02);">${escapeHtml(deptName)}</span></td>
      <td><span class="${roleClass}">${roleText}</span></td>
      ${isAdmin ? `
        <td class="text-center">
          <div class="table-actions">
            <button class="btn-icon btn-edit-user" data-id="${user.id}" title="Sửa"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn-icon delete btn-delete-user" data-id="${user.id}" title="Xóa"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      ` : ""}
    `;
    tbody.appendChild(tr);
  });
  
  if (isAdmin) {
    tbody.querySelectorAll(".btn-edit-user").forEach(btn => {
      btn.addEventListener("click", () => editUser(btn.dataset.id));
    });
    tbody.querySelectorAll(".btn-delete-user").forEach(btn => {
      btn.addEventListener("click", () => deleteUser(btn.dataset.id));
    });
  }
}

// 3.5. LOCKER LIST VIEW WITH PAGINATION (20 ITEMS/PAGE)
function renderLockerList() {
  const tbody = document.getElementById("locker-list-table-body");
  const paginationContainer = document.getElementById("locker-list-pagination");
  
  if (!tbody || !paginationContainer) return;
  tbody.innerHTML = "";
  paginationContainer.innerHTML = "";
  
  if (!db.currentUser) return;
  const isAdmin = db.currentUser.role === "admin";
  const searchVal = document.getElementById("locker-list-search").value.toLowerCase().trim();
  const filterLobby = document.getElementById("locker-list-filter-lobby").value;
  const filterDept = document.getElementById("locker-list-filter-dept").value;
  
  // Filter only lockers that are currently in_use
  let inUseLockers = db.lockers.filter(l => l.status === "in_use");
  
  // Map employees and departments for filtering
  let lockerListData = inUseLockers.map(l => {
    const emp = db.employees.find(e => e.code === l.userId);
    const dept = emp ? db.departments.find(d => d.id === emp.departmentId) : null;
    return {
      locker: l,
      user: emp ? { id: emp.code, username: emp.code, fullname: emp.fullname, departmentId: emp.departmentId } : null,
      dept: dept,
      lobbyName: db.lobbyNames[l.lobby] || `Sảnh ${l.lobby}`
    };
  });
  
  // Apply Search (search locker number, user fullname, username, dept name, row)
  if (searchVal) {
    lockerListData = lockerListData.filter(item => 
      item.locker.number.toLowerCase().includes(searchVal) ||
      (item.user && item.user.fullname.toLowerCase().includes(searchVal)) ||
      (item.user && item.user.username.toLowerCase().includes(searchVal)) ||
      (item.dept && item.dept.name.toLowerCase().includes(searchVal)) ||
      item.locker.row.toLowerCase().includes(searchVal)
    );
  }
  
  // Apply Lobby Filter
  if (filterLobby) {
    lockerListData = lockerListData.filter(item => item.locker.lobby === filterLobby);
  }
  
  // Apply Department Filter
  if (filterDept) {
    lockerListData = lockerListData.filter(item => item.user && item.user.departmentId === filterDept);
  }
  
  const totalItems = lockerListData.length;
  document.getElementById("locker-list-total-badge").innerText = `Tổng số: ${totalItems} tủ đang dùng`;
  
  if (totalItems === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--text-secondary); padding: 24px;">Không tìm thấy tủ đồ nào đang cấp phát phù hợp.</td></tr>`;
    return;
  }
  
  // Calculate Pagination
  const totalPages = Math.max(1, Math.ceil(totalItems / lockerListItemsPerPage));
  if (lockerListCurrentPage > totalPages) {
    lockerListCurrentPage = totalPages;
  }
  if (lockerListCurrentPage < 1) {
    lockerListCurrentPage = 1;
  }
  
  const startIndex = (lockerListCurrentPage - 1) * lockerListItemsPerPage;
  const endIndex = Math.min(startIndex + lockerListItemsPerPage, totalItems);
  const paginatedItems = lockerListData.slice(startIndex, endIndex);
  
  // Render Table Rows
  paginatedItems.forEach((item, index) => {
    const rowNo = startIndex + index + 1;
    const l = item.locker;
    const user = item.user;
    const dept = item.dept;
    
    const timeStr = l.assignedAt ? formatDateTime(l.assignedAt) : "Không rõ";
    
    // All logged-in system operators (admin/manager) have permission to return lockers
    const canReturn = true;
    
    const tr = document.createElement("tr");
    const displayUsername = user ? user.username.toUpperCase() : "-";
    const userCode = user ? user.username : "";
    tr.innerHTML = `
      <td><input type="checkbox" class="locker-list-item-checkbox" data-user-code="${escapeHtml(userCode)}"></td>
      <td>${rowNo}</td>
      <td style="font-family: monospace; font-weight: 700; color: var(--accent-blue);">${escapeHtml(displayUsername)}</td>
      <td><strong>${escapeHtml(user ? user.fullname : "Không rõ")}</strong></td>
      <td><span class="badge" style="background: rgba(255,255,255,0.02);">${escapeHtml(dept ? dept.name : "-")}</span></td>
      <td><span style="font-family: monospace; font-weight:700;">${escapeHtml(l.number)}</span></td>
      <td>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">
          ${escapeHtml(item.lobbyName)} - ${escapeHtml(l.row)} - Cột ${l.col} - Tầng ${l.tier}
        </span>
      </td>
      <td style="font-size:0.8rem; color: var(--text-secondary);">${timeStr}</td>
      <td class="text-center">
        ${canReturn ? `
          <button class="btn-secondary btn-sm btn-quick-return" data-id="${l.id}" style="color: var(--accent-blue); border-color: rgba(59,130,246,0.2); padding: 4px 8px; font-size: 0.75rem; width: auto;">
            <i class="fa-solid fa-right-from-bracket"></i> Trả tủ
          </button>
        ` : `<span style="font-size:0.75rem; color: var(--text-secondary);">-</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  // Attach quick return action click handler
  tbody.querySelectorAll(".btn-quick-return").forEach(btn => {
    btn.addEventListener("click", () => {
      const lid = btn.dataset.id;
      quickReturnLocker(lid);
    });
  });
  
  // Render Pagination Info & Buttons
  // Left side info
  const infoDiv = document.createElement("div");
  infoDiv.className = "pagination-info";
  infoDiv.innerText = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${totalItems} tủ đang sử dụng`;
  paginationContainer.appendChild(infoDiv);
  
  // Right side controls
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "pagination-controls";
  
  // First page button
  const firstBtn = document.createElement("button");
  firstBtn.className = "page-btn";
  firstBtn.innerHTML = '<i class="fa-solid fa-angles-left"></i>';
  firstBtn.disabled = lockerListCurrentPage === 1;
  firstBtn.addEventListener("click", () => {
    lockerListCurrentPage = 1;
    renderLockerList();
  });
  controlsDiv.appendChild(firstBtn);
  
  // Previous page button
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
  prevBtn.disabled = lockerListCurrentPage === 1;
  prevBtn.addEventListener("click", () => {
    if (lockerListCurrentPage > 1) {
      lockerListCurrentPage--;
      renderLockerList();
    }
  });
  controlsDiv.appendChild(prevBtn);
  
  // Render middle page numbers (sliding window of 5 pages)
  const maxPageVisible = 5;
  let startPage = Math.max(1, lockerListCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPageVisible - 1);
  
  if (endPage - startPage < maxPageVisible - 1) {
    startPage = Math.max(1, endPage - maxPageVisible + 1);
  }
  
  for (let p = startPage; p <= endPage; p++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `page-btn ${p === lockerListCurrentPage ? 'active' : ''}`;
    pageBtn.innerText = p;
    pageBtn.addEventListener("click", () => {
      lockerListCurrentPage = p;
      renderLockerList();
    });
    controlsDiv.appendChild(pageBtn);
  }
  
  // Next page button
  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
  nextBtn.disabled = lockerListCurrentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    if (lockerListCurrentPage < totalPages) {
      lockerListCurrentPage++;
      renderLockerList();
    }
  });
  controlsDiv.appendChild(nextBtn);
  
  // Last page button
  const lastBtn = document.createElement("button");
  lastBtn.className = "page-btn";
  lastBtn.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
  lastBtn.disabled = lockerListCurrentPage === totalPages;
  lastBtn.addEventListener("click", () => {
    lockerListCurrentPage = totalPages;
    renderLockerList();
  });
  controlsDiv.appendChild(lastBtn);
  
  paginationContainer.appendChild(controlsDiv);

  // Handle Select All checkbox
  const selectAllCheckbox = document.getElementById("locker-list-select-all");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      tbody.querySelectorAll(".locker-list-item-checkbox").forEach(cb => {
        if (cb.dataset.userCode) {
          cb.checked = checked;
        }
      });
      updateDeleteSelectedButtonState();
    });
  }

  // Handle individual checkbox change
  tbody.querySelectorAll(".locker-list-item-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      updateDeleteSelectedButtonState();
    });
  });
  
  // Update button visibility based on selection
  updateDeleteSelectedButtonState();
}

function updateDeleteSelectedButtonState() {
  const checkboxes = document.querySelectorAll(".locker-list-item-checkbox:checked");
  const deleteBtn = document.getElementById("btn-delete-selected-employees");
  const countSpan = document.getElementById("delete-selected-count");
  if (deleteBtn && countSpan) {
    if (checkboxes.length > 0) {
      deleteBtn.style.display = "inline-flex";
      countSpan.innerText = checkboxes.length;
    } else {
      deleteBtn.style.display = "none";
    }
  }
}

async function deleteSelectedEmployees() {
  const checkedBoxes = document.querySelectorAll(".locker-list-item-checkbox:checked");
  const userCodes = Array.from(checkedBoxes).map(cb => cb.dataset.userCode).filter(code => code);
  
  if (userCodes.length === 0) return;
  
  confirmAction(`Bạn có chắc chắn muốn xóa ${userCodes.length} nhân sự đã chọn? Tất cả tủ đồ đang được dùng bởi các nhân viên này sẽ được tự động giải phóng / thu hồi.`, async () => {
    const promises = [];
    
    userCodes.forEach(code => {
      // 1. Release locker
      const lockerIndex = db.lockers.findIndex(l => l.status === "in_use" && l.userId === code);
      if (lockerIndex !== -1) {
        db.lockers[lockerIndex].status = "available";
        db.lockers[lockerIndex].userId = null;
        db.lockers[lockerIndex].notes = "";
        db.lockers[lockerIndex].assignedAt = null;
        
        // Sync locker status
        promises.push(supabaseSync('lockers', db.lockers[lockerIndex].id, db.lockers[lockerIndex]));
        
        // Log transaction
        logTransaction(db.lockers[lockerIndex].id, "Trả tủ", code, "Thu hồi tự động khi xóa nhân sự");
      }
      
      // 2. Remove employee locally
      db.employees = db.employees.filter(e => e.code !== code);
      
      // 3. Delete from Supabase
      promises.push(supabaseDelete('employees', code));
    });
    
    try {
      await Promise.all(promises);
      showToast(`Đã xóa thành công ${userCodes.length} nhân viên!`, "success");
    } catch (err) {
      console.error("Error deleting selected employees:", err);
      showToast("Có lỗi xảy ra khi xóa nhân sự trên đám mây!", "error");
    }
    
    saveDatabase();
    
    // Reset state & refresh UI
    const selectAllCheckbox = document.getElementById("locker-list-select-all");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateDeleteSelectedButtonState();
    
    renderLockerList();
    renderLockerMap();
    renderUsers();
    renderHistory();
    renderStatistics();
  });
}

function quickReturnLocker(lockerId) {
  const locker = db.lockers.find(l => l.id === lockerId);
  if (!locker) return;
  
  const oldUserId = locker.userId;
  const emp = db.employees.find(e => e.code === oldUserId);
  const userName = emp ? emp.fullname : "Nhân viên";
  
  confirmAction(`Bạn có muốn thu hồi tủ đồ ${locker.number} đang được dùng bởi ${userName}?`, () => {
    const lockerIndex = db.lockers.findIndex(l => l.id === lockerId);
    if (lockerIndex === -1) return;
    
    db.lockers[lockerIndex].status = "available";
    db.lockers[lockerIndex].userId = null;
    db.lockers[lockerIndex].notes = "";
    db.lockers[lockerIndex].assignedAt = null;
    
    supabaseSync('lockers', lockerId, db.lockers[lockerIndex]);
    saveDatabase();
    logTransaction(lockerId, "Trả tủ", oldUserId, "Đã trả tủ nhanh tại bảng Danh sách");
    
    renderLockerList();
    renderLockerMap();
    renderUsers();
    showToast(`Đã trả tủ ${locker.number} thành công`, "success");
  });
}

// 4. TRANSACTION LOGS HISTORY RENDER
function renderHistory() {
  const tbody = document.getElementById("history-table-body");
  const paginationContainer = document.getElementById("history-pagination");
  if (!tbody || !paginationContainer) return;
  
  tbody.innerHTML = "";
  paginationContainer.innerHTML = "";
  
  const searchKeyword = document.getElementById("history-search").value.toLowerCase().trim();
  const filterLobby = document.getElementById("history-filter-lobby").value;
  const filterAction = document.getElementById("history-filter-action").value;
  
  let filteredLogs = db.history;
  
  // Apply Search
  if (searchKeyword) {
    filteredLogs = filteredLogs.filter(log => 
      log.lockerNumber.toLowerCase().includes(searchKeyword) ||
      log.lobbyName.toLowerCase().includes(searchKeyword) ||
      log.fullname.toLowerCase().includes(searchKeyword) ||
      log.username.toLowerCase().includes(searchKeyword) ||
      log.departmentName.toLowerCase().includes(searchKeyword) ||
      log.action.toLowerCase().includes(searchKeyword) ||
      log.note.toLowerCase().includes(searchKeyword)
    );
  }
  
  // Apply Lobby Filter
  if (filterLobby) {
    filteredLogs = filteredLogs.filter(log => {
      const locker = db.lockers.find(l => l.id === log.lockerId);
      return locker && locker.lobby === filterLobby;
    });
  }
  
  // Apply Action Filter
  if (filterAction) {
    filteredLogs = filteredLogs.filter(log => log.action === filterAction);
  }
  
  const totalItems = filteredLogs.length;
  
  if (totalItems === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--text-secondary); padding: 24px;">Chưa có bản ghi lịch sử nào phù hợp.</td></tr>`;
    return;
  }
  
  // Calculate Pagination
  const totalPages = Math.max(1, Math.ceil(totalItems / historyItemsPerPage));
  if (historyCurrentPage > totalPages) {
    historyCurrentPage = totalPages;
  }
  if (historyCurrentPage < 1) {
    historyCurrentPage = 1;
  }
  
  const startIndex = (historyCurrentPage - 1) * historyItemsPerPage;
  const endIndex = Math.min(startIndex + historyItemsPerPage, totalItems);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
  
  paginatedLogs.forEach(log => {
    const timeDisplay = formatDateTime(log.timestamp);
    const actionBadgeClass = `badge status-badge-${log.action.substring(0, 3)}`;
    
    let holderDesc = "-";
    if (log.fullname) {
      holderDesc = `<strong>${escapeHtml(log.fullname)}</strong><br><span style="font-size:0.75rem; color: var(--text-secondary); font-family: monospace; font-weight: 700;">${escapeHtml(log.username.toUpperCase())}</span>`;
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="history-item-checkbox" data-id="${escapeHtml(log.id)}"></td>
      <td style="font-size: 0.8rem; color: var(--text-secondary);">${timeDisplay}</td>
      <td>${escapeHtml(log.lobbyName)}</td>
      <td><span style="font-family: monospace; font-weight:700;">${escapeHtml(log.lockerNumber)}</span></td>
      <td><span class="${actionBadgeClass}">${escapeHtml(log.action)}</span></td>
      <td>${holderDesc}</td>
      <td><span class="badge" style="background:rgba(255,255,255,0.02);">${escapeHtml(log.departmentName || "-")}</span></td>
      <td>
        <div style="font-size: 0.85rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.note)}">
          ${escapeHtml(log.note || "-")}
        </div>
        <div style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 2px;">
          Bởi: ${escapeHtml(log.operatorName)}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Handle Select All checkbox
  const selectAllCheckbox = document.getElementById("history-select-all");
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    selectAllCheckbox.addEventListener("change", (e) => {
      const checked = e.target.checked;
      tbody.querySelectorAll(".history-item-checkbox").forEach(cb => {
        cb.checked = checked;
      });
      updateDeleteSelectedHistoryButtonState();
    });
  }

  // Handle individual checkbox change
  tbody.querySelectorAll(".history-item-checkbox").forEach(cb => {
    cb.addEventListener("change", () => {
      updateDeleteSelectedHistoryButtonState();
    });
  });
  
  updateDeleteSelectedHistoryButtonState();

  // Render History Pagination Controls
  // Left side info
  const infoDiv = document.createElement("div");
  infoDiv.className = "pagination-info";
  infoDiv.innerText = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${totalItems} lịch sử`;
  paginationContainer.appendChild(infoDiv);
  
  // Right side controls
  const controlsDiv = document.createElement("div");
  controlsDiv.className = "pagination-controls";
  
  // First page button
  const firstBtn = document.createElement("button");
  firstBtn.className = "page-btn";
  firstBtn.innerHTML = '<i class="fa-solid fa-angles-left"></i>';
  firstBtn.disabled = historyCurrentPage === 1;
  firstBtn.addEventListener("click", () => {
    historyCurrentPage = 1;
    renderHistory();
  });
  controlsDiv.appendChild(firstBtn);
  
  // Previous page button
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
  prevBtn.disabled = historyCurrentPage === 1;
  prevBtn.addEventListener("click", () => {
    if (historyCurrentPage > 1) {
      historyCurrentPage--;
      renderHistory();
    }
  });
  controlsDiv.appendChild(prevBtn);
  
  // Render middle page numbers
  const maxPageVisible = 5;
  let startPage = Math.max(1, historyCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxPageVisible - 1);
  if (endPage - startPage < maxPageVisible - 1) {
    startPage = Math.max(1, endPage - maxPageVisible + 1);
  }
  
  for (let p = startPage; p <= endPage; p++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `page-btn ${p === historyCurrentPage ? 'active' : ''}`;
    pageBtn.innerText = p;
    pageBtn.addEventListener("click", () => {
      historyCurrentPage = p;
      renderHistory();
    });
    controlsDiv.appendChild(pageBtn);
  }
  
  // Next page button
  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
  nextBtn.disabled = historyCurrentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    if (historyCurrentPage < totalPages) {
      historyCurrentPage++;
      renderHistory();
    }
  });
  controlsDiv.appendChild(nextBtn);
  
  // Last page button
  const lastBtn = document.createElement("button");
  lastBtn.className = "page-btn";
  lastBtn.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
  lastBtn.disabled = historyCurrentPage === totalPages;
  lastBtn.addEventListener("click", () => {
    historyCurrentPage = totalPages;
    renderHistory();
  });
  controlsDiv.appendChild(lastBtn);
  
  paginationContainer.appendChild(controlsDiv);
}

function updateDeleteSelectedHistoryButtonState() {
  const checkboxes = document.querySelectorAll(".history-item-checkbox:checked");
  const deleteBtn = document.getElementById("btn-delete-selected-history");
  const countSpan = document.getElementById("delete-selected-history-count");
  if (deleteBtn && countSpan) {
    if (checkboxes.length > 0) {
      deleteBtn.style.display = "inline-flex";
      countSpan.innerText = checkboxes.length;
    } else {
      deleteBtn.style.display = "none";
    }
  }
}

async function deleteSelectedHistory() {
  const checkedBoxes = document.querySelectorAll(".history-item-checkbox:checked");
  const logIds = Array.from(checkedBoxes).map(cb => cb.dataset.id).filter(id => id);
  
  if (logIds.length === 0) return;
  
  confirmAction(`Bạn có chắc chắn muốn xóa ${logIds.length} bản ghi lịch sử đã chọn?`, async () => {
    const { error } = await supabaseClient.from('history').delete().in('id', logIds);
    if (error) {
      showToast("Lỗi xóa lịch sử trên đám mây: " + error.message, "error");
      return;
    }
    
    db.history = db.history.filter(h => !logIds.includes(h.id));
    saveDatabase();
    
    showToast(`Đã xóa thành công ${logIds.length} lịch sử!`, "success");
    
    const selectAllCheckbox = document.getElementById("history-select-all");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateDeleteSelectedHistoryButtonState();
    
    renderHistory();
  });
}

// 5. STATISTICS & DASHBOARD RENDER
function renderStatistics() {
  const totalCount = db.lockers.length;
  const availableCount = db.lockers.filter(l => l.status === "available").length;
  const inUseCount = db.lockers.filter(l => l.status === "in_use").length;
  const brokenCount = db.lockers.filter(l => ["broken", "error", "maintenance"].includes(l.status)).length;
  
  // Write to cards
  document.getElementById("stats-total-lockers").innerText = totalCount;
  document.getElementById("stats-available-lockers").innerText = availableCount;
  document.getElementById("stats-in-use-lockers").innerText = inUseCount;
  document.getElementById("stats-broken-lockers").innerText = brokenCount;
  
  // Lobby breakdown progress bars
  const lobbyStatsContainer = document.getElementById("lobby-stats-container");
  lobbyStatsContainer.innerHTML = "";
  
  const lobbies = ["A", "B"];
  lobbies.forEach(lobbyKey => {
    const lobbyName = db.lobbyNames[lobbyKey] || `Sảnh ${lobbyKey}`;
    const lockers = db.lockers.filter(l => l.lobby === lobbyKey);
    const total = lockers.length;
    
    if (total === 0) return;
    
    const occupied = lockers.filter(l => l.status === "in_use").length;
    const errors = lockers.filter(l => ["broken", "error", "maintenance"].includes(l.status)).length;
    
    const pctOccupied = total > 0 ? Math.round((occupied / total) * 100) : 0;
    const pctErrors = total > 0 ? Math.round((errors / total) * 100) : 0;
    const pctAvailable = 100 - pctOccupied - pctErrors;
    
    const div = document.createElement("div");
    div.className = "stat-bar-group";
    div.innerHTML = `
      <div class="stat-bar-label">
        <span>${escapeHtml(lobbyName)} (Tổng: ${total} tủ)</span>
        <span>Đang dùng: ${pctOccupied}% | Trống: ${pctAvailable}% | Sự cố: ${pctErrors}%</span>
      </div>
      <div class="stat-bar-wrapper" style="display: flex;">
        <div class="stat-bar-fill color-green" style="width: ${pctAvailable}%;" title="Trống: ${pctAvailable}%"></div>
        <div class="stat-bar-fill" style="width: ${pctOccupied}%;" title="Sử dụng: ${pctOccupied}%"></div>
        <div class="stat-bar-fill color-red" style="width: ${pctErrors}%;" title="Sự cố: ${pctErrors}%"></div>
      </div>
    `;
    lobbyStatsContainer.appendChild(div);
  });
  
  // Department breakdown progress bars
  const deptStatsContainer = document.getElementById("dept-stats-container");
  deptStatsContainer.innerHTML = "";
  
  if (db.departments.length === 0) {
    deptStatsContainer.innerHTML = `<p style="color:var(--text-secondary); text-align:center; padding:16px;">Chưa có dữ liệu bộ phận.</p>`;
    return;
  }
  
  const totalOccupiedLockers = db.lockers.filter(l => l.status === "in_use" && l.userId).length;
  
  db.departments.forEach(dept => {
    const deptEmployees = db.employees ? db.employees.filter(e => e.departmentId === dept.id) : [];
    const deptEmployeeCodes = deptEmployees.map(e => e.code);
    const deptLockerCount = db.lockers.filter(l => l.status === "in_use" && l.userId && deptEmployeeCodes.includes(l.userId)).length;
    
    const pct = totalOccupiedLockers > 0 ? Math.round((deptLockerCount / totalOccupiedLockers) * 100) : 0;
    
    const div = document.createElement("div");
    div.className = "stat-bar-group";
    div.innerHTML = `
      <div class="stat-bar-label">
        <span>${escapeHtml(dept.name)}</span>
        <span>${deptLockerCount} tủ (${pct}%)</span>
      </div>
      <div class="stat-bar-wrapper">
        <div class="stat-bar-fill color-purple" style="width: ${pct}%;"></div>
      </div>
    `;
    deptStatsContainer.appendChild(div);
  });
}

// Populate dropdown lists
function populateDropdowns() {
  // 1. Department dropdowns
  const deptSelects = [
    document.getElementById("user-dept"),
    document.getElementById("filter-user-dept"),
    document.getElementById("locker-list-filter-dept"),
    document.getElementById("assign-user-dept")
  ];
  
  const originalFilterVal = deptSelects[1] ? deptSelects[1].value : "";
  const originalListFilterVal = deptSelects[2] ? deptSelects[2].value : "";
  const originalAssignDeptVal = deptSelects[3] ? deptSelects[3].value : "";
  
  deptSelects.forEach(select => {
    if (!select) return;
    
    const val = select.value;
    const firstOpt = select.options[0];
    select.innerHTML = "";
    if (firstOpt) select.appendChild(firstOpt);
    
    db.departments.forEach(dept => {
      const opt = document.createElement("option");
      opt.value = dept.id;
      opt.innerText = dept.name;
      select.appendChild(opt);
    });
    
    select.value = val;
  });
  
  if (originalFilterVal && deptSelects[1]) {
    deptSelects[1].value = originalFilterVal;
  }
  if (originalListFilterVal && deptSelects[2]) {
    deptSelects[2].value = originalListFilterVal;
  }
  if (originalAssignDeptVal && deptSelects[3]) {
    deptSelects[3].value = originalAssignDeptVal;
  }
  
  // 2. User Switcher Dropdown (in sidebar)
  const switchUserSelect = document.getElementById("switch-user-select");
  if (switchUserSelect) {
    switchUserSelect.innerHTML = "";
    db.users.forEach(user => {
      const dept = db.departments.find(d => d.id === user.departmentId);
      const deptText = dept ? ` (${dept.name})` : "";
      const roleText = user.role === "admin" ? " [ADMIN]" : "";
      
      const opt = document.createElement("option");
      opt.value = user.id;
      opt.innerText = `${user.fullname}${deptText}${roleText}`;
      switchUserSelect.appendChild(opt);
    });
    
    if (db.currentUser) {
      switchUserSelect.value = db.currentUser.id;
    }
  }
}

// ==========================================
// EVENT LISTENERS & CRUD FUNCTIONS
// ==========================================

function setupEventListeners() {
  // Theme Toggle (Light/Dark Mode)
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", nextTheme);
    localStorage.setItem("smart_locker_theme", nextTheme);
    
    const icon = themeToggle.querySelector("i");
    if (nextTheme === "dark") {
      icon.className = "fa-solid fa-moon";
      showToast("Đã bật chế độ Tối", "success");
    } else {
      icon.className = "fa-solid fa-sun";
      showToast("Đã bật chế độ Sáng", "success");
    }
  });
  
  // Load saved theme on load
  const savedTheme = localStorage.getItem("smart_locker_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeToggle.querySelector("i").className = savedTheme === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
  
  // Switch Active User Dropdown in sidebar (Simulation)
  document.getElementById("switch-user-select").addEventListener("change", (e) => {
    const selectedUserId = e.target.value;
    const user = db.users.find(u => u.id === selectedUserId);
    if (user) {
      db.currentUser = user;
      saveDatabase();
      applyPermissions();
      populateDropdowns();
      renderLockerMap();
      renderDepartments();
      renderUsers();
      renderLockerList();
      renderHistory();
      showToast(`Đã mô phỏng chuyển sang: ${user.fullname}`, "success");
    }
  });
  
  // Lobby Tab toggle buttons
  document.getElementById("tab-lobby-a").addEventListener("click", () => switchLobby("A"));
  document.getElementById("tab-lobby-b").addEventListener("click", () => switchLobby("B"));
  
  // Manual Re-index button listener
  const btnManualReindex = document.getElementById("btn-manual-reindex");
  if (btnManualReindex) {
    btnManualReindex.addEventListener("click", handleManualReindexClick);
  }
  
  // Save Layout Changes button listener
  const btnSaveLayout = document.getElementById("btn-save-layout");
  if (btnSaveLayout) {
    btnSaveLayout.addEventListener("click", handleSaveLayoutClick);
  }
  
  // Lobby rename action
  document.getElementById("btn-lobby-rename").addEventListener("click", renameActiveLobby);
  
  // Filter user by department change
  document.getElementById("filter-user-dept").addEventListener("change", renderUsers);
  
  // Map Search Input listeners on Main Screen
  const mapSearchInput = document.getElementById("map-search-input");
  const btnClearMapSearch = document.getElementById("btn-clear-map-search");
  
  if (mapSearchInput) {
    mapSearchInput.addEventListener("input", (e) => {
      mapSearchQuery = e.target.value.toLowerCase().trim();
      
      if (mapSearchQuery) {
        if (btnClearMapSearch) btnClearMapSearch.style.display = "block";
      } else {
        if (btnClearMapSearch) btnClearMapSearch.style.display = "none";
      }
      
      renderLockerMap();
      renderMapSearchResults();
    });
  }
  
  if (btnClearMapSearch) {
    btnClearMapSearch.addEventListener("click", () => {
      if (mapSearchInput) mapSearchInput.value = "";
      btnClearMapSearch.style.display = "none";
      mapSearchQuery = "";
      
      renderLockerMap();
      renderMapSearchResults();
    });
  }
  
  // Search & Filter Locker List (New tab)
  document.getElementById("locker-list-search").addEventListener("input", () => {
    lockerListCurrentPage = 1;
    renderLockerList();
  });
  document.getElementById("locker-list-filter-lobby").addEventListener("change", () => {
    lockerListCurrentPage = 1;
    renderLockerList();
  });
  document.getElementById("locker-list-filter-dept").addEventListener("change", () => {
    lockerListCurrentPage = 1;
    renderLockerList();
  });
  
  // Bulk Delete Selected Employees Listener
  const bulkDeleteBtn = document.getElementById("btn-delete-selected-employees");
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener("click", deleteSelectedEmployees);
  }

  // Search & Filter History log
  document.getElementById("history-search").addEventListener("input", () => {
    historyCurrentPage = 1;
    renderHistory();
  });
  document.getElementById("history-filter-lobby").addEventListener("change", () => {
    historyCurrentPage = 1;
    renderHistory();
  });
  document.getElementById("history-filter-action").addEventListener("change", () => {
    historyCurrentPage = 1;
    renderHistory();
  });
  
  // Bulk Delete Selected History Listener
  const bulkDeleteHistBtn = document.getElementById("btn-delete-selected-history");
  if (bulkDeleteHistBtn) {
    bulkDeleteHistBtn.addEventListener("click", deleteSelectedHistory);
  }
  
  // Clear history log
  document.getElementById("btn-clear-history").addEventListener("click", () => {
    confirmAction("Bạn có chắc muốn xóa tất cả lịch sử? Thao tác này không thể hoàn tác.", () => {
      db.history = [];
      saveDatabase();
      supabaseClient.from('history').delete().gt('timestamp', '1970-01-01T00:00:00Z').then(({error}) => {
        if (error) console.error("Error clearing history:", error);
      });
      renderHistory();
      renderStatistics();
      showToast("Đã xóa sạch lịch sử giao dịch", "success");
    });
  });
  
  // Layout Config Modal actions (Admin only)
  document.getElementById("btn-config-layout").addEventListener("click", () => {
    document.getElementById("cfg-rows").value = db.settings.rows;
    document.getElementById("cfg-cols").value = db.settings.cols;
    document.getElementById("config-layout-modal").classList.add("open");
  });
  
  document.getElementById("btn-close-layout-modal").addEventListener("click", () => {
    document.getElementById("config-layout-modal").classList.remove("open");
  });
  document.getElementById("btn-cancel-layout-config").addEventListener("click", () => {
    document.getElementById("config-layout-modal").classList.remove("open");
  });
  document.getElementById("btn-save-layout-config").addEventListener("click", saveLayoutConfig);
  
  // UNLIMITED LOCKERS DYNAMIC ADDING MODAL ACTIONS
  const addLockerModal = document.getElementById("add-locker-modal");
  const modeSelect = document.getElementById("add-locker-mode");
  
  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      const mode = e.target.value;
      if (mode === "bulk") {
        document.getElementById("group-add-locker-qty").style.display = "block";
        document.getElementById("group-add-locker-row").style.display = "none";
        document.getElementById("group-add-locker-col").style.display = "none";
        document.getElementById("group-add-locker-tier").style.display = "none";
        document.getElementById("add-locker-row").removeAttribute("required");
      } else {
        document.getElementById("group-add-locker-qty").style.display = "none";
        document.getElementById("group-add-locker-row").style.display = "block";
        document.getElementById("group-add-locker-col").style.display = "block";
        document.getElementById("group-add-locker-tier").style.display = "block";
        document.getElementById("add-locker-row").setAttribute("required", "true");
      }
    });
  }

  document.getElementById("btn-add-locker").addEventListener("click", () => {
    document.getElementById("add-locker-lobby").value = activeLobby;
    document.getElementById("add-locker-mode").value = "bulk";
    if (modeSelect) modeSelect.dispatchEvent(new Event("change"));
    
    document.getElementById("add-locker-row").value = `Dãy ${db.settings.rows + 1}`;
    document.getElementById("add-locker-col").value = 1;
    document.getElementById("add-locker-tier").value = "6";
    addLockerModal.classList.add("open");
  });
  document.getElementById("btn-close-add-locker-modal").addEventListener("click", () => {
    addLockerModal.classList.remove("open");
  });
  document.getElementById("btn-cancel-add-locker").addEventListener("click", () => {
    addLockerModal.classList.remove("open");
  });
  document.getElementById("form-add-locker").addEventListener("submit", handleAddLockerSubmit);
  
  // Department Form Submit
  document.getElementById("department-form").addEventListener("submit", handleDepartmentSubmit);
  document.getElementById("btn-cancel-dept-edit").addEventListener("click", resetDepartmentForm);
  
  // User Form Submit
  document.getElementById("user-form").addEventListener("submit", handleUserSubmit);
  document.getElementById("btn-cancel-user-edit").addEventListener("click", resetUserForm);
  
  // Locker detail modal actions
  document.getElementById("btn-close-locker-modal").addEventListener("click", closeLockerModal);
  document.getElementById("form-assign-locker").addEventListener("submit", handleAssignLockerSubmit);
  document.getElementById("btn-return-locker").addEventListener("click", handleReturnLockerClick);
  document.getElementById("btn-report-broken").addEventListener("click", handleReportBrokenClick);
  document.getElementById("btn-override-status").addEventListener("click", handleOverrideStatusClick);
  document.getElementById("btn-delete-locker").addEventListener("click", handleDeleteLockerClick);
  
  // Auto-fill locker assignment info if user code exists
  const assignCodeInput = document.getElementById("assign-user-code");
  if (assignCodeInput) {
    assignCodeInput.addEventListener("input", (e) => {
      const code = e.target.value.trim().toLowerCase();
      if (!code) return;
      
      const emp = db.employees.find(e => e.code === code);
      if (emp) {
        document.getElementById("assign-user-name").value = emp.fullname;
        document.getElementById("assign-user-dept").value = emp.departmentId;
      }
    });
  }
  
  // Excel Export action
  document.getElementById("btn-export-excel").addEventListener("click", exportHistoryToExcel);
  
  // Excel Locker List Export, Import & Template actions
  const btnExportLList = document.getElementById("btn-export-locker-list");
  if (btnExportLList) {
    btnExportLList.addEventListener("click", exportLockerListToExcel);
  }
  
  const btnImportLList = document.getElementById("btn-import-locker-list");
  const fileImportLList = document.getElementById("import-locker-list-file");
  if (btnImportLList && fileImportLList) {
    btnImportLList.addEventListener("click", () => fileImportLList.click());
    fileImportLList.addEventListener("change", handleImportLockerListFile);
  }
  
  const btnDownloadTemp = document.getElementById("btn-download-template");
  if (btnDownloadTemp) {
    btnDownloadTemp.addEventListener("click", (e) => {
      e.preventDefault();
      downloadLockerListTemplate();
    });
  }
  
  const btnExportStats = document.getElementById("btn-export-stats-excel");
  if (btnExportStats) {
    btnExportStats.addEventListener("click", exportStatisticsToExcel);
  }
  
  // Custom confirmation modal bindings
  document.getElementById("btn-confirm-cancel").addEventListener("click", () => {
    document.getElementById("confirm-modal").classList.remove("open");
    confirmCallback = null;
  });
  
  document.getElementById("btn-confirm-ok").addEventListener("click", () => {
    document.getElementById("confirm-modal").classList.remove("open");
    if (confirmCallback) confirmCallback();
    confirmCallback = null;
  });
}

function switchLobby(lobbyKey) {
  activeLobby = lobbyKey;
  document.querySelectorAll(".lobby-tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });
  document.getElementById(`tab-lobby-${lobbyKey.toLowerCase()}`).classList.add("active");
  renderLockerMap();
}

function renameActiveLobby() {
  const newName = document.getElementById("input-lobby-rename").value.trim();
  if (!newName) {
    showToast("Tên sảnh không được để trống!", "error");
    return;
  }
  
  const oldName = db.lobbyNames[activeLobby];
  db.lobbyNames[activeLobby] = newName;
  saveDatabase();
  
  document.getElementById(`tab-lobby-${activeLobby.toLowerCase()}`).innerText = newName;
  
  renderLockerMap();
  renderLockerList();
  renderHistory();
  renderStatistics();
  
  showToast(`Đã đổi tên ${oldName} thành: ${newName}`, "success");
}

// ------------------------------------------
// DEPARTMENTS CRUD ACTIONS
// ------------------------------------------

function handleDepartmentSubmit(e) {
  e.preventDefault();
  
  const idInput = document.getElementById("dept-edit-id").value;
  const nameInput = document.getElementById("dept-name").value.trim();
  const descInput = document.getElementById("dept-desc").value.trim();
  
  if (!nameInput) return;
  
  let targetId = idInput;
  if (idInput) {
    const deptIndex = db.departments.findIndex(d => d.id === idInput);
    if (deptIndex !== -1) {
      db.departments[deptIndex].name = nameInput;
      db.departments[deptIndex].description = descInput;
      showToast(`Đã cập nhật bộ phận: ${nameInput}`, "success");
    }
  } else {
    targetId = "dept-" + Date.now();
    db.departments.push({
      id: targetId,
      name: nameInput,
      description: descInput
    });
    showToast(`Đã thêm bộ phận mới: ${nameInput}`, "success");
  }
  
  // Sync to Supabase
  const deptObj = db.departments.find(d => d.id === targetId);
  supabaseSync('departments', targetId, deptObj);
  
  saveDatabase();
  resetDepartmentForm();
  renderDepartments();
  populateDropdowns();
  renderUsers();
  renderLockerList();
}

function editDepartment(id) {
  const dept = db.departments.find(d => d.id === id);
  if (!dept) return;
  
  document.getElementById("dept-edit-id").value = dept.id;
  document.getElementById("dept-name").value = dept.name;
  document.getElementById("dept-desc").value = dept.description || "";
  
  document.getElementById("dept-form-title").innerText = "Sửa Bộ Phận";
  document.getElementById("btn-cancel-dept-edit").classList.remove("hidden");
}

function deleteDepartment(id) {
  const dept = db.departments.find(d => d.id === id);
  if (!dept) return;
  
  const employeeCount = db.employees ? db.employees.filter(e => e.departmentId === id).length : 0;
  if (employeeCount > 0) {
    showToast(`Không thể xóa bộ phận '${dept.name}' vì đang có ${employeeCount} nhân viên thuộc bộ phận này!`, "error");
    return;
  }
  
  confirmAction(`Bạn có chắc muốn xóa bộ phận '${dept.name}'?`, () => {
    db.departments = db.departments.filter(d => d.id !== id);
    supabaseDelete('departments', id);
    saveDatabase();
    renderDepartments();
    populateDropdowns();
    showToast(`Đã xóa bộ phận: ${dept.name}`, "success");
  });
}

function resetDepartmentForm() {
  document.getElementById("dept-edit-id").value = "";
  document.getElementById("dept-name").value = "";
  document.getElementById("dept-desc").value = "";
  
  document.getElementById("dept-form-title").innerText = "Thêm Bộ Phận Mới";
  document.getElementById("btn-cancel-dept-edit").classList.add("hidden");
}

// ------------------------------------------
// EMPLOYEES / USERS (ACCOUNT MANAGEMENT) CRUD ACTIONS
// ------------------------------------------

async function handleUserSubmit(e) {
  e.preventDefault();
  
  const idInput = document.getElementById("user-edit-id").value;
  const fullNameInput = document.getElementById("user-fullname").value.trim();
  const userNameInput = document.getElementById("user-username").value.trim().toLowerCase();
  const passwordInput = document.getElementById("user-password").value.trim();
  const deptInput = document.getElementById("user-dept").value;
  const roleInput = document.getElementById("user-role").value;
  
  if (!fullNameInput || !userNameInput || !passwordInput || !deptInput || !roleInput) return;
  
  const duplicate = db.users.find(u => u.username === userNameInput && u.id !== idInput);
  if (duplicate) {
    showToast(`Tên đăng nhập @${userNameInput} đã tồn tại! Vui lòng chọn tên khác.`, "error");
    return;
  }
  
  if (idInput) {
    // 1. Update public profiles details
    const { error: profErr } = await supabaseClient.from('profiles').update({
      fullname: fullNameInput,
      department_id: deptInput,
      role: roleInput
    }).eq('id', idInput);
    
    if (profErr) {
      showToast("Lỗi cập nhật tài khoản: " + profErr.message, "error");
      return;
    }
    
    // 2. If password changed, update it using RPC
    if (passwordInput && passwordInput !== '***') {
      const { error: passErr } = await supabaseClient.rpc('admin_update_user_password', {
        user_uuid: idInput,
        new_password: passwordInput
      });
      if (passErr) {
        showToast("Không thể cập nhật mật khẩu: " + passErr.message, "error");
        return;
      }
    }
    showToast(`Đã cập nhật tài khoản: ${fullNameInput}`, "success");
  } else {
    // 3. Auto-append email domain if only username is provided
    let emailInput = userNameInput;
    if (!emailInput.includes("@")) {
      emailInput = emailInput + "@internal.locker";
    }

    // 4. Register user using RPC (admin_create_user)
    const { data: newId, error: signUpErr } = await supabaseClient.rpc('admin_create_user', {
      email_val: emailInput,
      password_val: passwordInput,
      fullname_val: fullNameInput,
      role_val: roleInput,
      department_id_val: deptInput
    });
    
    if (signUpErr) {
      showToast("Lỗi tạo tài khoản: " + signUpErr.message, "error");
      return;
    }
    showToast(`Đã tạo tài khoản thành công cho: ${fullNameInput}`, "success");
  }
  
  await loadDatabase();
  resetUserForm();
  renderUsers();
  populateDropdowns();
  applyPermissions();
  renderLockerMap();
  renderLockerList();
}

function editUser(id) {
  const user = db.users.find(u => u.id === id);
  if (!user) return;
  
  document.getElementById("user-edit-id").value = user.id;
  document.getElementById("user-fullname").value = user.fullname;
  document.getElementById("user-username").value = user.username;
  document.getElementById("user-password").value = user.password || "123456";
  document.getElementById("user-dept").value = user.departmentId;
  document.getElementById("user-role").value = user.role;
  
  document.getElementById("user-form-title").innerText = "Sửa Tài Khoản";
  document.getElementById("btn-cancel-user-edit").classList.remove("hidden");
}

function deleteUser(id) {
  const user = db.users.find(u => u.id === id);
  if (!user) return;
  
  if (id === db.currentUser.id) {
    showToast("Không thể tự xóa tài khoản của chính bạn đang đăng nhập!", "error");
    return;
  }
  
  const holdingLocker = db.lockers.find(l => l.status === "in_use" && l.userId === id);
  if (holdingLocker) {
    showToast(`Không thể xóa tài khoản '${user.fullname}' vì họ đang giữ tủ ${holdingLocker.number}! Vui lòng thu hồi tủ trước.`, "error");
    return;
  }
  
  confirmAction(`Bạn có chắc chắn muốn xóa tài khoản của '${user.fullname}'?`, async () => {
    const { error } = await supabaseClient.rpc('admin_delete_user', { user_uuid: id });
    if (error) {
      showToast("Lỗi xóa tài khoản: " + error.message, "error");
      return;
    }
    db.users = db.users.filter(u => u.id !== id);
    saveDatabase();
    renderUsers();
    populateDropdowns();
    showToast(`Đã xóa tài khoản: ${user.fullname}`, "success");
  });
}

function resetUserForm() {
  document.getElementById("user-edit-id").value = "";
  document.getElementById("user-fullname").value = "";
  document.getElementById("user-username").value = "";
  document.getElementById("user-password").value = "";
  document.getElementById("user-dept").value = "";
  document.getElementById("user-role").value = "user";
  
  document.getElementById("user-form-title").innerText = "Tạo Tài Khoản Mới";
  document.getElementById("btn-cancel-user-edit").classList.add("hidden");
}

// ------------------------------------------
// LOCKER LAYOUT SETUP CONFIG ACTION
// ------------------------------------------

function saveLayoutConfig() {
  const newRows = parseInt(document.getElementById("cfg-rows").value);
  const newCols = parseInt(document.getElementById("cfg-cols").value);
  
  if (isNaN(newRows) || newRows < 1 || newRows > 50 || isNaN(newCols) || newCols < 1 || newCols > 50) {
    showToast("Số dãy (1-50) và số cột (1-50) không hợp lệ!", "error");
    return;
  }
  
  confirmAction("Thay đổi này sẽ tái cấu trúc lưới tủ đồ sảnh A và B. Bạn có chắc muốn tiếp tục?", () => {
    db.settings.rows = newRows;
    db.settings.cols = newCols;
    
    generateLockers();
    supabaseSync('settings', 'global', db.settings);
    
    // Bulk upsert regenerated lockers layout to Supabase
    const lockersToUpsert = db.lockers.map(l => ({
      id: l.id,
      lobby: l.lobby,
      row: l.row,
      col: l.col,
      tier: l.tier,
      number: l.number,
      status: l.status,
      user_id: l.userId,
      notes: l.notes || '',
      assigned_at: l.assignedAt
    }));
    supabaseClient.from('lockers').upsert(lockersToUpsert).then(({error}) => {
      if (error) console.error("Error syncing regenerated lockers layout:", error);
    });

    saveDatabase();
    
    document.getElementById("config-layout-modal").classList.remove("open");
    renderLockerMap();
    renderLockerList();
    renderStatistics();
    showToast("Đã cập nhật cấu trúc tủ đồ thành công!", "success");
  });
}

// ------------------------------------------
// DYNAMIC UNLIMITED LOCKER ADDING
// ------------------------------------------

// Helper to find the first N vacant sequential coordinates in standard layout grid
function findNextEmptyPositions(lobby, qty) {
  const currentLobbyLockers = db.lockers.filter(l => l.lobby === lobby);
  const currentLobbyIds = new Set(currentLobbyLockers.map(l => l.id));
  
  const results = [];
  const tiersCount = 6;
  const colsCount = 13;
  const rowsCount = 10;
  
  let count = 0;
  let finished = false;
  
  if (lobby === "A") {
    // Loop standard Lobby A sequence (1 to 546)
    for (let r = 1; r <= rowsCount; r++) {
      const rowName = `Dãy ${r}`;
      for (let c = 1; c <= colsCount; c++) {
        for (let t = tiersCount; t >= 1; t--) {
          count++;
          const id = `A-R${r}-C${c}-T${t}`;
          if (!currentLobbyIds.has(id)) {
            results.push({
              id: id,
              lobby: "A",
              row: rowName,
              col: c,
              tier: t
            });
            if (results.length >= qty) {
              return results;
            }
          }
          if (count === 546) {
            finished = true;
            break;
          }
        }
        if (finished) break;
      }
      if (finished) break;
    }
  } else {
    // Loop standard Lobby B sequence (547 to 1092)
    for (let r = 1; r <= rowsCount; r++) {
      const rowName = `Dãy ${r}`;
      for (let c = 1; c <= colsCount; c++) {
        for (let t = tiersCount; t >= 1; t--) {
          count++;
          if (count > 546) { // Lobby B has 546 lockers
            finished = true;
            break;
          }
          const id = `B-R${r}-C${c}-T${t}`;
          if (!currentLobbyIds.has(id)) {
            results.push({
              id: id,
              lobby: "B",
              row: rowName,
              col: c,
              tier: t
            });
            if (results.length >= qty) {
              return results;
            }
          }
        }
        if (finished) break;
      }
      if (finished) break;
    }
  }
  
  // If the standard 1035 slots are fully occupied, expand rows dynamically beyond rowsCount (10)
  if (results.length < qty) {
    let nextRow = rowsCount + 1;
    if (currentLobbyLockers.length > 0) {
      const rows = currentLobbyLockers.map(l => {
        const match = l.row.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      });
      nextRow = Math.max(...rows) + 1;
    }
    
    while (results.length < qty) {
      const rowName = `Dãy ${nextRow}`;
      for (let c = 1; c <= colsCount; c++) {
        for (let t = tiersCount; t >= 1; t--) {
          const id = `${lobby}-R${nextRow}-C${c}-T${t}`;
          if (!currentLobbyIds.has(id)) {
            results.push({
              id: id,
              lobby: lobby,
              row: rowName,
              col: c,
              tier: t
            });
            if (results.length >= qty) {
              return results;
            }
          }
        }
      }
      nextRow++;
    }
  }
  
  return results;
}

function handleAddLockerSubmit(e) {
  e.preventDefault();
  
  const lobby = document.getElementById("add-locker-lobby").value;
  const mode = document.getElementById("add-locker-mode").value;
  
  const oldLockers = [...db.lockers];
  const newLockersCreated = [];
  
  // Find next sequential number to assign temporarily
  const allNumbers = db.lockers.map(l => parseInt(l.number)).filter(num => !isNaN(num));
  let nextNumber = allNumbers.length > 0 ? Math.max(...allNumbers) + 1 : 1;
  
  if (mode === "single") {
    const rowName = document.getElementById("add-locker-row").value.trim();
    const colVal = parseInt(document.getElementById("add-locker-col").value);
    const tierVal = parseInt(document.getElementById("add-locker-tier").value);
    
    if (!rowName) {
      showToast("Vui lòng nhập tên dãy tủ!", "error");
      return;
    }
    
    if (isNaN(colVal) || colVal < 1 || isNaN(tierVal) || tierVal < 1 || tierVal > 6) {
      showToast("Thông tin cột hoặc tầng không hợp lệ!", "error");
      return;
    }
    
    const cleanRowName = rowName.replace(/\s+/g, '_');
    const id = `${lobby}-R_${cleanRowName}-C${colVal}-T${tierVal}`;
    
    const duplicate = db.lockers.find(l => l.id === id);
    if (duplicate) {
      showToast("Thêm thất bại! Vị trí tủ đồ đã tồn tại từ trước.", "error");
      return;
    }
    
    const formattedNumber = nextNumber < 10 ? '0' + nextNumber : String(nextNumber);
    
    const lockerObj = {
      id: id,
      lobby: lobby,
      row: rowName,
      col: colVal,
      tier: tierVal,
      number: formattedNumber,
      status: "available",
      userId: null,
      notes: "",
      assignedAt: null
    };
    
    db.lockers.push(lockerObj);
    newLockersCreated.push(lockerObj);
    
  } else {
    // Bulk Mode
    const qty = parseInt(document.getElementById("add-locker-qty").value);
    if (isNaN(qty) || qty < 1) {
      showToast("Số lượng tủ cần thêm không hợp lệ!", "error");
      return;
    }
    
    // Automatically find the next empty coordinates in the standard layout (13 columns, 6 tiers)
    const emptyCoords = findNextEmptyPositions(lobby, qty);
    
    emptyCoords.forEach(coord => {
      const formattedNumber = nextNumber < 10 ? '0' + nextNumber : String(nextNumber);
      
      const lockerObj = {
        id: coord.id,
        lobby: lobby,
        row: coord.row,
        col: coord.col,
        tier: coord.tier,
        number: formattedNumber,
        status: "available",
        userId: null,
        notes: "",
        assignedAt: null
      };
      
      db.lockers.push(lockerObj);
      newLockersCreated.push(lockerObj);
      nextNumber++;
    });
  }
  
  if (newLockersCreated.length > 0) {
    // Re-index all lockers to ensure they are seamless and contiguous
    reindexLockers();
    saveDatabase();
    
    // Mark unsaved layout changes
    markUnsavedLayoutChanges(oldLockers);
    showToast(`Đã thêm ${newLockersCreated.length} tủ mới thành công! Vui lòng nhấn nút "Lưu thay đổi sơ đồ" ở trên để lưu vào cơ sở dữ liệu.`, "warning");
    
    // Log transaction
    const refLocker = newLockersCreated[0];
    logTransaction(refLocker.id, "Thêm tủ mới", null, `Thêm mới ${newLockersCreated.length} tủ tại sảnh ${lobby}`);
    
    document.getElementById("add-locker-modal").classList.remove("open");
    renderLockerMap();
    renderLockerList();
    renderStatistics();
  }
}

// ==========================================
// LOCKER DETAIL ACTION MODAL LOGIC
// ==========================================

function openLockerModal(id) {
  selectedLockerIdForModal = id;
  const locker = db.lockers.find(l => l.id === id);
  if (!locker) return;
  
  const modal = document.getElementById("locker-action-modal");
  const modalTitle = document.getElementById("modal-locker-number");
  
  const lobbyName = db.lobbyNames[locker.lobby] || `Sảnh ${locker.lobby}`;
  modalTitle.innerText = `${locker.number} (${lobbyName} - ${locker.row} - Cột ${locker.col} - Tầng ${locker.tier})`;
  
  const dot = document.getElementById("locker-modal-dot");
  const stateText = document.getElementById("locker-modal-status-text");
  const stateDesc = document.getElementById("locker-modal-status-desc");
  
  dot.className = `state-dot status-${locker.status}`;
  
  const holderSection = document.getElementById("locker-holder-info");
  const formAssign = document.getElementById("form-assign-locker");
  const btnReturn = document.getElementById("btn-return-locker");
  const btnReportBroken = document.getElementById("btn-report-broken");
  const overrideSelect = document.getElementById("override-status-select");
  const overrideNoteInput = document.getElementById("override-note");
  
  holderSection.classList.add("hidden");
  formAssign.classList.add("hidden");
  btnReturn.classList.add("hidden");
  btnReportBroken.classList.add("hidden");
  
  if (locker.status === "available") {
    document.getElementById("assign-user-code").value = "";
    document.getElementById("assign-user-name").value = "";
    document.getElementById("assign-user-dept").value = "";
  }
  document.getElementById("assign-note").value = "";
  overrideNoteInput.value = "";
  overrideSelect.value = locker.status;
  
  const isAdmin = db.currentUser.role === "admin";
  const currentUserId = db.currentUser.id;
  
  let lockerHistory = db.history.filter(h => h.lockerId === locker.id && h.action === "Cấp tủ");
  let lastAssign = lockerHistory.length > 0 ? lockerHistory[0] : null;
  
  if (locker.status === "available") {
    stateText.innerText = "Trống";
    stateDesc.innerText = "Sẵn sàng cấp phát cho nhân viên sử dụng.";
    formAssign.classList.remove("hidden");
    populateDropdowns(); 
    
  } else if (locker.status === "in_use") {
    stateText.innerText = "Đang sử dụng";
    stateDesc.innerText = "Tủ đang được niêm phong khóa và sử dụng.";
    holderSection.classList.remove("hidden");
    
    const emp = db.employees.find(e => e.code === locker.userId);
    if (emp) {
      const dept = db.departments.find(d => d.id === emp.departmentId);
      document.getElementById("locker-holder-name").innerText = emp.fullname;
      document.getElementById("locker-holder-meta").innerText = `${dept ? dept.name : "Không rõ"} - ${emp.code.toUpperCase()}`;
    } else {
      document.getElementById("locker-holder-name").innerText = "Không rõ";
      document.getElementById("locker-holder-meta").innerText = "-";
    }
    
    document.getElementById("locker-holder-time").innerText = lastAssign ? `Thời gian cấp: ${formatDateTime(lastAssign.timestamp)}` : "Thời gian cấp: --";
    document.getElementById("locker-issue-notes-group").classList.add("hidden");
    
    // Admins and managers can return or report defect on lockers
    const canManage = isAdmin || db.currentUser.role === "manager";
    if (canManage) {
      btnReturn.classList.remove("hidden");
      btnReportBroken.classList.remove("hidden");
    }
    
  } else {
    const statusMap = {
      broken: { text: "Hỏng", desc: "Tủ bị hỏng nặng kết cấu, ngăn kéo, hoặc ổ khóa cần thay thế." },
      error: { text: "Lỗi kỹ thuật", desc: "Lỗi kẹt khóa, thất lạc khóa cơ, cần hỗ trợ mở tủ." },
      maintenance: { text: "Đang bảo trì", desc: "Tủ đang được vệ sinh hoặc kiểm tra định kỳ." }
    };
    
    stateText.innerText = statusMap[locker.status].text;
    stateDesc.innerText = statusMap[locker.status].desc;
    
    holderSection.classList.remove("hidden");
    document.getElementById("locker-holder-name").innerText = "Hệ thống bảo trì";
    document.getElementById("locker-holder-meta").innerText = "Chờ xử lý";
    document.getElementById("locker-holder-time").innerText = "";
    
    const lastIssueLog = db.history.find(h => h.lockerId === locker.id && ["Báo hỏng", "Bảo trì"].includes(h.action));
    document.getElementById("locker-issue-notes-group").classList.remove("hidden");
    document.getElementById("locker-modal-issue-notes").innerText = locker.notes || (lastIssueLog ? lastIssueLog.note : "Không có ghi chú chi tiết.");
  }
  
  modal.classList.add("open");
}

function closeLockerModal() {
  document.getElementById("locker-action-modal").classList.remove("open");
  selectedLockerIdForModal = null;
}

// Handler: Assign Locker
function handleAssignLockerSubmit(e) {
  e.preventDefault();
  
  if (!selectedLockerIdForModal) return;
  
  const code = document.getElementById("assign-user-code").value.trim().toLowerCase();
  const name = document.getElementById("assign-user-name").value.trim();
  const deptId = document.getElementById("assign-user-dept").value;
  const note = document.getElementById("assign-note").value.trim();
  
  if (!code || !name || !deptId) {
    showToast("Vui lòng điền đầy đủ thông tin nhân viên!", "error");
    return;
  }
  
  const lockerIndex = db.lockers.findIndex(l => l.id === selectedLockerIdForModal);
  if (lockerIndex === -1) return;
  
  // Find or dynamically create employee (locker user)
  let emp = db.employees.find(e => e.code === code);
  
  if (emp) {
    // Check if this existing employee is already holding 3 lockers
    const holdingLockers = db.lockers.filter(l => l.status === "in_use" && l.userId === code);
    if (holdingLockers.length >= 3) {
      const lockerNumbersStr = holdingLockers.map(l => l.number).join(", ");
      showToast(`Nhân viên '${emp.fullname}' đang giữ tối đa 3 tủ (${lockerNumbersStr})! Không thể cấp thêm.`, "error");
      return;
    }
    
    // Optionally update employee name or department if they changed
    emp.fullname = name;
    emp.departmentId = deptId;
  } else {
    // Dynamically create new employee
    emp = {
      code: code,
      fullname: name,
      departmentId: deptId
    };
    db.employees.push(emp);
    showToast(`Đã thêm nhân viên ${name} vào danh sách nhân sự`, "info");
  }
  
  db.lockers[lockerIndex].status = "in_use";
  db.lockers[lockerIndex].userId = code;
  db.lockers[lockerIndex].notes = note;
  db.lockers[lockerIndex].assignedAt = new Date().toISOString();
  
  // Sync to Supabase
  supabaseSync('employees', code, emp);
  supabaseSync('lockers', selectedLockerIdForModal, db.lockers[lockerIndex]);
  
  saveDatabase();
  logTransaction(selectedLockerIdForModal, "Cấp tủ", code, note || "Cấp tủ mới");
  
  closeLockerModal();
  renderLockerMap();
  renderLockerList();
  renderUsers();
  showToast(`Đã cấp tủ ${db.lockers[lockerIndex].number} cho: ${emp.fullname}`, "success");
}

// Handler: Return Locker
function handleReturnLockerClick() {
  if (!selectedLockerIdForModal) return;
  
  const lockerIndex = db.lockers.findIndex(l => l.id === selectedLockerIdForModal);
  if (lockerIndex === -1) return;
  
  const locker = db.lockers[lockerIndex];
  const oldUserId = locker.userId;
  const emp = db.employees.find(e => e.code === oldUserId);
  const userName = emp ? emp.fullname : "Nhân viên";
  
  confirmAction(`Bạn có muốn thu hồi / nhận lại tủ đồ ${locker.number} đang được dùng bởi ${userName}?`, () => {
    db.lockers[lockerIndex].status = "available";
    db.lockers[lockerIndex].userId = null;
    db.lockers[lockerIndex].notes = "";
    db.lockers[lockerIndex].assignedAt = null;
    
    // Sync to Supabase
    supabaseSync('lockers', selectedLockerIdForModal, db.lockers[lockerIndex]);
    
    saveDatabase();
    logTransaction(selectedLockerIdForModal, "Trả tủ", oldUserId, "Đã trả tủ lại kho trống");
    
    closeLockerModal();
    renderLockerMap();
    renderLockerList();
    renderUsers();
    showToast(`Đã trả tủ ${locker.number} thành công`, "success");
  });
}

// Handler: Report Broken
function handleReportBrokenClick() {
  if (!selectedLockerIdForModal) return;
  
  const lockerIndex = db.lockers.findIndex(l => l.id === selectedLockerIdForModal);
  if (lockerIndex === -1) return;
  
  const locker = db.lockers[lockerIndex];
  const oldUserId = locker.userId;
  
  const reason = prompt("Nhập lý lý do báo lỗi / hỏng tủ:", "Ổ khóa bị kẹt không vặn được");
  if (reason === null) return; 
  
  const finalReason = reason.trim() || "Báo hỏng không rõ nguyên nhân";
  
  db.lockers[lockerIndex].status = "broken";
  db.lockers[lockerIndex].userId = null;
  db.lockers[lockerIndex].notes = finalReason;
  db.lockers[lockerIndex].assignedAt = null;
  
  // Sync to Supabase
  supabaseSync('lockers', selectedLockerIdForModal, db.lockers[lockerIndex]);
  
  saveDatabase();
  logTransaction(selectedLockerIdForModal, "Báo hỏng", oldUserId, `Sự cố: ${finalReason}`);
  
  closeLockerModal();
  renderLockerMap();
  renderLockerList();
  renderUsers();
  showToast(`Đã ghi nhận sự cố tủ ${locker.number}`, "warning");
}

// Handler: Override status directly (Admin only)
function handleOverrideStatusClick() {
  if (!selectedLockerIdForModal) return;
  
  const lockerIndex = db.lockers.findIndex(l => l.id === selectedLockerIdForModal);
  if (lockerIndex === -1) return;
  
  const locker = db.lockers[lockerIndex];
  const nextStatus = document.getElementById("override-status-select").value;
  const note = document.getElementById("override-note").value.trim();
  
  if (locker.status === nextStatus) {
    showToast("Trạng thái mới trùng với trạng thái hiện tại!", "warning");
    return;
  }
  
  let oldUserId = locker.userId;
  if (nextStatus !== "in_use") {
    db.lockers[lockerIndex].userId = null;
    db.lockers[lockerIndex].assignedAt = null;
  } else {
    // If override status to in_use, we should keep/make a timestamp
    db.lockers[lockerIndex].assignedAt = db.lockers[lockerIndex].assignedAt || new Date().toISOString();
  }
  
  db.lockers[lockerIndex].status = nextStatus;
  db.lockers[lockerIndex].notes = note;
  
  // Sync to Supabase
  supabaseSync('lockers', selectedLockerIdForModal, db.lockers[lockerIndex]);
  
  saveDatabase();
  
  let actionName = "Thay đổi";
  if (nextStatus === "available") actionName = "Sửa xong";
  else if (nextStatus === "broken") actionName = "Báo hỏng";
  else if (nextStatus === "maintenance") actionName = "Bảo trì";
  
  logTransaction(selectedLockerIdForModal, actionName, oldUserId, note || `Cập nhật sang: ${nextStatus}`);
  
  closeLockerModal();
  renderLockerMap();
  renderLockerList();
  renderUsers();
  showToast(`Đã thay đổi trạng thái tủ ${locker.number}`, "success");
}

// ==========================================
// EXCEL EXPORT SERVICE
// ==========================================

function exportHistoryToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("Lỗi: Không tìm thấy thư viện SheetJS (xlsx.full.min.js)!", "error");
    return;
  }
  
  try {
    const logs = db.history;
    if (logs.length === 0) {
      showToast("Không có lịch sử giao dịch nào để xuất!", "warning");
      return;
    }
    
    const sheetData = logs.map((log, index) => {
      return {
        "STT": index + 1,
        "Thời Gian": formatDateTime(log.timestamp),
        "Sảnh": log.lobbyName,
        "Mã Tủ Đồ": log.lockerNumber,
        "Hành Động": log.action,
        "Nhân Viên Sử Dụng": log.fullname ? `${log.fullname} (${log.username})` : "-",
        "Bộ Phận": log.departmentName || "-",
        "Ghi Chú Chi Tiết": log.note || "-",
        "Người Thực Hiện": log.operatorName || "Hệ thống"
      };
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    
    const wscols = [
      { wch: 6 },  // STT
      { wch: 22 }, // Thời gian
      { wch: 15 }, // Sảnh
      { wch: 15 }, // Mã tủ
      { wch: 15 }, // Hành động
      { wch: 25 }, // Nhân viên sử dụng
      { wch: 18 }, // Bộ phận
      { wch: 35 }, // Ghi chú
      { wch: 20 }  // Người thực hiện
    ];
    ws["!cols"] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, "Lịch sử cấp trả tủ đồ");
    
    const timestampStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `Lich_Su_Cap_Tra_Tu_Do_${timestampStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast(`Đã xuất và tải về file Excel: ${fileName}`, "success");
    
  } catch (err) {
    console.error("Export error: ", err);
    showToast(`Lỗi xuất Excel: ${err.message}`, "error");
  }
}

// ==========================================
// TOAST NOTIFICATIONS SERVICE
// ==========================================

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let iconClass = "fa-solid fa-circle-info";
  if (type === "success") iconClass = "fa-solid fa-circle-check";
  else if (type === "error") iconClass = "fa-solid fa-triangle-exclamation";
  else if (type === "warning") iconClass = "fa-solid fa-circle-exclamation";
  
  toast.innerHTML = `
    <i class="${iconClass}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 4000);
}

// ==========================================
// CONFIRMATION POPUP SYSTEM
// ==========================================

let confirmCallback = null;

function confirmAction(message, callback, title = "Xác nhận thao tác") {
  confirmCallback = callback;
  
  const modal = document.getElementById("confirm-modal");
  document.getElementById("confirm-modal-title").innerText = title;
  document.getElementById("confirm-modal-message").innerText = message;
  
  modal.classList.add("open");
}

// ==========================================
// FORMATTING HELPER FUNCTIONS
// ==========================================

function formatDateTime(isoString) {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    return `${dateStr} ${timeStr}`;
  } catch (e) {
    return isoString;
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==========================================
// EXCEL EXPORT & IMPORT FOR ASSIGNED LOCKERS
// ==========================================

function exportLockerListToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("Lỗi: Không tìm thấy thư viện SheetJS (xlsx.full.min.js)!", "error");
    return;
  }
  
  try {
    const inUseLockers = db.lockers.filter(l => l.status === "in_use");
    if (inUseLockers.length === 0) {
      showToast("Không có danh sách nhân viên sử dụng tủ nào để xuất!", "warning");
      return;
    }
    
    const sheetData = inUseLockers.map((l, index) => {
      const emp = db.employees.find(e => e.code === l.userId);
      const dept = emp ? db.departments.find(d => d.id === emp.departmentId) : null;
      const lobbyName = db.lobbyNames[l.lobby] || `Sảnh ${l.lobby}`;
      
      return {
        "STT": index + 1,
        "Mã nhân viên": emp ? emp.code.toUpperCase() : "-",
        "Họ và tên": emp ? emp.fullname : "Không rõ",
        "Bộ phận": dept ? dept.name : "-",
        "Số tủ đồ": l.number,
        "Khu vực tủ": `${lobbyName} - ${l.row} - Cột ${l.col} - Tầng ${l.tier}`,
        "Ngày cấp bàn giao": formatDateTime(l.assignedAt),
        "Ghi chú cấp phát": l.notes || ""
      };
    });
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sheetData);
    
    const wscols = [
      { wch: 6 },  // STT
      { wch: 15 }, // Mã nhân viên
      { wch: 22 }, // Họ và tên
      { wch: 18 }, // Bộ phận
      { wch: 12 }, // Số tủ đồ
      { wch: 30 }, // Khu vực tủ
      { wch: 22 }, // Ngày cấp bàn giao
      { wch: 25 }  // Ghi chú cấp phát
    ];
    ws["!cols"] = wscols;
    
    XLSX.utils.book_append_sheet(wb, ws, "Nhân viên sử dụng tủ");
    
    const timestampStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `Nhan_Vien_Su_Dung_Tu_Do_${timestampStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast(`Đã xuất và tải về danh sách sử dụng: ${fileName}`, "success");
    
  } catch (err) {
    console.error("Export error: ", err);
    showToast(`Lỗi xuất Excel: ${err.message}`, "error");
  }
}

function handleImportLockerListFile(e) {
  if (typeof XLSX === "undefined") {
    showToast("Lỗi: Không tìm thấy thư viện SheetJS!", "error");
    return;
  }
  
  const files = e.target.files;
  if (!files || files.length === 0) return;
  
  const file = files[0];
  const reader = new FileReader();
  
  reader.onload = function(evt) {
    try {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Parse JSON (rows of objects)
      const rows = XLSX.utils.sheet_to_json(worksheet);
      if (rows.length === 0) {
        showToast("Không tìm thấy dòng dữ liệu nào trong file Excel!", "error");
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      // Process rows
      for (const row of rows) {
        // Support multiple Vietnamese/English column names flexibly
        const codeKey = Object.keys(row).find(k => k.toLowerCase() === "mã nhân viên" || k.toLowerCase() === "ma nhan vien" || k.toLowerCase() === "employee id" || k.toLowerCase() === "manhanvien");
        const nameKey = Object.keys(row).find(k => k.toLowerCase() === "họ và tên" || k.toLowerCase() === "ho va ten" || k.toLowerCase() === "fullname" || k.toLowerCase() === "tên nhân viên" || k.toLowerCase() === "ten nhan vien");
        const deptKey = Object.keys(row).find(k => k.toLowerCase() === "bộ phận" || k.toLowerCase() === "bo phan" || k.toLowerCase() === "department" || k.toLowerCase() === "bophan");
        const numberKey = Object.keys(row).find(k => k.toLowerCase() === "số tủ đồ" || k.toLowerCase() === "so tu do" || k.toLowerCase() === "số tủ" || k.toLowerCase() === "so tu" || k.toLowerCase() === "locker number" || k.toLowerCase() === "sotudo");
        const dateKey = Object.keys(row).find(k => k.toLowerCase() === "ngày cấp bàn giao" || k.toLowerCase() === "ngay cap ban giao" || k.toLowerCase() === "ngay cap" || k.toLowerCase() === "ngày cấp");
        const noteKey = Object.keys(row).find(k => k.toLowerCase() === "ghi chú cấp phát" || k.toLowerCase() === "ghi chu" || k.toLowerCase() === "ghi chú" || k.toLowerCase() === "note");
        
        if (!codeKey || !nameKey || !numberKey) {
          continue; // Skip invalid rows that don't have basic columns
        }
        
        const rawCode = String(row[codeKey]).trim();
        const rawName = String(row[nameKey]).trim();
        const rawDept = deptKey ? String(row[deptKey]).trim() : "Mặc định";
        const rawNumber = String(row[numberKey]).trim();
        const rawNote = noteKey ? String(row[noteKey]).trim() : "Nạp tự động từ Excel";
        
        if (!rawCode || !rawName || !rawNumber) {
          errorCount++;
          continue;
        }
        
        // Format locker number to at least 2 digits (e.g. 5 -> "05")
        let formattedNumber = rawNumber;
        if (!isNaN(rawNumber)) {
          formattedNumber = String(parseInt(rawNumber)).padStart(2, '0');
        }
        
        // Find matching locker in database
        const locker = db.lockers.find(l => l.number === formattedNumber);
        if (!locker) {
          errorCount++;
          console.warn(`Locker number ${formattedNumber} not found in database.`);
          continue;
        }
        
        // Resolve department
        let dept = db.departments.find(d => d.name.toLowerCase() === rawDept.toLowerCase());
        if (!dept) {
          // Dynamically create a new department if it doesn't exist
          const newDeptId = "dept-" + Date.now() + "-" + Math.floor(Math.random() * 100);
          dept = {
            id: newDeptId,
            name: rawDept,
            description: "Tạo tự động khi nạp file Excel"
          };
          db.departments.push(dept);
        }
        
        // Resolve employee: find by code (Employee Code)
        const username = rawCode.toLowerCase();
        let emp = db.employees.find(e => e.code === username);
        if (!emp) {
          // Auto create employee
          emp = {
            code: username,
            fullname: rawName,
            departmentId: dept.id
          };
          db.employees.push(emp);
        } else {
          // Update employee details
          emp.fullname = rawName;
          emp.departmentId = dept.id;
        }
        
        // Release previous holder of this locker if any
        if (locker.status === "in_use" && locker.userId !== username) {
          const oldUserId = locker.userId;
          logTransaction(locker.id, "Trả tủ", oldUserId, "Thu hồi tự động để cấp lại qua nạp Excel");
        }
        
        // Check if employee already holds 3 lockers elsewhere
        const holdingLockers = db.lockers.filter(l => l.status === "in_use" && l.userId === username && l.id !== locker.id);
        if (holdingLockers.length >= 3) {
          // Sort holdingLockers by assignedAt ascending (oldest first) to release the oldest one
          holdingLockers.sort((a, b) => new Date(a.assignedAt || 0) - new Date(b.assignedAt || 0));
          const oldestLocker = holdingLockers[0];
          
          oldestLocker.status = "available";
          oldestLocker.userId = null;
          oldestLocker.notes = "";
          oldestLocker.assignedAt = null;
          logTransaction(oldestLocker.id, "Trả tủ", username, "Thu hồi tự động tủ cũ nhất do vượt quá hạn mức 3 tủ khi nạp Excel");
        }
        
        // Handle assignment date parsing
        let assignDate = new Date().toISOString();
        if (dateKey && row[dateKey]) {
          try {
            const parsedDate = new Date(row[dateKey]);
            if (!isNaN(parsedDate.getTime())) {
              assignDate = parsedDate.toISOString();
            }
          } catch (e) {
            // fallback to current
          }
        }
        
        // Assign the locker
        locker.status = "in_use";
        locker.userId = username;
        locker.notes = rawNote;
        locker.assignedAt = assignDate;
        
        // Log transaction
        logTransaction(locker.id, "Cấp tủ", username, rawNote);
        successCount++;
      }
      
      if (successCount > 0) {
        // Bulk upsert all departments, lockers and employees to Supabase
        const deptsToUpsert = db.departments.map(d => ({
          id: d.id,
          name: d.name,
          description: d.description || ""
        }));

        const empsToUpsert = db.employees.map(e => ({
          code: e.code,
          fullname: e.fullname,
          department_id: e.departmentId
        }));
        
        const lockersToUpsert = db.lockers.map(l => ({
          id: l.id,
          lobby: l.lobby,
          row: l.row,
          col: l.col,
          tier: l.tier,
          number: l.number,
          status: l.status,
          user_id: l.userId,
          notes: l.notes || '',
          assigned_at: l.assignedAt
        }));

        supabaseClient.from('departments').upsert(deptsToUpsert)
          .then(() => {
            return Promise.all([
              supabaseClient.from('employees').upsert(empsToUpsert),
              supabaseClient.from('lockers').upsert(lockersToUpsert)
            ]);
          })
          .then(() => {
            showToast(`Đã đồng bộ ${successCount} bản ghi nhập từ Excel lên Supabase!`, "success");
            // Refresh database from Supabase and render
            loadDatabase().then(() => {
              populateDropdowns();
              renderLockerMap();
              renderLockerList();
              renderUsers();
              renderHistory();
              renderStatistics();
            });
          })
          .catch(err => {
            console.error("Error bulk upserting from Excel:", err);
            showToast("Lỗi đồng bộ dữ liệu Excel lên Supabase!", "error");
          });

        saveDatabase();
        showToast(`Nạp thành công ${successCount} vị trí cấp tủ!`, "success");
      }
      
      if (errorCount > 0) {
        showToast(`Có ${errorCount} dòng dữ liệu bị lỗi hoặc không khớp số tủ đồ!`, "warning");
      }
      
    } catch (err) {
      console.error("Read Excel file error: ", err);
      showToast(`Không thể đọc file Excel: ${err.message}`, "error");
    } finally {
      // Clear input so the same file can be selected again
      e.target.value = "";
    }
  };
  
  reader.readAsBinaryString(file);
}

function downloadLockerListTemplate() {
  if (typeof XLSX === "undefined") {
    showToast("Lỗi: Không tìm thấy thư viện SheetJS!", "error");
    return;
  }
  
  try {
    const headers = ["Mã nhân viên", "Họ và tên", "Bộ phận", "Số tủ đồ", "Ghi chú cấp phát"];
    const samples = [
      ["NV001", "Nguyễn Văn Thịnh", "Kỹ thuật", "09", "Cấp tủ đồ làm việc"],
      ["NV002", "Lê Thị Thu Trang", "Nhân sự", "12", "Cấp khóa tủ tạm thời"],
      ["NV003", "Trần Hữu Nam", "Sản xuất", "845", "Cấp đầu ca"]
    ];
    
    const sheetData = [headers, ...samples];
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    ws["!cols"] = [
      { wch: 15 }, // Mã nhân viên
      { wch: 22 }, // Họ và tên
      { wch: 18 }, // Bộ phận
      { wch: 12 }, // Số tủ đồ
      { wch: 25 }  // Ghi chú cấp phát
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, "File mẫu cấp tủ");
    
    const fileName = "Mau_Nap_Nhan_Vien_Su_Dung_Tu.xlsx";
    XLSX.writeFile(wb, fileName);
    showToast("Đã tải xuống file Excel mẫu để nạp!", "success");
    
  } catch (err) {
    console.error("Template download error: ", err);
    showToast(`Lỗi tạo file mẫu: ${err.message}`, "error");
  }
}

function exportStatisticsToExcel() {
  if (typeof XLSX === "undefined") {
    showToast("Lỗi: Không tìm thấy thư viện SheetJS!", "error");
    return;
  }
  
  try {
    const total = db.lockers.length;
    const avail = db.lockers.filter(l => l.status === "available").length;
    const inuse = db.lockers.filter(l => l.status === "in_use").length;
    const broken = db.lockers.filter(l => l.status === "broken" || l.status === "error").length;
    
    const getLobbyStats = (lobbyKey) => {
      const list = db.lockers.filter(l => l.lobby === lobbyKey);
      return {
        total: list.length,
        avail: list.filter(l => l.status === "available").length,
        inuse: list.filter(l => l.status === "in_use").length,
        broken: list.filter(l => l.status === "broken" || l.status === "error").length
      };
    };
    
    const lobbyA = getLobbyStats("A");
    const lobbyB = getLobbyStats("B");
    
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: General Summary
    const summaryData = [
      ["BÁO CÁO TỔNG QUAN HỆ THỐNG TỦ ĐỒ (SMARTLOCKER)"],
      ["Thời gian xuất báo cáo:", formatDateTime(new Date().toISOString())],
      [],
      ["1. TÌNH TRẠNG CHUNG"],
      ["Chỉ số", "Số lượng", "Tỷ lệ %"],
      ["Tổng số tủ đồ", total, "100%"],
      ["Tủ trống khả dụng", avail, total > 0 ? ((avail / total) * 100).toFixed(1) + "%" : "0%"],
      ["Tủ đang sử dụng", inuse, total > 0 ? ((inuse / total) * 100).toFixed(1) + "%" : "0%"],
      ["Tủ lỗi / hỏng", broken, total > 0 ? ((broken / total) * 100).toFixed(1) + "%" : "0%"],
      [],
      ["2. PHÂN BỔ THEO KHU VỰC SẢNH"],
      ["Sảnh", "Tổng số tủ", "Tủ trống", "Tủ đang sử dụng", "Tủ lỗi / hỏng"],
      ["Sảnh A", lobbyA.total, lobbyA.avail, lobbyA.inuse, lobbyA.broken],
      ["Sảnh B", lobbyB.total, lobbyB.avail, lobbyB.inuse, lobbyB.broken]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Tổng quan");
    
    // Sheet 2: Department Occupancy
    const deptHeaders = [
      ["TÌNH HÌNH PHÂN BỔ TỦ ĐỒ THEO BỘ PHẬN"],
      ["Thời gian xuất báo cáo:", formatDateTime(new Date().toISOString())],
      [],
      ["Tên Bộ Phận", "Số Nhân Sự", "Tủ Đang Sử Dụng", "Tỷ Lệ Sở Hữu"]
    ];
    
    const deptRows = db.departments.map(d => {
      const employeeCount = db.employees ? db.employees.filter(e => e.departmentId === d.id).length : 0;
      // Get lockers in use belonging to employees of this department
      const lockersInUse = db.lockers.filter(l => {
        if (l.status !== "in_use") return false;
        const emp = db.employees ? db.employees.find(e => e.code === l.userId) : null;
        return emp && emp.departmentId === d.id;
      }).length;
      const rate = employeeCount > 0 ? ((lockersInUse / employeeCount) * 100).toFixed(1) + "%" : "0%";
      return [d.name, employeeCount, lockersInUse, rate];
    });
    
    const deptData = [...deptHeaders, ...deptRows];
    const wsDept = XLSX.utils.aoa_to_sheet(deptData);
    wsDept["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDept, "Phân bổ Bộ phận");
    
    const timestampStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const fileName = `Bao_Cao_Thong_Ke_Tu_Do_${timestampStr}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    showToast(`Đã xuất báo cáo thống kê: ${fileName}`, "success");
    
  } catch (err) {
    console.error("Export statistics error: ", err);
    showToast(`Lỗi xuất Excel thống kê: ${err.message}`, "error");
  }
}

// ==========================================
// LOCKER MAP SEARCH SERVICE
// ==========================================

function isLockerMatch(locker, query) {
  if (!query) return true;
  
  // 1. Check locker number
  if (locker.number.toLowerCase().includes(query)) return true;
  
  // 2. Check row
  if (locker.row.toLowerCase().includes(query)) return true;
  
  // 3. Check column/tier
  if (`cột ${locker.col}`.includes(query) || `tầng ${locker.tier}`.includes(query)) return true;
  if (`c${locker.col}`.includes(query) || `t${locker.tier}`.includes(query)) return true;
  
  // 4. Check status matching (with Vietnamese aliases)
  let statusText = "";
  if (locker.status === "available") statusText = "trống khả dụng";
  else if (locker.status === "in_use") statusText = "đang sử dụng dùng";
  else if (locker.status === "broken") statusText = "hỏng sự cố lỗi";
  else if (locker.status === "error") statusText = "lỗi kẹt hỏng";
  else if (locker.status === "maintenance") statusText = "bảo trì";
  
  if (statusText.includes(query)) return true;
  
  // 5. Check occupant details
  if (locker.status === "in_use" && locker.userId) {
    if (locker.userId.toLowerCase().includes(query)) return true;
    
    const emp = db.employees.find(e => e.code === locker.userId);
    if (emp) {
      if (emp.fullname.toLowerCase().includes(query)) return true;
      
      const dept = db.departments.find(d => d.id === emp.departmentId);
      if (dept && dept.name.toLowerCase().includes(query)) return true;
    }
  }
  
  return false;
}

function renderMapSearchResults() {
  const container = document.getElementById("map-search-results");
  if (!container) return;
  
  if (!mapSearchQuery) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }
  
  const matches = db.lockers.filter(l => isLockerMatch(l, mapSearchQuery));
  container.classList.remove("hidden");
  
  if (matches.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 12px; color: var(--text-secondary); font-size: 0.9rem;">
        <i class="fa-solid fa-triangle-exclamation"></i> Không tìm thấy tủ đồ hoặc nhân viên phù hợp.
      </div>
    `;
    return;
  }
  
  const maxResults = 10;
  const displayedMatches = matches.slice(0, maxResults);
  
  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-blue);">
        Tìm thấy ${matches.length} tủ khớp (Hiển thị tối đa ${maxResults})
      </span>
    </div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
  `;
  
  displayedMatches.forEach(locker => {
    const lobbyName = db.lobbyNames[locker.lobby] || `Sảnh ${locker.lobby}`;
    let holderText = "Trống";
    let subText = `${lobbyName} — ${locker.row} — Cột ${locker.col} — Tầng ${locker.tier}`;
    
    if (locker.status === "in_use" && locker.userId) {
      const emp = db.employees.find(e => e.code === locker.userId);
      const dept = emp ? db.departments.find(d => d.id === emp.departmentId) : null;
      holderText = emp ? `${emp.fullname} (${emp.code.toUpperCase()})` : `Mã: ${locker.userId.toUpperCase()}`;
      if (dept) {
        subText += ` | Bộ phận: ${dept.name}`;
      }
    } else if (locker.status === "broken") {
      holderText = "Sự cố / Hỏng";
    } else if (locker.status === "error") {
      holderText = "Lỗi kẹt khóa";
    } else if (locker.status === "maintenance") {
      holderText = "Bảo trì";
    }
    
    const actionButtons = [];
    
    // Quick Return button if locker in use
    if (locker.status === "in_use") {
      actionButtons.push(`
        <button class="btn-primary btn-sm btn-quick-return-search" data-id="${locker.id}" style="background: var(--accent-blue); padding: 6px 12px; font-size: 0.75rem; width: auto; font-weight: 700; border-radius: var(--border-radius-sm);">
          <i class="fa-solid fa-right-from-bracket"></i> Trả nhanh
        </button>
      `);
    }
    
    // Detail button
    actionButtons.push(`
      <button class="btn-secondary btn-sm btn-detail-search" data-id="${locker.id}" data-lobby="${locker.lobby}" style="padding: 6px 12px; font-size: 0.75rem; width: auto; border-radius: var(--border-radius-sm);">
        Chi tiết
      </button>
    `);
    
    html += `
      <div class="search-result-item">
        <div class="search-result-info">
          <div class="search-result-info-title">
            Tủ <span style="color: var(--accent-blue); font-family: monospace; font-size: 0.95rem;">${locker.number}</span> — ${holderText}
          </div>
          <div class="search-result-info-sub">
            ${subText}
          </div>
        </div>
        <div class="search-result-actions">
          ${actionButtons.join('')}
        </div>
      </div>
    `;
  });
  
  html += `</div>`;
  container.innerHTML = html;
  
  // Attach event handlers
  container.querySelectorAll(".btn-quick-return-search").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      quickReturnLockerFromSearch(id);
    });
  });
  
  container.querySelectorAll(".btn-detail-search").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const lobby = btn.dataset.lobby;
      
      // Auto switch lobby first
      if (activeLobby !== lobby) {
        switchLobby(lobby);
      }
      
      // Open modal
      openLockerModal(id);
    });
  });
}

function quickReturnLockerFromSearch(lockerId) {
  const locker = db.lockers.find(l => l.id === lockerId);
  if (!locker) return;
  
  const oldUserId = locker.userId;
  const emp = db.employees.find(e => e.code === oldUserId);
  const userName = emp ? emp.fullname : "Nhân viên";
  
  confirmAction(`Bạn có muốn thu hồi tủ đồ ${locker.number} đang được dùng bởi ${userName}?`, () => {
    const lockerIndex = db.lockers.findIndex(l => l.id === lockerId);
    if (lockerIndex === -1) return;
    
    db.lockers[lockerIndex].status = "available";
    db.lockers[lockerIndex].userId = null;
    db.lockers[lockerIndex].notes = "";
    db.lockers[lockerIndex].assignedAt = null;
    
    supabaseSync('lockers', lockerId, db.lockers[lockerIndex]);
    saveDatabase();
    logTransaction(lockerId, "Trả tủ", oldUserId, "Đã trả tủ nhanh từ thanh Tìm kiếm màn hình chính");
    
    // Update UI components
    renderLockerMap();
    renderMapSearchResults();
    renderLockerList();
    renderUsers();
    
    showToast(`Đã trả tủ ${locker.number} thành công`, "success");
  });
}

// Admin-only row deletion logic
async function deleteRow(rowName) {
  if (!db.currentUser || db.currentUser.role !== "admin") {
    showToast("Chỉ có tài khoản Admin mới có quyền xóa dãy tủ!", "error");
    return;
  }
  
  const rowLockers = db.lockers.filter(l => l.lobby === activeLobby && l.row === rowName);
  if (rowLockers.length === 0) return;
  
  const inUseCount = rowLockers.filter(l => l.status === "in_use").length;
  let confirmMessage = `Bạn có chắc chắn muốn xóa toàn bộ ${rowName} tại sảnh ${activeLobby === 'A' ? 'A' : 'B'} (${rowLockers.length} tủ)?`;
  if (inUseCount > 0) {
    confirmMessage += `\nCẢNH BÁO: Hiện có ${inUseCount} tủ đang sử dụng trong dãy này. Nếu xóa, các tủ này sẽ bị thu hồi và giải phóng!`;
  }
  
  confirmAction(confirmMessage, async () => {
    // 1. Release in-use lockers and log transactions
    rowLockers.forEach(l => {
      if (l.status === "in_use" && l.userId) {
        logTransaction(l.id, "Trả tủ", l.userId, "Thu hồi tự động khi xóa dãy tủ");
      }
    });
    
    const oldLockers = [...db.lockers];
    
    // 2. Filter out deleted lockers locally
    db.lockers = db.lockers.filter(l => !(l.lobby === activeLobby && l.row === rowName));
    
    // 3. Re-index remaining lockers to keep them seamless
    reindexLockers();
    saveDatabase();
    
    // 4. Mark unsaved layout changes
    markUnsavedLayoutChanges(oldLockers);
    showToast(`Đã xóa dãy ${rowName} thành công! Vui lòng nhấn nút "Lưu thay đổi sơ đồ" ở trên để lưu vào cơ sở dữ liệu.`, "warning");
    
    renderLockerMap();
    renderLockerList();
    renderStatistics();
  }, "Xóa Dãy Tủ");
}

// Admin-only locker deletion logic
async function handleDeleteLockerClick() {
  if (!selectedLockerIdForModal) return;
  if (!db.currentUser || db.currentUser.role !== "admin") {
    showToast("Chỉ có tài khoản Admin mới có quyền xóa tủ!", "error");
    return;
  }
  
  const locker = db.lockers.find(l => l.id === selectedLockerIdForModal);
  if (!locker) return;
  
  let confirmMessage = `Bạn có chắc chắn muốn xóa tủ ${locker.number} khỏi hệ thống?`;
  if (locker.status === "in_use" && locker.userId) {
    const emp = db.employees.find(e => e.code === locker.userId);
    const userName = emp ? emp.fullname : "Nhân viên";
    confirmMessage += `\nCẢNH BÁO: Tủ này đang được sử dụng bởi ${userName}. Nếu xóa, tủ sẽ bị thu hồi tự động!`;
  }
  
  confirmAction(confirmMessage, async () => {
    // 1. Log transaction if in use
    if (locker.status === "in_use" && locker.userId) {
      logTransaction(locker.id, "Trả tủ", locker.userId, "Thu hồi tự động khi xóa tủ");
    }
    
    const oldLockers = [...db.lockers];
    
    // 2. Remove locally
    db.lockers = db.lockers.filter(l => l.id !== selectedLockerIdForModal);
    
    // 3. Re-index remaining lockers
    reindexLockers();
    saveDatabase();
    
    // 4. Mark unsaved layout changes
    markUnsavedLayoutChanges(oldLockers);
    showToast(`Đã xóa tủ số ${locker.number} thành công! Vui lòng nhấn nút "Lưu thay đổi sơ đồ" ở trên để lưu vào cơ sở dữ liệu.`, "warning");
    
    closeLockerModal();
    renderLockerMap();
    renderLockerList();
    renderStatistics();
  }, "Xóa Tủ Đồ");
}

// Re-index remaining lockers sequentially, filling any empty positions and re-assigning numbers consecutively
function reindexLockers() {
  const sortedLockers = [...db.lockers].sort((a, b) => {
    if (a.lobby !== b.lobby) {
      return a.lobby.localeCompare(b.lobby);
    }
    
    // Sort strictly by locker number numerically
    const numA = parseInt(a.number) || 0;
    const numB = parseInt(b.number) || 0;
    if (numA !== numB) return numA - numB;
    
    return a.id.localeCompare(b.id);
  });
  
  const lobbyALockers = sortedLockers.filter(l => l.lobby === "A");
  const lobbyBLockers = sortedLockers.filter(l => l.lobby === "B");
  
  // Ensure layout capacity has enough rows to cover the current locker count
  let neededRows = db.settings.rows;
  while (neededRows * db.settings.cols * 6 < Math.max(lobbyALockers.length, lobbyBLockers.length)) {
    neededRows++;
  }
  db.settings.rows = neededRows;
  
  const getSeqCoords = (lobby, maxCount, rowsCount, colsCount) => {
    const coords = [];
    const tiersCount = 6;
    let count = 0;
    for (let r = 1; r <= rowsCount; r++) {
      const rowName = `Dãy ${r}`;
      for (let c = 1; c <= colsCount; c++) {
        for (let t = tiersCount; t >= 1; t--) {
          count++;
          coords.push({
            id: `${lobby}-R${r}-C${c}-T${t}`,
            row: rowName,
            col: c,
            tier: t
          });
          if (count >= maxCount) return coords;
        }
      }
    }
    return coords;
  };
  
  const lobbyACoords = getSeqCoords("A", lobbyALockers.length, db.settings.rows, db.settings.cols);
  const lobbyBCoords = getSeqCoords("B", lobbyBLockers.length, db.settings.rows, db.settings.cols);
  
  const reindexedLockers = [];
  let globalCount = 0;
  
  lobbyALockers.forEach((locker, index) => {
    globalCount++;
    const coord = lobbyACoords[index];
    locker.id = coord.id;
    locker.row = coord.row;
    locker.col = coord.col;
    locker.tier = coord.tier;
    locker.number = String(globalCount).padStart(2, '0');
    reindexedLockers.push(locker);
  });
  
  lobbyBLockers.forEach((locker, index) => {
    globalCount++;
    const coord = lobbyBCoords[index];
    locker.id = coord.id;
    locker.row = coord.row;
    locker.col = coord.col;
    locker.tier = coord.tier;
    locker.number = String(globalCount).padStart(2, '0');
    reindexedLockers.push(locker);
  });
  
  db.lockers = reindexedLockers;
}

// Cleanly synchronize new locker configurations to Supabase, deleting leftover IDs
async function syncLockersDb(oldLockers) {
  const oldLockerIds = oldLockers.map(l => l.id);
  const newLockerIds = new Set(db.lockers.map(l => l.id));
  const idsToDelete = oldLockerIds.filter(id => !newLockerIds.has(id));
  
  const lockersToUpsert = db.lockers.map(l => ({
    id: l.id,
    lobby: l.lobby,
    row: l.row,
    col: l.col,
    tier: l.tier,
    number: l.number,
    status: l.status,
    user_id: l.userId,
    notes: l.notes || '',
    assigned_at: l.assignedAt
  }));
  
  try {
    // 1. Delete removed IDs in batches
    if (idsToDelete.length > 0) {
      for (let i = 0; i < idsToDelete.length; i += 100) {
        const batch = idsToDelete.slice(i, i + 100);
        await supabaseClient.from('lockers').delete().in('id', batch);
      }
    }
    
    // 2. Upsert all current lockers in batches
    for (let i = 0; i < lockersToUpsert.length; i += 150) {
      const batch = lockersToUpsert.slice(i, i + 150);
      const { error } = await supabaseClient.from('lockers').upsert(batch);
      if (error) throw error;
    }
  } catch (err) {
    console.error("Error syncing lockers to Supabase:", err);
    showToast("Lỗi đồng bộ sơ đồ tủ đồ lên đám mây!", "error");
  }
}

// Manual re-indexing triggered by Admin
async function handleManualReindexClick() {
  if (!db.currentUser || db.currentUser.role !== "admin") {
    showToast("Chỉ có tài khoản Admin mới có quyền sắp xếp lại thứ tự tủ đồ!", "error");
    return;
  }
  
  confirmAction("Bạn có chắc chắn muốn sắp xếp lại toàn bộ thứ tự các tủ đồ theo số thứ tự (từ nhỏ đến lớn), lấp đầy các ô trống trong cột và dãy?", async () => {
    const oldLockers = [...db.lockers];
    reindexLockers();
    saveDatabase();
    
    markUnsavedLayoutChanges(oldLockers);
    showToast(`Đã sắp xếp lại thứ tự tủ! Vui lòng nhấn nút "Lưu thay đổi sơ đồ" ở trên để lưu vào cơ sở dữ liệu.`, "warning");
    
    renderLockerMap();
    renderLockerList();
    renderStatistics();
  }, "Sắp xếp lại thứ tự tủ");
}

// Layout state variables for manual saving
let hasUnsavedLayoutChanges = false;
let oldLockersStateBeforeEdit = null;

function markUnsavedLayoutChanges(oldLockers) {
  if (!oldLockersStateBeforeEdit && oldLockers) {
    oldLockersStateBeforeEdit = [...oldLockers];
  }
  hasUnsavedLayoutChanges = true;
  const saveBtn = document.getElementById("btn-save-layout");
  if (saveBtn) {
    saveBtn.style.display = "flex";
  }
}

function clearUnsavedLayoutChanges() {
  hasUnsavedLayoutChanges = false;
  oldLockersStateBeforeEdit = null;
  const saveBtn = document.getElementById("btn-save-layout");
  if (saveBtn) {
    saveBtn.style.display = "none";
  }
}

async function handleSaveLayoutClick() {
  if (!db.currentUser || db.currentUser.role !== "admin") {
    showToast("Chỉ có tài khoản Admin mới có quyền lưu thay đổi sơ đồ!", "error");
    return;
  }
  
  if (!hasUnsavedLayoutChanges || !oldLockersStateBeforeEdit) {
    showToast("Không có thay đổi sơ đồ nào cần lưu!", "info");
    return;
  }
  
  confirmAction("Bạn có chắc chắn muốn lưu và đồng bộ toàn bộ các thay đổi sơ đồ tủ đồ vừa thực hiện lên Supabase?", async () => {
    showToast("Đang đồng bộ sơ đồ tủ đồ lên Supabase...", "info");
    
    const saveBtn = document.getElementById("btn-save-layout");
    if (saveBtn) saveBtn.disabled = true;
    
    try {
      await syncLockersDb(oldLockersStateBeforeEdit);
      showToast("Đã lưu và đồng bộ sơ đồ tủ đồ thành công!", "success");
      clearUnsavedLayoutChanges();
    } catch (err) {
      console.error("Error saving layout changes:", err);
      showToast("Lỗi xảy ra khi lưu sơ đồ lên đám mây!", "error");
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }, "Lưu thay đổi sơ đồ");
}

