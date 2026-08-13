// js/datos.js
//
// Capa de acceso a Firestore reutilizada por las 3 secciones (mapa de
// ayuda, desaparecidos, comunidad). Centraliza el patrón:
//   - escucha en tiempo real de los N documentos más recientes
//   - "cargar más" paginado (sin listener, para no gastar cuota) ordenado
//     por los más recientes
//   - creación de documentos con timestamp forzado por el servidor
//   - actualización acotada: solo "estado", "marcasDesactualizado" o
//     "reportesAbuso" (todo esto validado también del lado del servidor
//     en firestore.rules, no solo aquí)
//
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { db } from './firebase-init.js';
import { TAMANO_PAGINA } from './config.js';
import { guardarEnCache, leerDeCache } from './cache.js';

/**
 * Crea un controlador de datos para una colección de Firestore.
 * @param {string} nombreColeccion
 */
export function crearControladorDatos(nombreColeccion) {
  let ultimoDocVisible = null;
  let hayMasParaCargar = true;
  let desuscribir = null;

  const ref = collection(db, nombreColeccion);

  function docASimple(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      _fecha: data.timestamp && data.timestamp.toDate ? data.timestamp.toDate() : new Date()
    };
  }

  /**
   * Escucha en tiempo real la ventana más reciente (primeros N documentos).
   * Se usa para que el feed y el mapa se actualicen solos cuando llega
   * un reporte nuevo, sin recargar la página.
   */
  function escucharRecientes({ onDatos, onError }) {
    // Pinta de inmediato lo último que quedó guardado en caché local,
    // así el usuario ve algo aunque la red tarde en responder.
    const cache = leerDeCache(nombreColeccion);
    if (cache && cache.items && cache.items.length) {
      onDatos({ items: cache.items, deCache: true });
    }

    const q = query(ref, orderBy('timestamp', 'desc'), limit(TAMANO_PAGINA));
    desuscribir = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(docASimple);
        if (items.length) {
          ultimoDocVisible = snapshot.docs[snapshot.docs.length - 1];
        }
        hayMasParaCargar = items.length === TAMANO_PAGINA;
        guardarEnCache(nombreColeccion, items);
        onDatos({ items, deCache: false });
      },
      (error) => {
        console.error(`Error escuchando ${nombreColeccion}:`, error);
        if (onError) onError(error);
      }
    );
  }

  function detenerEscucha() {
    if (desuscribir) desuscribir();
    desuscribir = null;
  }

  /**
   * Trae el siguiente bloque de resultados más antiguos (paginación).
   * Es una lectura única (no realtime) para no multiplicar listeners
   * activos ni gastar cuota de más.
   */
  async function cargarSiguientePagina() {
    if (!ultimoDocVisible || !hayMasParaCargar) return { items: [], hayMas: false };
    const q = query(ref, orderBy('timestamp', 'desc'), startAfter(ultimoDocVisible), limit(TAMANO_PAGINA));
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(docASimple);
    if (items.length) {
      ultimoDocVisible = snapshot.docs[snapshot.docs.length - 1];
    }
    hayMasParaCargar = items.length === TAMANO_PAGINA;
    return { items, hayMas: hayMasParaCargar };
  }

  async function crear(datos) {
    return addDoc(ref, {
      ...datos,
      timestamp: serverTimestamp(), // el servidor fija la hora real; las reglas exigen esto
      reportesAbuso: 0,
      marcasDesactualizado: 0
    });
  }

  async function crearConAutoria(datosBase, { intentarVerificado, correoUsuario }) {
    if (intentarVerificado && correoUsuario) {
      try {
        return await crear({ ...datosBase, verificado: true, autorEmail: correoUsuario });
      } catch (err) {
        console.warn('No se pudo publicar como verificado (¿correo fuera de la whitelist?), reintentando sin verificar.', err);
      }
    }
    return crear({ ...datosBase, verificado: false, autorEmail: null });
  }

  /**
   * Cambia el campo "estado" de un documento (ej. activo → atendido,
   * buscando → encontrado, abierto → cubierto). Las reglas de Firestore
   * solo permiten avanzar en ese sentido y no tocar ningún otro campo.
   */
  async function marcarEstado(id, nuevoEstado) {
    return updateDoc(doc(db, nombreColeccion, id), { estado: nuevoEstado });
  }

  /**
   * Suma un "voto" de que esta publicación parece desactualizada o falsa.
   * Las reglas solo permiten subir este contador de a 1 y no tocar nada más.
   */
  async function reportarDesactualizado(id) {
    return updateDoc(doc(db, nombreColeccion, id), { marcasDesactualizado: increment(1) });
  }

  /**
   * Suma un "voto" de que esta publicación es abusiva/spam. Igual que el
   * anterior: las reglas solo permiten subir este contador de a 1. No hay
   * un botón para esto en la interfaz todavía; queda listo por si más
   * adelante quieres agregarlo.
   */
  async function reportarAbuso(id) {
    return updateDoc(doc(db, nombreColeccion, id), { reportesAbuso: increment(1) });
  }

  return {
    escucharRecientes,
    detenerEscucha,
    cargarSiguientePagina,
    crear,
    crearConAutoria,
    marcarEstado,
    reportarDesactualizado,
    reportarAbuso
  };
}
