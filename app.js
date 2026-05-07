import { auth } from "./auth.js";
import { login, logout } from "./auth.js";
import { supabase } from "./supabase.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ── State & Config ────────────────────────────────────────
const LAB_KEY = "LAB2024"; // The "Lab Register Key"
let isLabUser = localStorage.getItem("lab_unlocked") === "true";
let useSampleMode = localStorage.getItem("sample_mode") === "true";
let isAdmin = true; // Enabled for all users during testing
let allPatients = [];
let allTests = [];
let selectedTests = []; // State for multi-test selection in modal
let currentPatientId = null;

const TEST_LIST = [
  { name: "C.B.C.", price: 250 },
  { name: "Hb%", price: 100 },
  { name: "ESR", price: 100 },
  { name: "P. Smear", price: 100 },
  { name: "P.S. for M.P.", price: 100 },
  { name: "M.P. Card Test", price: 100 },
  { name: "B.T./C.T.", price: 100 },
  { name: "Blood Group/Rh Type", price: 100 },
  { name: "PT / INR", price: 300 },
  { name: "P.T.T.", price: 300 },
  { name: "Sickling", price: 400 },
  { name: "Reti Count", price: 200 },
  { name: "Routine / B.S. & B.P.", price: 100 },
  { name: "Culture & Sensitivity", price: 1000 },
  { name: "Pregnancy Test", price: 100 },
  { name: "Routine / Microscopy", price: 300 },
  { name: "Occult Blood", price: 300 },
  { name: "R.B.S. (Blood Sugar)", price: 80 },
  { name: "P.M.B.S. (Blood Sugar)", price: 160 },
  { name: "F.B.S. (Blood Sugar)", price: 160 },
  { name: "K.F.T.", price: 600 },
  { name: "Urea", price: 100 },
  { name: "Sr. Creatinine", price: 100 },
  { name: "Electrolytes (Na+/K+)", price: 400 },
  { name: "Serum Ca", price: 100 },
  { name: "Ionic Ca", price: 400 },
  { name: "Uric Acid", price: 100 },
  { name: "L.F.T.", price: 700 },
  { name: "Bilirubin", price: 200 },
  { name: "S.G.O.T.", price: 100 },
  { name: "S.G.P.T.", price: 100 },
  { name: "Alk. Phos", price: 100 },
  { name: "Sr. Proriens", price: 100 },
  { name: "Sr. Albumine", price: 100 },
  { name: "LIPID PROFILE", price: 400 },
  { name: "Cholesterol", price: 100 },
  { name: "H.D.L. Cholesterol", price: 100 },
  { name: "L.D.L. Cholesterol", price: 100 },
  { name: "Triglycerides", price: 100 },
  { name: "CPK M.B.", price: 600 },
  { name: "Troponin - I", price: 1500 },
  { name: "SGOT", price: 100 },
  { name: "L.D.H.", price: 600 },
  { name: "Amylase", price: 600 },
  { name: "Lipase", price: 600 },
  { name: "Cholin estarase", price: 600 },
  { name: "CPK (Total)", price: 600 },
  { name: "Widal Test", price: 100 },
  { name: "Typhoid antibody", price: 200 },
  { name: "H.I.V.", price: 200 },
  { name: "V.D.R.L.", price: 200 },
  { name: "Australia Ag. (HBSAg.)", price: 200 },
  { name: "Montoux Test", price: 100 },
  { name: "R.A. Test", price: 200 },
  { name: "C.R.P.", price: 300 },
  { name: "A.S.O. Titre", price: 100 },
  { name: "Dengue Card Test", price: 600 },
  { name: "C.S.F. Exam", price: 1000 },
  { name: "T.S.H. only", price: 400 },
  { name: "T₃ T₄ T.S.H.", price: 500 },
  { name: "HBA1C", price: 600 }
];

// ── DOM refs ──────────────────────────────────────────────
const authScreen        = document.getElementById("authScreen");
const keyScreen         = document.getElementById("keyScreen");
const appEl             = document.getElementById("app");
const loginBtn          = document.getElementById("loginBtn");
const logoutBtn         = document.getElementById("logoutBtn");
const userInfo          = document.getElementById("userInfo");
const authError         = document.getElementById("authError");
const keyError          = document.getElementById("keyError");
const labKeyInput       = document.getElementById("labKeyInput");
const verifyKeyBtn      = document.getElementById("verifyKeyBtn");
const sampleAppBtn      = document.getElementById("sampleAppBtn");
const modeBadge         = document.getElementById("modeBadge");

