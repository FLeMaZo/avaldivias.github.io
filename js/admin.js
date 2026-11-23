import * as DB from "./db.js";

const C = window.CONFIG;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
const deMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const money = (n) => new Intl.NumberFormat(C.locale, { style: "currency", currency: C.moneda, maximumFractionDigits: 0 }).format(n || 0);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fechaLarga = (s) => {
  const t = parseYmd(s).toLocaleDateString(C.locale, { weekday: "long", day: "numeric", month: "long" });
  return t[0].toUpperCase() + t.slice(1);
};

/** Teléfono chileno → formato internacional para WhatsApp */
const waUrl = (tel, texto) =>
  `https://api.whatsapp.com/send?phone=${tel}` + (texto ? `&text=${encodeURIComponent(texto)}` : "");
function telWa(tel) {
  let d = String(tel || "").replace(/\D/g, "");
  if (d.length === 9 && d.startsWith("9")) d = "56" + d;
  else if (d.length === 8) d = "569" + d;
  return d;
}

const state = { fecha: ymd(new Date()), reservas: [], slots: [], pendientes: [], recordatorios: [], tab: "dia" };

/** Próximo día con atención (mañana, o el siguiente que no esté cerrado). */
function proximoDiaHabil() {
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    d.setDate(d.getDate() + 1);
    if (C.horario[d.getDay()]) return ymd(d);
  }
  return ymd(d);
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2800);
}

function mostrar(vista) {
  for (const id of ["noConfig", "loginView", "panelView"]) $("#" + id).hidden = id !== vista;
  $("#logoutBtn").hidden = vista !== "panelView";
}

/* ---------- arranque ---------- */
if (!window.FIREBASE_CONFIG) {
  mostrar("noConfig");
} else {
  await DB.init(window.FIREBASE_CONFIG, { conAuth: true, emulador: !!window.FIREBASE_EMULADOR });
  DB.alCambiarUsuario((user) => {
    if (user) {
      $("#userEmail").textContent = user.email;
      mostrar("panelView");
      cargarTodo();
    } else {
      $("#userEmail").textContent = "";
      mostrar("loginView");
    }
  });
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  $("#loginError").hidden = true;
  try {
    await DB.login(f.get("email").trim(), f.get("pass"));
  } catch (err) {
    $("#loginError").textContent = "Correo o contraseña incorrectos.";
    $("#loginError").hidden = false;
  }
});
$("#logoutBtn").addEventListener("click", () => DB.logout());

/* ---------- pestañas ---------- */
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => {
  state.tab = b.dataset.tab;
  document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
  document.querySelectorAll("[data-view]").forEach((v) => (v.hidden = v.dataset.view !== state.tab));
}));

/* ---------- navegación de días ---------- */
function moverDia(n) {
  const d = parseYmd(state.fecha); d.setDate(d.getDate() + n);
  state.fecha = ymd(d); cargarDia();
}
$("#prevDay").addEventListener("click", () => moverDia(-1));
$("#nextDay").addEventListener("click", () => moverDia(1));
$("#todayBtn").addEventListener("click", () => { state.fecha = ymd(new Date()); cargarDia(); });
$("#dayInput").addEventListener("change", (e) => { if (e.target.value) { state.fecha = e.target.value; cargarDia(); } });

/* ---------- carga de datos ---------- */
async function cargarTodo() { await Promise.all([cargarDia(), cargarPendientes(), cargarRecordatorios()]); }

async function cargarRecordatorios() {
  const f = proximoDiaHabil();
  $("#recLabel").textContent = fechaLarga(f);
  try {
    state.recordatorios = (await DB.reservasEntre(f, f)).filter((r) => r.estado !== "cancelada");
  } catch (e) { console.error(e); return; }
  const faltan = state.recordatorios.filter((r) => !r.recordado).length;
  $("#recCount").textContent = faltan || "";
  $("#recList").innerHTML = state.recordatorios.length
    ? state.recordatorios.map((r) => tarjeta(r, false, true)).join("")
    : `<p class="empty">No tienes clientes agendados para ese día.</p>`;
}

async function cargarDia() {
  $("#dayLabel").textContent = fechaLarga(state.fecha);
  $("#dayInput").value = state.fecha;
  try {
    const [reservas, ocup] = await Promise.all([
      DB.reservasEntre(state.fecha, state.fecha),
      DB.ocupacion(state.fecha, state.fecha),
    ]);
    state.reservas = reservas; state.slots = ocup.slots;
  } catch (e) {
    console.error(e); toast("No se pudieron cargar los datos. ¿Tienes permiso de administrador?");
    return;
  }
  renderDia();
}

