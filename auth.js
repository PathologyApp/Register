import { auth } from "./firebase.js";
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export const login = async () => {
  try {
    // FORCE local persistence so mobile browsers don't "forget" the login after redirect
    await setPersistence(auth, browserLocalPersistence);
    
    // Desktop: Popup usually works
    // Mobile: Popup is often blocked, so we catch and redirect
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.log("Auth error, trying redirect:", error.code);
    if (
      error.code === 'auth/popup-blocked' || 
      error.code === 'auth/cross-origin-isolated-binary-not-supported' || 
      error.code === 'auth/internal-error' ||
      error.code === 'auth/network-request-failed'
    ) {
      return await signInWithRedirect(auth, provider);
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

// CRITICAL FOR MOBILE: This must run on every page load to "catch" the login result
getRedirectResult(auth).then((result) => {
  if (result?.user) {
    console.log("Redirect login successful:", result.user.displayName);
  }
}).catch((error) => {
  if (error.code !== 'auth/no-current-user') {
    console.error("Redirect result error:", error);
  }
});