const addPatientBtn     = document.getElementById("addPatientBtn");
const patientModal      = document.getElementById("patientModal");
const closePatientModal = document.getElementById("closePatientModal");
const savePatientBtn    = document.getElementById("savePatient");

const testModal         = document.getElementById("testModal");
const closeTestModal    = document.getElementById("closeTestModal");
const saveTestBtn       = document.getElementById("saveTest");

const patientList       = document.getElementById("patientList");
const paymentView       = document.getElementById("paymentView");
const paymentList       = document.getElementById("paymentList");
const totalPendingGlobal = document.getElementById("totalPendingGlobal");
const logsView          = document.getElementById("logsView");
const testDropdown      = document.getElementById("testDropdown");
const tNameInput        = document.getElementById("tName");
const selectedTestsList = document.getElementById("selectedTestsList");

const patientsTab       = document.getElementById("patientsTab");
const paymentsTab       = document.getElementById("paymentsTab");
const logsTab           = document.getElementById("logsTab");
const toastEl           = document.getElementById("toast");
const patientSearch     = document.getElementById("patientSearch");
const patientSearchCont = document.getElementById("patientSearchContainer");
const paymentDateModal  = document.getElementById("paymentDateModal");
const payDateInput       = document.getElementById("payDate");
const confirmPaymentBtn  = document.getElementById("confirmPaymentBtn");
const closePayDateModal  = document.getElementById("closePaymentDateModal");
const totalPaidGlobal    = document.getElementById("totalPaidGlobal");
const paidList           = document.getElementById("paidList");

const reportsTab         = document.getElementById("reportsTab");
const reportsView        = document.getElementById("reportsView");
const reportMonth        = document.getElementById("reportMonth");
const reportYear         = document.getElementById("reportYear");
const reportType         = document.getElementById("reportType");
const monthlySelectors   = document.getElementById("monthlySelectors");
const dailySelectors     = document.getElementById("dailySelectors");
const reportDate         = document.getElementById("reportDate");
const generateReportBtn  = document.getElementById("generateReportBtn");
const reportContent      = document.getElementById("reportContent");

const patientSort        = document.getElementById("patientSort");
const patientModalTitle  = document.getElementById("patientModalTitle");
const editPatientId      = document.getElementById("editPatientId");
const pReferredInput     = document.getElementById("pReferred");

const billNumberInput    = document.getElementById("billNumber");

const editTestModal      = document.getElementById("editTestModal");
const closeEditTestModal = document.getElementById("closeEditTestModal");
const editTestId         = document.getElementById("editTestId");
const editTestPid        = document.getElementById("editTestPid");
const etNameInput        = document.getElementById("etName");
const etAmountInput      = document.getElementById("etAmount");
const etDateInput        = document.getElementById("etDate");
const saveEditTestBtn    = document.getElementById("saveEditTest");

let currentTestIdForPayment = null; // Track which test is being marked paid


// ── Helpers ───────────────────────────────────────────────
function getTable(base) {
  // If in sample mode, use sample_ prefix
  return useSampleMode ? `sample_${base}` : base;
}

// ── Auth & Mode Flow ──────────────────────────────────────
const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.7 36 24 36c-5.1 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2C37.2 38.3 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;

loginBtn.onclick = async () => {
  loginBtn.disabled = true;
  try { await login(); } catch (err) { loginBtn.disabled = false; }
};

logoutBtn.onclick = async () => {
  localStorage.removeItem("lab_unlocked");
  localStorage.removeItem("sample_mode");
  await logout();
  location.reload(); // Refresh to reset state
};

verifyKeyBtn.onclick = () => {
  const key = labKeyInput.value.trim();
  if (key === LAB_KEY) {
    isLabUser = true;
    useSampleMode = false;
    localStorage.setItem("lab_unlocked", "true");
    localStorage.setItem("sample_mode", "false");
    enterApp();
  } else {
    keyError.textContent = "Incorrect Lab Key. Please try again.";
  }
};

sampleAppBtn.onclick = () => {
  isLabUser = false;
  useSampleMode = true;
  localStorage.setItem("lab_unlocked", "false");
  localStorage.setItem("sample_mode", "true");
  enterApp();
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    if (!isLabUser && !useSampleMode) {
      keyScreen.classList.remove("hidden");
      appEl.classList.add("hidden");
    } else {
      enterApp();
    }
  } else {
    authScreen.classList.remove("hidden");
    keyScreen.classList.add("hidden");
    appEl.classList.add("hidden");
    loginBtn.disabled = false;
    loginBtn.innerHTML = `${GOOGLE_ICON} Sign in with Google`;
  }
});

