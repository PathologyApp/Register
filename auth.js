// auth.js
import { auth } from "./firebase.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const provider = new GoogleAuthProvider();

const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i
  .test(navigator.userAgent);

// Handle redirect result on page load (mobile flow)
getRedirectResult(auth).catch(err => {
  if (err && err.code !== "auth/null-user") {
    console.error("Redirect result error:", err.message);
  }
});

export async function login() {
  if (isMobile) {
    return signInWithRedirect(auth, provider);
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    if (err.code === "auth/popup-blocked" || err.code === "auth/popup-closed-by-user") {
      return signInWithRedirect(auth, provider);
    }
    throw err;
  }
}

export async function logout() {
  return signOut(auth);
}