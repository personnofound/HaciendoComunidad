// js/comunidad.js
import { crearControladorDatos } from './datos.js';
import { COLECCIONES, CATEGORIAS_COMUNIDAD, UMBRAL_DESACTUALIZADO } from './config.js';
import {
  escaparHTML, limpiarTexto, puedeEnviar, marcarEnviado, tiempoRelativo, linkContacto,
  esPublicacionPropia, recordarPublicacionPropia, yaMarcadaComoDesactualizada, recordarMarcaDesactualizada,
  obtenerUbicacionPorGPS
} from './utils.js';

const controlador = crearControladorDatos(COLECCIONES.comunidad);
let itemsActuales = [];
let filtroTipoPublicacion = 'todos'; // todos | peticion | oferta
let filtroCategoria = 'todas';
let filtroZona = '';
let mostrarCubiertos = false;
const COLECCION_ID = COLECCIONES.comunidad;

function etiquetaCategoria(id) {
  return (CATEGORIAS_COMUNIDAD.find((c) => c.id === id) || { etiqueta: 'Otro' }).etiqueta;
}

function tarjetaHTML(item) {
  const contacto = item.contacto ? linkContacto(item.contacto) : null;
  const esPeticion = item.tipoPublicacion === 'peticion';
  const cubierto = item.estado === 'cubierto';
  const desactualizada = (item.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
  const esMia = esPublicacionPropia(COLECCION_ID, item.id);
  const yaFlageada = yaMarcadaComoDesactualizada(COLECCION_ID, item.id);

  const acciones = [];
  if (!cubierto && esMia) {
    const texto = esPeticion ? '✅ Marcar como cubierta (ya no necesito)' : '✅ Marcar como completa (ya no tengo más)';
    acciones.push(`<button type="button" class="btn-mini resolver" data-accion="resolver" data-id="${item.id}">${texto}</button>`);
  }
  if (!cubierto && !yaFlageada) {
    acciones.push(`<button type="button" class="btn-mini" data-accion="flagear" data-id="${item.id}">🚩 Ya no aplica / desactualizado</button>`);
  }

  return `
    <article class="tarjeta ${cubierto ? 'esta-resuelta' : ''}">
      <div class="fila-top">
        <span class="etiqueta ${esPeticion ? 'peticion' : 'oferta'}">
          ${esPeticion ? '🙋 Necesito' : '🤝 Puedo ofrecer'}
        </span>
        <span class="meta">${tiempoRelativo(item._fecha)}</span>
      </div>
      ${cubierto ? `<span class="etiqueta resuelto">✅ ${esPeticion ? 'Ya está cubierto' : 'Ya no disponible'}</span>` : ''}
      ${desactualizada ? '<span class="etiqueta alerta">⚠️ Varias personas dicen que esto podría estar desactualizado</span>' : ''}
      <p><strong>${escaparHTML(item.servicio || '')}</strong></p>
      <p>${escaparHTML(item.descripcion || '')}</p>
      <div class="meta">
        <span class="etiqueta-categoria">${escaparHTML(etiquetaCategoria(item.categoria))}</span>
        ${item.zona ? `<span>🏘️ ${escaparHTML(item.zona)}</span>` : ''}
        ${contacto && contacto.href
          ? `<a class="contacto" href="${contacto.href}" target="_blank" rel="noopener">📞 ${escaparHTML(contacto.texto)}</a>`
          : contacto && contacto.texto ? `<span>📞 ${escaparHTML(contacto.texto)}</span>` : ''}
      </div>
      ${yaFlageada && !cubierto ? '<p class="nota-flageada">Gracias, ya avisaste que esto podría estar desactualizado.</p>' : ''}
      ${acciones.length ? `<div class="acciones-tarjeta">${acciones.join('')}</div>` : ''}
    </article>`;
}

function itemsFiltrados(items) {
  return items.filter((it) => {
    const pasaTipo = filtroTipoPublicacion === 'todos' || it.tipoPublicacion === filtroTipoPublicacion;
    const pasaCategoria = filtroCategoria === 'todas' || it.categoria === filtroCategoria;
    const pasaZona = !filtroZona || String(it.zona || '').toLowerCase().includes(filtroZona);
    const desactualizada = (it.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
    const pasaEstado = mostrarCubiertos || (it.estado !== 'cubierto' && !desactualizada);
    return pasaTipo && pasaCategoria && pasaZona && pasaEstado;
  });
}

function renderLista(items, { agregar = false } = {}) {
  const cont = document.getElementById('lista-comunidad');
  const vacio = document.getElementById('vacio-comunidad');
  const visibles = itemsFiltrados(items);
  if (!agregar) cont.innerHTML = '';
  if (visibles.length === 0 && !agregar) {
    vacio.hidden = false;
  } else {
    vacio.hidden = true;
    cont.insertAdjacentHTML('beforeend', visibles.map(tarjetaHTML).join(''));
  }
}

export function iniciarListaYRealtimeComunidad() {
  const avisoCache = document.getElementById('aviso-cache-comunidad');
  controlador.escucharRecientes({
    onDatos: ({ items, deCache }) => {
      itemsActuales = items;
      renderLista(items);
      avisoCache.hidden = !deCache;
    },
    onError: () => {
      const vacio = document.getElementById('vacio-comunidad');
      vacio.hidden = false;
      vacio.textContent = 'No se pudo cargar la lista. Revisa tu conexión.';
    }
  });

  document.getElementById('lista-comunidad').addEventListener('click', async (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const { accion, id } = boton.dataset;
    boton.disabled = true;
    try {
      if (accion === 'resolver') {
        await controlador.marcarEstado(id, 'cubierto');
      } else if (accion === 'flagear') {
        await controlador.reportarDesactualizado(id);
        recordarMarcaDesactualizada(COLECCION_ID, id);
      }
    } catch (err) {
      console.error(err);
      boton.disabled = false;
    }
  });

  document.getElementById('btn-cargar-mas-comunidad').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Cargando…';
    const { items, hayMas } = await controlador.cargarSiguientePagina();
    itemsActuales = itemsActuales.concat(items);
    renderLista(items, { agregar: true });
    e.target.disabled = false;
    e.target.textContent = 'Cargar más';
    e.target.hidden = !hayMas;
  });

  document.querySelectorAll('#filtro-tipo-comunidad button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-tipo-comunidad button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroTipoPublicacion = btn.dataset.filtro;
      renderLista(itemsActuales);
    });
  });

  const selectCategoria = document.getElementById('filtro-categoria-comunidad');
  selectCategoria.addEventListener('change', () => {
    filtroCategoria = selectCategoria.value;
    renderLista(itemsActuales);
  });

  const inputZona = document.getElementById('filtro-zona-comunidad');
  const btnLimpiarZona = document.getElementById('limpiar-filtro-zona-comunidad');
  inputZona.addEventListener('input', () => {
    filtroZona = inputZona.value.trim().toLowerCase();
    btnLimpiarZona.hidden = !filtroZona;
    renderLista(itemsActuales);
  });
  btnLimpiarZona.addEventListener('click', () => {
    inputZona.value = '';
    filtroZona = '';
    btnLimpiarZona.hidden = true;
    renderLista(itemsActuales);
  });

  const btnGPS = document.getElementById('gps-filtro-comunidad');
  btnGPS.addEventListener('click', async () => {
    btnGPS.disabled = true;
    const textoOriginal = btnGPS.textContent;
    btnGPS.textContent = '📡 Ubicando…';
    try {
      const ubicacion = await obtenerUbicacionPorGPS();
      const texto = ubicacion.barrio || ubicacion.ciudad || '';
      inputZona.value = texto;
      filtroZona = texto.toLowerCase();
      btnLimpiarZona.hidden = !filtroZona;
      renderLista(itemsActuales);
    } catch (err) {
      console.error(err);
      alert('No se pudo obtener tu ubicación. Revisa los permisos del navegador.');
    } finally {
      btnGPS.disabled = false;
      btnGPS.textContent = textoOriginal;
    }
  });

  document.getElementById('toggle-cubiertos-comunidad').addEventListener('change', (e) => {
    mostrarCubiertos = e.target.checked;
    renderLista(itemsActuales);
  });
}