async function enterApp() {
  const user = auth.currentUser;
  if (!user) return;

  keyScreen.classList.add("hidden");
  appEl.classList.remove("hidden");
  userInfo.textContent = user.displayName || user.email.split("@")[0];
  
  // Force admin/delete permissions for everyone with the key
  isAdmin = true; 
  console.log("Admin Mode: Active");

  if (useSampleMode) {
    modeBadge.textContent = "Sample App";
    modeBadge.className = "mode-badge sample";
  } else {
    modeBadge.textContent = "Lab Database";
    modeBadge.className = "mode-badge lab";
    // We run the check for logs, but don't let it reset isAdmin to false
    await checkAdminStatus(user.email).catch(() => {});
    isAdmin = true; 
  }
  
  initReportSelectors();
  loadPatients();
}

function initReportSelectors() {
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= 2024; y--) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    reportYear.appendChild(opt);
  }
  reportMonth.value = new Date().getMonth();
  reportDate.value = new Date().toISOString().split("T")[0];
}

reportType.onchange = () => {
  const type = reportType.value;
  monthlySelectors.classList.toggle("hidden", type !== "monthly");
  dailySelectors.classList.toggle("hidden", type !== "daily");
};

async function checkAdminStatus(email) {
  try {
    const data = await (await supabase.from("admins")).select();
    isAdmin = data.some(a => a.email.toLowerCase() === email.toLowerCase());
    if (isAdmin) console.log("Welcome, Supervisor!");
  } catch (e) { isAdmin = false; }
}

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type = "info") {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type} show`;
  setTimeout(() => { toastEl.className = "toast"; }, 3200);
}

// ── Patient Modal ─────────────────────────────────────────
addPatientBtn.onclick = () => {
  patientModalTitle.textContent = "Add Patient";
  savePatientBtn.textContent = "Save Patient";
  editPatientId.value = "";
  patientModal.classList.remove("hidden");
  setTodayIfEmpty("pDate");
  document.getElementById("pName").value = "";
  document.getElementById("pAge").value = "";
  document.getElementById("pGender").value = "Male";
  pReferredInput.value = "";
  document.getElementById("pName").focus();
};
closePatientModal.onclick = () => patientModal.classList.add("hidden");


// ── Save Patient ──────────────────────────────────────────
savePatientBtn.onclick = async () => {
  if (!auth.currentUser) return;
  const id = editPatientId.value;
  const name = document.getElementById("pName").value.trim();
  const age = document.getElementById("pAge").value.trim();
  const gender = document.getElementById("pGender").value;
  const date = document.getElementById("pDate").value;
  const referred = pReferredInput.value.trim();

  if (!name) return;
  savePatientBtn.disabled = true;
  savePatientBtn.textContent = id ? "Updating…" : "Saving…";
  try {
    const payload = {
      name, age, gender,
      admission_date: date,
      referred_by: referred,
      created_by: auth.currentUser.email
    };

    if (id) {
      await (await supabase.from(getTable("patients"))).update(id, payload);
      await addLog("Updated Patient", name);
      showToast(`✓ ${name} updated`, "success");
    } else {
      await (await supabase.from(getTable("patients"))).insert(payload);
      await addLog("Added Patient", name);
      showToast(`✓ ${name} added`, "success");
    }

    patientModal.classList.add("hidden");
    await loadPatients();
  } catch (err) { 
    console.error(err);
    showToast("Error saving", "error"); 
  }
  finally { 
    savePatientBtn.disabled = false; 
    savePatientBtn.textContent = id ? "Update Patient" : "Save Patient"; 
  }
};


// ── Load Patients ─────────────────────────────────────────
async function loadPatients() {
  patientList.innerHTML = `<div class="loading-state">Loading patients…</div>`;
  try {
    allPatients = await (await supabase.from(getTable("patients"))).select();
    allTests = await (await supabase.from(getTable("tests"))).select();
    renderPatients(allPatients);
  } catch (err) {
    patientList.innerHTML = `<div class="empty-state">Error loading data.</div>`;
  }
}

function renderPatients(patients) {
  patientList.innerHTML = "";
  if (!patients || patients.length === 0) {
    patientList.innerHTML = `<div class="empty-state">No patients found.</div>`;
    return;
  }
  
  // Sort patients by date (newest first)
  const sorted = [...patients].sort((a,b) => new Date(b.admission_date) - new Date(a.admission_date));

  sorted.forEach(p => {
    const pTests = allTests.filter(t => t.patient_id == p.id);
    const total = pTests.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const card = buildPatientCard(p.id, p, total);
    patientList.appendChild(card);
  });
}

patientSearch.oninput = (e) => {
  filterAndRender();
};

patientSort.onchange = () => {
  filterAndRender();
};

function filterAndRender() {
  const q = patientSearch.value.toLowerCase();
  const sortVal = patientSort.value;
  
  let filtered = allPatients.filter(p => p.name.toLowerCase().includes(q));
  
  if (sortVal === "oldest") {
    filtered.sort((a,b) => new Date(a.admission_date) - new Date(b.admission_date));
  } else if (sortVal === "name-asc") {
    filtered.sort((a,b) => a.name.localeCompare(b.name));
  } else if (sortVal === "name-desc") {
    filtered.sort((a,b) => b.name.localeCompare(a.name));
  } else {
    // Default: newest first
    filtered.sort((a,b) => new Date(b.admission_date) - new Date(a.admission_date));
  }
  
  renderPatients(filtered);
}


function buildPatientCard(id, p, total) {
  const card = document.createElement("div");
  card.className = "patient-card";
  card.innerHTML = `
    <div class="patient-header" id="hdr-${id}">
      <div class="patient-title-row">
        <div class="patient-name-container">
          <div class="patient-name-row">
             <span class="patient-name">${p.name}</span>
             ${isAdmin ? `<button class="edit-patient-btn" data-id="${id}">✏️</button>` : ""}
          </div>
          ${p.referred_by ? `<span class="patient-referred">Ref: ${p.referred_by}</span>` : ""}
        </div>
        ${total > 0 ? `<span class="patient-total">₹${total}</span>` : ""}
      </div>
      <div class="patient-meta">
        <span class="patient-badge">${p.gender} · ${p.age}y</span>
        <span class="patient-date">${formatDate(p.admission_date)}</span>
        <span class="chevron" id="chev-${id}">▾</span>
      </div>
    </div>
    <div class="patient-body hidden" id="body-${id}">
      <div class="tests-section">
        <div id="tests-${id}"><div class="no-tests">Loading…</div></div>
        <div class="card-actions">
           <button class="add-test-btn" data-id="${id}">+ Add Test</button>
           ${isAdmin ? `<button class="delete-patient-btn" data-id="${id}" data-name="${p.name}">🗑 Delete Patient</button>` : ""}
        </div>
      </div>
    </div>`;


  card.querySelector(`#hdr-${id}`).onclick = async (e) => {
    if (e.target.closest('.card-actions')) return;
    const body = document.getElementById(`body-${id}`);
    const chev = document.getElementById(`chev-${id}`);
    const isOpen = !body.classList.contains("hidden");
    body.classList.toggle("hidden");
    chev.classList.toggle("open", !isOpen);
    if (!isOpen) await loadTests(id);
  };
  return card;
}

