// auth.js
import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Detect mobile — popups are blocked on most mobile browsers
const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Handle redirect result when the page loads after a redirect login
getRedirectResult(auth).catch(err => {
  if (err.code !== "auth/null-user") {
    console.error("Redirect login error:", err.message);
    alert("Login failed: " + err.message);
  }
});

export async function login() {
  if (isMobile) {
    // Redirect flow — page reloads and onAuthStateChanged picks up the user
    await signInWithRedirect(auth, provider);
  } else {
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (err) {
      console.error("Popup login error:", err.message);
      // Fallback to redirect if popup was blocked
      if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
        await signInWithRedirect(auth, provider);
      } else {
        alert("Login failed: " + err.message);
      }
    }
  }
}