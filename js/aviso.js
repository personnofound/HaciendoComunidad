// js/aviso.js
//
// Publica los avisos definidos en js/avisos-config.js que estén vigentes
// en este momento (según su día/hora/fecha) en la campanita de
// notificaciones, en vez de un banner propio arriba de la pantalla.
//
import { AVISOS, avisosActivosAhora } from './avisos-config.js';
import { escaparHTML } from './utils.js';
import { publicarNotificacion, retirarNotificacion } from './notificaciones.js';

const MINUTO_MS = 60 * 1000;

function claveDismiss(aviso, ahora) {
  const fecha = ahora.toISOString().slice(0, 10);
  // La clave incluye la fecha de hoy: si lo cierran, no vuelve a molestar
  // el resto del día, pero reaparece solo en la próxima fecha en que el
  // aviso esté programado (ej: el próximo día de pico y placa).
  return `aviso_cerrado_${aviso.id}_${fecha}`;
}

function idNotificacion(aviso) {
  return `aviso-${aviso.id}`;
}

function publicarAvisoEnCampana(aviso) {
  const notifId = idNotificacion(aviso);
  const enlace = aviso.link
    ? `<a class="item-notificacion-btn" href="${escaparHTML(aviso.link)}" target="_blank" rel="noopener noreferrer">${escaparHTML(aviso.textoLink || '🔗 Ver noticia completa')}</a>`
    : '';

  publicarNotificacion({
    id: notifId,
    icono: '📣',
    titulo: escaparHTML(aviso.titulo),
    mensaje: escaparHTML(aviso.mensaje),
    accionHTML: enlace,
    onCerrar: () => localStorage.setItem(claveDismiss(aviso, new Date()), '1')
  });
}

function actualizar() {
  const ahora = new Date();
  const activos = avisosActivosAhora(ahora).filter(
    (aviso) => !localStorage.getItem(claveDismiss(aviso, ahora))
  );
  const idsActivos = new Set(activos.map(idNotificacion));

  activos.forEach(publicarAvisoEnCampana);

  // Si un aviso ya no está vigente (cambió la hora/día), se retira solo
  // de la campanita aunque nadie lo haya cerrado a mano.
  AVISOS.forEach((aviso) => {
    const notifId = idNotificacion(aviso);
    if (!idsActivos.has(notifId)) retirarNotificacion(notifId);
  });
}

export function iniciarAviso() {
  actualizar();
  setInterval(actualizar, MINUTO_MS);
}
