import { auth } from "./firebase.js";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut,
  getRedirectResult
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export const login = async () => {
  try {
    // Try popup first (desktop)
    return await signInWithPopup(auth, provider);
  } catch (error) {
    // Fallback to redirect (mobile or COOP issues)
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cross-origin-isolated-binary-not-supported' || error.code === 'auth/internal-error') {
      return await signInWithRedirect(auth, provider);
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

// Handle redirect result on page load
getRedirectResult(auth).catch((error) => {
  console.error("Redirect login error:", error);
});