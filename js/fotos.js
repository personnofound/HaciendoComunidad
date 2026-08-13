// js/fotos.js
import { storage, storageRef, uploadBytes, getDownloadURL } from './firebase-init.js';
import { TAMANO_MAX_FOTO_BYTES, TAMANO_MAX_FOTO_MB } from './config.js';

export const MAX_FOTOS_POR_PUBLICACION = 3;

/**
 * Valida un archivo de imagen elegido en un <input type="file">.
 * Devuelve { ok: true } o { ok: false, error: '...' }.
 */
export function validarFoto(archivo) {
  if (!archivo) return { ok: true }; // la foto es opcional
  if (!archivo.type.startsWith('image/')) {
    return { ok: false, error: 'El archivo debe ser una imagen (JPG, PNG, etc).' };
  }
  if (archivo.size > TAMANO_MAX_FOTO_BYTES) {
    return { ok: false, error: `La foto no puede pesar más de ${TAMANO_MAX_FOTO_MB}MB.` };
  }
  return { ok: true };
}

export function validarFotos(archivos) {
  const lista = Array.from(archivos || []);
  if (lista.length === 0) return { ok: true };
  if (lista.length > MAX_FOTOS_POR_PUBLICACION) {
    return { ok: false, error: `Puedes subir máximo ${MAX_FOTOS_POR_PUBLICACION} fotos.` };
  }
  for (const archivo of lista) {
    const resultado = validarFoto(archivo);
    if (!resultado.ok) return resultado;
  }
  return { ok: true };
}

/**
 * Sube una foto a Storage bajo carpetas/{docId o aleatorio}.ext y devuelve
 * la URL pública de descarga para guardar en el documento de Firestore.
 */
export async function subirFoto(archivo, carpeta) {
  const extension = (archivo.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const nombreArchivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const ref = storageRef(storage, `${carpeta}/${nombreArchivo}`);
  await uploadBytes(ref, archivo, { contentType: archivo.type });
  return getDownloadURL(ref);
}

export async function subirFotos(archivos, carpeta) {
  const lista = Array.from(archivos || []).slice(0, MAX_FOTOS_POR_PUBLICACION);
  const urls = [];
  for (const archivo of lista) {
    urls.push(await subirFoto(archivo, carpeta));
  }
  return urls;
}
