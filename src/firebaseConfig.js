
// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyByKgjq_vDT9_tyHn9G-8svejXuojndXfE",
  authDomain: "admin-familia.firebaseapp.com",
  projectId: "admin-familia",
  storageBucket: "admin-familia.appspot.com",
  messagingSenderId: "151786976329",
  appId: "1:151786976329:web:XXXXXXXXXXXX",
  measurementId: "G-XXXXXXXX",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
