// js/avisos-config.js

export const AVISOS = [
  {
    id: 'pico-placa-par-cali',
    titulo: '🚗 Pico y placa hoy Cali',
    mensaje: 'Restricción para vehículos con placa terminada en 0, 2, 4, 6, 8, de 6:00am a 7:00pm. Aplica para todo tipo de vehículos (Incluye híbridos y eléctricos).',
    diasSemana: [3, 5],
    horaInicio: '06:00',
    horaFin: '19:00',
    link: 'https://www.elpais.com.co/cali/vuelve-el-pico-y-placa-a-cali-asi-funcionara-nuevo-esquema-para-placas-pares-e-impares-1137.html',
    textoLink: '🔗 Ver el detalle oficial'
  },
  {
    id: 'pico-placa-impar-cali',
    titulo: '🚗 Pico y placa hoy Cali',
    mensaje: 'Restricción para vehículos con placa terminada en 1, 3, 5, 7, 9, de 6:00am a 7:00pm. Aplica para todo tipo de vehículos (Incluye híbridos y eléctricos).',
    diasSemana: [4, 6],
    horaInicio: '06:00',
    horaFin: '19:00',
    link: 'https://www.elpais.com.co/cali/vuelve-el-pico-y-placa-a-cali-asi-funcionara-nuevo-esquema-para-placas-pares-e-impares-1137.html',
    textoLink: '🔗 Ver el detalle oficial'
  },
  {
    id: 'adres-comunicado-terremoto',
    titulo: '🏥 ADRES: Comunicado de interés para las víctimas del terremoto.',
    mensaje: 'El ADRES reconocerá el pago de indemnizaciones y gastos funerarios para las víctimas mortales de catástrofes y/o eventos naturales. Así como el pago de servicios de salud prestados a las víctimas de estos eventos.',
    link: 'https://share.google/dZMg7HqRKzdlSiVjk',
    textoLink: '🔗 Ver el detalle oficial'
  },
  {
    id: 'ventana-terremoto',
    titulo: '🔕 Hoy se cumplen las 72 horas de la ventana de oro.',
    mensaje: 'Las 72 horas son el tiempo más crítico (la "ventana de oro") después de un terremoto para rescatar a personas con vida bajo los escombros. Recuerda hacer silencio para que los rescatistas puedan escuchar a los sobrevivientes.',
    link: 'https://www.infobae.com/colombia/2026/08/12/por-que-son-tan-importantes-las-primeras-72-horas-tras-un-desastre-natural-que-es-la-ventana-de-oro/',
    textoLink: '🔗 Ver el detalle oficial'
  },
  {
    id: 'toque-de-queda',
    titulo: '🚫🏠 Toque de queda.',
    mensaje: 'La Alcaldía de Cali decretó un nuevo toque de queda para la noche de este miércoles 12 de agosto de 2026. La medida rige desde las 9:00 p. m. hasta las 6:00 a. m. del jueves 13 de agosto, como parte de las acciones por el terremoto y la calamidad pública.',
    link: 'https://www.facebook.com/AlcaldiaDeCali/videos/importante-se-decreta-toque-de-queda-hoy-mi%C3%A9rcoles-12-de-agosto-desde-las-900-pm/1741671197169058/',
    textoLink: '🔗 Ver el detalle oficial'
  }
];

function horaAMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function avisosActivosAhora(ahora = new Date()) {
  const diaSemana = ahora.getDay();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
  const fechaHoy = ahora.toISOString().slice(0, 10);

  return AVISOS.filter((aviso) => {
    if (aviso.diasSemana && !aviso.diasSemana.includes(diaSemana)) return false;
    if (aviso.horaInicio && minutosActuales < horaAMinutos(aviso.horaInicio)) return false;
    if (aviso.horaFin && minutosActuales > horaAMinutos(aviso.horaFin)) return false;
    if (aviso.fechaInicio && fechaHoy < aviso.fechaInicio) return false;
    if (aviso.fechaFin && fechaHoy > aviso.fechaFin) return false;
    return true;
  });
}