// js/app.js
import { iniciarMapa, iniciarListaYRealtime, iniciarFormularioReporte, refrescarTamanoMapa } from './mapa.js';
import { iniciarListaYRealtimeDesaparecidos, iniciarFormularioDesaparecidos } from './desaparecidos.js';
import { iniciarListaYRealtimeComunidad, iniciarFormularioComunidad } from './comunidad.js';
import { iniciarAviso } from './aviso.js';
import { iniciarMonitorSismos } from './sismos.js';
import { iniciarSesionGoogle, cerrarSesion, onCambioAuth, usuarioEsCuentaInstitucional } from './auth.js';

// ---------- Pestañas ----------
function iniciarTabs() {
  const botones = document.querySelectorAll('nav.tabs button');
  const vistas = document.querySelectorAll('section.vista');
  botones.forEach((btn) => {
    btn.addEventListener('click', () => {
      botones.forEach((b) => b.classList.remove('active'));
      vistas.forEach((v) => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.vista).classList.add('active');
      if (btn.dataset.vista === 'vista-mapa') refrescarTamanoMapa();
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    });
  });
}

// ---------- Estado de conexión ----------
function iniciarEstadoConexion() {
  const el = document.getElementById('estado-conexion');
  function actualizar() {
    if (navigator.onLine) {
      el.textContent = '🟢 En línea';
      el.className = 'online';
    } else {
      el.textContent = '🔴 Sin conexión — viendo datos guardados';
      el.className = 'offline';
    }
  }
  window.addEventListener('online', actualizar);
  window.addEventListener('offline', actualizar);
  actualizar();
}

function claveDismissInstalar() {
  const hoy = new Date().toISOString().slice(0, 10);
  return `instalar_cerrado_${hoy}`;
}

function iniciarInstalacionPWA() {
  const cont = document.getElementById('contenedor-instalar');
  if (!cont) return;

  let eventoDiferido = null;

  const yaEstaInstalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const yaLoCerroHoy = localStorage.getItem(claveDismissInstalar()) === '1';
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function ocultar() {
    cont.hidden = true;
    cont.innerHTML = '';
  }

  function mostrar({ mensaje, conBoton }) {
    if (yaEstaInstalada || yaLoCerroHoy) return;
    cont.innerHTML = `
      <div class="franja-aviso">
        <span class="franja-aviso-icono" aria-hidden="true">📲</span>
        <div class="franja-aviso-texto">
          <strong>Instala la app</strong>
          <p>${mensaje}</p>
          ${conBoton ? '<button type="button" class="franja-sismo-btn-mapa" id="btn-instalar">Instalar ahora</button>' : ''}
        </div>
        <button type="button" class="btn-cerrar-aviso" id="btn-cerrar-instalar" aria-label="Cerrar aviso de instalación">✕</button>
      </div>`;
    cont.hidden = false;

    document.getElementById('btn-cerrar-instalar').addEventListener('click', () => {
      localStorage.setItem(claveDismissInstalar(), '1');
      ocultar();
    });

    if (conBoton) {
      document.getElementById('btn-instalar').addEventListener('click', async () => {
        if (!eventoDiferido) return;
        eventoDiferido.prompt();
        await eventoDiferido.userChoice;
        eventoDiferido = null;
        ocultar();
      });
    }
  }

  if (!yaEstaInstalada && esIOS) {
    mostrar({
      mensaje: 'Toca el botón Compartir de Safari y elige "Añadir a pantalla de inicio" — así abres la app más rápido, incluso con mala señal.',
      conBoton: false
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoDiferido = e;
    mostrar({
      mensaje: 'Accede más rápido y hasta con mala señal instalando la app en tu teléfono.',
      conBoton: true
    });
  });
}

function registrarServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch((err) => {
        console.warn('No se pudo registrar el service worker:', err);
      });
    });
  }
}

// ---------- Sesión institucional (opcional) ----------
function iniciarPanelAuth() {
  const btnLogin = document.getElementById('btn-login-admin');
  const sesionAdmin = document.getElementById('sesion-admin');
  const emailCorto = document.getElementById('sesion-email-corto');
  const btnLogout = document.getElementById('btn-logout-admin');

  btnLogin.addEventListener('click', async () => {
    btnLogin.disabled = true;
    try {
      await iniciarSesionGoogle();
    } catch (err) {
    } finally {
      btnLogin.disabled = false;
    }
  });

  btnLogout.addEventListener('click', () => cerrarSesion());

  onCambioAuth((usuario) => {
    const esCuentaInstitucional = usuarioEsCuentaInstitucional();
    btnLogin.hidden = !!usuario;
    sesionAdmin.hidden = !usuario;
    if (usuario) {
      emailCorto.textContent = usuario.email;
      emailCorto.title = esCuentaInstitucional
        ? 'Tu correo está en la lista de administradores, tus próximas publicaciones saldrán marcadas como verificadas.'
        : 'Esta cuenta no está autorizada.';
    }
    document.dispatchEvent(new CustomEvent('auth-cambio', { detail: { usuario, esCuentaInstitucional } }));
  });
}

// ---------- Arranque ----------
document.addEventListener('DOMContentLoaded', () => {
  iniciarTabs();
  iniciarEstadoConexion();
  iniciarInstalacionPWA();
  registrarServiceWorker();
  iniciarAviso();
  iniciarPanelAuth();

  iniciarMapa();
  iniciarListaYRealtime();
  iniciarFormularioReporte();
  iniciarMonitorSismos();

  iniciarListaYRealtimeDesaparecidos();
  iniciarFormularioDesaparecidos();

  iniciarListaYRealtimeComunidad();
  iniciarFormularioComunidad();
});
