(() => {
  "use strict";
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const STORE_KEY = "detailing_reservas";

  const state = {
    step: 1,
    vehiculo: C.vehiculos[0].id,
    servicios: new Set(),
    fecha: null,   // "AAAA-MM-DD"
    hora: null,    // "HH:MM"
    mes: firstOfMonth(new Date()),
    cliente: {},
    ocup: {},          // {"AAAA-MM-DD_HH": autos ocupando esa hora}
    cargando: false,
  };
  let DB = null;       // módulo de base de datos (si Firebase está configurado)

  /* ---------- utilidades ---------- */
  const money = (n) =>
    new Intl.NumberFormat(C.locale, { style: "currency", currency: C.moneda, maximumFractionDigits: 0 }).format(n);
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const toMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function parseYmd(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  const durText = (min) => {
    const h = Math.floor(min / 60), m = min % 60;
    return [h && `${h} h`, m && `${m} min`].filter(Boolean).join(" ") || "0 min";
  };
  const fechaLarga = (s) =>
    parseYmd(s).toLocaleDateString(C.locale, { weekday: "long", day: "numeric", month: "long" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const vehiculoSel = () => C.vehiculos.find((v) => v.id === state.vehiculo);
  const serviciosSel = () => C.servicios.filter((s) => state.servicios.has(s.id));
  const precio = (s) => s.precios[state.vehiculo];
  const total = () => serviciosSel().reduce((a, s) => a + precio(s), 0);
  const duracion = () => serviciosSel().reduce((a, s) => a + s.duracion, 0);

  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
  function save(list) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* sin almacenamiento */ } }

  /* ---------- cabecera / pie ---------- */
  document.title = `Agenda tu hora · ${C.negocio}`;
  $("#nota").textContent = C.nota || "";
  $("#nota1").textContent = C.nota || "";
  $("#waFooter").href = `https://wa.me/${C.whatsapp}`;
  $("#waFooterText").textContent = "+" + C.whatsapp.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, "$1 $2 $3 $4");
  $("#footerInfo").innerHTML =
    [C.negocio, C.direccion].filter(Boolean).map(esc).join(" · ") +
    (C.instagram ? ` · <a href="https://instagram.com/${encodeURIComponent(C.instagram)}" target="_blank" rel="noopener">@${esc(C.instagram)}</a>` : "");

  /* ---------- paso 1: vehículo y servicios ---------- */
  const W = '<circle cx="16" cy="22" r="4.5"/><circle cx="48" cy="22" r="4.5"/><path d="M4 22h7.5M20.5 22h23M52.5 22H60"/>';
  const ICONOS = {
    auto: `<path d="M4 22v-3.5c0-2 1.4-3.2 3.4-3.6L14 13.6l6.6-6c1-.9 2.1-1.3 3.4-1.3h13c1.5 0 2.8.6 3.8 1.7l5.4 5.6 9 1.6c2.3.4 3.8 2.1 3.8 4.3V22"/><path d="M22 13.4h22"/>${W}`,
    suv: `<path d="M4 22v-6c0-1.6 1-2.7 2.6-3L12 12l4.6-6c.8-1 1.9-1.6 3.2-1.6H46c1.4 0 2.5.6 3.2 1.8L53 12l4.8 1c1.4.3 2.2 1.3 2.2 2.7V22"/><path d="M17 12h33"/>${W}`,
    camioneta: `<path d="M4 22v-6.5c0-1.3.8-2 2-2h20V7.2c0-1 .8-1.7 1.8-1.7H40c1 0 1.8.4 2.4 1.2L48 13l8 1.4c2.2.4 4 1.6 4 3.7V22"/><path d="M26 13.5h22"/>${W}`,
  };
  const icono = (id) => {
    const base = id.replace(/_xl$/, "");
    return ICONOS[base]
      ? `<svg viewBox="0 0 64 30" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONOS[base]}</svg>`
      : "";
  };
  function renderVehiculos() {
    $("#vehicleList").innerHTML = C.vehiculos.map((v) =>
      `<button type="button" class="chip" data-id="${v.id}" aria-pressed="${v.id === state.vehiculo}">
         ${/_xl$/.test(v.id) ? '<span class="xl">XL</span>' : ""}${icono(v.id) || `<span class="ico">${v.icono}</span>`}${esc(v.nombre)}
       </button>`).join("");
  }
  function renderServicios() {
    $("#serviceList").innerHTML = C.servicios.map((s) =>
      `<button type="button" class="service" data-id="${s.id}" aria-pressed="${state.servicios.has(s.id)}">
         <div class="head">
           <strong>${esc(s.nombre)}</strong>
           <span class="sub">${esc(s.subtitulo)}</span>
           ${s.etiqueta ? `<span class="tag">${esc(s.etiqueta)}</span>` : ""}
         </div>
         <div class="body">
           <ul class="incluye">${s.incluye.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
           <div class="meta"><span class="price">${money(precio(s))}</span><span class="dur">⏱ ${durText(s.duracion)}</span></div>
         </div>
       </button>`).join("");
  }
  $("#vehicleList").addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    state.vehiculo = b.dataset.id;
    renderVehiculos(); renderServicios(); update();
  });
  $("#serviceList").addEventListener("click", (e) => {
    const b = e.target.closest(".service"); if (!b) return;
    const id = b.dataset.id;
    const yaEstaba = state.servicios.has(id);
    state.servicios.clear(); // un plan a la vez
    if (!yaEstaba) state.servicios.add(id);
    renderServicios();
    state.hora = null; // la duración cambió: revalidar hora
    update();
  });

  /* ---------- paso 2: calendario y horas ---------- */
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const limite = new Date(hoy); limite.setDate(limite.getDate() + C.diasAnticipacion);

  function slotsDelDia(fechaStr) {
    const d = parseYmd(fechaStr);
    const h = C.horario[d.getDay()];
    if (!h || C.diasBloqueados.includes(fechaStr)) return [];
    const abre = toMin(h.abre), cierra = toMin(h.cierra);
    // Si el trabajo dura más que la jornada, el auto debe llegar a primera hora
    const ocupa = Math.min(duracion() || C.intervaloMin, cierra - abre);
    const minimo = Date.now() + C.minHorasAviso * 3600e3;
    const out = [];
    for (let m = abre; m + ocupa <= cierra; m += C.intervaloMin) {
      const t = new Date(d); t.setHours(0, m, 0, 0);
      if (t.getTime() >= minimo && hayCupo(fechaStr, m, ocupa)) out.push(fromMin(m));
    }
    return out;
  }

  // ¿Quedan puestos libres en todas las horas que ocuparía el trabajo?
  function hayCupo(fecha, inicioMin, durMin) {
    if (!DB) return true;
    for (let h = Math.floor(inicioMin / 60); h * 60 < inicioMin + durMin; h++) {
      if ((state.ocup[`${fecha}_${pad(h)}`] || 0) >= DB.CAPACIDAD) return false;
    }
    return true;
  }

  async function cargarOcupacion() {
    if (!DB) return;
    state.cargando = true; renderSlots();
    try {
      state.ocup = (await DB.ocupacion(ymd(hoy), ymd(limite))).cuenta;
    } catch (e) {
      console.error(e);
    }
    state.cargando = false;
    if (state.step === 2) { renderCalendario(); renderSlots(); update(); }
  }

  function renderCalendario() {
    const m = state.mes;
    const ml = m.toLocaleDateString(C.locale, { month: "long" });
    $("#monthLabel").textContent = `${ml[0].toUpperCase()}${ml.slice(1)} ${m.getFullYear()}`;
    $("#prevMonth").disabled = m <= firstOfMonth(hoy);
    $("#nextMonth").disabled = new Date(m.getFullYear(), m.getMonth() + 1, 1) > limite;

    const offset = (m.getDay() + 6) % 7; // lunes primero
    const diasMes = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    let html = "<span></span>".repeat(offset);
    for (let i = 1; i <= diasMes; i++) {
      const d = new Date(m.getFullYear(), m.getMonth(), i);
      const s = ymd(d);
      const ok = d >= hoy && d <= limite && slotsDelDia(s).length > 0;
      const cls = ["day", s === ymd(hoy) && "today", s === state.fecha && "selected"].filter(Boolean).join(" ");
      html += `<button type="button" class="${cls}" data-date="${s}" ${ok ? "" : "disabled"}>${i}</button>`;
    }
    $("#calDays").innerHTML = html;
  }

  function renderSlots() {
    if (!state.fecha) {
      $("#slotList").innerHTML = "";
      $("#slotHint").textContent = "Selecciona un día para ver los horarios disponibles.";
      return;
    }
    if (state.cargando) {
      $("#slotHint").textContent = "Cargando horarios disponibles…";
      $("#slotList").innerHTML = "";
      return;
    }
    const slots = slotsDelDia(state.fecha);
    if (state.hora && !slots.includes(state.hora)) state.hora = null;
    $("#slotHint").textContent = slots.length
      ? `${fechaLarga(state.fecha)} · duración estimada ${durText(duracion())}`
      : "No quedan horarios para este día. Prueba con otra fecha.";
    $("#slotList").innerHTML = slots.map((h) =>
      `<button type="button" class="slot ${h === state.hora ? "selected" : ""}" data-hora="${h}">${h}</button>`).join("");
  }

  $("#prevMonth").addEventListener("click", () => { state.mes = new Date(state.mes.getFullYear(), state.mes.getMonth() - 1, 1); renderCalendario(); });
  $("#nextMonth").addEventListener("click", () => { state.mes = new Date(state.mes.getFullYear(), state.mes.getMonth() + 1, 1); renderCalendario(); });
  $("#calDays").addEventListener("click", (e) => {
    const b = e.target.closest(".day"); if (!b || b.disabled) return;
    state.fecha = b.dataset.date; state.hora = null;
    renderCalendario(); renderSlots(); update();
  });
  $("#slotList").addEventListener("click", (e) => {
    const b = e.target.closest(".slot"); if (!b) return;
    state.hora = b.dataset.hora; renderSlots(); update();
  });

  /* ---------- paso 3: formulario ---------- */
  const form = $("#clientForm");
  form.addEventListener("input", (e) => {
    e.target.classList.remove("invalid");
    const err = form.querySelector(`[data-err="${e.target.name}"]`);
    if (err) err.classList.remove("show");
    update();
  });
  function leerForm() {
    state.cliente = Object.fromEntries(new FormData(form).entries());
    for (const k in state.cliente) state.cliente[k] = state.cliente[k].trim();
  }
  function formValido(marcar) {
    leerForm();
    let ok = true;
    for (const el of form.querySelectorAll("[required]")) {
      let bad = !el.value.trim();
      if (el.name === "telefono") bad = el.value.replace(/\D/g, "").length < 8;
      if (bad) {
        ok = false;
        if (marcar) {
          el.classList.add("invalid");
          form.querySelector(`[data-err="${el.name}"]`)?.classList.add("show");
        }
      }
    }
    // El correo es opcional: nunca impide reservar
    return ok;
  }

  /* ---------- paso 4: resumen ---------- */
  function renderResumen() {
    const c = state.cliente;
    const filas = [
      ["Vehículo", `${vehiculoSel().nombre} · ${c.vehiculo}${c.patente ? " (" + c.patente.toUpperCase() + ")" : ""}`],
      ...serviciosSel().map((s) => [s.nombre, money(precio(s))]),
      ["Fecha", fechaLarga(state.fecha)],
      ["Hora de llegada", state.hora],
      ["Duración estimada", durText(duracion())],
      ["Nombre", c.nombre],
      ["Teléfono", c.telefono],
      c.email && ["Correo", c.email],
      c.notas && ["Comentarios", c.notas],
    ].filter(Boolean);
    $("#summary").innerHTML = `<dl>${filas.map(([k, v]) =>
      `<div class="item"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
      <div class="item total-row"><dt>Total estimado</dt><dd>${money(total())}</dd></div></dl>`;
  }

  function mensajeWhatsApp(codigo) {
    const c = state.cliente;
    return [
      `Hola ${C.negocio}! Quiero agendar una hora 🚗✨`,
      codigo ? `🔖 Reserva #${codigo}` : null,
      ``,
      `📅 ${fechaLarga(state.fecha)} a las ${state.hora}`,
      `🧽 Servicio:`,
      ...serviciosSel().map((s) => `  • ${s.nombre} (${money(precio(s))})`),
      `💰 Total estimado: ${money(total())}`,
      `⏱ Duración aprox.: ${durText(duracion())}`,
      ``,
      `👤 ${c.nombre}`,
      `📞 ${c.telefono}`,
      c.email ? `✉️ ${c.email}` : null,
      `🚘 ${vehiculoSel().nombre} — ${c.vehiculo}${c.patente ? " (" + c.patente.toUpperCase() + ")" : ""}`,
      c.notas ? `📝 ${c.notas}` : null,
    ].filter((l) => l !== null).join("\n");
  }

  async function confirmar() {
    const btn = $("#nextBtn");
    btn.disabled = true; btn.textContent = "Reservando…";
    $("#confirmError").hidden = true;
    // Se abre la pestaña ya (en el toque) para que el navegador no la bloquee
    const ventana = DB ? window.open("", "_blank") : null;
    let codigo = null;

    if (DB) {
      const c = state.cliente;
      try {
        const id = await DB.reservar({
          fecha: state.fecha, hora: state.hora, duracion: duracion(),
          servicio: serviciosSel().map((s) => s.nombre).join(" + "),
          vehiculoTipo: vehiculoSel().nombre, total: total(),
          nombre: c.nombre, telefono: c.telefono, email: c.email || "",
          vehiculo: c.vehiculo, patente: (c.patente || "").toUpperCase(), notas: c.notas || "",
        });
        codigo = id.slice(0, 6).toUpperCase();
      } catch (e) {
        ventana?.close();
        console.error(e);
        if (e.message === "OCUPADO") {
          state.hora = null;
          irA(2);
          $("#slotMsg").hidden = false;
        } else {
          $("#confirmError").hidden = false;
          update();
        }
        return;
      }
    }

    const reserva = {
      id: codigo || Date.now().toString(36),
      fecha: state.fecha, hora: state.hora,
      servicios: serviciosSel().map((s) => s.nombre),
      total: total(), duracion: duracion(),
      vehiculo: state.cliente.vehiculo,
    };
    save([...load(), reserva]);
    const url = `https://wa.me/${C.whatsapp}?text=${encodeURIComponent(mensajeWhatsApp(codigo))}`;
    $("#waLink").href = url;
    $("#icsBtn").onclick = () => descargarIcs(reserva);
    $("#codigo").textContent = codigo ? `Código de reserva: #${codigo}` : "";
    if (ventana) ventana.location.href = url;
    else window.open(url, "_blank", "noopener");
    renderMisReservas();
    irA(5);
  }

  function descargarIcs(r) {
    const [y, mo, d] = r.fecha.split("-");
    const ini = toMin(r.hora), fin = ini + r.duracion;
    const fmt = (min) => `${y}${mo}${d}T${pad(Math.floor(min / 60) % 24)}${pad(min % 60)}00`;
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Detailing//Agenda//ES", "BEGIN:VEVENT",
      `UID:${r.id}@detailing`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART:${fmt(ini)}`, `DTEND:${fmt(Math.min(fin, 23 * 60 + 59))}`,
      `SUMMARY:${C.negocio} — ${r.servicios.join(", ")}`,
      `LOCATION:${C.direccion}`,
      `DESCRIPTION:Código ${r.id}. Si no puedes asistir avisa por WhatsApp +${C.whatsapp}`,
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-P1D", `DESCRIPTION:Mañana tienes hora en ${C.negocio}`, "END:VALARM",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT2H", `DESCRIPTION:En 2 horas: tu hora en ${C.negocio}`, "END:VALARM",
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    a.download = "reserva-detailing.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function renderMisReservas() {
    const ahora = ymd(new Date());
    const list = load().filter((r) => r.fecha >= ahora).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    $("#mySection").hidden = list.length === 0;
    $("#myList").innerHTML = list.map((r) =>
      `<li><div><strong>${esc(fechaLarga(r.fecha))} · ${esc(r.hora)}</strong>
       <small>${esc(r.servicios.join(", "))} · ${money(r.total)}</small></div>
       <button type="button" data-id="${r.id}" aria-label="Quitar de la lista">✕</button></li>`).join("");
  }
  $("#myList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-id]"); if (!b) return;
    save(load().filter((r) => r.id !== b.dataset.id)); renderMisReservas();
  });

  /* ---------- navegación ---------- */
  function puedeAvanzar() {
    if (state.step === 1) return state.servicios.size > 0;
    if (state.step === 2) return !!(state.fecha && state.hora);
    if (state.step === 3) return formValido(false);
    return true;
  }

  function irA(step) {
    state.step = step;
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = +p.dataset.panel !== step));
    document.querySelectorAll("#stepper li").forEach((li) => {
      const n = +li.dataset.step;
      li.classList.toggle("active", n === step);
      li.classList.toggle("done", n < step);
    });
    $("#stepper").style.setProperty("--progress", Math.min(step - 1, 3) / 3);
    if (step === 2) { renderCalendario(); renderSlots(); cargarOcupacion(); }
    if (step !== 2) $("#slotMsg").hidden = true;
    if (step === 4) renderResumen();
    $("#bar").hidden = step === 5;
    const y = $("#stepper").getBoundingClientRect().top + window.scrollY - 12;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    update();
  }

  function update() {
    const n = state.servicios.size;
    $("#barInfo").textContent = n
      ? `${serviciosSel().map((s) => s.nombre).join(" + ")} · ${vehiculoSel().nombre}${state.hora ? " · " + state.hora : ""}`
      : "Elige un servicio";
    $("#barTotal").textContent = money(total());
    $("#backBtn").hidden = state.step === 1;
    $("#nextBtn").textContent = state.step === 4 ? "Confirmar" : "Continuar";
    $("#nextBtn").disabled = state.step !== 3 && !puedeAvanzar();
  }

  $("#nextBtn").addEventListener("click", () => {
    if (state.step === 3 && !formValido(true)) {
      form.querySelector(".invalid")?.focus();
      return;
    }
    if (state.step === 4) { confirmar(); return; }
    irA(state.step + 1);
  });
  $("#backBtn").addEventListener("click", () => irA(Math.max(1, state.step - 1)));
  $("#restartBtn").addEventListener("click", () => {
    state.servicios.clear(); state.fecha = null; state.hora = null;
    form.reset(); renderServicios(); irA(1);
  });

  /* ---------- inicio ---------- */
  if (window.FIREBASE_CONFIG) {
    import("./db.js")
      .then(async (mod) => {
        await mod.init(window.FIREBASE_CONFIG, { emulador: !!window.FIREBASE_EMULADOR });
        DB = mod;
        if (state.step === 2) cargarOcupacion();
      })
      .catch((e) => console.error("No se pudo conectar a la base de datos", e));
  }
  renderVehiculos();
  renderServicios();
  renderMisReservas();
  update();
})();
