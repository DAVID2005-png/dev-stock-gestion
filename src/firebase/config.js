// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC6SvgSzI42ocVWRCXCyxF7JfZ2zo5kICI",
  authDomain: "dev-stock-3196e.firebaseapp.com",
  projectId: "dev-stock-3196e",
  storageBucket: "dev-stock-3196e.firebasestorage.app",
  messagingSenderId: "555509732322",
  appId: "1:555509732322:web:eb59964a7761dfc9811fbb",
  measurementId: "G-QBEJCYRF64"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// const analytics = getAnalytics(app);