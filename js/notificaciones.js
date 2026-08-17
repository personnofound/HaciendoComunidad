// js/notificaciones.js
//
// Centraliza TODOS los avisos (sismo, pico y placa / avisos-config, instalar
// la app) en un solo lugar: la campanita 🔔 del header, en vez de banners
// grandes arriba de la pantalla. Así la interfaz queda más limpia y todo
// lo "informativo" vive en un solo sitio predecible.
//
// Cómo lo usan los demás módulos (js/sismos.js, js/aviso.js, js/app.js):
// en vez de pintar su propio banner, llaman a publicarNotificacion({...})
// cada vez que tienen algo que mostrar, y retirarNotificacion(id) cuando
// ya no aplica. Este módulo se encarga de dibujarlo dentro del panel y de
// contar cuántas no se han visto todavía.
//
const notificaciones = new Map(); // id -> objeto de notificación
const CLAVE_VISTOS = 'notif_vistas';

function leerVistos() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_VISTOS) || '[]'));
  } catch (e) {
    return new Set();
  }
}
function guardarVistos(set) {
  localStorage.setItem(CLAVE_VISTOS, JSON.stringify([...set].slice(-200)));
}

let vistos = leerVistos();

function contarNoVistas() {
  let n = 0;
  notificaciones.forEach((item) => {
    if (!vistos.has(item.id)) n += 1;
  });
  return n;
}

function render() {
  const lista = document.getElementById('lista-notificaciones');
  const badge = document.getElementById('badge-notificaciones');
  if (!lista || !badge) return;

  const items = Array.from(notificaciones.values());

  if (items.length === 0) {
    lista.innerHTML = '<p class="panel-notificaciones-vacio">No hay notificaciones por ahora.</p>';
  } else {
    lista.innerHTML = items
      .map(
        (n) => `
        <div class="item-notificacion ${n.clase || ''}" data-id="${n.id}">
          <span class="item-notificacion-icono" aria-hidden="true">${n.icono || '📣'}</span>
          <div class="item-notificacion-texto">
            <strong>${n.titulo}</strong>
            <p>${n.mensaje}</p>
            ${n.accionHTML || ''}
          </div>
          <button type="button" class="item-notificacion-cerrar" data-cerrar="${n.id}" aria-label="Cerrar esta notificación">✕</button>
        </div>`
      )
      .join('');

    lista.querySelectorAll('[data-cerrar]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.cerrar;
        const item = notificaciones.get(id);
        if (item && item.onCerrar) item.onCerrar();
        retirarNotificacion(id);
      });
    });
  }

  const noVistas = contarNoVistas();
  badge.hidden = noVistas === 0;
  badge.textContent = noVistas > 9 ? '9+' : String(noVistas);
}

/**
 * Agrega o actualiza una notificación en la campanita.
 *   id          identificador único y estable (si publicás otra vez con
 *               el mismo id, se actualiza en vez de duplicarse).
 *   icono       emoji para el ícono (opcional, 📣 por defecto).
 *   clase       clase CSS extra para colorear (ej. "sismo-fuerte").
 *   titulo/mensaje  texto de la notificación.
 *   accionHTML  HTML opcional con botones de acción — usa data-accion="x"
 *               y engánchalo vos mismo desde tu propio módulo (ver
 *               ejemplo en js/sismos.js).
 *   onCerrar    función opcional que se ejecuta si la persona la cierra
 *               con la ✕ (para recordar el cierre en localStorage, etc).
 */
export function publicarNotificacion(item) {
  const yaExistia = notificaciones.has(item.id);
  notificaciones.set(item.id, item);
  render();
  return !yaExistia; // true si es nueva (útil para no re-marcar como "vista" algo que ya se había visto)
}

export function retirarNotificacion(id) {
  notificaciones.delete(id);
  render();
}

export function iniciarCampanaNotificaciones() {
  const btn = document.getElementById('btn-campana');
  const panel = document.getElementById('panel-notificaciones');
  const btnCerrar = document.getElementById('btn-cerrar-panel-notificaciones');
  const lista = document.getElementById('lista-notificaciones');
  if (!btn || !panel) return;

  function abrir() {
    panel.hidden = false;
    // Al abrir, se marca todo lo que hay ahora mismo como "visto" —
    // el contador vuelve a subir solo si llega algo nuevo después.
    notificaciones.forEach((_, id) => vistos.add(id));
    guardarVistos(vistos);
    render();
  }
  function cerrar() {
    panel.hidden = true;
  }

  btn.addEventListener('click', () => {
    if (panel.hidden) abrir();
    else cerrar();
  });
  btnCerrar.addEventListener('click', cerrar);

  // Delegación central de clics para las acciones de cada notificación
  // (ej. "Ver en el mapa" del sismo). Cada módulo productor registra su
  // propio manejador con registrarAccionNotificacion().
  lista.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-accion]');
    if (!boton) return;
    const contenedor = boton.closest('[data-id]');
    const id = contenedor && contenedor.dataset.id;
    const manejador = manejadoresAccion.get(`${id}:${boton.dataset.accion}`) || manejadoresAccion.get(`*:${boton.dataset.accion}`);
    if (manejador) manejador(boton, id);
  });

  // Cerrar el panel si se toca afuera.
  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) cerrar();
  });

  render();
}

// Los módulos productores (sismos.js, aviso.js) registran acá qué hacer
// cuando alguien toca un botón con data-accion="..." dentro de SU
// notificación. La clave puede ser "idExacto:accion" (para una
// notificación puntual) o "*:accion" (para cualquier notificación que use
// ese mismo nombre de acción, como los avisos de pico y placa).
const manejadoresAccion = new Map();
export function registrarAccionNotificacion(idONulo, accion, fn) {
  manejadoresAccion.set(`${idONulo || '*'}:${accion}`, fn);
}
