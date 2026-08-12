// js/mapa.js
import { crearControladorDatos } from './datos.js';
import { COLECCIONES, UBICACION_POR_DEFECTO, UMBRAL_DESACTUALIZADO, TIPOS_AYUDA } from './config.js';
import {
  escaparHTML, limpiarTexto, puedeEnviar, marcarEnviado, tiempoRelativo, linkContacto,
  esPublicacionPropia, recordarPublicacionPropia, yaMarcadaComoDesactualizada, recordarMarcaDesactualizada,
  obtenerUbicacionPorGPS, buscarDireccion
} from './utils.js';

export { TIPOS_AYUDA };

const controlador = crearControladorDatos(COLECCIONES.reportes);
const COLECCION_ID = COLECCIONES.reportes;

let mapaLeaflet = null;
let capaMarcadores = null;
let marcadorBusqueda = null;
let ubicacionSeleccionada = null; // {lat, lng}
let tipoSeleccionado = null;
let itemsActuales = [];
let filtroLocalidad = '';
let filtroTipo = 'todos';
let mostrarAtendidos = false;

function colorPorTipo(id) {
  return (TIPOS_AYUDA.find((t) => t.id === id) || TIPOS_AYUDA[TIPOS_AYUDA.length - 1]).color;
}
function etiquetaPorTipo(id) {
  return (TIPOS_AYUDA.find((t) => t.id === id) || { etiqueta: 'Otro' }).etiqueta;
}

export function iniciarMapa({
  centroInicial = [UBICACION_POR_DEFECTO.lat, UBICACION_POR_DEFECTO.lng],
  zoomInicial = UBICACION_POR_DEFECTO.zoom
} = {}) {
  if (mapaLeaflet) return; // ya iniciado

  // Por defecto el mapa abre centrado en Cali. Si el visitante da permiso
  // de ubicación, se recentra automáticamente en su posición real.
  mapaLeaflet = L.map('mapa', { zoomControl: true }).setView(centroInicial, zoomInicial);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(mapaLeaflet);

  capaMarcadores = L.layerGroup().addTo(mapaLeaflet);

  mapaLeaflet.on('click', (e) => {
    ubicacionSeleccionada = { lat: e.latlng.lat, lng: e.latlng.lng };
    abrirModalReporte();
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => mapaLeaflet.setView([pos.coords.latitude, pos.coords.longitude], 14),
      () => {}, // permiso denegado o no disponible: se queda en Cali
      { timeout: 6000 }
    );
  }

  setTimeout(() => mapaLeaflet.invalidateSize(), 300);
}

function pintarMarcadores(items) {
  if (!capaMarcadores) return;
  capaMarcadores.clearLayers();
  items.forEach((item) => {
    if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return;
    const marcador = L.circleMarker([item.lat, item.lng], {
      radius: 9,
      color: '#0f1720',
      weight: 2,
      fillColor: colorPorTipo(item.tipo),
      fillOpacity: 0.9
    });
    const contacto = item.contacto ? linkContacto(item.contacto) : null;
    marcador.bindPopup(`
      <strong>${escaparHTML(etiquetaPorTipo(item.tipo))}</strong><br>
      ${escaparHTML(item.descripcion || '')}<br>
      ${item.localidad ? `<small>🏘️ ${escaparHTML(item.localidad)}</small><br>` : ''}
      <small>${tiempoRelativo(item._fecha)}</small>
      ${contacto && contacto.texto ? `<br><small>Contacto: ${escaparHTML(contacto.texto)}</small>` : ''}
    `);
    marcador.addTo(capaMarcadores);
  });
}

