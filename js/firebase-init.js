// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { firebaseConfig } from './config.js';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export { serverTimestamp, storageRef, uploadBytes, getDownloadURL };

// Persistencia offline: Firestore guarda una copia local en IndexedDB y
// encola las escrituras hechas sin conexión para enviarlas al reconectar.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistencia offline solo puede estar activa en una pestaña a la vez.');
  } else if (err.code === 'unimplemented') {
    console.warn('Este navegador no soporta persistencia offline de Firestore.');
  }
});