async function cargarPendientes() {
  try {
    const hasta = new Date(); hasta.setDate(hasta.getDate() + 120);
    const todas = await DB.reservasEntre(ymd(new Date()), ymd(hasta));
    state.pendientes = todas.filter((r) => r.estado === "pendiente");
  } catch (e) { console.error(e); return; }
  $("#pendCount").textContent = state.pendientes.length || "";
  $("#pendList").innerHTML = state.pendientes.length
    ? state.pendientes.map((r) => tarjeta(r, true)).join("")
    : `<p class="empty">No hay reservas por confirmar 🎉</p>`;
}

/* ---------- render ---------- */
function tarjeta(r, conFecha, conRecordatorio = false) {
  const fin = deMin(aMin(r.hora) + (r.duracion || 0));
  const tel = telWa(r.telefono);
  const btnRec = conRecordatorio
    ? `<button type="button" class="btn rec ${r.recordado ? "hecho" : ""}" data-act="recordar" data-id="${r.id}">${r.recordado ? "✓ Recordatorio enviado · reenviar" : "📲 Enviar recordatorio"}</button>`
    : "";
  const acciones = r.estado === "cancelada"
    ? `<a class="btn" href="${waUrl(tel, msgCancelacion(r))}" target="_blank" rel="noopener">Avisar cancelación</a>`
    : `${btnRec}${r.estado === "pendiente" ? `<button type="button" class="btn ok" data-act="confirmar" data-id="${r.id}">✓ Confirmar</button>` : ""}
       <a class="btn" href="${waUrl(tel)}" target="_blank" rel="noopener">WhatsApp</a>
       <a class="btn" href="tel:${esc(r.telefono)}">Llamar</a>
       <button type="button" class="btn danger" data-act="cancelar" data-id="${r.id}">Cancelar</button>`;
  return `<article class="rcard ${esc(r.estado)}">
    <div class="res-top">
      <div>
        <div class="res-hora">${esc(r.hora)} – ${fin}</div>
        ${conFecha ? `<div class="res-fecha">${esc(fechaLarga(r.fecha))}</div>` : ""}
      </div>
      <span class="estado ${esc(r.estado)}">${esc(r.estado)}</span>
    </div>
    <div class="res-serv">${esc(r.servicio)} · ${money(r.total)}</div>
    <div class="res-det">
      <span><b>${esc(r.nombre)}</b> · ${esc(r.telefono)}</span>
      <span>🚘 ${esc(r.vehiculoTipo)} — ${esc(r.vehiculo)}${r.patente ? ` (${esc(r.patente)})` : ""}</span>
      ${r.email ? `<span>✉️ ${esc(r.email)}</span>` : ""}
      ${r.notas ? `<span>📝 ${esc(r.notas)}</span>` : ""}
      ${r.recordado && !conRecordatorio ? `<span class="recordado">📲 Recordatorio enviado</span>` : ""}
      <span class="res-fecha">Código #${esc(r.id.slice(0, 6).toUpperCase())}</span>
    </div>
    <div class="res-actions">${acciones}</div>
  </article>`;
}

function horasDelDia(fecha) {
  const h = C.horario[parseYmd(fecha).getDay()];
  if (!h) return [];
  const out = [];
  for (let x = Math.floor(aMin(h.abre) / 60); x * 60 < aMin(h.cierra); x++) out.push(x);
  return out;
}

function renderDia() {
  const activas = state.reservas.filter((r) => r.estado !== "cancelada");
  $("#dayStats").textContent = `${activas.length} reserva${activas.length === 1 ? "" : "s"} · ${money(activas.reduce((a, r) => a + (r.total || 0), 0))}`;
  $("#dayList").innerHTML = state.reservas.length
    ? state.reservas.map((r) => tarjeta(r, false)).join("")
    : `<p class="empty">Sin reservas este día.</p>`;

  const porId = Object.fromEntries(state.slots.map((s) => [s.id, s]));
  const nombres = Object.fromEntries(state.reservas.map((r) => [r.id, r.nombre.split(" ")[0]]));
  const horas = horasDelDia(state.fecha);
  if (!horas.length) {
    $("#dayGrid").innerHTML = `<p class="empty" style="grid-column:1/-1">Día cerrado según tu horario.</p>`;
    return;
  }
  let html = "";
  for (const h of horas) {
    html += `<span class="h">${pad(h)}:00</span>`;
    for (let p = 1; p <= DB.CAPACIDAD; p++) {
      const id = DB.slotId(state.fecha, h, p);
      const s = porId[id];
      if (!s) html += `<button type="button" class="cell" data-libre="${h}_${p}" aria-label="Bloquear ${pad(h)}:00 puesto ${p}">+ libre</button>`;
      else if (s.tipo === "bloqueo") html += `<button type="button" class="cell blk" data-bloqueo="${id}" aria-label="Desbloquear">Bloqueado ✕</button>`;
      else html += `<button type="button" class="cell res" disabled>${esc(nombres[s.reserva] || "Reserva")}</button>`;
    }
  }
  $("#dayGrid").innerHTML = html;
}

