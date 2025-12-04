import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage"; // Ajouté pour gérer les images plus tard

// --- TES CLÉS DE CONFIGURATION ---
// L'export ici est essentiel pour la méthode de l'App Secondaire.
export const firebaseConfig = {
  apiKey: "AIzaSyAPVeSw6zsZn5K1_c0si-nyXvSSOy03cpA",
  authDomain: "application-inventaire.firebaseapp.com",
  projectId: "application-inventaire",
  storageBucket: "application-inventaire.firebasestorage.app",
  messagingSenderId: "928384629068",
  appId: "1:928384629068:web:0851d4f97a1054634cf7e9"
};

// Initialisation de l'application principale
const app = initializeApp(firebaseConfig);

// Exports des services pour les utiliser ailleurs
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);