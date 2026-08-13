// js/auth.js

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { app, db } from './firebase-init.js';
import { DOMINIO_ADMIN } from './config.js';

export const auth = getAuth(app);

let usuarioActual = null;
const listeners = [];

onAuthStateChanged(auth, (user) => {
  usuarioActual = user;
  listeners.forEach((cb) => cb(usuarioActual));
});

export function onCambioAuth(cb) {
  listeners.push(cb);
  cb(usuarioActual);
}

export function obtenerUsuarioActual() {
  return usuarioActual;
}

export function usuarioEsCuentaInstitucional() {
  return !!usuarioActual;
}

export async function iniciarSesionGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: DOMINIO_ADMIN });

  const resultado = await signInWithPopup(auth, provider);
  const email = (resultado.user.email || '').toLowerCase();

  if (!email.endsWith(`@${DOMINIO_ADMIN}`)) {
    await signOut(auth);
    throw new Error(`Solo cuentas @${DOMINIO_ADMIN} pueden iniciar sesión.`);
  }

  const snap = await getDoc(doc(db, 'admins_permitidos', email));
  if (!snap.exists()) {
    await signOut(auth);
    throw new Error('Tu correo todavía no está autorizado para iniciar sesión. Pide que te agreguen a la lista de administradores.');
  }

  return resultado.user;
}

export async function cerrarSesion() {
  await signOut(auth);
}

