/* =========================================================
   Acceso a la base de datos (Firebase Firestore + Auth).
   Lo usan la página de reservas (app.js) y el panel (admin.js).
   ========================================================= */
const VERSION = "10.14.1";
const CDN = `https://www.gstatic.com/firebasejs/${VERSION}/`;

export const CAPACIDAD = 2; // autos a la vez (debe coincidir con firestore.rules)

let fs, au, db, auth;
const pad = (n) => String(n).padStart(2, "0");

export async function init(config, { conAuth = false, emulador = false } = {}) {
  const appMod = await import(CDN + "firebase-app.js");
  fs = await import(CDN + "firebase-firestore.js");
  const app = appMod.initializeApp(config);
  db = fs.getFirestore(app);
  if (emulador) fs.connectFirestoreEmulator(db, "127.0.0.1", 8080);
  if (conAuth) {
    au = await import(CDN + "firebase-auth.js");
    auth = au.getAuth(app);
    if (emulador) au.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  }
}

/* ---------- utilidades de horario ---------- */
export const slotId = (fecha, h, puesto) => `${fecha}_${pad(h)}_${puesto}`;
const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

/** Horas (enteras) que ocupa un trabajo que empieza a "hora" y dura "duracion" minutos. */
export function horasCubiertas(hora, duracion) {
  const ini = aMin(hora), fin = ini + duracion;
  const out = [];
  for (let h = Math.floor(ini / 60); h * 60 < fin; h++) out.push(h);
  return out;
}

/**
 * Ocupación entre dos fechas (AAAA-MM-DD, inclusive).
 * Devuelve { cuenta: {"AAAA-MM-DD_HH": n}, slots: [{id, ...datos}] }
 */
export async function ocupacion(desde, hasta) {
  const q = fs.query(fs.collection(db, "slots"),
    fs.where("fecha", ">=", desde), fs.where("fecha", "<=", hasta));
  const snap = await fs.getDocs(q);
  const cuenta = {};
  const slots = [];
  snap.forEach((d) => {
    const k = d.id.slice(0, 13);
    cuenta[k] = (cuenta[k] || 0) + 1;
    slots.push({ id: d.id, ...d.data() });
  });
  return { cuenta, slots };
}

/** Crea una reserva ocupando las horas necesarias. Lanza Error("OCUPADO") si ya no hay cupo. */
export async function reservar(datos) {
  const horas = horasCubiertas(datos.hora, datos.duracion);
  const ref = fs.doc(fs.collection(db, "reservas"));
  await fs.runTransaction(db, async (tx) => {
    const elegidos = [];
    for (const h of horas) {
      let libre = null;
      for (let p = 1; p <= CAPACIDAD && !libre; p++) {
        const r = fs.doc(db, "slots", slotId(datos.fecha, h, p));
        if (!(await tx.get(r)).exists()) libre = r;
      }
      if (!libre) throw new Error("OCUPADO");
      elegidos.push(libre);
    }
    tx.set(ref, {
      ...datos,
      slots: elegidos.map((r) => r.id),
      estado: "pendiente",
      creado: fs.serverTimestamp(),
    });
    for (const r of elegidos) {
      tx.set(r, { fecha: datos.fecha, hora: `${r.id.slice(11, 13)}:00`, tipo: "reserva", reserva: ref.id });
    }
  });
  return ref.id;
}

/* ---------- solo administrador ---------- */
export const login = (email, pass) => au.signInWithEmailAndPassword(auth, email, pass);
export const logout = () => au.signOut(auth);
export const alCambiarUsuario = (cb) => au.onAuthStateChanged(auth, cb);

export async function reservasEntre(desde, hasta) {
  const q = fs.query(fs.collection(db, "reservas"),
    fs.where("fecha", ">=", desde), fs.where("fecha", "<=", hasta));
  const snap = await fs.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

export const cambiarEstado = (id, estado) =>
  fs.updateDoc(fs.doc(db, "reservas", id), { estado });

/** Cancela: libera las horas ocupadas y marca la reserva como cancelada. */
export async function cancelar(reserva) {
  const b = fs.writeBatch(db);
  for (const s of reserva.slots || []) b.delete(fs.doc(db, "slots", s));
  b.update(fs.doc(db, "reservas", reserva.id), { estado: "cancelada" });
  await b.commit();
}

/** Bloquea un puesto en una hora (ej. cliente que llegó sin reserva). */
export const bloquear = (fecha, h, puesto) =>
  fs.setDoc(fs.doc(db, "slots", slotId(fecha, h, puesto)),
    { fecha, hora: `${pad(h)}:00`, tipo: "bloqueo", reserva: null });

export const desbloquear = (id) => fs.deleteDoc(fs.doc(db, "slots", id));

/** Bloquea todos los puestos libres de las horas indicadas. */
export async function bloquearHoras(fecha, horas, ocupados) {
  const b = fs.writeBatch(db);
  for (const h of horas) {
    for (let p = 1; p <= CAPACIDAD; p++) {
      const id = slotId(fecha, h, p);
      if (!ocupados.has(id)) b.set(fs.doc(db, "slots", id), { fecha, hora: `${pad(h)}:00`, tipo: "bloqueo", reserva: null });
    }
  }
  await b.commit();
}

/** Quita todos los bloqueos manuales de un día (no toca reservas). */
export async function desbloquearDia(slotsDelDia) {
  const b = fs.writeBatch(db);
  for (const s of slotsDelDia) if (s.tipo === "bloqueo") b.delete(fs.doc(db, "slots", s.id));
  await b.commit();
}
