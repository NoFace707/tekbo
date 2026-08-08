// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyASLIH5gSIuWBd5xCKB7TDr5mNbrClCmIk",
  authDomain: "pruebas-5caab.firebaseapp.com",
  projectId: "pruebas-5caab",
  storageBucket: "pruebas-5caab.firebasestorage.app",
  messagingSenderId: "17557243543",
  appId: "1:17557243543:web:28758d8ace966ed8454bd2",
  measurementId: "G-KX3HC4KD4V",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, auth, analytics };