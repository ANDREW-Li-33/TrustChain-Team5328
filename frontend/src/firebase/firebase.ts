// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDREjHYwKXzc_j1ySytPGEvtikA2Yl82kU",
  authDomain: "trustchain-37e8d.firebaseapp.com",
  projectId: "trustchain-37e8d",
  storageBucket: "trustchain-37e8d.firebasestorage.app",
  messagingSenderId: "694915983203",
  appId: "1:694915983203:web:d4a8d78836eecbba9bd556",
  measurementId: "G-HJCLTCF0GV",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
