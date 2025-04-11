import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBLrJFzAz_aHXaUj9LN26Nea_fzmT09CW8",
  authDomain: "maza-gym-clean.firebaseapp.com",
  projectId: "maza-gym-clean",
  storageBucket: "maza-gym-clean.firebasestorage.app",
  messagingSenderId: "520228079750",
  appId: "1:520228079750:web:ea8269f423b37eb31f2907",
  measurementId: "G-FVXTVWDSL4"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app); 