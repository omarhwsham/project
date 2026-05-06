// firebase.js — Shared Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBlJPUnOsXvnS0yiPJs0UxT02fcUPr8gyo",
    authDomain: "eduvibes-60060.firebaseapp.com",
    projectId: "eduvibes-60060",
    storageBucket: "eduvibes-60060.firebasestorage.app",
    messagingSenderId: "875311364757",
    appId: "1:875311364757:web:a6927ad93ea3f02f78799c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export {
    auth, db, googleProvider,
    createUserWithEmailAndPassword, signInWithEmailAndPassword,
    signOut, onAuthStateChanged,
    GoogleAuthProvider, signInWithPopup,
    doc, setDoc, getDoc, updateDoc
};
