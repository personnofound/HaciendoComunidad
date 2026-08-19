// js/desaparecidos.js
//
// La lista muestra TODO junto (buscando y encontrados, personas y
// mascotas) por defecto — "modo" y "tipo de sujeto" son filtros, no
// pestañas separadas. Publicar una ficha nueva se hace desde un modal;
// adentro del modal sí hay que elegir el modo (Busco / Encontré), porque
// cambia qué campos son obligatorios.
import { crearControladorDatos } from './datos.js';
import { COLECCIONES, UMBRAL_DESACTUALIZADO } from './config.js';
import {
  escaparHTML, limpiarTexto, puedeEnviar, marcarEnviado, tiempoRelativo, linkContacto,
  esPublicacionPropia, recordarPublicacionPropia, yaMarcadaComoDesactualizada, recordarMarcaDesactualizada, olvidarMarcaDesactualizada,
  obtenerUbicacionPorGPS, compartirPublicacion, construirMensajeCompartir, mostrarToast
} from './utils.js';
import { validarFotos, subirFotos } from './fotos.js';
import { usuarioEsCuentaInstitucional, obtenerUsuarioActual } from './auth.js';

const controlador = crearControladorDatos(COLECCIONES.desaparecidos);
const COLECCION_ID = COLECCIONES.desaparecidos;

let filtroModo = 'todos'; // todos | busco | encontre
let filtroTipoSujeto = 'todos'; // todos | persona | mascota
let filtroLocalidad = '';
let mostrarResueltos = false;
let soloMisPublicaciones = false;
let soloVerificados = false;
let itemsActuales = [];

const TEXTOS_MODO = {
  busco: {
    tituloForm: 'Publicar búsqueda',
    botonResolver: '✅ Marcar como encontrado',
    etiquetaBadge: '🔎 Buscando',
    etiquetaResuelto: '✅ Ya se encontró',
    nombreObligatorio: true
  },
  encontre: {
    tituloForm: 'Publicar hallazgo',
    botonResolver: '✅ Marcar como reclamado',
    etiquetaBadge: '✅ Encontrado',
    etiquetaResuelto: '✅ Ya fue reclamado',
    nombreObligatorio: false
  }
};

function estadoResuelto(item) {
  return item.estado === 'encontrado' || item.estado === 'reclamado';
}

function galeriaFotosHTML(item) {
  const urls = Array.isArray(item.fotos) && item.fotos.length ? item.fotos : (item.fotoUrl ? [item.fotoUrl] : []);
  if (urls.length === 0) return '';
  const alt = `Foto de ${item.nombre || 'la publicación'}`;
  if (urls.length === 1) {
    return `<img class="foto-tarjeta" src="${escaparHTML(urls[0])}" alt="${escaparHTML(alt)}" loading="lazy">`;
  }
  return `<div class="galeria-fotos">${urls
    .map((u) => `<img src="${escaparHTML(u)}" alt="${escaparHTML(alt)}" loading="lazy">`)
    .join('')}</div>`;
}