// ── Load Tests ────────────────────────────────────────────
function getPatientName(id) {
  const p = allPatients.find(p => p.id == id);
  return p ? p.name : "Unknown Patient";
}

async function loadTests(patientId) {
  const container = document.getElementById(`tests-${patientId}`);
  if (!container) return;
  container.innerHTML = `<div class="no-tests">Loading…</div>`;
  try {
    const data = await (await supabase.from(getTable("tests"))).select();
    const pTests = data.filter(t => t.patient_id == patientId);
    container.innerHTML = "";
    if (pTests.length === 0) {
      container.innerHTML = `<div class="no-tests">No tests added yet</div>`;
      return;
    }
    pTests.forEach(t => {
      const div = document.createElement("div");
      div.className = "test-item";
      const isPaid = !!t.paid;
      div.innerHTML = `
        <div class="test-left-info">
          <div class="test-name-row" style="display:flex; align-items:center; gap:8px;">
            <span class="test-name">${t.test_name}</span>
            ${isAdmin ? `<button class="edit-test-btn" data-id="${t.id}" data-pid="${patientId}">✏️</button>` : ""}
          </div>
          <div class="test-sub-info">
            ${t.amount ? `<span class="test-amount">₹${t.amount}</span>` : ""}
            <span class="test-date">${formatDate(t.test_date)}</span>
            ${t.bill_number ? `<span class="test-bill">Bill: ${t.bill_number}</span>` : ""}
          </div>
        </div>
        <div class="test-right">
          <div class="payment-toggle ${isPaid ? 'paid' : 'pending'}" data-id="${t.id}" data-pid="${patientId}" data-paid="${isPaid}">
            <span class="payment-label">${isPaid ? 'Paid' : 'Pending'}</span>
            <div class="toggle-switch"></div>
          </div>
          ${isAdmin ? `<button class="delete-test-btn" data-id="${t.id}" data-name="${t.test_name}" data-pid="${patientId}">✕</button>` : ""}
        </div>`;

      container.appendChild(div);
    });
  } catch (err) { container.innerHTML = `<div class="no-tests">Error</div>`; }
}

