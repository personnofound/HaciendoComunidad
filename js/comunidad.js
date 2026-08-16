// js/comunidad.js

import { crearControladorDatos } from './datos.js';
import { COLECCIONES, CATEGORIAS_COMUNIDAD, UMBRAL_DESACTUALIZADO, UMBRAL_ALTA_DEMANDA } from './config.js';
import {
  escaparHTML, limpiarTexto, puedeEnviar, marcarEnviado, tiempoRelativo, linkContacto,
  esPublicacionPropia, recordarPublicacionPropia, yaMarcadaComoDesactualizada, recordarMarcaDesactualizada, olvidarMarcaDesactualizada,
  yaReclamoEsto, recordarReclamo, olvidarReclamo, yaConfirmoEntrega, recordarConfirmacionEntrega, olvidarConfirmacionEntrega,
  obtenerUbicacionPorGPS
} from './utils.js';
import { usuarioEsCuentaInstitucional, obtenerUsuarioActual } from './auth.js';

const controlador = crearControladorDatos(COLECCIONES.comunidad);
const COLECCION_ID = COLECCIONES.comunidad;

let itemsActuales = [];
let filtroTipoPublicacion = 'todos'; // todos | peticion | oferta
let filtroCategoria = 'todas';
let filtroZona = '';
let mostrarResueltas = false;
let soloMisPublicaciones = false;
let soloVerificados = false;

function etiquetaCategoria(id) {
  return (CATEGORIAS_COMUNIDAD.find((c) => c.id === id) || { etiqueta: 'Otro' }).etiqueta;
}

function listaItemsHTML(item) {
  if (!Array.isArray(item.items) || item.items.length === 0) return '';
  const filas = item.items
    .map((it) => {
      const texto = escaparHTML(String(it.texto || ''));
      const cantidad = typeof it.cantidad === 'number' && it.cantidad > 0
        ? ` — ${it.cantidad}`
        : ' — Cantidad no especificada';
      return `<li>${texto}${cantidad}</li>`;
    })
    .join('');
  return `<ul class="lista-items-comunidad">${filas}</ul>`;
}

function esLegado(item) {
  return item.numAyudantes === undefined || item.numEntregas === undefined;
}

function estaResuelta(item) {
  if (esLegado(item)) return item.estado === 'cubierto'; // valor viejo, ya no se genera
  return item.estado === 'atendida' || item.estado === 'cancelada';
}

function estadoVisual(item) {
  const esPeticion = item.tipoPublicacion === 'peticion';

  if (esLegado(item)) {
    return { texto: 'ℹ️ Sin información de seguimiento', clase: 'legado' };
  }
  if (item.estado === 'cancelada') {
    return {
      texto: esPeticion ? '🚫 Ya no se necesita' : '🚫 Ya no está disponible',
      clase: 'cancelada'
    };
  }
  if (item.estado === 'atendida') {
    return {
      texto: esPeticion ? '✅ Ayuda entregada' : '✅ Entrega completada',
      clase: 'atendida'
    };
  }
  if (item.numAyudantes === 0) {
    return esPeticion
      ? { texto: '🔴 Urgente — nadie se ha ofrecido todavía', clase: 'urgente' }
      : { texto: '🟢 Disponible', clase: 'disponible' };
  }
  if (item.numAyudantes >= UMBRAL_ALTA_DEMANDA) {
    return esPeticion
      ? { texto: `🟣 Mucha gente ya se ofreció (${item.numAyudantes}) — puedes sumarte si aún hace falta`, clase: 'alta-demanda' }
      : { texto: `🔥 Solicitado muchas veces (${item.numAyudantes}) — podría estarse agotando`, clase: 'alta-demanda' };
  }
  return esPeticion
    ? { texto: `🟡 ${item.numAyudantes} persona${item.numAyudantes === 1 ? '' : 's'} ya se ofreció a ayudar`, clase: 'en-atencion' }
    : { texto: `🟡 ${item.numAyudantes} persona${item.numAyudantes === 1 ? '' : 's'} ya lo solicitó`, clase: 'en-atencion' };
}

