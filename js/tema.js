// js/tema.js
//
// Interruptor de modo claro/oscuro dentro del panel de notificaciones.
// Oscuro es el que ya existía y sigue siendo el de por defecto — el modo
// claro es 100% opcional y se recuerda por dispositivo (localStorage).
//
const CLAVE_TEMA = 'tema_preferido'; // 'claro' | 'oscuro' (oscuro = no se guarda nada, es el default)

export function iniciarTema() {
  const toggle = document.getElementById('toggle-tema-claro');
  if (!toggle) return;

  const guardado = localStorage.getItem(CLAVE_TEMA);
  const esClaro = guardado === 'claro';
  document.body.classList.toggle('tema-claro', esClaro);
  toggle.checked = esClaro;

  toggle.addEventListener('change', () => {
    const claro = toggle.checked;
    document.body.classList.toggle('tema-claro', claro);
    localStorage.setItem(CLAVE_TEMA, claro ? 'claro' : 'oscuro');
  });
}
