// js/config.js
export const firebaseConfig = {
  apiKey: "AIzaSyDx9QqALGXfGLL74K5qqbfupBqrGOVlr0I",
  authDomain: "haciendo-comunidad-db.firebaseapp.com",
  projectId: "haciendo-comunidad-db",
  storageBucket: "haciendo-comunidad-db.firebasestorage.app",
  messagingSenderId: "1030593110206",
  appId: "1:1030593110206:web:fcd0b0be981d7ebb34feef",
  measurementId: "G-EVKP1YVW2K"
};

export const COLECCIONES = {
  reportes: "reportes_ayuda",
  desaparecidos: "desaparecidos",
  comunidad: "comunidad_servicios"
};

export const TAMANO_PAGINA = 15;

export const UBICACION_POR_DEFECTO = { lat: 3.4516, lng: -76.5320, zoom: 12 };

export const CATEGORIAS_COMUNIDAD = [
  { id: 'agua', etiqueta: 'Agua' },
  { id: 'alimentos', etiqueta: 'Alimentos' },
  { id: 'refugio', etiqueta: 'Refugio / Alojamiento' },
  { id: 'medica', etiqueta: 'Salud / Médica' },
  { id: 'transporte', etiqueta: 'Transporte' },
  { id: 'herramientas', etiqueta: 'Herramientas / Maquinaria' },
  { id: 'voluntariado', etiqueta: 'Voluntariado / Mano de obra' },
  { id: 'ropa', etiqueta: 'Ropa / Abrigo' },
  { id: 'otro', etiqueta: 'Otro' }
];

export const TIPOS_AYUDA = [
  { id: 'medica', etiqueta: 'Médica', color: '#c0392b' },
  { id: 'rescate', etiqueta: 'Atrapados / Rescate', color: '#e05a45' },
  { id: 'agua', etiqueta: 'Agua', color: '#3b82c4' },
  { id: 'alimentos', etiqueta: 'Alimentos', color: '#d9a441' },
  { id: 'refugio', etiqueta: 'Refugio / Techo', color: '#8e6fce' },
  { id: 'otro', etiqueta: 'Otro', color: '#7a8a99' }
];

export const ENFRIAMIENTO_SEGUNDOS = 30;

export const UMBRAL_DESACTUALIZADO = 8;

export const TAMANO_MAX_FOTO_MB = 5;
export const TAMANO_MAX_FOTO_BYTES = TAMANO_MAX_FOTO_MB * 1024 * 1024;
