import { auth, db } from "./firebase.js";
import { login, logout } from "./auth.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Full Firestore SDK — must match firebase.js (not Lite)
import {
  collection, addDoc, serverTimestamp,
  getDocs, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ── DOM refs ──────────────────────────────────────────────
const authScreen        = document.getElementById("authScreen");
const appEl             = document.getElementById("app");
const loginBtn          = document.getElementById("loginBtn");
const logoutBtn         = document.getElementById("logoutBtn");
const userInfo          = document.getElementById("userInfo");
const authError         = document.getElementById("authError");

const addPatientBtn     = document.getElementById("addPatientBtn");
const patientModal      = document.getElementById("patientModal");
const closePatientModal = document.getElementById("closePatientModal");
const savePatientBtn    = document.getElementById("savePatient");

const testModal         = document.getElementById("testModal");
const closeTestModal    = document.getElementById("closeTestModal");
const saveTestBtn       = document.getElementById("saveTest");

const patientList       = document.getElementById("patientList");
const logsView          = document.getElementById("logsView");
const patientsTab       = document.getElementById("patientsTab");
const logsTab           = document.getElementById("logsTab");
const toastEl           = document.getElementById("toast");

let currentPatientId = null;

// ── Toast ─────────────────────────────────────────────────
function showToast(msg, type = "info") {
  toastEl.textContent = msg;
  toastEl.className = `toast ${type} show`;
  setTimeout(() => { toastEl.className = "toast"; }, 3200);
}

// ── Auth ──────────────────────────────────────────────────
const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.8 18.9 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.2C29.3 35.5 26.7 36 24 36c-5.1 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.6l6.2 5.2C37.2 38.3 44 33 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>`;

loginBtn.onclick = async () => {
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in…";
  authError.textContent = "";
  try {
    await login();
    // For redirect flow: page reloads; for popup: onAuthStateChanged fires
  } catch (err) {
    authError.textContent = "Login failed: " + err.message;
    loginBtn.disabled = false;
    loginBtn.innerHTML = `${GOOGLE_ICON} Sign in with Google`;
  }
};

logoutBtn.onclick = async () => {
  await logout();
  patientList.innerHTML = "";
  logsView.innerHTML = "";
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    authScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    userInfo.textContent = user.displayName || user.email.split("@")[0];
    loadPatients();
    loadLogs();
  } else {
    authScreen.classList.remove("hidden");
    appEl.classList.add("hidden");
    loginBtn.disabled = false;
    loginBtn.innerHTML = `${GOOGLE_ICON} Sign in with Google`;
  }
});

// ── Patient Modal ─────────────────────────────────────────
addPatientBtn.onclick = () => {
  patientModal.classList.remove("hidden");
  setTodayIfEmpty("pDate");
  document.getElementById("pName").focus();
};
closePatientModal.onclick = () => patientModal.classList.add("hidden");
patientModal.onclick = (e) => { if (e.target === patientModal) patientModal.classList.add("hidden"); };

// ── Save Patient ──────────────────────────────────────────
savePatientBtn.onclick = async () => {
  if (!auth.currentUser) { showToast("Please login first", "error"); return; }

  const name   = document.getElementById("pName").value.trim();
  const age    = document.getElementById("pAge").value.trim();
  const gender = document.getElementById("pGender").value;
  const date   = document.getElementById("pDate").value;

  if (!name) { showToast("Enter patient name", "error"); return; }
  if (!age)  { showToast("Enter age", "error"); return; }
  if (!date) { showToast("Select admission date", "error"); return; }

  savePatientBtn.disabled = true;
  savePatientBtn.textContent = "Saving…";

  try {
    await addDoc(collection(db, "patients"), {
      name, age, gender,
      admissionDate: date,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });

    await addLog("Added Patient", name);
    showToast(`✓ ${name} added successfully`, "success");

    document.getElementById("pName").value = "";
    document.getElementById("pAge").value = "";
    document.getElementById("pDate").value = "";
    patientModal.classList.add("hidden");

    // Refresh the patient list
    await loadPatients();
  } catch (err) {
    console.error("Save patient error:", err);
    showToast("Error: " + err.message, "error");
  } finally {
    savePatientBtn.disabled = false;
    savePatientBtn.textContent = "Save Patient";
  }
};

// ── Load Patients (getDocs — Firestore Lite) ──────────────
async function loadPatients() {
  patientList.innerHTML = `<div class="loading-state">Loading patients…</div>`;
  try {
    const q = query(collection(db, "patients"), orderBy("admissionDate", "desc"));
    const snapshot = await getDocs(q);

    patientList.innerHTML = "";

    if (snapshot.empty) {
      patientList.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <p>No patients yet. Tap <strong>+</strong> to add one.</p>
        </div>`;
      return;
    }

    snapshot.forEach(docSnap => {
      const p  = docSnap.data();
      const id = docSnap.id;
      const card = buildPatientCard(id, p);
      patientList.appendChild(card);
    });
  } catch (err) {
    console.error("Load patients error:", err);
    patientList.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Error: ${err.message}</p></div>`;
  }
}

function buildPatientCard(id, p) {
  const card = document.createElement("div");
  card.className = "patient-card";
  card.innerHTML = `
    <div class="patient-header" id="hdr-${id}">
      <span class="patient-name">${p.name}</span>
      <div class="patient-meta">
        <span class="patient-badge">${p.gender} · ${p.age}y</span>
        <span class="patient-date">${formatDate(p.admissionDate)}</span>
        <span class="chevron" id="chev-${id}">▾</span>
      </div>
    </div>
    <div class="patient-body hidden" id="body-${id}">
      <div class="patient-details">
        <span>🗓 Admitted: ${formatDate(p.admissionDate)}</span>
      </div>
      <div class="tests-section">
        <div class="tests-label">Lab Tests</div>
        <div id="tests-${id}"><div class="no-tests">Click to load tests</div></div>
        <button class="add-test-btn" data-id="${id}">+ Add Test</button>
      </div>
    </div>`;

  card.querySelector(`#hdr-${id}`).onclick = async () => {
    const body = document.getElementById(`body-${id}`);
    const chev = document.getElementById(`chev-${id}`);
    const isOpen = !body.classList.contains("hidden");
    body.classList.toggle("hidden");
    chev.classList.toggle("open", !isOpen);
    if (!isOpen) {
      await loadTests(id);
    }
  };

  return card;
}

