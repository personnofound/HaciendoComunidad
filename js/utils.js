// js/utils.js
import { ENFRIAMIENTO_SEGUNDOS } from './config.js';

// Evita HTML/scripts inyectados en texto libre (protección básica anti-XSS
// en el cliente; complementa, no reemplaza, la validación en las reglas
// de Firestore).
export function escaparHTML(texto = '') {
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

export function limpiarTexto(valor, maxLargo = 400) {
  return String(valor || '').trim().slice(0, maxLargo);
}

// --- Anti-spam simple del lado del cliente (cooldown por formulario) ---
export function puedeEnviar(idFormulario) {
  const clave = `enfriamiento_${idFormulario}`;
  const ultimo = Number(localStorage.getItem(clave) || 0);
  const ahora = Date.now();
  const segundosRestantes = Math.ceil((ultimo + ENFRIAMIENTO_SEGUNDOS * 1000 - ahora) / 1000);
  return segundosRestantes <= 0 ? { ok: true } : { ok: false, segundosRestantes };
}

export function marcarEnviado(idFormulario) {
  localStorage.setItem(`enfriamiento_${idFormulario}`, String(Date.now()));
}

// --- Formato de tiempo relativo en español ---
export function tiempoRelativo(fecha) {
  if (!fecha) return 'justo ahora';
  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 30) return 'justo ahora';
  if (segundos < 60) return `hace ${segundos}s`;
  const min = Math.floor(segundos / 60);
  if (min < 60) return `hace ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `hace ${dias} d`;
}

// --- Construye un link de WhatsApp a partir de un número/contacto libre ---
export function linkContacto(contactoCrudo) {
  const texto = limpiarTexto(contactoCrudo, 120);
  const soloDigitos = texto.replace(/[^\d+]/g, '');
  if (soloDigitos.replace('+', '').length >= 7) {
    const numero = soloDigitos.replace(/^0/, '');
    return { texto, href: `https://wa.me/${numero.replace('+', '')}` };
  }
  return { texto, href: null };
}

export function debounce(fn, espera = 300) {
  let temporizador;
  return (...args) => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => fn(...args), espera);
  };
}

export function generarIdDispositivo() {
  let id = localStorage.getItem('id_dispositivo');
  if (!id) {
    id = 'disp_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('id_dispositivo', id);
  }
  return id;
}

// --- Recuerda en este dispositivo qué publicaciones creó la propia
// persona, para ofrecerle el botón "marcar como resuelto" solo a ella.
// (Es una ayuda de interfaz, no una medida de seguridad: cualquiera que
// llame a la API de Firestore directamente podría igual intentarlo; ver
// la nota sobre esto en el README).
function leerListaLocal(clave) {
  try {
    return JSON.parse(localStorage.getItem(clave) || '[]');
  } catch (e) {
    return [];
  }
}
function agregarAListaLocal(clave, valor, tope = 300) {
  const lista = leerListaLocal(clave);
  if (!lista.includes(valor)) lista.push(valor);
  localStorage.setItem(clave, JSON.stringify(lista.slice(-tope)));
}

export function esPublicacionPropia(coleccionId, docId) {
  return leerListaLocal(`mis_publicaciones_${coleccionId}`).includes(docId);
}
export function recordarPublicacionPropia(coleccionId, docId) {
  agregarAListaLocal(`mis_publicaciones_${coleccionId}`, docId);
}

export function yaMarcadaComoDesactualizada(coleccionId, docId) {
  return leerListaLocal(`flag_desactualizado_${coleccionId}`).includes(docId);
}
export function recordarMarcaDesactualizada(coleccionId, docId) {
  agregarAListaLocal(`flag_desactualizado_${coleccionId}`, docId);
}
