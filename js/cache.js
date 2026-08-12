// js/cache.js
//
// Guarda en localStorage la última "foto" de cada colección para que,
// al abrir la app (o si no hay red), el usuario vea datos de inmediato
// en vez de una pantalla en blanco. Firestore igual mantiene su propia
// caché offline (IndexedDB) para las escrituras pendientes; esto es una
// capa adicional pensada para pintar la UI al instante.

const PREFIJO = 'cache_datos_';
const VERSION = 'v1';

export function guardarEnCache(coleccion, items) {
  try {
    const paquete = { v: VERSION, guardadoEn: Date.now(), items };
    localStorage.setItem(PREFIJO + coleccion, JSON.stringify(paquete));
  } catch (e) {
    // localStorage lleno o no disponible: no es crítico, seguimos sin caché
    console.warn('No se pudo guardar caché local:', e);
  }
}

export function leerDeCache(coleccion) {
  try {
    const crudo = localStorage.getItem(PREFIJO + coleccion);
    if (!crudo) return null;
    const paquete = JSON.parse(crudo);
    if (paquete.v !== VERSION) return null;

    // JSON.parse deja _fecha como texto (string), no como objeto Date.
    // Lo reconstruimos acá para que el resto de la app pueda usar
    // .getTime() y demás métodos de Date sin fallar.
    paquete.items = (paquete.items || []).map((item) => ({
      ...item,
      _fecha: item._fecha ? new Date(item._fecha) : new Date()
    }));

    return paquete;
  } catch (e) {
    return null;
  }
}
