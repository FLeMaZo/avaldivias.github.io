/* =========================================================
   CONEXIÓN CON FIREBASE (base de datos de reservas)
   Pega aquí la configuración de tu proyecto Firebase:
   Consola Firebase → ⚙️ Configuración del proyecto → Tus apps → Web → "Configuración".
   Estos datos NO son secretos: la seguridad la dan las reglas (firestore.rules).
   Mientras esté en null, la app funciona solo con WhatsApp (sin bloquear horas).
   ========================================================= */
window.FIREBASE_CONFIG = null;

/* Ejemplo:
window.FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
*/