async function togglePaymentStatus(id, patientId, currentPaid) {
  if (!currentPaid) {
    // Switching to Paid: Show Modal
    currentTestIdForPayment = id;
    currentPatientId = patientId;
    paymentDateModal.classList.remove("hidden");
    payDateInput.value = new Date().toISOString().split("T")[0]; // Default today
    billNumberInput.value = ""; // Reset bill number

  } else {
    // Switching back to Pending
    try {
      await (await supabase.from(getTable("tests"))).update(id, { paid: false, payment_date: null });
      await loadTests(patientId);
      await loadPatients();
      if (!paymentView.classList.contains("hidden")) await loadPayments();
      showToast("Marked as Pending", "info");
    } catch (e) { showToast("Update failed", "error"); }
  }
}

confirmPaymentBtn.onclick = async () => {
  const date = payDateInput.value;
  if (!date) {
    showToast("Please select a date", "info");
    return;
  }
  
  confirmPaymentBtn.disabled = true;
  confirmPaymentBtn.textContent = "Updating…";
  
  try {
    await (await supabase.from(getTable("tests"))).update(currentTestIdForPayment, { 
      paid: true, 
      payment_date: date,
      bill_number: billNumberInput.value.trim() || null
    });

    
    paymentDateModal.classList.add("hidden");
    await loadTests(currentPatientId);
    await loadPatients();
    if (!paymentView.classList.contains("hidden")) await loadPayments();
    showToast("Payment Received", "success");
  } catch (e) {
    console.error(e);
    showToast("Error updating payment", "error");
  } finally {
    confirmPaymentBtn.disabled = false;
    confirmPaymentBtn.textContent = "Confirm & Mark Paid";
  }
};

closePayDateModal.onclick = () => paymentDateModal.classList.add("hidden");

document.addEventListener("click", async (e) => {
  const toggle = e.target.closest('.payment-toggle');
  if (toggle) {
    const { id, pid, paid } = toggle.dataset;
    togglePaymentStatus(id, pid, paid === 'true');
    return;
  }

  if (!isAdmin) return; // Fail-safe check
  
  if (e.target.classList.contains("delete-patient-btn")) {
    const { id, name } = e.target.dataset;
    if (confirm(`Delete ${name}?`)) {
      await (await supabase.from(getTable("patients"))).delete(id);
      await addLog("Deleted Patient", name);
      showToast("Removed", "info");
      loadPatients();
    }
  }
  if (e.target.classList.contains("delete-test-btn")) {
    const { id, name, pid } = e.target.dataset;
    if (confirm(`Delete test "${name}"?`)) {
      await (await supabase.from(getTable("tests"))).delete(id);
      const pName = getPatientName(pid);
      await addLog("Deleted Test", `${name} for ${pName}`);
      showToast("Removed", "info");
      await loadPatients();
      await loadTests(pid);
    }
  }

  if (e.target.classList.contains("edit-patient-btn")) {
    const id = e.target.dataset.id;
    editPatient(id);
  }
  
  if (e.target.classList.contains("edit-test-btn")) {
    const { id, pid } = e.target.dataset;
    editTest(id, pid);
  }
});

async function editPatient(id) {
  const p = allPatients.find(p => p.id == id);
  if (!p) return;
  
  patientModalTitle.textContent = "Edit Patient";
  savePatientBtn.textContent = "Update Patient";
  editPatientId.value = id;
  
  document.getElementById("pName").value = p.name;
  document.getElementById("pAge").value = p.age;
  document.getElementById("pGender").value = p.gender;
  document.getElementById("pDate").value = p.admission_date;
  pReferredInput.value = p.referred_by || "";
  
  patientModal.classList.remove("hidden");
}

async function editTest(id, pid) {
  // Fetch all tests to find the one we need (since allTests might be filtered or not up to date)
  const data = await (await supabase.from(getTable("tests"))).select();
  const test = data.find(t => t.id == id);
  if (!test) return;
  
  editTestId.value = id;
  editTestPid.value = pid;
  etNameInput.value = test.test_name;
  etAmountInput.value = test.amount;
  etDateInput.value = test.test_date;
  
  editTestModal.classList.remove("hidden");
}

