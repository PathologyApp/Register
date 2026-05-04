import { auth } from "./auth.js";
import { login, logout } from "./auth.js";
import { supabase } from "./supabase.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// ── State & Config ────────────────────────────────────────
const LAB_KEY = "LAB2024"; // The "Lab Register Key"
let isLabUser = localStorage.getItem("lab_unlocked") === "true";
let useSampleMode = localStorage.getItem("sample_mode") === "true";
let isAdmin = false;

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

const patientsTab       = document.getElementById("patientsTab");
const paymentsTab       = document.getElementById("paymentsTab");
const logsTab           = document.getElementById("logsTab");
const toastEl           = document.getElementById("toast");

let currentPatientId = null;

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
  
  // Update UI Badge
  if (useSampleMode) {
    modeBadge.textContent = "Sample App";
    modeBadge.className = "mode-badge sample";
    isAdmin = true; // Allow full access in Sample Mode for testing
  } else {
    modeBadge.textContent = "Lab Database";
    modeBadge.className = "mode-badge lab";
    await checkAdminStatus(user.email);
  }
  
  loadPatients();
}

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
  patientModal.classList.remove("hidden");
  setTodayIfEmpty("pDate");
  document.getElementById("pName").focus();
};
closePatientModal.onclick = () => patientModal.classList.add("hidden");

// ── Save Patient ──────────────────────────────────────────
savePatientBtn.onclick = async () => {
  if (!auth.currentUser) return;
  const name = document.getElementById("pName").value.trim();
  const age = document.getElementById("pAge").value.trim();
  const gender = document.getElementById("pGender").value;
  const date = document.getElementById("pDate").value;
  if (!name) return;
  savePatientBtn.disabled = true;
  savePatientBtn.textContent = "Saving…";
  try {
    await (await supabase.from(getTable("patients"))).insert({
      name, age, gender,
      admission_date: date,
      created_by: auth.currentUser.email
    });
    await addLog("Added Patient", name);
    showToast(`✓ ${name} added`, "success");
    patientModal.classList.add("hidden");
    document.getElementById("pName").value = "";
    await loadPatients();
  } catch (err) { showToast("Error saving", "error"); }
  finally { savePatientBtn.disabled = false; savePatientBtn.textContent = "Save Patient"; }
};

// ── Load Patients ─────────────────────────────────────────
async function loadPatients() {
  patientList.innerHTML = `<div class="loading-state">Loading patients…</div>`;
  try {
    const data = await (await supabase.from(getTable("patients"))).select();
    const tests = await (await supabase.from(getTable("tests"))).select();
    patientList.innerHTML = "";
    if (!data || data.length === 0) {
      patientList.innerHTML = `<div class="empty-state">No patients yet.</div>`;
      return;
    }
    data.forEach(p => {
      const pTests = tests.filter(t => t.patient_id == p.id);
      const total = pTests.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const card = buildPatientCard(p.id, p, total);
      patientList.appendChild(card);
    });
  } catch (err) {
    patientList.innerHTML = `<div class="empty-state">Error loading data.</div>`;
  }
}