function accionesHTML(item) {
  if (esLegado(item) || item.estado !== 'abierta') return '';

  const esPeticion = item.tipoPublicacion === 'peticion';
  const esMia = esPublicacionPropia(COLECCION_ID, item.id);
  const yoReclame = yaReclamoEsto(COLECCION_ID, item.id);
  const yoConfirme = yaConfirmoEntrega(COLECCION_ID, item.id);
  const acciones = [];

  if (esMia) {
    const textoCancelar = esPeticion ? '🚫 Ya no lo necesito' : '🚫 Ya no tengo disponible';
    acciones.push(`<button type="button" class="btn-mini" data-accion="cancelar" data-id="${item.id}">${textoCancelar}</button>`);
    if (item.numAyudantes > 0) {
      const textoConfirmar = esPeticion ? '✅ Confirmar que ya me ayudaron' : '✅ Confirmar entrega completa';
      acciones.push(`<button type="button" class="btn-mini resolver" data-accion="confirmar-atendida" data-id="${item.id}">${textoConfirmar}</button>`);
    }
  } else {
    if (!yoReclame) {
      const textoTomar = esPeticion ? '🙋 Yo me encargo' : '🙋 Necesito esto';
      acciones.push(`<button type="button" class="btn-mini resolver" data-accion="tomar" data-id="${item.id}">${textoTomar}</button>`);
    } else if (!yoConfirme) {
      const textoConfirmar = esPeticion ? '✅ Ya lo entregué' : '✅ Ya me lo dieron';
      acciones.push(`<button type="button" class="btn-mini resolver" data-accion="confirmar-entrega" data-id="${item.id}">${textoConfirmar}</button>`);
    }
  }

  const yaFlageada = yaMarcadaComoDesactualizada(COLECCION_ID, item.id);
  if (!yaFlageada) {
    acciones.push(`<button type="button" class="btn-mini" data-accion="flagear" data-id="${item.id}">🚩 Ya no aplica / desactualizado</button>`);
  }

  return acciones.length ? `<div class="acciones-tarjeta">${acciones.join('')}</div>` : '';
}

function tarjetaHTML(item) {
  const contacto = item.contacto ? linkContacto(item.contacto) : null;
  const esPeticion = item.tipoPublicacion === 'peticion';
  const resuelta = estaResuelta(item);
  const estado = estadoVisual(item);
  const yoReclame = !esLegado(item) && yaReclamoEsto(COLECCION_ID, item.id);
  const yoConfirme = !esLegado(item) && yaConfirmoEntrega(COLECCION_ID, item.id);

  return `
    <article class="tarjeta ${resuelta ? 'esta-resuelta' : ''} ${item.verificado ? 'verificada' : ''}" data-doc-id="${item.id}">
      <div class="fila-top">
        <span class="etiqueta ${esPeticion ? 'peticion' : 'oferta'}">
          ${esPeticion ? '🙋 Necesito' : '🤝 Puedo ofrecer'}
        </span>
        <span class="meta">${tiempoRelativo(item._fecha)}</span>
      </div>
      ${item.verificado ? '<span class="etiqueta verificado">✅ Fuente verificada</span>' : ''}
      <span class="etiqueta ${estado.clase}">${estado.texto}</span>
      <p><strong>${escaparHTML(item.servicio || '')}</strong></p>
      <p>${escaparHTML(item.descripcion || '')}</p>
      ${listaItemsHTML(item)}
      <div class="meta">
        <span class="etiqueta-categoria">${escaparHTML(etiquetaCategoria(item.categoria))}</span>
        ${item.zona ? `<span>🏘️ ${escaparHTML(item.zona)}</span>` : ''}
        ${contacto && contacto.href
          ? `<a class="contacto" href="${contacto.href}" target="_blank" rel="noopener">📞 ${escaparHTML(contacto.texto)}</a>`
          : contacto && contacto.texto ? `<span>📞 ${escaparHTML(contacto.texto)}</span>` : ''}
      </div>
      ${yoReclame && yoConfirme ? '<p class="nota-flageada" style="color:#9fe0ba">Ya confirmaste tu parte, ¡gracias por ayudar!</p>' : ''}
      ${accionesHTML(item)}
    </article>`;
}