function tarjetaHTML(item) {
  const contacto = item.contacto ? linkContacto(item.contacto) : null;
  const atendido = item.estado === 'atendido';
  const desactualizada = (item.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
  const esMia = esPublicacionPropia(COLECCION_ID, item.id);
  const yaFlageada = yaMarcadaComoDesactualizada(COLECCION_ID, item.id);

  const acciones = [];
  if (!atendido && esMia) {
    acciones.push(`<button type="button" class="btn-mini resolver" data-accion="resolver" data-id="${item.id}">✅ Marcar como atendido</button>`);
  }
  if (!atendido && !yaFlageada) {
    acciones.push(`<button type="button" class="btn-mini" data-accion="flagear" data-id="${item.id}">🚩 Marcar como "Ya no aplica / desactualizado"</button>`);
  }

  return `
    <article class="tarjeta ${atendido ? 'esta-resuelta' : ''}">
      <div class="fila-top">
        <span class="etiqueta urgente">${escaparHTML(etiquetaPorTipo(item.tipo))}</span>
        <span class="meta">${tiempoRelativo(item._fecha)}</span>
      </div>
      ${atendido ? '<span class="etiqueta resuelto">✅ Ya atendido</span>' : ''}
      ${desactualizada ? '<span class="etiqueta alerta">⚠️ Varias personas dicen que esto podría estar desactualizado</span>' : ''}
      <p>${escaparHTML(item.descripcion || '')}</p>
      <div class="meta">
        ${item.localidad ? `<span>🏘️ ${escaparHTML(item.localidad)}</span>` : ''}
        ${typeof item.lat === 'number' ? `<span>📍 ${item.lat.toFixed(4)}, ${item.lng.toFixed(4)}</span>` : ''}
        ${contacto && contacto.href
          ? `<a class="contacto" href="${contacto.href}" target="_blank" rel="noopener">📞 ${escaparHTML(contacto.texto)}</a>`
          : contacto && contacto.texto ? `<span>📞 ${escaparHTML(contacto.texto)}</span>` : ''}
      </div>
      ${yaFlageada && !atendido ? '<p class="nota-flageada">Gracias, ya avisaste que esto podría estar desactualizado.</p>' : ''}
      ${acciones.length ? `<div class="acciones-tarjeta">${acciones.join('')}</div>` : ''}
    </article>`;
}

function coincideLocalidad(item) {
  if (!filtroLocalidad) return true;
  return String(item.localidad || '').toLowerCase().includes(filtroLocalidad);
}
function coincideTipo(item) {
  return filtroTipo === 'todos' || item.tipo === filtroTipo;
}

function itemsVisibles(items) {
  return items.filter((item) => {
    const desactualizada = (item.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
    const pasaEstado = mostrarAtendidos || (item.estado !== 'atendido' && !desactualizada);
    return coincideLocalidad(item) && coincideTipo(item) && pasaEstado;
  });
}

function renderLista(items, { agregar = false } = {}) {
  const cont = document.getElementById('lista-reportes');
  const vacio = document.getElementById('vacio-reportes');
  const visibles = itemsVisibles(items);
  if (!agregar) cont.innerHTML = '';
  if (visibles.length === 0 && !agregar) {
    vacio.hidden = false;
    vacio.textContent = (filtroLocalidad || filtroTipo !== 'todos')
      ? 'No hay reportes que coincidan con ese filtro todavía.'
      : 'Todavía no hay reportes. Sé la primera persona en marcar dónde se necesita ayuda.';
  } else {
    vacio.hidden = true;
    cont.insertAdjacentHTML('beforeend', visibles.map(tarjetaHTML).join(''));
  }
}

function refiltrarTodo() {
  renderLista(itemsActuales);
  pintarMarcadores(itemsVisibles(itemsActuales));
}

export function iniciarListaYRealtime() {
  const avisoCache = document.getElementById('aviso-cache-reportes');
  controlador.escucharRecientes({
    onDatos: ({ items, deCache }) => {
      itemsActuales = items;
      refiltrarTodo();
      avisoCache.hidden = !deCache;
    },
    onError: () => {
      document.getElementById('vacio-reportes').hidden = false;
      document.getElementById('vacio-reportes').textContent =
        'No se pudieron cargar los reportes. Revisa tu conexión.';
    }
  });

  document.getElementById('lista-reportes').addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const { accion, id } = boton.dataset;
    boton.disabled = true;
    try {
      if (accion === 'resolver') {
        await controlador.marcarEstado(id, 'atendido');
      } else if (accion === 'flagear') {
        await controlador.reportarDesactualizado(id);
        recordarMarcaDesactualizada(COLECCION_ID, id);
      }
    } catch (err) {
      console.error(err);
      boton.disabled = false;
    }
  });

  document.getElementById('btn-cargar-mas-reportes').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Cargando…';
    const { items, hayMas } = await controlador.cargarSiguientePagina();
    itemsActuales = itemsActuales.concat(items);
    renderLista(items, { agregar: true });
    pintarMarcadores(itemsVisibles(itemsActuales));
    e.target.disabled = false;
    e.target.textContent = 'Cargar más';
    e.target.hidden = !hayMas;
  });

  // --- Filtro por localidad (texto manual o por GPS) ---
  const inputFiltro = document.getElementById('filtro-localidad-reportes');
  const btnLimpiar = document.getElementById('limpiar-filtro-reportes');
  inputFiltro.addEventListener('input', () => {
    filtroLocalidad = inputFiltro.value.trim().toLowerCase();
    btnLimpiar.hidden = !filtroLocalidad;
    refiltrarTodo();
  });
  btnLimpiar.addEventListener('click', () => {
    inputFiltro.value = '';
    filtroLocalidad = '';
    btnLimpiar.hidden = true;
    refiltrarTodo();
  });

  const btnGPS = document.getElementById('gps-filtro-reportes');
  btnGPS.addEventListener('click', async () => {
    btnGPS.disabled = true;
    const textoOriginal = btnGPS.textContent;
    btnGPS.textContent = '📡 Ubicando…';
    try {
      const ubicacion = await obtenerUbicacionPorGPS();
      const texto = ubicacion.barrio || ubicacion.ciudad || '';
      inputFiltro.value = texto;
      filtroLocalidad = texto.toLowerCase();
      btnLimpiar.hidden = !filtroLocalidad;
      refiltrarTodo();
    } catch (err) {
      console.error(err);
      alert('No se pudo obtener tu ubicación. Revisa los permisos del navegador.');
    } finally {
      btnGPS.disabled = false;
      btnGPS.textContent = textoOriginal;
    }
  });

  // --- Filtro por tipo de ayuda ---
  document.querySelectorAll('#filtro-tipo-reportes button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-tipo-reportes button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroTipo = btn.dataset.filtro;
      refiltrarTodo();
    });
  });

  document.getElementById('toggle-atendidos-reportes').addEventListener('change', (e) => {
    mostrarAtendidos = e.target.checked;
    refiltrarTodo();
  });
}

