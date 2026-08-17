// js/tutorial.js
//
// Un tutorial cortito de 3 pasos que solo aparece la PRIMERA VEZ que
// alguien abre la app en este dispositivo (se guarda en localStorage).
// Nada de esto es obligatorio: se puede saltar en cualquier momento.
//
const CLAVE_VISTO = 'tutorial_visto';

const PASOS = [
  {
    icono: '👋',
    titulo: 'Bienvenido a Haciendo Comunidad',
    texto: 'Aquí puedes pedir ayuda, ofrecer ayuda, o avisar sobre personas y mascotas desaparecidas. Todo en tiempo real, sin necesidad de registrarte.'
  },
  {
    icono: '🙋',
    titulo: '¿Necesitas algo o puedes ayudar?',
    texto: 'Ve a "Necesito / Ofrezco ayuda", toca "➕ Agregar ayuda" y cuéntanos qué pasa. Si alguien más ya publicó algo, toca "Yo me encargo" para avisar que tú vas a ayudar.'
  },
  {
    icono: '🗺️',
    titulo: 'Mira el mapa',
    texto: 'En "Mapa de puntos críticos" puedes ver dónde se necesita ayuda cerca de ti, y tocar cualquier punto del mapa para reportar algo nuevo.'
  },
  {
    icono: '🔎',
    titulo: 'Busca o reporta personas desaparecidas',
    texto: 'En "Desaparecidos" puedes avisar con "➕ Publicar" si estás buscando o encontraste a alguna persona o mascota. Intenta subir una foto para que la reconozcan fácilmente.'
  }
];

let pasoActual = 0;

function render() {
  const cont = document.getElementById('modal-tutorial');
  if (!cont) return;
  const paso = PASOS[pasoActual];
  const esUltimo = pasoActual === PASOS.length - 1;

  cont.querySelector('.tutorial-icono').textContent = paso.icono;
  cont.querySelector('.tutorial-titulo').textContent = paso.titulo;
  cont.querySelector('.tutorial-texto').textContent = paso.texto;
  cont.querySelector('.tutorial-puntos').innerHTML = PASOS
    .map((_, i) => `<span class="tutorial-punto ${i === pasoActual ? 'activo' : ''}"></span>`)
    .join('');

  const btnAnterior = cont.querySelector('#btn-tutorial-anterior');
  const btnSiguiente = cont.querySelector('#btn-tutorial-siguiente');
  btnAnterior.hidden = pasoActual === 0;
  btnSiguiente.textContent = esUltimo ? '¡Listo, entendido!' : 'Siguiente';
}

function cerrarTutorial() {
  const cont = document.getElementById('modal-tutorial');
  if (cont) cont.hidden = true;
  localStorage.setItem(CLAVE_VISTO, '1');
}

export function iniciarTutorial() {
  const cont = document.getElementById('modal-tutorial');
  if (!cont) return;

  if (localStorage.getItem(CLAVE_VISTO) === '1') return; // ya lo vio antes

  pasoActual = 0;
  render();
  cont.hidden = false;

  cont.querySelector('#btn-tutorial-saltar').addEventListener('click', cerrarTutorial);
  cont.querySelector('#btn-tutorial-anterior').addEventListener('click', () => {
    if (pasoActual > 0) {
      pasoActual -= 1;
      render();
    }
  });
  cont.querySelector('#btn-tutorial-siguiente').addEventListener('click', () => {
    if (pasoActual < PASOS.length - 1) {
      pasoActual += 1;
      render();
    } else {
      cerrarTutorial();
    }
  });
}