function itemsFiltrados(items) {
  return items.filter((it) => {
    const pasaTipo = filtroTipoPublicacion === 'todos' || it.tipoPublicacion === filtroTipoPublicacion;
    const pasaCategoria = filtroCategoria === 'todas' || it.categoria === filtroCategoria;
    const pasaZona = !filtroZona || String(it.zona || '').toLowerCase().includes(filtroZona);
    const desactualizada = (it.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
    const pasaEstado = mostrarResueltas || (!estaResuelta(it) && !desactualizada);
    const usuario = obtenerUsuarioActual();
    const pasaAutor = !soloMisPublicaciones || !!(usuario && it.autorEmail && it.autorEmail === usuario.email);
    const pasaVerificado = !soloVerificados || !!it.verificado;
    return pasaTipo && pasaCategoria && pasaZona && pasaEstado && pasaAutor && pasaVerificado;
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

function reemplazarTarjetaEnDOM(id) {
  const item = itemsActuales.find((it) => it.id === id);
  const nodoViejo = document.querySelector(`#lista-comunidad [data-doc-id="${id}"]`);
  if (!item || !nodoViejo) return;
  const envoltorio = document.createElement('div');
  envoltorio.innerHTML = tarjetaHTML(item).trim();
  nodoViejo.replaceWith(envoltorio.firstElementChild);
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
    const item = itemsActuales.find((it) => it.id === id);

    if (accion === 'cancelar' || accion === 'confirmar-atendida') {
      boton.disabled = true;
      try {
        await controlador.marcarEstado(id, accion === 'cancelar' ? 'cancelada' : 'atendida');
      } catch (err) {
        console.error(err);
        boton.disabled = false;
      }
      return;
    }

    if (accion === 'tomar') {
      recordarReclamo(COLECCION_ID, id);
      if (item) item.numAyudantes = (item.numAyudantes || 0) + 1;
      reemplazarTarjetaEnDOM(id);
      try {
        await controlador.incrementarCampo(id, 'numAyudantes');
      } catch (err) {
        console.error(err);
        olvidarReclamo(COLECCION_ID, id);
        if (item) item.numAyudantes = Math.max(0, (item.numAyudantes || 0) - 1);
        reemplazarTarjetaEnDOM(id);
      }
      return;
    }

    if (accion === 'confirmar-entrega') {
      recordarConfirmacionEntrega(COLECCION_ID, id);
      if (item) item.numEntregas = (item.numEntregas || 0) + 1;
      reemplazarTarjetaEnDOM(id);
      try {
        await controlador.incrementarCampo(id, 'numEntregas');
      } catch (err) {
        console.error(err);
        olvidarConfirmacionEntrega(COLECCION_ID, id);
        if (item) item.numEntregas = Math.max(0, (item.numEntregas || 0) - 1);
        reemplazarTarjetaEnDOM(id);
      }
      return;
    }

    if (accion === 'flagear') {
      recordarMarcaDesactualizada(COLECCION_ID, id);
      reemplazarTarjetaEnDOM(id);
      try {
        await controlador.reportarDesactualizado(id);
      } catch (err) {
        console.error(err);
        olvidarMarcaDesactualizada(COLECCION_ID, id);
        reemplazarTarjetaEnDOM(id);
      }
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

  // const toggleVerificados = document.getElementById('toggle-solo-verificados-comunidad');
  // if (toggleVerificados) {
  //   toggleVerificados.addEventListener('change', (e) => {
  //     soloVerificados = e.target.checked;
  //     renderLista(itemsActuales);
  //   });
  // }

  document.getElementById('toggle-cubiertos-comunidad').addEventListener('change', (e) => {
    mostrarResueltas = e.target.checked;
    renderLista(itemsActuales);
  });

  const filaMisPublicaciones = document.getElementById('fila-mis-comunidad');
  const toggleMisPublicaciones = document.getElementById('toggle-mis-comunidad');
  if (toggleMisPublicaciones) {
    toggleMisPublicaciones.addEventListener('change', (e) => {
      soloMisPublicaciones = e.target.checked;
      renderLista(itemsActuales);
    });
  }
  document.addEventListener('auth-cambio', (e) => {
    if (filaMisPublicaciones) filaMisPublicaciones.hidden = !e.detail.usuario;
    if (!e.detail.usuario) {
      soloMisPublicaciones = false;
      if (toggleMisPublicaciones) toggleMisPublicaciones.checked = false;
      renderLista(itemsActuales);
    }
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

  const MAX_ITEMS = 10;
  const contItems = document.getElementById('items-comunidad');
  const btnAgregarItem = document.getElementById('btn-agregar-item-comunidad');

  function actualizarBotonAgregarItem() {
    const cantidadFilas = contItems.querySelectorAll('.fila-item-comunidad').length;
    btnAgregarItem.hidden = cantidadFilas >= MAX_ITEMS;
  }

  function crearFilaItem() {
    const fila = document.createElement('div');
    fila.className = 'fila-item-comunidad';
    fila.innerHTML = `
      <input type="text" class="item-texto" maxlength="100" placeholder="Ej: Agua embotellada">
      <input type="number" class="item-cantidad" min="0" max="99999" step="1" placeholder="Cant.">
      <button type="button" class="btn-quitar-item" aria-label="Quitar este ítem">✕</button>
    `;
    fila.querySelector('.btn-quitar-item').addEventListener('click', () => {
      fila.remove();
      actualizarBotonAgregarItem();
    });
    return fila;
  }

  function reiniciarFilasItems() {
    contItems.innerHTML = '';
    contItems.appendChild(crearFilaItem());
    actualizarBotonAgregarItem();
  }

  reiniciarFilasItems();

  btnAgregarItem.addEventListener('click', () => {
    contItems.appendChild(crearFilaItem());
    actualizarBotonAgregarItem();
  });

  function leerItems() {
    const filas = Array.from(contItems.querySelectorAll('.fila-item-comunidad'));
    const items = [];
    for (const fila of filas) {
      const texto = limpiarTexto(fila.querySelector('.item-texto').value, 100);
      const cantidadCruda = fila.querySelector('.item-cantidad').value.trim();
      if (!texto && !cantidadCruda) continue; // fila vacía, se ignora
      if (!texto) {
        throw new Error('Cada ítem necesita una descripción (qué es).');
      }
      let cantidad = 0;
      if (cantidadCruda !== '') {
        const numero = Number(cantidadCruda);
        if (!Number.isInteger(numero) || numero < 0 || numero > 99999) {
          throw new Error(`La cantidad de "${texto}" debe ser un número entero de 0 en adelante.`);
        }
        cantidad = numero;
      }
      items.push({ texto, cantidad });
    }
    return items;
  }

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

    let items;
    try {
      items = leerItems();
    } catch (errItems) {
      msg.textContent = errItems.message;
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
      const usuario = obtenerUsuarioActual();
      const ref = await controlador.crearConAutoria(
        {
          tipoPublicacion,
          categoria: categoriaSeleccionada,
          servicio,
          descripcion,
          items,
          zona,
          contacto,
          estado: 'abierta',
          numAyudantes: 0,
          numEntregas: 0
        },
        {
          intentarVerificado: usuarioEsCuentaInstitucional(),
          correoUsuario: usuario ? usuario.email : null
        }
      );
      recordarPublicacionPropia(COLECCION_ID, ref.id);
      marcarEnviado('comunidad');
      msg.textContent = 'Publicado. Gracias por sumarte a la comunidad.';
      msg.classList.add('ok');
      form.reset();
      reiniciarFilasItems();
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