// ---------- Modal / formulario ----------
function abrirModalReporte() {
  document.getElementById('modal-reporte').hidden = false;
  document.getElementById('coords-reporte').textContent = ubicacionSeleccionada
    ? `📍 ${ubicacionSeleccionada.lat.toFixed(5)}, ${ubicacionSeleccionada.lng.toFixed(5)}`
    : 'Toca el mapa para marcar la ubicación';

  const inputBuscar = document.getElementById('buscar-direccion-reporte');
  const listaResultados = document.getElementById('resultados-direccion');
  if (inputBuscar) inputBuscar.value = '';
  if (listaResultados) {
    listaResultados.hidden = true;
    listaResultados.innerHTML = '';
  }
}
function cerrarModalReporte() {
  document.getElementById('modal-reporte').hidden = true;
  if (marcadorBusqueda && mapaLeaflet) {
    mapaLeaflet.removeLayer(marcadorBusqueda);
    marcadorBusqueda = null;
  }
}

function fijarUbicacionElegida(lat, lng, sufijoTexto = '') {
  ubicacionSeleccionada = { lat, lng };
  document.getElementById('coords-reporte').textContent =
    `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}${sufijoTexto}`;

  if (mapaLeaflet) {
    if (marcadorBusqueda) mapaLeaflet.removeLayer(marcadorBusqueda);
    marcadorBusqueda = L.marker([lat, lng]).addTo(mapaLeaflet);
    mapaLeaflet.setView([lat, lng], 16);
  }
}

