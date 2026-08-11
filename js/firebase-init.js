// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

import { firebaseConfig, RECAPTCHA_SITE_KEY } from './config.js';

export const app = initializeApp(firebaseConfig);

// --- App Check: bloquea escrituras que no vengan de un navegador real,
// principal defensa gratuita contra bots y scripts de spam. ---
let appCheck = null;
try {
  if (RECAPTCHA_SITE_KEY && !RECAPTCHA_SITE_KEY.startsWith('REEMPLAZA')) {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    console.warn('App Check no está configurado todavía: agrega tu RECAPTCHA_SITE_KEY en js/config.js');
  }
} catch (e) {
  console.warn('No se pudo iniciar App Check:', e);
}

export const db = getFirestore(app);
export { serverTimestamp };

// Persistencia offline: Firestore guarda una copia local en IndexedDB y
// encola las escrituras hechas sin conexión para enviarlas al reconectar.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia offline solo puede estar activa en una pestaña a la vez.');
  } else if (err.code === 'unimplemented') {
    console.warn('Este navegador no soporta persistencia offline de Firestore.');
  }
});
