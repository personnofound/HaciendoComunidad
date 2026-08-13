// js/desaparecidos.js
import { crearControladorDatos } from './datos.js';
import { COLECCIONES, UMBRAL_DESACTUALIZADO } from './config.js';
import {
  escaparHTML, limpiarTexto, puedeEnviar, marcarEnviado, tiempoRelativo, linkContacto,
  esPublicacionPropia, recordarPublicacionPropia, yaMarcadaComoDesactualizada, recordarMarcaDesactualizada,
  obtenerUbicacionPorGPS
} from './utils.js';
import { validarFoto, subirFoto } from './fotos.js';
import { usuarioEsCuentaInstitucional, obtenerUsuarioActual } from './auth.js';

const controlador = crearControladorDatos(COLECCIONES.desaparecidos);
const COLECCION_ID = COLECCIONES.desaparecidos;

let modoActivo = 'busco'; // busco | encontre
let filtroTipoSujeto = 'todos'; // todos | persona | mascota
let filtroLocalidad = '';
let mostrarResueltos = false;
let soloMisPublicaciones = false;
let soloVerificados = false;
let itemsActuales = [];

const TEXTOS_MODO = {
  busco: {
    tituloForm: 'Publicar búsqueda',
    tituloLista: 'Publicados recientemente',
    vacio: 'Aún no hay publicaciones en esta categoría.',
    botonResolver: '✅ Marcar como encontrado',
    etiquetaResuelto: '✅ Ya se encontró',
    toggleMostrar: 'Mostrar también los ya encontrados o marcados como desactualizados',
    nombreObligatorio: true
  },
  encontre: {
    tituloForm: 'Publicar hallazgo',
    tituloLista: 'Encontrados recientemente',
    vacio: 'Todavía no hay publicaciones de personas o mascotas encontradas.',
    botonResolver: '✅ Marcar como reclamado',
    etiquetaResuelto: '✅ Ya fue reclamado',
    toggleMostrar: 'Mostrar también los ya reclamados o marcados como desactualizados',
    nombreObligatorio: false
  }
};

function estadoResuelto(item) {
  return item.estado === 'encontrado' || item.estado === 'reclamado';
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

  return `
    <article class="tarjeta ${resuelto ? 'esta-resuelta' : ''} ${item.verificado ? 'verificada' : ''}" data-tipo-sujeto="${escaparHTML(item.tipoSujeto || 'persona')}">
      <div class="fila-top">
        <span class="etiqueta ${esPersona ? 'urgente' : 'info'}">${esPersona ? '🧍 Persona' : '🐾 Mascota'}</span>
        <span class="meta">${tiempoRelativo(item._fecha)}</span>
      </div>
      ${item.verificado ? '<span class="etiqueta verificado">✅ Fuente verificada</span>' : ''}
      ${resuelto ? `<span class="etiqueta resuelto">${textos.etiquetaResuelto}</span>` : ''}
      ${desactualizada ? '<span class="etiqueta alerta">⚠️ Varias personas dicen que esto podría estar desactualizado</span>' : ''}
      ${item.fotoUrl ? `<img class="foto-tarjeta" src="${escaparHTML(item.fotoUrl)}" alt="Foto de ${escaparHTML(item.nombre || 'la publicación')}" loading="lazy">` : ''}
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
    const pasaModo = (it.modo || 'busco') === modoActivo;
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
    vacio.textContent = TEXTOS_MODO[modoActivo].vacio;
  } else {
    vacio.hidden = true;
    cont.insertAdjacentHTML('beforeend', visibles.map(tarjetaHTML).join(''));
  }
}

function actualizarTextosPorModo() {
  const textos = TEXTOS_MODO[modoActivo];
  document.getElementById('titulo-lista-desaparecidos').textContent = textos.tituloLista;
  document.getElementById('toggle-encontrados-desaparecidos-texto').textContent = textos.toggleMostrar;
  document.getElementById('btn-publicar-desaparecidos').textContent = textos.tituloForm;
  const labelNombre = document.getElementById('label-nombre-desaparecido');
  labelNombre.textContent = textos.nombreObligatorio ? 'Nombre (obligatorio)' : 'Nombre (si lo sabes)';
  document.getElementById('nombre-desaparecido').required = textos.nombreObligatorio;
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
        const item = itemsActuales.find((it) => it.id === id);
        const nuevoEstado = item && item.modo === 'encontre' ? 'reclamado' : 'encontrado';
        await controlador.marcarEstado(id, nuevoEstado);
      } else if (accion === 'flagear') {
        await controlador.reportarDesactualizado(id);
        recordarMarcaDesactualizada(COLECCION_ID, id);
      }
    } catch (err) {
      console.error(err);
      boton.disabled = false;
    }
  });

  // --- Pestañas internas Buscando / Encontrados ---
  document.querySelectorAll('#tabs-modo-desaparecidos button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#tabs-modo-desaparecidos button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      modoActivo = btn.dataset.modo;
      actualizarTextosPorModo();
      renderLista(itemsActuales);
    });
  });
  actualizarTextosPorModo();

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

  // document.getElementById('toggle-solo-verificados-desaparecidos').addEventListener('change', (e) => {
  //   soloVerificados = e.target.checked;
  //   renderLista(itemsActuales);
  // });

  document.getElementById('toggle-encontrados-desaparecidos').addEventListener('change', (e) => {
    mostrarResueltos = e.target.checked;
    renderLista(itemsActuales);
  });

  const filaMisPublicaciones = document.getElementById('fila-mis-desaparecidos');
  // const toggleMisPublicaciones = document.getElementById('toggle-mis-desaparecidos');
  // toggleMisPublicaciones.addEventListener('change', (e) => {
  //   soloMisPublicaciones = e.target.checked;
  //   renderLista(itemsActuales);
  // });
  document.addEventListener('auth-cambio', (e) => {
    filaMisPublicaciones.hidden = !e.detail.usuario;
    if (!e.detail.usuario) {
      soloMisPublicaciones = false;
      // toggleMisPublicaciones.checked = false;
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

  const inputFoto = document.getElementById('foto-desaparecido');
  const msgFoto = document.getElementById('msg-foto-desaparecido');
  inputFoto.addEventListener('change', () => {
    const archivo = inputFoto.files[0];
    const resultado = validarFoto(archivo);
    if (!resultado.ok) {
      msgFoto.textContent = resultado.error;
      msgFoto.classList.add('error');
      inputFoto.value = '';
    } else {
      msgFoto.textContent = archivo ? `Foto lista: ${archivo.name}` : '';
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
    const archivo = inputFoto.files[0] || null;

    const textos = TEXTOS_MODO[modoActivo];
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
    const validacionFoto = validarFoto(archivo);
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
      let fotoUrl = '';
      if (archivo) {
        btn.textContent = 'Subiendo foto…';
        fotoUrl = await subirFoto(archivo, 'desaparecidos');
      }
      btn.textContent = 'Publicando…';
      const estadoInicial = modoActivo === 'busco' ? 'buscando' : 'disponible';
      const usuario = obtenerUsuarioActual();
      const ref = await controlador.crearConAutoria(
        {
          modo: modoActivo,
          tipoSujeto,
          nombre,
          descripcion,
          localidad,
          ultimaUbicacion,
          contacto,
          fotoUrl,
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
    } catch (err) {
      console.error(err);
      msg.textContent = 'No se pudo publicar. Revisa tu conexión e intenta de nuevo.';
      msg.classList.add('error');
    } finally {
      btn.disabled = false;
      btn.textContent = TEXTOS_MODO[modoActivo].tituloForm;
    }
  });
}
