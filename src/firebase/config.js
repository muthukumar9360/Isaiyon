import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA1uqaS3akPaF43cYWIJSoBRkD-yVRM71A",
  authDomain: "music-player-d0eb8.firebaseapp.com",
  projectId: "music-player-d0eb8",
  storageBucket: "music-player-d0eb8.firebasestorage.app",
  messagingSenderId: "167959878686",
  appId: "1:167959878686:web:199f75f091d0e3d59ca20f"
};

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export const db = getFirestore(app);
export const storage = getStorage(app);
export { ref, uploadBytes, getDownloadURL };

// Secret Admin Email - no public badge is shown to users
export const ADMIN_EMAIL = "perumpatayans@gmail.com";

export const isAdminUser = (user) => {
  return !!user && user.email?.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
};

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
};

export default app;
