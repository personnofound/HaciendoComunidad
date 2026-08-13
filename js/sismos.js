// js/sismos.js

import { obtenerNombreLugar, tiempoRelativo, escaparHTML } from './utils.js';
import { marcarSismoEnMapa, irAVistaMapa } from './mapa.js';

const MAGNITUD_MINIMA = 4.0;
const REVISAR_CADA_MS = 5 * 60 * 1000;

const BBOX_COLOMBIA = { minLat: -4.2, maxLat: 12.5, minLng: -79.0, maxLng: -66.8 };

function urlEMSC() {
  const params = new URLSearchParams({
    format: 'json',
    limit: '10',
    orderby: 'time',
    minmagnitude: String(MAGNITUD_MINIMA),
    minlatitude: String(BBOX_COLOMBIA.minLat),
    maxlatitude: String(BBOX_COLOMBIA.maxLat),
    minlongitude: String(BBOX_COLOMBIA.minLng),
    maxlongitude: String(BBOX_COLOMBIA.maxLng)
  });
  return `https://www.seismicportal.eu/fdsnws/event/1/query?${params}`;
}

async function obtenerUltimoSismoRelevante() {
  const respuesta = await fetch(urlEMSC());
  if (!respuesta.ok) throw new Error('No se pudo consultar el servicio de sismos.');
  const datos = await respuesta.json();
  const eventos = datos.features || [];
  if (eventos.length === 0) return null;

  const delSGC = eventos.find((e) => (e.properties.auth || '').toUpperCase() === 'SGC');
  const elegido = delSGC || eventos[0];
  const p = elegido.properties;

  return {
    id: elegido.id || `${p.time}-${p.mag}`,
    mag: p.mag,
    depth: p.depth,
    lat: p.lat,
    lng: p.lon,
    fecha: new Date(p.time),
    agencia: p.auth || 'Red sísmica internacional',
    lugarBase: p.flynn_region || ''
  };
}

function claveDismiss(idSismo) {
  return `sismo_cerrado_${idSismo}`;
}

function formatearFechaSismo(fecha) {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Bogota'
  }).format(fecha);
}

function construirPopupHTML(sismo, nombreLugar) {
  return `
    <strong>🌐 Sismo Mag.${sismo.mag.toFixed(1)}</strong><br>
    ${escaparHTML(nombreLugar)}<br>
    <small>Profundidad: ${sismo.depth} km · ${formatearFechaSismo(sismo.fecha)}</small><br>
    <small>Fuente: ${escaparHTML(sismo.agencia)}</small>
  `;
}

function renderBanner(sismo, nombreLugar) {
  const cont = document.getElementById('contenedor-sismo');
  if (!cont) return;

  const esFuerte = sismo.mag >= 5.0;

  cont.innerHTML = `
    <div class="franja-sismo ${esFuerte ? 'sismo-fuerte' : 'sismo-moderado'}">
      <span class="franja-sismo-icono" aria-hidden="true">🌐</span>
      <div class="franja-sismo-texto">
        <strong>Sismo Mag.${sismo.mag.toFixed(1)} · ${escaparHTML(nombreLugar)}</strong>
        <p>
          Profundidad ${sismo.depth} km · ${formatearFechaSismo(sismo.fecha)} ·
          Fuente: <a class="franja-aviso-link" href="https://sgc.gov.co/sismos" target="_blank" rel="noopener noreferrer">${escaparHTML(sismo.agencia)}</a>
        </p>
        <button type="button" class="franja-sismo-btn-mapa" id="btn-ver-sismo-mapa">📍 Ver en el mapa</button>
      </div>
      <button type="button" class="btn-cerrar-aviso" id="btn-cerrar-sismo" aria-label="Cerrar aviso de sismo">✕</button>
    </div>`;
  cont.hidden = false;

  document.getElementById('btn-ver-sismo-mapa').addEventListener('click', () => {
    irAVistaMapa();
    marcarSismoEnMapa({
      lat: sismo.lat,
      lng: sismo.lng,
      popupHtml: construirPopupHTML(sismo, nombreLugar),
      zoom: 9
    });
  });

  document.getElementById('btn-cerrar-sismo').addEventListener('click', () => {
    localStorage.setItem(claveDismiss(sismo.id), '1');
    cont.hidden = true;
    cont.innerHTML = '';
  });
}

async function revisarSismos() {
  try {
    const sismo = await obtenerUltimoSismoRelevante();
    if (!sismo) return;
    if (localStorage.getItem(claveDismiss(sismo.id))) return;

    let nombreLugar = sismo.lugarBase;
    try {
      nombreLugar = await obtenerNombreLugar(sismo.lat, sismo.lng);
    } catch (e) {
    }

    renderBanner(sismo, nombreLugar || 'Colombia');
  } catch (error) {
    console.warn('No se pudo revisar el monitor de sismos:', error);
  }
}

export function iniciarMonitorSismos() {
  revisarSismos();
  setInterval(revisarSismos, REVISAR_CADA_MS);
}