export function iniciarFormularioComunidad() {
  const chipsCategoria = document.getElementById('chips-categoria-comunidad');
  chipsCategoria.innerHTML = CATEGORIAS_COMUNIDAD
    .map((c) => `<button type="button" class="chip" data-categoria="${c.id}" aria-pressed="false">${c.etiqueta}</button>`)
    .join('');

  const selectCategoria = document.getElementById('filtro-categoria-comunidad');
  selectCategoria.innerHTML =
    '<option value="todas">Todas las categorías</option>' +
    CATEGORIAS_COMUNIDAD.map((c) => `<option value="${c.id}">${c.etiqueta}</option>`).join('');

  let tipoPublicacion = 'peticion';
  let categoriaSeleccionada = null;

  const chipsTipo = document.querySelectorAll('#chips-tipo-publicacion .chip');
  chipsTipo.forEach((chip) => {
    chip.addEventListener('click', () => {
      chipsTipo.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      tipoPublicacion = chip.dataset.tipoPublicacion;
    });
  });

  const chipsCat = chipsCategoria.querySelectorAll('.chip');
  chipsCat.forEach((chip) => {
    chip.addEventListener('click', () => {
      chipsCat.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      categoriaSeleccionada = chip.dataset.categoria;
    });
  });

  const form = document.getElementById('form-comunidad');
  const msg = document.getElementById('msg-form-comunidad');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = '';
    msg.className = 'msg-form';

    const servicio = limpiarTexto(document.getElementById('servicio-comunidad').value, 100);
    const descripcion = limpiarTexto(document.getElementById('descripcion-comunidad').value, 300);
    const zona = limpiarTexto(document.getElementById('zona-comunidad').value, 120);
    const contacto = limpiarTexto(document.getElementById('contacto-comunidad').value, 120);

    if (!servicio || !contacto) {
      msg.textContent = 'Cuéntanos qué necesitas u ofreces, y deja un contacto.';
      msg.classList.add('error');
      return;
    }
    if (!categoriaSeleccionada) {
      msg.textContent = 'Selecciona una categoría.';
      msg.classList.add('error');
      return;
    }
    const cooldown = puedeEnviar('comunidad');
    if (!cooldown.ok) {
      msg.textContent = `Espera ${cooldown.segundosRestantes}s antes de publicar otra vez.`;
      msg.classList.add('error');
      return;
    }

    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    btn.textContent = 'Publicando…';
    try {
      const ref = await controlador.crear({
        tipoPublicacion,
        categoria: categoriaSeleccionada,
        servicio,
        descripcion,
        zona,
        contacto,
        estado: 'abierto'
      });
      recordarPublicacionPropia(COLECCION_ID, ref.id);
      marcarEnviado('comunidad');
      msg.textContent = 'Publicado. Gracias por sumarte a la comunidad.';
      msg.classList.add('ok');
      form.reset();
      chipsCat.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      categoriaSeleccionada = null;
      chipsTipo.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      document.querySelector('#chips-tipo-publicacion .chip[data-tipo-publicacion="peticion"]').setAttribute('aria-pressed', 'true');
      tipoPublicacion = 'peticion';
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
