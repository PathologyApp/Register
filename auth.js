// auth.js
import { auth } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const provider = new GoogleAuthProvider();

export async function login() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}