/* =========================================================
   CONFIGURACIÓN DEL NEGOCIO — edita solo este archivo
   ========================================================= */
window.CONFIG = {
  negocio: "Detailing Pro",
  eslogan: "Cuidamos tu auto como si fuera nuestro",
  direccion: "Tu dirección, Ciudad",
  instagram: "",                // ej: "detailingpro" (sin @). Vacío = se oculta

  // Número de WhatsApp que recibe las reservas: código país + número, sin "+" ni espacios
  whatsapp: "56900000000",

  moneda: "CLP",
  locale: "es-CL",

  // Horario de atención. 0 = domingo, 1 = lunes ... 6 = sábado. null = cerrado
  horario: {
    0: null,
    1: { abre: "09:00", cierra: "19:00" },
    2: { abre: "09:00", cierra: "19:00" },
    3: { abre: "09:00", cierra: "19:00" },
    4: { abre: "09:00", cierra: "19:00" },
    5: { abre: "09:00", cierra: "19:00" },
    6: { abre: "10:00", cierra: "14:00" },
  },

  intervaloMin: 60,      // cada cuántos minutos se ofrece una hora
  diasAnticipacion: 30,  // hasta cuántos días hacia adelante se puede reservar
  minHorasAviso: 2,      // no permitir reservas con menos de X horas de aviso

  // Días cerrados puntuales (feriados, vacaciones) en formato AAAA-MM-DD
  diasBloqueados: ["2026-12-25", "2027-01-01"],

  // Tamaño del vehículo: multiplica el precio del servicio
  vehiculos: [
    { id: "auto", nombre: "Auto / Hatchback", icono: "🚗", factor: 1 },
    { id: "suv", nombre: "SUV / Station", icono: "🚙", factor: 1.2 },
    { id: "camioneta", nombre: "Camioneta / Van", icono: "🛻", factor: 1.4 },
  ],

  // Servicios: precio base (auto) y duración en minutos
  servicios: [
    { id: "lavado", nombre: "Lavado Premium", precio: 15000, duracion: 60,
      desc: "Lavado exterior a mano, aspirado, limpieza de vidrios y llantas." },
    { id: "interior", nombre: "Limpieza Interior Profunda", precio: 45000, duracion: 180,
      desc: "Lavado de tapiz, plásticos, alfombras y hidratación de cueros." },
    { id: "pulido", nombre: "Pulido y Encerado", precio: 60000, duracion: 240,
      desc: "Corrección de micro-rayas en 1 etapa y cera protectora." },
    { id: "ceramico", nombre: "Tratamiento Cerámico", precio: 180000, duracion: 480,
      desc: "Descontaminado, pulido y recubrimiento cerámico de larga duración." },
    { id: "motor", nombre: "Limpieza de Motor", precio: 20000, duracion: 60,
      desc: "Desengrasado y acondicionamiento de plásticos del motor." },
    { id: "focos", nombre: "Restauración de Focos", precio: 25000, duracion: 60,
      desc: "Pulido de focos opacos y sellado UV." },
  ],
};