saveEditTestBtn.onclick = async () => {
  const id = editTestId.value;
  const pid = editTestPid.value;
  const name = etNameInput.value.trim();
  const amount = parseFloat(etAmountInput.value) || 0;
  const date = etDateInput.value;
  
  if (!name) return;
  
  saveEditTestBtn.disabled = true;
  saveEditTestBtn.textContent = "Updating…";
  
  try {
    await (await supabase.from(getTable("tests"))).update(id, {
      test_name: name,
      amount: amount,
      test_date: date
    });
    
    await addLog("Updated Test", `${name} (₹${amount})`);
    showToast("Test updated", "success");
    editTestModal.classList.add("hidden");
    await loadPatients();
    await loadTests(pid);
  } catch (e) {
    showToast("Update failed", "error");
  } finally {
    saveEditTestBtn.disabled = false;
    saveEditTestBtn.textContent = "Update Test";
  }
};

closeEditTestModal.onclick = () => editTestModal.classList.add("hidden");


// ── Test Modal ────────────────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-test-btn")) {
    currentPatientId = e.target.dataset.id;
    testModal.classList.remove("hidden");
    setTodayIfEmpty("tDate");
    tNameInput.focus();
    selectedTests = []; // Reset selections
    renderSelectedTests();
    renderTestDropdown(""); // Reset dropdown
  }
});

function renderTestDropdown(query) {
  const q = query.toLowerCase();
  const filtered = TEST_LIST.filter(t => t.name.toLowerCase().includes(q));
  
  testDropdown.innerHTML = "";
  if (filtered.length === 0) {
    testDropdown.classList.add("hidden");
    return;
  }

  filtered.forEach(t => {
    const item = document.createElement("div");
    item.className = "dropdown-item";
    item.innerHTML = `<span>${t.name}</span><span class="item-price">₹${t.price}</span>`;
    item.onclick = () => {
      // Add to selected list instead of just filling input
      if (selectedTests.some(st => st.name === t.name)) {
        showToast("Test already added", "info");
      } else {
        selectedTests.push({ ...t });
        renderSelectedTests();
      }
      tNameInput.value = "";
      testDropdown.classList.add("hidden");
    };
    testDropdown.appendChild(item);
  });
  testDropdown.classList.remove("hidden");
}

function renderSelectedTests() {
  selectedTestsList.innerHTML = "";
  if (selectedTests.length === 0) {
    selectedTestsList.innerHTML = `<p class="empty-selection-msg">No tests selected yet.</p>`;
    saveTestBtn.textContent = "Save All Tests";
    return;
  }

  selectedTests.forEach((t, i) => {
    const div = document.createElement("div");
    div.className = "selected-test-item";
    div.innerHTML = `
      <span class="selected-test-name">${t.name}</span>
      <input type="number" class="selected-test-price-input" value="${t.price}" data-index="${i}">
      <button class="remove-selected-btn" data-index="${i}">✕</button>
    `;
    
    div.querySelector('input').oninput = (e) => {
      selectedTests[i].price = parseFloat(e.target.value) || 0;
    };
    
    div.querySelector('.remove-selected-btn').onclick = () => {
      selectedTests.splice(i, 1);
      renderSelectedTests();
    };
    
    selectedTestsList.appendChild(div);
  });
  
  saveTestBtn.textContent = `Save ${selectedTests.length} Tests`;
}

tNameInput.oninput = (e) => renderTestDropdown(e.target.value);
tNameInput.onfocus = (e) => renderTestDropdown(e.target.value);

// Hide dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!e.target.closest('.autocomplete-container')) {
    testDropdown.classList.add("hidden");
  }
});

closeTestModal.onclick = () => testModal.classList.add("hidden");

