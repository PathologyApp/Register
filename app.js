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
};
modal.onclick = (e) => e.target === modal && modal.classList.add("hidden");
testModal.onclick = (e) => e.target === testModal && testModal.classList.add("hidden");

// SAVE PATIENT
saveBtn.onclick = async () => {
  console.log("USER:", auth.currentUser);

if (!auth.currentUser) {
  alert("Please login again");
  return;
}

  const name = pName.value;
  const age = pAge.value;
  const gender = pGender.value;
  const date = pDate.value;

  if (!name || !age || !date) return alert("Fill all fields");

  try {
  await addDoc(collection(db, "patients"), {
    name,
    age,
    gender,
    admissionDate: date,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid
  });

  console.log("✅ Saved to Firestore");

} catch (err) {
  console.error("❌ Firestore error:", err);
}
  pName.value = "";
  pAge.value = "";
  pDate.value = "";
  modal.classList.add("hidden");
  console.log("Saving:", name, age, date);
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

      div.innerHTML = `
        ${t.testName}
        <span style="float:right">${t.testDate}</span>
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

  const name = tName.value;
  const date = tDate.value;

  if (!name || !date) return alert("Fill all fields");

  await addDoc(
    collection(db, `patients/${currentPatientId}/tests`),
    {
      testName: name,
      testDate: date,
      addedBy: auth.currentUser.displayName,
      addedAt: serverTimestamp()
    }
  );

  await addLog("Added Test", name);

  tName.value = "";
  tDate.value = "";
  testModal.classList.add("hidden");
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


if (window.flatpickr) {
  window.flatpickr("#tDate", {
    dateFormat: "Y-m-d",
    allowInput: false
  });
}