function tarjetaHTML(item) {
  const contacto = item.contacto ? linkContacto(item.contacto) : null;
  const esPersona = item.tipoSujeto === 'persona';
  const textos = TEXTOS_MODO[item.modo] || TEXTOS_MODO.busco;
  const resuelto = estadoResuelto(item);
  const desactualizada = (item.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
  const esMia = esPublicacionPropia(COLECCION_ID, item.id);
  const yaFlageada = yaMarcadaComoDesactualizada(COLECCION_ID, item.id);

  const acciones = [];
  if (!resuelto && esMia) {
    acciones.push(`<button type="button" class="btn-mini resolver" data-accion="resolver" data-id="${item.id}">${textos.botonResolver}</button>`);
  }
  if (!resuelto && !yaFlageada) {
    acciones.push(`<button type="button" class="btn-mini" data-accion="flagear" data-id="${item.id}">🚩 Marcar como "Ya no aplica / desactualizado"</button>`);
  }
  acciones.push(`<button type="button" class="btn-mini" data-accion="compartir" data-id="${item.id}">🔗 Compartir</button>`);

  return `
    <article class="tarjeta ${resuelto ? 'esta-resuelta' : ''} ${item.verificado ? 'verificada' : ''}" data-doc-id="${item.id}" data-tipo-sujeto="${escaparHTML(item.tipoSujeto || 'persona')}">
      <div class="fila-top">
        <span class="etiqueta ${esPersona ? 'urgente' : 'info'}">${esPersona ? '🧍 Persona' : '🐾 Mascota'}</span>
        <span class="meta">${tiempoRelativo(item._fecha)}</span>
      </div>
      <span class="etiqueta ${item.modo === 'encontre' ? 'disponible' : 'en-atencion'}">${textos.etiquetaBadge}</span>
      ${item.verificado ? '<span class="etiqueta verificado">✅ Fuente verificada</span>' : ''}
      ${resuelto ? `<span class="etiqueta resuelto">${textos.etiquetaResuelto}</span>` : ''}
      ${desactualizada ? '<span class="etiqueta alerta">⚠️ Varias personas dicen que esto podría estar desactualizado</span>' : ''}
      ${galeriaFotosHTML(item)}
      <p><strong>${escaparHTML(item.nombre || 'Sin nombre registrado')}</strong></p>
      <p>${escaparHTML(item.descripcion || '')}</p>
      <div class="meta">
        ${item.localidad ? `<span>🏘️ ${escaparHTML(item.localidad)}</span>` : ''}
        ${item.ultimaUbicacion ? `<span>📍 ${escaparHTML(item.ultimaUbicacion)}</span>` : ''}
        ${contacto && contacto.href
          ? `<a class="contacto" href="${contacto.href}" target="_blank" rel="noopener">📞 ${escaparHTML(contacto.texto)}</a>`
          : contacto && contacto.texto ? `<span>📞 ${escaparHTML(contacto.texto)}</span>` : ''}
      </div>
      ${yaFlageada && !resuelto ? '<p class="nota-flageada">Gracias, ya avisaste que esto podría estar desactualizado.</p>' : ''}
      ${acciones.length ? `<div class="acciones-tarjeta">${acciones.join('')}</div>` : ''}
    </article>`;
}

function itemsFiltrados(items) {
  return items.filter((it) => {
    const pasaModo = filtroModo === 'todos' || (it.modo || 'busco') === filtroModo;
    const pasaTipo = filtroTipoSujeto === 'todos' || it.tipoSujeto === filtroTipoSujeto;
    const pasaLocalidad = !filtroLocalidad || String(it.localidad || '').toLowerCase().includes(filtroLocalidad);
    const desactualizada = (it.marcasDesactualizado || 0) >= UMBRAL_DESACTUALIZADO;
    const pasaEstado = mostrarResueltos || (!estadoResuelto(it) && !desactualizada);
    const usuario = obtenerUsuarioActual();
    const pasaAutor = !soloMisPublicaciones || !!(usuario && it.autorEmail && it.autorEmail === usuario.email);
    const pasaVerificado = !soloVerificados || !!it.verificado;
    return pasaModo && pasaTipo && pasaLocalidad && pasaEstado && pasaAutor && pasaVerificado;
  });
}

function renderLista(items, { agregar = false } = {}) {
  const cont = document.getElementById('lista-desaparecidos');
  const vacio = document.getElementById('vacio-desaparecidos');
  const visibles = itemsFiltrados(items);
  if (!agregar) cont.innerHTML = '';
  if (visibles.length === 0 && !agregar) {
    vacio.hidden = false;
    vacio.textContent = 'No hay publicaciones que coincidan con este filtro todavía.';
  } else {
    vacio.hidden = true;
    cont.insertAdjacentHTML('beforeend', visibles.map(tarjetaHTML).join(''));
  }
}

function reemplazarTarjetaEnDOM(id) {
  const item = itemsActuales.find((it) => it.id === id);
  const nodoViejo = document.querySelector(`#lista-desaparecidos [data-doc-id="${id}"]`);
  if (!item || !nodoViejo) return;
  const envoltorio = document.createElement('div');
  envoltorio.innerHTML = tarjetaHTML(item).trim();
  nodoViejo.replaceWith(envoltorio.firstElementChild);
}

let idPendientePorResaltar = null;

function resaltarTarjeta(id, { scroll = true } = {}) {
  document.querySelectorAll('#lista-desaparecidos .tarjeta.seleccionada').forEach((n) => n.classList.remove('seleccionada'));
  const nodo = document.querySelector(`#lista-desaparecidos [data-doc-id="${id}"]`);
  if (!nodo) return false;
  nodo.classList.add('seleccionada');
  if (scroll) nodo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return true;
}

/** Se usa al abrir un enlace directo a una publicación (#desaparecido-id):
 * resetea los filtros para garantizar que sea visible, y la resalta apenas
 * esté disponible (de una si ya cargó, o en el próximo tiempo real). */
export function resaltarDesdeEnlace(id) {
  idPendientePorResaltar = id;
  filtroModo = 'todos';
  filtroTipoSujeto = 'todos';
  filtroLocalidad = '';
  mostrarResueltos = true;
  const inputFiltro = document.getElementById('filtro-localidad-desaparecidos');
  if (inputFiltro) inputFiltro.value = '';
  document.querySelectorAll('#filtro-modo-desaparecidos button, #filtro-desaparecidos button').forEach((b) => b.classList.remove('active'));
  document.querySelectorAll('#filtro-modo-desaparecidos button[data-filtro="todos"], #filtro-desaparecidos button[data-filtro="todos"]').forEach((b) => b.classList.add('active'));
  const toggleResueltos = document.getElementById('toggle-encontrados-desaparecidos');
  if (toggleResueltos) toggleResueltos.checked = true;
  renderLista(itemsActuales);
  if (resaltarTarjeta(id, { scroll: true })) {
    idPendientePorResaltar = null;
  }
}

export function iniciarListaYRealtimeDesaparecidos() {
  const avisoCache = document.getElementById('aviso-cache-desaparecidos');
  controlador.escucharRecientes({
    onDatos: ({ items, deCache }) => {
      itemsActuales = items;
      renderLista(items);
      avisoCache.hidden = !deCache;
      if (idPendientePorResaltar && resaltarTarjeta(idPendientePorResaltar, { scroll: true })) {
        idPendientePorResaltar = null;
      }
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

    if (accion === 'compartir') {
      const item = itemsActuales.find((it) => it.id === id);
      if (!item) return;
      const esPersona = item.tipoSujeto === 'persona';
      const esBusco = item.modo === 'busco';
      const contacto = item.contacto ? linkContacto(item.contacto) : null;
      const url = `${location.origin}${location.pathname}#desaparecido-${id}`;
      const texto = construirMensajeCompartir({
        intro: esBusco
          ? `🔎 Se está buscando a ${esPersona ? 'una persona' : 'una mascota'}.`
          : `✅ Encontraron a ${esPersona ? 'una persona' : 'una mascota'}.`,
        campos: [
          ['Nombre', item.nombre || 'Sin identificar'],
          ['Descripción', item.descripcion],
          ['Última ubicación conocida', item.ultimaUbicacion],
          ['Localidad', item.localidad],
          ['Contacto', contacto ? contacto.texto : '']
        ],
        fecha: item._fecha,
        url
      });
      const resultado = await compartirPublicacion({
        titulo: `${esBusco ? 'Búsqueda' : 'Hallazgo'} — Haciendo Comunidad`,
        texto
      });
      if (resultado.metodo === 'portapapeles') mostrarToast('🔗 Enlace copiado');
      else if (resultado.metodo === 'manual') mostrarToast('📋 Copia el texto del cuadro para compartirlo');
      return;
    }

    if (accion === 'resolver') {
      boton.disabled = true;
      try {
        const item = itemsActuales.find((it) => it.id === id);
        const nuevoEstado = item && item.modo === 'encontre' ? 'reclamado' : 'encontrado';
        await controlador.marcarEstado(id, nuevoEstado);
      } catch (err) {
        console.error(err);
        boton.disabled = false;
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

  // --- Filtro por modo: Todos / Buscando / Encontrados ---
  document.querySelectorAll('#filtro-modo-desaparecidos button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-modo-desaparecidos button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroModo = btn.dataset.filtro;
      renderLista(itemsActuales);
    });
  });

  // --- Filtro por tipo de sujeto: Todos / Personas / Mascotas ---
  document.querySelectorAll('#filtro-desaparecidos button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#filtro-desaparecidos button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      filtroTipoSujeto = btn.dataset.filtro;
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

  const btnGPS = document.getElementById('gps-filtro-desaparecidos');
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
      renderLista(itemsActuales);
    } catch (err) {
      console.error(err);
      alert('No se pudo obtener tu ubicación. Revisa los permisos del navegador.');
    } finally {
      btnGPS.disabled = false;
      btnGPS.textContent = textoOriginal;
    }
  });

  // const toggleVerificados = document.getElementById('toggle-solo-verificados-desaparecidos');
  // if (toggleVerificados) {
  //   toggleVerificados.addEventListener('change', (e) => {
  //     soloVerificados = e.target.checked;
  //     renderLista(itemsActuales);
  //   });
  // }

  document.getElementById('toggle-encontrados-desaparecidos').addEventListener('change', (e) => {
    mostrarResueltos = e.target.checked;
    renderLista(itemsActuales);
  });

  const filaMisPublicaciones = document.getElementById('fila-mis-desaparecidos');
  // const toggleMisPublicaciones = document.getElementById('toggle-mis-desaparecidos');
  // if (toggleMisPublicaciones) {
  //   toggleMisPublicaciones.addEventListener('change', (e) => {
  //     soloMisPublicaciones = e.target.checked;
  //     renderLista(itemsActuales);
  //   });
  // }
  document.addEventListener('auth-cambio', (e) => {
    if (filaMisPublicaciones) filaMisPublicaciones.hidden = !e.detail.usuario;
    if (!e.detail.usuario) {
      soloMisPublicaciones = false;
      renderLista(itemsActuales);
    }
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

  // --- Botón chico "➕ Publicar" que abre el modal ---
  const modal = document.getElementById('modal-desaparecidos');
  document.getElementById('btn-abrir-form-desaparecidos').addEventListener('click', () => {
    modal.hidden = false;
  });
  document.getElementById('btn-cerrar-modal-desaparecidos').addEventListener('click', () => {
    modal.hidden = true;
  });
}

export function iniciarFormularioDesaparecidos() {
  let modoModal = 'busco'; // qué se está publicando AHORA MISMO en el modal
  let tipoSujeto = 'persona';

  function aplicarTextosModoModal() {
    const textos = TEXTOS_MODO[modoModal];
    document.getElementById('btn-publicar-desaparecidos').textContent = textos.tituloForm;
    const labelNombre = document.getElementById('label-nombre-desaparecido');
    labelNombre.textContent = textos.nombreObligatorio ? 'Nombre (obligatorio)' : 'Nombre (si lo sabes)';
    document.getElementById('nombre-desaparecido').required = textos.nombreObligatorio;
  }

  const chipsModo = document.querySelectorAll('#chips-modo-desaparecido .chip');
  chipsModo.forEach((chip) => {
    chip.addEventListener('click', () => {
      chipsModo.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      modoModal = chip.dataset.modo;
      aplicarTextosModoModal();
    });
  });
  aplicarTextosModoModal();

  const chips = document.querySelectorAll('#chips-tipo-sujeto .chip');
  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', 'true');
      tipoSujeto = chip.dataset.tipoSujeto;
    });
  });

  const inputFoto = document.getElementById('foto-desaparecido');
  const msgFoto = document.getElementById('msg-foto-desaparecido');
  inputFoto.addEventListener('change', () => {
    const archivos = inputFoto.files;
    const resultado = validarFotos(archivos);
    if (!resultado.ok) {
      msgFoto.textContent = resultado.error;
      msgFoto.classList.add('error');
      inputFoto.value = '';
    } else {
      msgFoto.textContent = archivos.length
        ? `${archivos.length} foto${archivos.length === 1 ? '' : 's'} lista${archivos.length === 1 ? '' : 's'}: ${Array.from(archivos).map((a) => a.name).join(', ')}`
        : '';
      msgFoto.classList.remove('error');
    }
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
    const archivos = inputFoto.files;

    const textos = TEXTOS_MODO[modoModal];
    if (textos.nombreObligatorio && !nombre) {
      msg.textContent = 'El nombre es obligatorio.';
      msg.classList.add('error');
      return;
    }
    if (!descripcion) {
      msg.textContent = 'Agrega una descripción (características, ropa, señas, etc).';
      msg.classList.add('error');
      return;
    }
    if (!contacto) {
      msg.textContent = 'Deja un contacto para que puedan escribirte.';
      msg.classList.add('error');
      return;
    }
    const validacionFoto = validarFotos(archivos);
    if (!validacionFoto.ok) {
      msg.textContent = validacionFoto.error;
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
    try {
      let fotos = [];
      if (archivos.length) {
        btn.textContent = `Subiendo ${archivos.length} foto${archivos.length === 1 ? '' : 's'}…`;
        fotos = await subirFotos(archivos, 'desaparecidos');
      }
      btn.textContent = 'Publicando…';
      const estadoInicial = modoModal === 'busco' ? 'buscando' : 'disponible';
      const usuario = obtenerUsuarioActual();
      const ref = await controlador.crearConAutoria(
        {
          modo: modoModal,
          tipoSujeto,
          nombre,
          descripcion,
          localidad,
          ultimaUbicacion,
          contacto,
          fotos,
          estado: estadoInicial
        },
        {
          intentarVerificado: usuarioEsCuentaInstitucional(),
          correoUsuario: usuario ? usuario.email : null
        }
      );
      recordarPublicacionPropia(COLECCION_ID, ref.id);
      marcarEnviado('desaparecido');
      msg.textContent = 'Publicado. La comunidad ya puede verlo.';
      msg.classList.add('ok');
      form.reset();
      msgFoto.textContent = '';
      chips.forEach((c) => c.setAttribute('aria-pressed', 'false'));
      document.querySelector('#chips-tipo-sujeto .chip[data-tipo-sujeto="persona"]').setAttribute('aria-pressed', 'true');
      tipoSujeto = 'persona';
      setTimeout(() => {
        document.getElementById('modal-desaparecidos').hidden = true;
      }, 1200);
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se pudo publicar. Revisa tu conexión e intenta de nuevo.';
      msg.classList.add('error');
    } finally {
      btn.disabled = false;
      btn.textContent = TEXTOS_MODO[modoModal].tituloForm;
    }
  });
}
