import { login } from "./auth.js";
import { auth, db } from "./firebase.js";

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import { 
  collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// DOM
const loginBtn = document.getElementById("loginBtn");
const userInfo = document.getElementById("userInfo");

const addBtn = document.getElementById("addPatientBtn");
const modal = document.getElementById("patientModal");
const saveBtn = document.getElementById("savePatient");

const testModal = document.getElementById("testModal");
const saveTestBtn = document.getElementById("saveTest");

const patientList = document.getElementById("patientList");
const logsView = document.getElementById("logsView");

const patientsTab = document.getElementById("patientsTab");
const logsTab = document.getElementById("logsTab");

let currentPatientId = null;
let isLoaded = false;
let patientDatePicker = null;
let testDatePicker = null;

// LOGIN
loginBtn.onclick = async () => await login();

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    window.currentUserReady = true;
    const name = user.displayName || user.email.split("@")[0];
    userInfo.innerText = name;
    loginBtn.style.display = "none";

      if (!isLoaded) {
      loadPatients();
      loadLogs();
      isLoaded = true;
    }
  } else {
    loginBtn.style.display = "block";
    userInfo.innerText = "";
  }
});

// MODALS
addBtn.onclick = () => {
  modal.classList.remove("hidden");
  // Re-initialize flatpickr for pDate when modal opens (most reliable approach)
  if (typeof flatpickr !== "undefined") {
    if (patientDatePicker) patientDatePicker.destroy();
    patientDatePicker = flatpickr("#pDate", {
      dateFormat: "Y-m-d",
      allowInput: true,
      disableMobile: false
    });
  }
};
modal.onclick = (e) => e.target === modal && modal.classList.add("hidden");
testModal.onclick = (e) => e.target === testModal && testModal.classList.add("hidden");

// SAVE PATIENT
saveBtn.onclick = async () => {
  if (!auth.currentUser) {
    alert("Please login first before adding a patient.");
    return;
  }

  const name = document.getElementById("pName").value.trim();
  const age = document.getElementById("pAge").value.trim();
  const gender = document.getElementById("pGender").value;
  const date = document.getElementById("pDate").value.trim();

  if (!name || !age || !date) return alert("Please fill in all fields (Name, Age, Date).");

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    await addDoc(collection(db, "patients"), {
      name,
      age,
      gender,
      admissionDate: date,
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });

    await addLog("Added Patient", name);

    document.getElementById("pName").value = "";
    document.getElementById("pAge").value = "";
    if (patientDatePicker) patientDatePicker.clear();
    modal.classList.add("hidden");
  } catch (err) {
    console.error("Firestore error:", err);
    alert("Failed to save patient: " + err.message);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
};

// LOAD PATIENTS
function loadPatients() {
  const q = query(collection(db, "patients"), orderBy("admissionDate", "desc"));

  onSnapshot(q, (snapshot) => {
    patientList.innerHTML = "";

    snapshot.forEach(docSnap => {
      const p = docSnap.data();
      const id = docSnap.id;

      const div = document.createElement("div");
      div.className = "patient-card";

      div.innerHTML = `
        <div class="patient-header">
          <strong>${p.name}</strong>
          <span>${p.admissionDate}</span>
        </div>

        <div class="patient-body hidden" id="body-${id}">
          <div>Age: ${p.age} | ${p.gender}</div>
          <div id="tests-${id}">Loading...</div>
          <button class="addTestBtn" data-id="${id}">+ Add Test</button>
        </div>
      `;

      div.querySelector(".patient-header").onclick = () => {
        const body = document.getElementById(`body-${id}`);
        body.classList.toggle("hidden");

        if (!body.dataset.loaded) {
          loadTests(id);
          body.dataset.loaded = true;
        }
      };

      patientList.appendChild(div);
    });
  });
}

// LOAD TESTS
function loadTests(patientId) {
  const q = query(
    collection(db, `patients/${patientId}/tests`),
    orderBy("testDate", "desc")
  );

  const container = document.getElementById(`tests-${patientId}`);

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<i>No tests</i>";
      return;
    }

    snapshot.forEach(doc => {
      const t = doc.data();

      const div = document.createElement("div");
      div.className = "test-item";

      const amountStr = t.amount != null ? `<span style="color:#2d7ff9;font-weight:600">₹${t.amount}</span>` : "";

      div.innerHTML = `
        ${t.testName}
        <span style="float:right">${amountStr} &nbsp; ${t.testDate}</span>
      `;

      container.appendChild(div);
    });
  });
}

// OPEN TEST MODAL
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("addTestBtn")) {
    currentPatientId = e.target.dataset.id;
    testModal.classList.remove("hidden");
  }
});

// SAVE TEST
saveTestBtn.onclick = async () => {
  if (!auth.currentUser) return alert("Login required");

  const name = document.getElementById("tName").value.trim();
  const date = document.getElementById("tDate").value.trim();
  const amount = parseFloat(document.getElementById("tAmount").value) || 0;

  if (!name || !date) return alert("Fill all fields");

  saveTestBtn.disabled = true;
  saveTestBtn.textContent = "Saving...";

  try {
    await addDoc(
      collection(db, `patients/${currentPatientId}/tests`),
      {
        testName: name,
        testDate: date,
        amount: amount,
        addedBy: auth.currentUser.displayName,
        addedAt: serverTimestamp()
      }
    );

    await addLog("Added Test", `${name} (₹${amount})`);

    document.getElementById("tName").value = "";
    document.getElementById("tAmount").value = "";
    if (testDatePicker) testDatePicker.clear();
    testModal.classList.add("hidden");
  } catch (err) {
    console.error("Firestore error:", err);
    alert("Failed to save test: " + err.message);
  } finally {
    saveTestBtn.disabled = false;
    saveTestBtn.textContent = "Save Test";
  }
};

// LOG SYSTEM
async function addLog(action, item) {
  await addDoc(collection(db, "logs"), {
    action,
    item,
    by: auth.currentUser.displayName,
    time: serverTimestamp()
  });
}

// LOAD LOGS
function loadLogs() {
  const q = query(collection(db, "logs"), orderBy("time", "desc"));

  onSnapshot(q, (snapshot) => {
    logsView.innerHTML = "";

    snapshot.forEach(doc => {
      const l = doc.data();

      const div = document.createElement("div");
      div.className = "log-item";

      div.innerHTML = `
        <strong>${l.action}</strong><br>
        ${l.item}<br>
        By: ${l.by}
      `;

      logsView.appendChild(div);
    });
  });
}

// TABS
patientsTab.onclick = () => {
  patientList.style.display = "block";
  logsView.classList.add("hidden");
};

logsTab.onclick = () => {
  patientList.style.display = "none";
  logsView.classList.remove("hidden");
};

// FLATPICKR — initialize tDate at load time
// pDate is initialized dynamically when the patient modal opens (see addBtn.onclick)
if (typeof flatpickr !== "undefined") {
  testDatePicker = flatpickr("#tDate", {
    dateFormat: "Y-m-d",
    allowInput: true,
    disableMobile: false
  });
} else {
  console.warn("flatpickr not loaded — falling back to native date inputs");
  document.getElementById("pDate").type = "date";
  document.getElementById("tDate").type = "date";
}