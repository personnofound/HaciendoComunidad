// js/desaparecidos.js
import { crearControladorDatos } from './datos.js';
import { COLECCIONES, UMBRAL_DESACTUALIZADO } from './config.js';
import {
  escaparHTML, limpiarTexto, puedeEnviar, marcarEnviado, tiempoRelativo, linkContacto,
  esPublicacionPropia, recordarPublicacionPropia, yaMarcadaComoDesactualizada, recordarMarcaDesactualizada
} from './utils.js';

const controlador = crearControladorDatos(COLECCIONES.desaparecidos);
let filtroActivo = 'todos'; // todos | persona | mascota
let filtroLocalidad = '';
let mostrarEncontrados = false;
let itemsActuales = [];
const COLECCION_ID = COLECCIONES.desaparecidos;

function tarjetaHTML(item) {
  const contacto = item.contacto ? linkContacto(item.contacto) : null;
  const esPersona = item.tipoSujeto === 'persona';
  const encontrado = item.estado === 'encontrado';
  const desactualizada = (item.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
  const esMia = esPublicacionPropia(COLECCION_ID, item.id);
  const yaFlageada = yaMarcadaComoDesactualizada(COLECCION_ID, item.id);

  const acciones = [];
  if (!encontrado && esMia) {
    acciones.push(`<button type="button" class="btn-mini resolver" data-accion="resolver" data-id="${item.id}">✅ Marcar como encontrado</button>`);
  }
  if (!encontrado && !yaFlageada) {
    acciones.push(`<button type="button" class="btn-mini" data-accion="flagear" data-id="${item.id}">🚩 Ya no aplica / desactualizado</button>`);
  }

  return `
    <article class="tarjeta ${encontrado ? 'esta-resuelta' : ''}" data-tipo-sujeto="${escaparHTML(item.tipoSujeto || 'persona')}">
      <div class="fila-top">
        <span class="etiqueta ${esPersona ? 'urgente' : 'info'}">${esPersona ? '🧍 Persona' : '🐾 Mascota'}</span>
        <span class="meta">${tiempoRelativo(item._fecha)}</span>
      </div>
      ${encontrado ? '<span class="etiqueta resuelto">✅ Ya se encontró</span>' : ''}
      ${desactualizada ? '<span class="etiqueta alerta">⚠️ Varias personas dicen que esto podría estar desactualizado</span>' : ''}
      <p><strong>${escaparHTML(item.nombre || 'Sin nombre registrado')}</strong></p>
      <p>${escaparHTML(item.descripcion || '')}</p>
      <div class="meta">
        ${item.localidad ? `<span>🏘️ ${escaparHTML(item.localidad)}</span>` : ''}
        ${item.ultimaUbicacion ? `<span>📍 ${escaparHTML(item.ultimaUbicacion)}</span>` : ''}
        ${contacto && contacto.href
          ? `<a class="contacto" href="${contacto.href}" target="_blank" rel="noopener">📞 ${escaparHTML(contacto.texto)}</a>`
          : contacto && contacto.texto ? `<span>📞 ${escaparHTML(contacto.texto)}</span>` : ''}
      </div>
      ${yaFlageada && !encontrado ? '<p class="nota-flageada">Gracias, ya avisaste que esto podría estar desactualizado.</p>' : ''}
      ${acciones.length ? `<div class="acciones-tarjeta">${acciones.join('')}</div>` : ''}
    </article>`;
}

function itemsFiltrados(items) {
  return items.filter((it) => {
    const pasaTipo = filtroActivo === 'todos' || it.tipoSujeto === filtroActivo;
    const pasaLocalidad = !filtroLocalidad || String(it.localidad || '').toLowerCase().includes(filtroLocalidad);
    const desactualizada = (it.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
    const pasaEstado = mostrarEncontrados || (it.estado !== 'encontrado' && !desactualizada);
    return pasaTipo && pasaLocalidad && pasaEstado;
  });
}

function renderLista(items, { agregar = false } = {}) {
  const cont = document.getElementById('lista-desaparecidos');
  const vacio = document.getElementById('vacio-desaparecidos');
  const visibles = itemsFiltrados(items);
  if (!agregar) cont.innerHTML = '';
  if (visibles.length === 0 && !agregar) {
    vacio.hidden = false;
  } else {
    vacio.hidden = true;
    cont.insertAdjacentHTML('beforeend', visibles.map(tarjetaHTML).join(''));
  }
}

export function iniciarListaYRealtimeDesaparecidos() {
  const avisoCache = document.getElementById('aviso-cache-desaparecidos');
  controlador.escucharRecientes({
    onDatos: ({ items, deCache }) => {
      itemsActuales = items;
      renderLista(items);
      avisoCache.hidden = !deCache;
    },
    onError: () => {
      const vacio = document.getElementById('vacio-desaparecidos');
      vacio.hidden = false;
      vacio.textContent = 'No se pudo cargar la lista. Revisa tu conexión.';
    }
  });

  document.getElementById('lista-desaparecidos').addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const { accion, id } = boton.dataset;
    boton.disabled = true;
    try {
      if (accion === 'resolver') {
        await controlador.marcarEstado(id, 'encontrado');
      } else if (accion === 'flagear') {
        await controlador.reportarDesactualizado(id);
        recordarMarcaDesactualizada(COLECCION_ID, id);
      }
    } catch (err) {
      console.error(err);
      boton.disabled = false;
    }
  });

  document.querySelectorAll('#filtro-desaparecidos button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-desaparecidos button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroActivo = btn.dataset.filtro;
      renderLista(itemsActuales);
    });
  });

  const inputFiltro = document.getElementById('filtro-localidad-desaparecidos');
  const btnLimpiar = document.getElementById('limpiar-filtro-desaparecidos');
  inputFiltro.addEventListener('input', () => {
    filtroLocalidad = inputFiltro.value.trim().toLowerCase();
    btnLimpiar.hidden = !filtroLocalidad;
    renderLista(itemsActuales);
  });
  btnLimpiar.addEventListener('click', () => {
    inputFiltro.value = '';
    filtroLocalidad = '';
    btnLimpiar.hidden = true;
    renderLista(itemsActuales);
  });

  document.getElementById('toggle-encontrados-desaparecidos').addEventListener('change', (e) => {
    mostrarEncontrados = e.target.checked;
    renderLista(itemsActuales);
  });

  document.getElementById('btn-cargar-mas-desaparecidos').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Cargando…';
    const { items, hayMas } = await controlador.cargarSiguientePagina();
    itemsActuales = itemsActuales.concat(items);
    renderLista(items, { agregar: true });
    e.target.disabled = false;
    e.target.textContent = 'Cargar más';
    e.target.hidden = !hayMas;
  });
}