// ── Save Test ─────────────────────────────────────────────
saveTestBtn.onclick = async () => {
  if (!auth.currentUser) return;
  if (selectedTests.length === 0) {
    showToast("Please select at least one test", "info");
    return;
  }
  
  const date = document.getElementById("tDate").value;
  saveTestBtn.disabled = true;
  saveTestBtn.textContent = "Saving…";
  
  try {
    const pName = getPatientName(currentPatientId);
    
    // Prepare batch insert
    const testsToInsert = selectedTests.map(t => ({
      patient_id: currentPatientId,
      test_name: t.name,
      test_date: date,
      amount: t.price,
      added_by: auth.currentUser.email,
      paid: false
    }));

    await (await supabase.from(getTable("tests"))).insert(testsToInsert);
    
    // Aggregate log entry
    const testNames = selectedTests.map(t => t.name).join(", ");
    await addLog("Added Tests", `${testNames} for ${pName}`);
    
    showToast(`✓ ${selectedTests.length} tests saved`, "success");
    testModal.classList.add("hidden");
    tNameInput.value = "";
    
    await loadPatients();
    await loadTests(currentPatientId);
  } catch (err) { 
    console.error(err);
    showToast("Error saving tests", "error"); 
  } finally { 
    saveTestBtn.disabled = false; 
    saveTestBtn.textContent = "Save All Tests"; 
  }
};

// ── Logs & Helpers ────────────────────────────────────────
async function addLog(action, item) {
  try {
    await (await supabase.from(getTable("logs"))).insert({
      action, item,
      by: auth.currentUser?.displayName || "User"
    });
  } catch (e) {}
}

async function loadLogs() {
  try {
    const data = await (await supabase.from(getTable("logs"))).select();
    logsView.innerHTML = "";
    data.forEach(l => {
      const div = document.createElement("div");
      div.className = "log-item";
      div.innerHTML = `<div class="log-dot"></div><div><div class="log-action">${l.action}</div><div class="log-item-name">${l.item}</div><div class="log-by">by ${l.by}</div></div>`;
      logsView.appendChild(div);
    });
  } catch (err) {}
}

patientsTab.onclick = () => {
  patientList.classList.remove("hidden");
  patientSearchCont.classList.remove("hidden");
  paymentView.classList.add("hidden");
  logsView.classList.add("hidden");
  reportsView.classList.add("hidden");
  patientsTab.classList.add("active");
  paymentsTab.classList.remove("active");
  logsTab.classList.remove("active");
  reportsTab.classList.remove("active");
};
paymentsTab.onclick = async () => {
  patientList.classList.add("hidden");
  patientSearchCont.classList.add("hidden");
  paymentView.classList.remove("hidden");
  logsView.classList.add("hidden");
  reportsView.classList.add("hidden");
  paymentsTab.classList.add("active");
  patientsTab.classList.remove("active");
  logsTab.classList.remove("active");
  reportsTab.classList.remove("active");
  await loadPayments();
};
logsTab.onclick = async () => {
  patientList.classList.add("hidden");
  patientSearchCont.classList.add("hidden");
  paymentView.classList.add("hidden");
  logsView.classList.remove("hidden");
  reportsView.classList.add("hidden");
  logsTab.classList.add("active");
  patientsTab.classList.remove("active");
  paymentsTab.classList.remove("active");
  reportsTab.classList.remove("active");
  await loadLogs();
};

reportsTab.onclick = () => {
  patientList.classList.add("hidden");
  patientSearchCont.classList.add("hidden");
  paymentView.classList.add("hidden");
  logsView.classList.add("hidden");
  reportsView.classList.remove("hidden");
  reportsTab.classList.add("active");
  patientsTab.classList.remove("active");
  paymentsTab.classList.remove("active");
  logsTab.classList.remove("active");
};

generateReportBtn.onclick = () => generateReport();