// ── Load Tests (getDocs — Firestore Lite) ─────────────────
async function loadTests(patientId) {
  const container = document.getElementById(`tests-${patientId}`);
  if (!container) return;
  container.innerHTML = `<div class="no-tests">Loading…</div>`;

  try {
    const q = query(
      collection(db, `patients/${patientId}/tests`),
      orderBy("testDate", "desc")
    );
    const snapshot = await getDocs(q);
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = `<div class="no-tests">No tests added yet</div>`;
      return;
    }

    snapshot.forEach(doc => {
      const t = doc.data();
      const div = document.createElement("div");
      div.className = "test-item";
      div.innerHTML = `
        <span class="test-name">${t.testName}</span>
        <span class="test-right">
          ${t.amount ? `<span class="test-amount">₹${t.amount}</span>` : ""}
          <span class="test-date">${formatDate(t.testDate)}</span>
        </span>`;
      container.appendChild(div);
    });
  } catch (err) {
    console.error("Load tests error:", err);
    container.innerHTML = `<div class="no-tests">Error: ${err.message}</div>`;
  }
}

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
testModal.onclick = (e) => { if (e.target === testModal) testModal.classList.add("hidden"); };

// ── Save Test ─────────────────────────────────────────────
saveTestBtn.onclick = async () => {
  if (!auth.currentUser) { showToast("Login required", "error"); return; }

  const name   = document.getElementById("tName").value.trim();
  const date   = document.getElementById("tDate").value;
  const amount = parseFloat(document.getElementById("tAmount").value) || 0;

  if (!name) { showToast("Enter test name", "error"); return; }
  if (!date) { showToast("Select a test date", "error"); return; }

  saveTestBtn.disabled = true;
  saveTestBtn.textContent = "Saving…";

  try {
    await addDoc(collection(db, `patients/${currentPatientId}/tests`), {
      testName: name,
      testDate: date,
      amount,
      addedBy: auth.currentUser.displayName || auth.currentUser.email,
      addedAt: serverTimestamp()
    });

    await addLog("Added Test", `${name} (₹${amount})`);
    showToast(`✓ Test "${name}" saved`, "success");

    document.getElementById("tName").value = "";
    document.getElementById("tDate").value = "";
    document.getElementById("tAmount").value = "";
    testModal.classList.add("hidden");

    // Refresh the tests list for this patient
    await loadTests(currentPatientId);
  } catch (err) {
    console.error("Save test error:", err);
    showToast("Error: " + err.message, "error");
  } finally {
    saveTestBtn.disabled = false;
    saveTestBtn.textContent = "Save Test";
  }
};

// ── Logs ──────────────────────────────────────────────────
async function addLog(action, item) {
  try {
    await addDoc(collection(db, "logs"), {
      action, item,
      by: auth.currentUser?.displayName || "Unknown",
      time: serverTimestamp()
    });
  } catch (e) {
    console.warn("Log write failed (non-critical):", e.message);
  }
}

async function loadLogs() {
  try {
    const q = query(collection(db, "logs"), orderBy("time", "desc"));
    const snapshot = await getDocs(q);

    logsView.innerHTML = "";
    if (snapshot.empty) {
      logsView.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>No activity yet.</p></div>`;
      return;
    }

    snapshot.forEach(doc => {
      const l = doc.data();
      const div = document.createElement("div");
      div.className = "log-item";
      div.innerHTML = `
        <div class="log-dot"></div>
        <div>
          <div class="log-action">${l.action}</div>
          <div class="log-item-name">${l.item}</div>
          <div class="log-by">by ${l.by}</div>
        </div>`;
      logsView.appendChild(div);
    });
  } catch (err) {
    console.error("Load logs error:", err);
  }
}

// ── Tabs ──────────────────────────────────────────────────
patientsTab.onclick = () => {
  patientList.classList.remove("hidden");
  logsView.classList.add("hidden");
  patientsTab.classList.add("active");
  logsTab.classList.remove("active");
};
logsTab.onclick = async () => {
  patientList.classList.add("hidden");
  logsView.classList.remove("hidden");
  logsTab.classList.add("active");
  patientsTab.classList.remove("active");
  await loadLogs(); // refresh logs when tab is opened
};

// ── Helpers ───────────────────────────────────────────────
function setTodayIfEmpty(inputId) {
  const el = document.getElementById(inputId);
  if (el && !el.value) {
    el.value = new Date().toISOString().split("T")[0];
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${parseInt(d)} ${months[parseInt(m,10)-1]} ${y}`;
  } catch { return dateStr; }
}