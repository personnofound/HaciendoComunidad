// js/app.js
import { iniciarMapa, iniciarListaYRealtime, iniciarFormularioReporte, refrescarTamanoMapa } from './mapa.js';
import { iniciarListaYRealtimeDesaparecidos, iniciarFormularioDesaparecidos } from './desaparecidos.js';
import { iniciarListaYRealtimeComunidad, iniciarFormularioComunidad } from './comunidad.js';
import { iniciarAviso } from './aviso.js';

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

// ---------- Instalar como app (PWA) ----------
function iniciarInstalacionPWA() {
  const franja = document.getElementById('franja-instalar');
  const btnInstalar = document.getElementById('btn-instalar');
  const btnCerrar = document.getElementById('btn-cerrar-instalar');
  let eventoDiferido = null;

  const yaEstaInstalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const yaLoCerro = localStorage.getItem('instalar_cerrado') === '1';
  const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (yaEstaInstalada || yaLoCerro) {
    franja.hidden = true;
  } else if (esIOS) {
    document.getElementById('texto-instalar').textContent =
      'Instala esta app: toca el botón Compartir de Safari y elige "Añadir a pantalla de inicio".';
    btnInstalar.hidden = true;
    franja.hidden = false;
  } else {
    franja.hidden = true; // se muestra solo si el navegador dispara beforeinstallprompt
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    eventoDiferido = e;
    if (!yaLoCerro) franja.hidden = false;
  });

  btnInstalar.addEventListener('click', async () => {
    if (!eventoDiferido) return;
    eventoDiferido.prompt();
    await eventoDiferido.userChoice;
    eventoDiferido = null;
    franja.hidden = true;
  });

  btnCerrar.addEventListener('click', () => {
    franja.hidden = true;
    localStorage.setItem('instalar_cerrado', '1');
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

// ---------- Arranque ----------
document.addEventListener('DOMContentLoaded', () => {
  iniciarTabs();
  iniciarEstadoConexion();
  iniciarInstalacionPWA();
  registrarServiceWorker();
  iniciarAviso();

  iniciarMapa();
  iniciarListaYRealtime();
  iniciarFormularioReporte();

  iniciarListaYRealtimeDesaparecidos();
  iniciarFormularioDesaparecidos();

  iniciarListaYRealtimeComunidad();
  iniciarFormularioComunidad();
});