function buildPatientCard(id, p, total) {
  const card = document.createElement("div");
  card.className = "patient-card";
  card.innerHTML = `
    <div class="patient-header" id="hdr-${id}">
      <div class="patient-title-row">
        <span class="patient-name">${p.name}</span>
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
          <span class="test-name">${t.test_name}</span>
          <div class="test-sub-info">
            ${t.amount ? `<span class="test-amount">₹${t.amount}</span>` : ""}
            <span class="test-date">${formatDate(t.test_date)}</span>
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
  try {
    const newStatus = !currentPaid;
    await (await supabase.from(getTable("tests"))).update(id, { paid: newStatus });
    await loadTests(patientId);
    await loadPatients(); // Update total if needed
    showToast(newStatus ? "Payment Received" : "Marked as Pending", "success");
  } catch (e) { showToast("Update failed", "error"); }
}

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
      await addLog("Deleted Test", name);
      showToast("Removed", "info");
      await loadPatients();
      await loadTests(pid);
    }
  }
});

// ── Test Modal ────────────────────────────────────────────
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("add-test-btn")) {
    currentPatientId = e.target.dataset.id;
    testModal.classList.remove("hidden");
    setTodayIfEmpty("tDate");
    document.getElementById("tName").focus();
  }
});
closeTestModal.onclick = () => testModal.classList.add("hidden");

// ── Save Test ─────────────────────────────────────────────
saveTestBtn.onclick = async () => {
  if (!auth.currentUser) return;
  const name = document.getElementById("tName").value.trim();
  const date = document.getElementById("tDate").value;
  const amount = parseFloat(document.getElementById("tAmount").value) || 0;
  if (!name) return;
  saveTestBtn.disabled = true;
  saveTestBtn.textContent = "Saving…";
  try {
    await (await supabase.from(getTable("tests"))).insert({
      patient_id: currentPatientId,
      test_name: name,
      test_date: date,
      amount: amount,
      added_by: auth.currentUser.email,
      paid: false
    });
    await addLog("Added Test", name);
    showToast(`✓ Test saved`, "success");
    testModal.classList.add("hidden");
    document.getElementById("tName").value = "";
    document.getElementById("tAmount").value = "";
    await loadPatients();
    await loadTests(currentPatientId);
  } catch (err) { showToast("Error", "error"); }
  finally { saveTestBtn.disabled = false; saveTestBtn.textContent = "Save Test"; }
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
  paymentView.classList.add("hidden");
  logsView.classList.add("hidden");
  patientsTab.classList.add("active");
  paymentsTab.classList.remove("active");
  logsTab.classList.remove("active");
};
paymentsTab.onclick = async () => {
  patientList.classList.add("hidden");
  paymentView.classList.remove("hidden");
  logsView.classList.add("hidden");
  paymentsTab.classList.add("active");
  patientsTab.classList.remove("active");
  logsTab.classList.remove("active");
  await loadPayments();
};
logsTab.onclick = async () => {
  patientList.classList.add("hidden");
  paymentView.classList.add("hidden");
  logsView.classList.remove("hidden");
  logsTab.classList.add("active");
  patientsTab.classList.remove("active");
  paymentsTab.classList.remove("active");
  await loadLogs();
};

async function loadPayments() {
  paymentList.innerHTML = `<div class="loading-state">Analyzing accounts...</div>`;
  try {
    const patients = await (await supabase.from(getTable("patients"))).select();
    const tests = await (await supabase.from(getTable("tests"))).select();
    
    const pendingPatients = [];
    let grandTotal = 0;

    patients.forEach(p => {
      const pPendingTests = tests.filter(t => t.patient_id == p.id && !t.paid);
      if (pPendingTests.length > 0) {
        const total = pPendingTests.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        pendingPatients.push({ ...p, pendingTests: pPendingTests, total });
        grandTotal += total;
      }
    });

    totalPendingGlobal.textContent = `Total: ₹${grandTotal}`;
    paymentList.innerHTML = "";

    if (pendingPatients.length === 0) {
      paymentList.innerHTML = `<div class="empty-state">No pending payments! 🎉</div>`;
      return;
    }

    pendingPatients.sort((a,b) => b.total - a.total).forEach(item => {
      const card = document.createElement("div");
      card.className = "payment-card";
      card.innerHTML = `
        <div class="payment-card-header">
          <div>
            <span class="payment-patient-name">${item.name}</span>
            <span class="payment-patient-date">Joined ${formatDate(item.admission_date)}</span>
          </div>
          <div class="payment-amount-due">₹${item.total}</div>
        </div>
        <div class="pending-tests-list">
          ${item.pendingTests.map(t => `
            <div class="pending-test-item">
              <span class="pending-test-name">${t.test_name}</span>
              <span class="pending-test-price">₹${t.amount || 0}</span>
            </div>
          `).join('')}
        </div>
      `;
      paymentList.appendChild(card);
    });
  } catch (e) {
    paymentList.innerHTML = `<div class="empty-state">Error loading payments.</div>`;
  }
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