# Agenda de Detailing — Studio Ultima Finish

Aplicación web para que los clientes agenden horas de detailing. Funciona en GitHub Pages.

- **Página de reservas** (`index.html`): el cliente elige vehículo y servicio → día y hora → sus datos → confirma. La reserva se guarda, la hora se bloquea y se abre WhatsApp con la solicitud.
- **Panel del dueño** (`admin.html`): ver las reservas del día, confirmarlas (abre WhatsApp al cliente con la confirmación), cancelarlas (libera la hora) y bloquear horas o días completos.

Se atienden **2 autos a la vez**: una hora deja de ofrecerse cuando ya hay 2 trabajos ocupándola. Un trabajo largo ocupa todas las horas que dura.

Sin Firebase configurado la app sigue funcionando solo con WhatsApp (sin bloquear horas).

## Activar la base de datos (Firebase, plan gratuito)

1. Entra a <https://console.firebase.google.com> con tu cuenta de Google y crea un proyecto (puedes desactivar Google Analytics).
2. **Firestore:** menú *Compilación → Firestore Database → Crear base de datos*. Ubicación: `southamerica-east1` (São Paulo). Modo: *producción*.
3. **Reglas:** en Firestore, pestaña *Reglas*, borra todo y pega el contenido de `firestore.rules`. Cambia `CORREO_ADMIN` por tu correo y toca *Publicar*.
4. **Usuario del panel:** menú *Compilación → Authentication → Comenzar → Correo electrónico/contraseña → Habilitar*. Luego en *Usuarios → Agregar usuario*, crea tu usuario con **el mismo correo** del paso 3 y una contraseña segura.
5. **Conectar la página:** *⚙️ Configuración del proyecto → Tus apps → ícono web `</>`*, ponle un nombre y registra. Copia el bloque `firebaseConfig` y pégalo en `js/firebase-config.js` en lugar de `null`.
6. Abre `https://ultimafinishstudio.github.io/admin.html` e ingresa con tu correo y contraseña.

> Los datos de `firebase-config.js` no son secretos: lo que protege la información son las reglas. Con ellas, el público solo puede ver qué horas están ocupadas (sin nombres ni teléfonos) y crear reservas nuevas; solo tu cuenta puede ver los datos de los clientes, confirmar, cancelar o bloquear.

## Personalizar

Todo se edita en `js/config.js`:

- `negocio`, `eslogan`, `direccion`, `instagram`, `whatsapp` (código de país sin `+`)
- `horario` por día (`null` = cerrado), `intervaloMin`, `diasAnticipacion`, `minHorasAviso`, `diasBloqueados`
- `vehiculos` y `servicios` (precio por tipo de vehículo y duración en minutos)

Para cambiar la cantidad de autos a la vez: `CAPACIDAD` en `js/db.js` y el `[12]` en `firestore.rules` (para 3 autos: `[123]`).

## Archivos

- `index.html`, `js/app.js` — página de reservas
- `admin.html`, `js/admin.js`, `css/admin.css` — panel del dueño
- `js/db.js` — conexión con Firebase
- `js/config.js` — datos del negocio
- `js/firebase-config.js` — conexión del proyecto Firebase
- `firestore.rules` — reglas de seguridad de la base de datos
- `css/styles.css` — estilos