export function iniciarFormularioDesaparecidos() {
  let tipoSujeto = 'persona';
  const chips = document.querySelectorAll('#chips-tipo-sujeto .chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      tipoSujeto = chip.dataset.tipoSujeto;
    });
  });

  const form = document.getElementById('form-desaparecidos');
  const msg = document.getElementById('msg-form-desaparecidos');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'msg-form';

    const nombre = limpiarTexto(document.getElementById('nombre-desaparecido').value, 100);
    const descripcion = limpiarTexto(document.getElementById('descripcion-desaparecido').value, 400);
    const localidad = limpiarTexto(document.getElementById('localidad-desaparecido').value, 100);
    const ultimaUbicacion = limpiarTexto(document.getElementById('ubicacion-desaparecido').value, 150);
    const contacto = limpiarTexto(document.getElementById('contacto-desaparecido').value, 120);

    if (!descripcion) {
      msg.textContent = 'Agrega una descripción (características, ropa, señas, etc).';
      msg.classList.add('error');
      return;
    }
    if (!contacto) {
      msg.textContent = 'Deja un contacto para que puedan avisarte si lo encuentran.';
      msg.classList.add('error');
      return;
    }
    const cooldown = puedeEnviar('desaparecido');
    if (!cooldown.ok) {
      msg.textContent = `Espera ${cooldown.segundosRestantes}s antes de publicar otro reporte.`;
      msg.classList.add('error');
      return;
    }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    try {
      const ref = await controlador.crear({ tipoSujeto, nombre, descripcion, localidad, ultimaUbicacion, contacto, estado: 'buscando' });
      recordarPublicacionPropia(COLECCION_ID, ref.id);
      marcarEnviado('desaparecido');
      msg.textContent = 'Publicado. La comunidad ya puede verlo.';
      msg.classList.add('ok');
      form.reset();
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      document.querySelector('#chips-tipo-sujeto .chip[data-tipo-sujeto="persona"]').setAttribute('aria-pressed', 'true');
      tipoSujeto = 'persona';
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se pudo publicar. Revisa tu conexión e intenta de nuevo.';
      msg.classList.add('error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publicar';
    }
  });
}
