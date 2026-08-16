// js/avisos-config.js

export const AVISOS = [
  {
    id: 'adres-comunicado-terremoto',
    titulo: '🏥 ADRES: Comunicado de interés para las víctimas del terremoto.',
    mensaje: 'El ADRES reconocerá el pago de indemnizaciones y gastos funerarios para las víctimas mortales de catástrofes y/o eventos naturales. Así como el pago de servicios de salud prestados a las víctimas de estos eventos.',
    link: 'https://share.google/dZMg7HqRKzdlSiVjk',
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