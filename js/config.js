/* =========================================================
   CONFIGURACIÓN DEL NEGOCIO — edita solo este archivo
   ========================================================= */
window.CONFIG = {
  negocio: "Studio Ultima Finish",
  eslogan: "Detailing · Car Care · Estética Automotriz",
  direccion: "",                // ej: "Av. Siempre Viva 123, Iquique". Vacío = se oculta
  instagram: "ultimafinishdetailing_ccp",              // ej: "studioultimafinish" (sin @). Vacío = se oculta

  // Número de WhatsApp que recibe las reservas: código país + número, sin "+" ni espacios
  whatsapp: "56995736685",
  nota: "Precios sujetos a evaluación del vehículo.",

  moneda: "CLP",
  locale: "es-CL",

  // Horario de atención. 0 = domingo, 1 = lunes ... 6 = sábado. null = cerrado
  horario: {
    0: { abre: "10:00", cierra: "20:00" },
    1: { abre: "09:00", cierra: "20:00" },
    2: { abre: "09:00", cierra: "20:00" },
    3: { abre: "09:00", cierra: "20:00" },
    4: { abre: "09:00", cierra: "20:00" },
    5: { abre: "09:00", cierra: "20:00" },
    6: { abre: "10:00", cierra: "20:00" },
  },

  intervaloMin: 60,      // cada cuántos minutos se ofrece una hora
  diasAnticipacion: 30,  // hasta cuántos días hacia adelante se puede reservar
  minHorasAviso: 2,      // no permitir reservas con menos de X horas de aviso

  // Días cerrados puntuales (feriados, vacaciones) en formato AAAA-MM-DD
  diasBloqueados: [],

  // Tipos de vehículo (los ids se usan en "precios" de cada servicio)
  vehiculos: [
    // extraMin: minutos que se suman a la duración del servicio por el tamaño del vehículo
    { id: "auto", nombre: "Auto", icono: "🚗", extraMin: 0 },
    { id: "suv", nombre: "SUV", icono: "🚙", extraMin: 30 },
    { id: "suv_xl", nombre: "SUV XL", icono: "🚙", extraMin: 45 },
    { id: "camioneta", nombre: "Camioneta", icono: "🛻", extraMin: 45 },
    { id: "camioneta_xl", nombre: "Camioneta XL", icono: "🛻", extraMin: 60 },
  ],

  // Servicios. "duracion" en minutos (estimada: ajústala a tu realidad)
  servicios: [
    {
      id: "essential", nombre: "Essential Finish", subtitulo: "De mantención", etiqueta: "",
      duracion: 120,
      precios: { auto: 25000, suv: 30000, suv_xl: 35000, camioneta: 35000, camioneta_xl: 40000 },
      incluye: [
        "Lavado Snow Foam",
        "Limpieza e hidratación de puertas y tablero",
        "Aspirado completo",
        "Lavado de vidrios y espejos",
        "Incluye cera Meguiar's o Sonax",
      ],
    },
    {
      id: "clean", nombre: "Studio Clean", subtitulo: "Limpieza interior y exterior al detalle", etiqueta: "Nuevo",
      duracion: 240,
      precios: { auto: 50000, suv: 55000, suv_xl: 60000, camioneta: 60000, camioneta_xl: 65000 },
      incluye: [
        "Lavado Snow Foam y exterior detallado",
        "Limpieza de llantas y pasarruedas",
        "Aspirado completo de cabina y maletero",
        "Limpieza de tablero, consola y puertas",
        "Hidratación de plásticos y gomas",
        "Vidrios y espejos sin marcas",
        "Sellado rápido de protección",
      ],
    },
    {
      id: "reset", nombre: "Studio Reset", subtitulo: "Limpieza completa al detalle · incluye tapicería", etiqueta: "Premium",
      duracion: 420,
      // minutos adicionales solo para este servicio según el vehículo
      extraPorVehiculo: { suv: 60, suv_xl: 60, camioneta: 60, camioneta_xl: 60 },
      precios: { auto: 80000, suv: 90000, suv_xl: 100000, camioneta: 100000, camioneta_xl: 110000 },
      incluye: [
        "Lavado profundo de tapicería (tela o cuero)",
        "Snow Foam: descontaminación y prelavado",
        "Aspirado completo de todo el interior",
        "Detallado de tablero, consola y puertas",
        "Limpieza profunda de plásticos y gomas",
        "Limpieza de llantas y pasarruedas",
        "Vidrios y espejos sin marcas",
        "Sellado sintético, acabado duradero",
        "Brillo de neumáticos y detalles",
        "Renovación total: se siente como nuevo",
      ],
    },
  ],
};
