import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
// Firestore LITE — no WebSocket, no IndexedDB, direct HTTP writes to server
// This is the reliable choice for static GitHub Pages hosting
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js";

const firebaseConfig = {
  apiKey: "AIzaSyDHgwCyZQmnsl98xTwinVXAWKprcPax0vI",
  authDomain: "pathology-register.firebaseapp.com",
  projectId: "pathology-register",
  storageBucket: "pathology-register.firebasestorage.app",
  messagingSenderId: "575059004359",
  appId: "1:575059004359:web:9ad3e1ac57358b7ae767e2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);