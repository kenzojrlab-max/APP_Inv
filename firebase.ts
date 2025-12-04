import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
// 1. Import nécessaire pour la sécurité
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Ta configuration existante
export const firebaseConfig = {
  apiKey: "AIzaSyAPVeSw6zsZn5K1_c0si-nyXvSSOy03cpA", // Tu peux aussi utiliser import.meta.env.VITE_xxx si tu veux
  authDomain: "application-inventaire.firebaseapp.com",
  projectId: "application-inventaire",
  storageBucket: "application-inventaire.firebasestorage.app",
  messagingSenderId: "928384629068",
  appId: "1:928384629068:web:0851d4f97a1054634cf7e9"
};

// Initialisation de l'app
const app = initializeApp(firebaseConfig);

// 2. Activation de la protection App Check
// On vérifie qu'on est bien dans le navigateur (et pas côté serveur lors du build)
if (typeof window !== 'undefined') {
  // On active le mode debug en local pour éviter les erreurs pendant le dev
  if (location.hostname === "localhost") {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  
  if (recaptchaKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaKey),
      isTokenAutoRefreshEnabled: true
    });
    console.log("🛡️ App Check activé");
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);