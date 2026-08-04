import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBB3pugIq39nkNIApMtki9mg8tAPuPoFLo",
  authDomain: "arca-27b65.firebaseapp.com",
  projectId: "arca-27b65",
  storageBucket: "arca-27b65.firebasestorage.app",
  messagingSenderId: "49748419658",
  appId: "1:49748419658:web:e070747289ec1e33ccf2b3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