/* ---------- mensajes al cliente ---------- */
const msgConfirmacion = (r) =>
  `Hola ${r.nombre.split(" ")[0]}! Te confirmamos tu hora en ${C.negocio}:\n\n` +
  `*Fecha:* ${fechaLarga(r.fecha)} a las ${r.hora}\n*Servicio:* ${r.servicio}\n*Total:* ${money(r.total)}\n\n¡Te esperamos!`;
function msgRecordatorio(r) {
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  const cuando = r.fecha === ymd(manana) ? `mañana ${fechaLarga(r.fecha).toLowerCase()}` : `el ${fechaLarga(r.fecha).toLowerCase()}`;
  return `Hola ${r.nombre.split(" ")[0]}! Te recordamos tu hora en ${C.negocio}:\n\n` +
    `*Fecha:* ${cuando[0].toUpperCase() + cuando.slice(1)} a las ${r.hora}\n*Servicio:* ${r.servicio}\n\n` +
    `Si no puedes venir, avísanos por aquí para liberar el horario. ¡Te esperamos!`;
}
const msgCancelacion = (r) =>
  `Hola ${r.nombre.split(" ")[0]}, te escribimos de ${C.negocio}. Tu hora del ${fechaLarga(r.fecha)} a las ${r.hora} quedó cancelada. ` +
  `Si quieres, puedes agendar otro horario aquí: ${location.origin}${location.pathname.replace(/admin\.html$/, "")}`;

/* ---------- acciones ---------- */
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b) return;
  const r = [...state.reservas, ...state.pendientes, ...state.recordatorios].find((x) => x.id === b.dataset.id);
  if (!r) return;

  if (b.dataset.act === "confirmar") {
    // Abrir WhatsApp en el mismo toque para que no lo bloquee el navegador
    const w = window.open(waUrl(telWa(r.telefono), msgConfirmacion(r)), "_blank");
    b.disabled = true;
    try { await DB.cambiarEstado(r.id, "confirmada"); toast("Reserva confirmada"); }
    catch (err) { console.error(err); w?.close(); toast("No se pudo confirmar. Intenta de nuevo."); }
    cargarTodo();
  }

  if (b.dataset.act === "recordar") {
    window.open(waUrl(telWa(r.telefono), msgRecordatorio(r)), "_blank");
    try { await DB.actualizar(r.id, { recordado: true }); }
    catch (err) { console.error(err); toast("No se pudo marcar como enviado."); }
    cargarTodo();
  }

  if (b.dataset.act === "cancelar") {
    if (!confirm(`¿Cancelar la reserva de ${r.nombre} (${fechaLarga(r.fecha)} ${r.hora})?\nEl horario quedará libre para otros clientes.`)) return;
    b.disabled = true;
    try { await DB.cancelar(r); toast("Reserva cancelada. Puedes avisarle por WhatsApp."); }
    catch (err) { console.error(err); toast("No se pudo cancelar. Intenta de nuevo."); }
    cargarTodo();
  }
});

$("#dayGrid").addEventListener("click", async (e) => {
  const libre = e.target.closest("[data-libre]");
  const blk = e.target.closest("[data-bloqueo]");
  try {
    if (libre) {
      const [h, p] = libre.dataset.libre.split("_").map(Number);
      libre.disabled = true;
      await DB.bloquear(state.fecha, h, p);
    } else if (blk) {
      blk.disabled = true;
      await DB.desbloquear(blk.dataset.bloqueo);
    } else return;
  } catch (err) { console.error(err); toast("No se pudo actualizar el horario."); }
  cargarDia();
});

$("#blockDayBtn").addEventListener("click", async () => {
  const horas = horasDelDia(state.fecha);
  if (!horas.length) return;
  if (!confirm(`¿Bloquear todo el ${fechaLarga(state.fecha)}? Los clientes no podrán reservar ese día. Las reservas existentes se mantienen.`)) return;
  try { await DB.bloquearHoras(state.fecha, horas, new Set(state.slots.map((s) => s.id))); toast("Día bloqueado"); }
  catch (err) { console.error(err); toast("No se pudo bloquear el día."); }
  cargarDia();
});

$("#unblockDayBtn").addEventListener("click", async () => {
  if (!state.slots.some((s) => s.tipo === "bloqueo")) { toast("No hay bloqueos este día"); return; }
  try { await DB.desbloquearDia(state.slots); toast("Bloqueos quitados"); }
  catch (err) { console.error(err); toast("No se pudieron quitar los bloqueos."); }
  cargarDia();
});
