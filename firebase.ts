import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Ta configuration existante
export const firebaseConfig = {
  apiKey: "AIzaSyAPVeSw6zsZn5K1_c0si-nyXvSSOy03cpA",
  authDomain: "application-inventaire.firebaseapp.com",
  projectId: "application-inventaire",
  storageBucket: "application-inventaire.firebasestorage.app",
  messagingSenderId: "928384629068",
  appId: "1:928384629068:web:0851d4f97a1054634cf7e9"
};

const app = initializeApp(firebaseConfig);

// Configuration App Check (Anti-abus)
if (typeof window !== 'undefined') {
  // On active le mode debug pour localhost
  // @ts-ignore
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

  const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  
  if (recaptchaKey) {
    try {
        initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(recaptchaKey),
          isTokenAutoRefreshEnabled: true
        });
        console.log("🛡️ App Check initialisé");
    } catch (e) {
        console.warn("App Check n'a pas pu s'initialiser (ceci est normal en dev local si la clé n'est pas configurée pour localhost).", e);
    }
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);