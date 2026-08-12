// js/aviso.js

import { AVISOS, avisosActivosAhora } from './avisos-config.js';
import { escaparHTML } from './utils.js';

const MINUTO_MS = 60 * 1000;

function claveDismiss(aviso, ahora) {
  const fecha = ahora.toISOString().slice(0, 10);
  return `aviso_cerrado_${aviso.id}_${fecha}`;
}

function avisoHTML(aviso) {
  const enlace = aviso.link
    ? `<a class="franja-aviso-link" href="${escaparHTML(aviso.link)}" target="_blank" rel="noopener noreferrer">${escaparHTML(aviso.textoLink || '🔗 Ver noticia completa')}</a>`
    : '';
  return `
    <div class="franja-aviso" data-id="${escaparHTML(aviso.id)}">
      <span class="franja-aviso-icono" aria-hidden="true">📣</span>
      <div class="franja-aviso-texto">
        <strong>${escaparHTML(aviso.titulo)}</strong>
        <p>${escaparHTML(aviso.mensaje)}</p>
        ${enlace}
      </div>
      <button type="button" class="btn-cerrar-aviso" aria-label="Cerrar aviso">✕</button>
    </div>`;
}

function render() {
  const cont = document.getElementById('contenedor-avisos');
  if (!cont) return;

  const ahora = new Date();
  const activos = avisosActivosAhora(ahora).filter(
    (aviso) => !localStorage.getItem(claveDismiss(aviso, ahora))
  );

  if (activos.length === 0) {
    cont.innerHTML = '';
    cont.hidden = true;
    return;
  }

  cont.hidden = false;
  cont.innerHTML = activos.map(avisoHTML).join('');
}

export function iniciarAviso() {
  const cont = document.getElementById('contenedor-avisos');
  if (!cont) return;

  render();

  cont.addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-cerrar-aviso');
    if (!boton) return;
    const caja = boton.closest('.franja-aviso');
    const id = caja.dataset.id;
    const aviso = AVISOS.find((a) => a.id === id);
    if (aviso) {
      localStorage.setItem(claveDismiss(aviso, new Date()), '1');
    }
    caja.remove();
    if (!cont.querySelector('.franja-aviso')) cont.hidden = true;
  });

  setInterval(render, MINUTO_MS);
}