function generateReport() {
  const type = reportType.value;
  let monthTests = [];

  if (type === "monthly") {
    const month = parseInt(reportMonth.value);
    const year = parseInt(reportYear.value);
    monthTests = allTests.filter(t => {
      const d = new Date(t.test_date);
      return d.getMonth() === month && d.getFullYear() === year;
    });
  } else {
    const targetDate = reportDate.value;
    if (!targetDate) {
      showToast("Please select a date", "info");
      return;
    }
    monthTests = allTests.filter(t => t.test_date === targetDate);
  }

  if (monthTests.length === 0) {
    reportContent.innerHTML = `<div class="empty-state">No activity recorded for this period.</div>`;
    return;
  }

  // Group by patient
  const patientGroups = {};
  monthTests.forEach(t => {
    if (!patientGroups[t.patient_id]) {
      const p = allPatients.find(ap => ap.id == t.patient_id);
      patientGroups[t.patient_id] = {
        name: p ? p.name : "Unknown",
        admission: p ? p.admission_date : "",
        tests: [],
        collected: 0,
        pending: 0
      };
    }
    const group = patientGroups[t.patient_id];
    group.tests.push(t.test_name);
    const amt = parseFloat(t.amount) || 0;
    if (t.paid) group.collected += amt;
    else group.pending += amt;
  });

  let html = `
    <div class="report-table-container">
      <table class="report-table">
        <thead>
          <tr>
            <th>Patient (Adm. Date)</th>
            <th>Tests Taken</th>
            <th>Collected</th>
            <th>Pending</th>
          </tr>
        </thead>
        <tbody>
  `;

  let totalCollected = 0;
  let totalTestsCount = monthTests.length;
  let patientIds = Object.keys(patientGroups);

  patientIds.forEach(pid => {
    const g = patientGroups[pid];
    totalCollected += g.collected;
    html += `
      <tr>
        <td>
          <span class="report-patient-info">${g.name}</span>
          <span class="report-patient-date">Adm: ${formatDate(g.admission)}</span>
        </td>
        <td class="report-tests">${g.tests.join(", ")}</td>
        <td class="amt-collected">₹${g.collected}</td>
        <td class="amt-pending">₹${g.pending}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
    <div class="report-summary-box">
      <div class="summary-item">
        <label>Total Patients</label>
        <span>${patientIds.length}</span>
      </div>
      <div class="summary-item">
        <label>Total Tests</label>
        <span>${totalTestsCount}</span>
      </div>
      <div class="summary-item">
        <label>Total Collected</label>
        <span>₹${totalCollected}</span>
      </div>
    </div>
  `;

  reportContent.innerHTML = html;
}

async function loadPayments() {
  paymentList.innerHTML = `<div class="loading-state">Analyzing accounts...</div>`;
  paidList.innerHTML = `<div class="loading-state">Syncing collections...</div>`;
  
  try {
    const patients = await (await supabase.from(getTable("patients"))).select();
    const tests = await (await supabase.from(getTable("tests"))).select();
    
    const pendingPatients = [];
    const paidPatients = [];
    let totalPending = 0;
    let totalPaid = 0;

    patients.forEach(p => {
      const pPendingTests = tests.filter(t => t.patient_id == p.id && !t.paid);
      const pPaidTests = tests.filter(t => t.patient_id == p.id && t.paid);

      if (pPendingTests.length > 0) {
        const total = pPendingTests.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        pendingPatients.push({ ...p, pendingTests: pPendingTests, total });
        totalPending += total;
      }

      if (pPaidTests.length > 0) {
        const total = pPaidTests.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        paidPatients.push({ ...p, paidTests: pPaidTests, total });
        totalPaid += total;
      }
    });

    totalPendingGlobal.textContent = `Total Pending: ₹${totalPending}`;
    totalPaidGlobal.textContent = `Collected: ₹${totalPaid}`;

    renderPaymentList(paymentList, pendingPatients, "pending");
    renderPaymentList(paidList, paidPatients, "paid");

  } catch (e) {
    console.error(e);
    paymentList.innerHTML = `<div class="empty-state">Error loading payments.</div>`;
  }
}

function renderPaymentList(container, data, mode) {
  container.innerHTML = "";
  if (data.length === 0) {
    container.innerHTML = `<div class="empty-state">${mode === 'pending' ? 'No pending payments! 🎉' : 'No collections yet.'}</div>`;
    return;
  }

  data.sort((a,b) => b.total - a.total).forEach(item => {
    const card = document.createElement("div");
    card.className = `payment-card ${mode === 'paid' ? 'collected' : ''}`;
    
    const tests = mode === 'pending' ? item.pendingTests : item.paidTests;
    
    card.innerHTML = `
      <div class="payment-card-header">
        <div>
          <span class="payment-patient-name">${item.name}</span>
          <span class="payment-patient-date">${mode === 'pending' ? 'Joined ' + formatDate(item.admission_date) : 'Total Collection'}</span>
        </div>
        <div class="payment-amount-due">₹${item.total}</div>
      </div>
      <div class="pending-tests-list">
        ${tests.map(t => `
          <div class="pending-test-item">
            <div style="display:flex; flex-direction:column;">
              <span class="pending-test-name">${t.test_name}</span>
              ${t.payment_date ? `<span class="collection-date">Paid on ${formatDate(t.payment_date)}</span>` : ""}
            </div>
            <span class="pending-test-price">₹${t.amount || 0}</span>
          </div>
        `).join('')}
      </div>
    `;
    container.appendChild(card);
  });
}

function setTodayIfEmpty(inputId) {
  const el = document.getElementById(inputId);
  if (el && !el.value) el.value = new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${months[parseInt(m,10)-1]} ${y}`;
  } catch { return dateStr; }
}