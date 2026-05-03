// app.js

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

const patientList = document.getElementById("patientList");


// LOGIN
loginBtn.onclick = async () => {
  await login();
};


// Prevent multiple listeners
let isLoaded = false;


// AUTH STATE
onAuthStateChanged(auth, (user) => {
  if (user) {
    userInfo.innerText = user.email;
    loginBtn.style.display = "none";

    if (!isLoaded) {
      loadPatients();
      isLoaded = true;
    }

  } else {
    userInfo.innerText = "";
    loginBtn.style.display = "block";
    isLoaded = false;
  }
});


// MODAL OPEN
addBtn.onclick = () => {
  modal.classList.remove("hidden");
};


// MODAL CLOSE
modal.onclick = (e) => {
  if (e.target === modal) {
    modal.classList.add("hidden");
  }
};


// SAVE PATIENT
saveBtn.onclick = async () => {

  if (!auth.currentUser) {
    alert("Please login first");
    return;
  }

  const name = document.getElementById("pName").value;
  const age = document.getElementById("pAge").value;
  const gender = document.getElementById("pGender").value;
  const date = document.getElementById("pDate").value;

  if (!name || !age || !date) {
    alert("Please fill all fields");
    return;
  }

  saveBtn.disabled = true;

  await addDoc(collection(db, "patients"), {
    name,
    age,
    gender,
    admissionDate: date,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser.uid
  });

  // reset inputs
  document.getElementById("pName").value = "";
  document.getElementById("pAge").value = "";
  document.getElementById("pDate").value = "";

  saveBtn.disabled = false;

  modal.classList.add("hidden");
};


// LOAD PATIENTS
function loadPatients() {
  const q = query(
    collection(db, "patients"),
    orderBy("admissionDate", "desc")
  );

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

          <div class="tests" id="tests-${id}">
            Loading tests...
          </div>

          <button class="addTestBtn" data-id="${id}">
            + Add Test
          </button>
        </div>
      `;

      // Toggle expand
      div.querySelector(".patient-header").onclick = () => {
        const body = document.getElementById(`body-${id}`);
        body.classList.toggle("hidden");

        if (!body.dataset.loaded) {
          loadTests(id);
          body.dataset.loaded = "true";
        }
      };

      patientList.appendChild(div);
    });
  });
}

function loadTests(patientId) {
  const testsRef = collection(db, `patients/${patientId}/tests`);
  const q = query(testsRef, orderBy("testDate", "desc"));

  const container = document.getElementById(`tests-${patientId}`);

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<i>No tests yet</i>";
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

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("addTestBtn")) {
    const patientId = e.target.dataset.id;

    const testName = prompt("Enter Test Name:");
    if (!testName) return;

    const testDate = prompt("Enter Test Date (YYYY-MM-DD):");
    if (!testDate) return;

    await addDoc(
      collection(db, `patients/${patientId}/tests`),
      {
        testName,
        testDate,
        addedBy: auth.currentUser.uid,
        addedAt: serverTimestamp()
      }
    );
  }
});