export function iniciarFormularioReporte() {
  const chips = document.querySelectorAll('#chips-tipo-ayuda .chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      tipoSeleccionado = chip.dataset.tipo;
    });
  });

  document.getElementById('btn-abrir-reporte-manual').addEventListener('click', () => {
    ubicacionSeleccionada = null;
    abrirModalReporte();
  });
  document.getElementById('btn-usar-mi-ubicacion').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      fijarUbicacionElegida(pos.coords.latitude, pos.coords.longitude, ' (GPS)');
    });
  });

  // --- Buscador de direcciones (para no depender de tocar el mapa) ---
  const inputBuscar = document.getElementById('buscar-direccion-reporte');
  const btnBuscar = document.getElementById('btn-buscar-direccion');
  const listaResultados = document.getElementById('resultados-direccion');

  async function ejecutarBusquedaDireccion() {
    const consulta = inputBuscar.value.trim();
    if (!consulta) return;
    btnBuscar.disabled = true;
    const textoOriginal = btnBuscar.textContent;
    btnBuscar.textContent = '…';
    try {
      const resultados = await buscarDireccion(consulta, {
        cercaDe: { lat: UBICACION_POR_DEFECTO.lat, lng: UBICACION_POR_DEFECTO.lng }
      });

      if (resultados.length === 0) {
        listaResultados.innerHTML = '<li class="sin-resultados">No se encontraron resultados. Prueba con otra dirección o punto de referencia.</li>';
        listaResultados.hidden = false;
        return;
      }

      listaResultados.innerHTML = resultados
        .map((r, i) => `<li><button type="button" data-i="${i}">📍 ${escaparHTML(r.texto)}</button></li>`)
        .join('');
      listaResultados.hidden = false;

      listaResultados.querySelectorAll('button').forEach((btn, i) => {
        btn.addEventListener('click', () => {
          const r = resultados[i];
          fijarUbicacionElegida(r.lat, r.lng);
          listaResultados.hidden = true;
          listaResultados.innerHTML = '';
        });
      });
    } catch (err) {
      console.error(err);
      listaResultados.innerHTML = '<li class="sin-resultados">No se pudo buscar. Revisa tu conexión e intenta de nuevo.</li>';
      listaResultados.hidden = false;
    } finally {
      btnBuscar.disabled = false;
      btnBuscar.textContent = textoOriginal;
    }
  }

  btnBuscar.addEventListener('click', ejecutarBusquedaDireccion);
  inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ejecutarBusquedaDireccion();
    }
  });

  document.getElementById('btn-cerrar-modal-reporte').addEventListener('click', cerrarModalReporte);

  const form = document.getElementById('form-reporte');
  const msg = document.getElementById('msg-form-reporte');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'msg-form';

    if (!ubicacionSeleccionada) {
      msg.textContent = 'Falta marcar la ubicación en el mapa.';
      msg.classList.add('error');
      return;
    }
    if (!tipoSeleccionado) {
      msg.textContent = 'Selecciona qué tipo de ayuda se necesita.';
      msg.classList.add('error');
      return;
    }
    const descripcion = limpiarTexto(document.getElementById('descripcion-reporte').value, 300);
    const localidad = limpiarTexto(document.getElementById('localidad-reporte').value, 100);
    const contacto = limpiarTexto(document.getElementById('contacto-reporte').value, 120);

    if (!descripcion) {
      msg.textContent = 'La descripción es obligatoria.';
      msg.classList.add('error');
      return;
    }
    if (!localidad) {
      msg.textContent = 'La localidad / barrio es obligatoria.';
      msg.classList.add('error');
      return;
    }

    const cooldown = puedeEnviar('reporte');
    if (!cooldown.ok) {
      msg.textContent = `Espera ${cooldown.segundosRestantes}s antes de enviar otro reporte.`;
      msg.classList.add('error');
      return;
    }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    try {
      const ref = await controlador.crear({
        tipo: tipoSeleccionado,
        descripcion,
        localidad,
        contacto,
        lat: ubicacionSeleccionada.lat,
        lng: ubicacionSeleccionada.lng,
        estado: 'activo'
      });
      recordarPublicacionPropia(COLECCION_ID, ref.id);
      marcarEnviado('reporte');
      msg.textContent = 'Reporte enviado. ¡Gracias, aparecerá en el mapa en segundos!';
      msg.classList.add('ok');
      form.reset();
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      tipoSeleccionado = null;
      ubicacionSeleccionada = null;
      setTimeout(cerrarModalReporte, 1200);
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.';
      msg.classList.add('error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar reporte';
    }
  });
}

export function refrescarTamanoMapa() {
  if (mapaLeaflet) setTimeout(() => mapaLeaflet.invalidateSize(), 200);
}
