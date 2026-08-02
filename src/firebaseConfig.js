// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6hih9hFmNLiuWMzhRfHKlIZ2QTyxKGGc",
  authDomain: "modestify-e747d.firebaseapp.com",
  projectId: "modestify-e747d",
  storageBucket: "modestify-e747d.firebasestorage.app",
  messagingSenderId: "88527027978",
  appId: "1:88527027978:web:c373d95e9a327e09a684f3",
  measurementId: "G-M8YLR4LGHD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);