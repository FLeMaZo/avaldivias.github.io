# Agenda de Detailing

Aplicación web para que tus clientes agenden horas de detailing. Funciona en GitHub Pages, sin servidor.

**Flujo:** el cliente elige tipo de vehículo y servicios → día y hora → completa sus datos → revisa el resumen → se abre WhatsApp con la solicitud lista para enviarte. También puede descargar la cita a su calendario (.ics).

## Personalizar

Todo se edita en `js/config.js`:

- `negocio`, `eslogan`, `direccion`, `instagram`
- `whatsapp`: tu número con código de país, sin `+` (ej. `56912345678`)
- `horario`: horas de apertura y cierre por día (`null` = cerrado)
- `intervaloMin`, `diasAnticipacion`, `minHorasAviso`, `diasBloqueados`
- `vehiculos`: tamaños y factor de precio
- `servicios`: nombre, descripción, precio base y duración

## Archivos

- `index.html` — estructura
- `css/styles.css` — estilos (modo claro/oscuro automático)
- `js/config.js` — datos del negocio
- `js/app.js` — lógica

> Nota: al ser un sitio estático, los horarios no se bloquean automáticamente entre clientes; la hora queda confirmada cuando respondes por WhatsApp.
