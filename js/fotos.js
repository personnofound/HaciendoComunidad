// js/fotos.js
import { storage, storageRef, uploadBytes, getDownloadURL } from './firebase-init.js';
import { TAMANO_MAX_FOTO_BYTES, TAMANO_MAX_FOTO_MB } from './config.js';

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
