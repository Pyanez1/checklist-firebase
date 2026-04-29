import { db } from "./firebase.js";
import { collection, addDoc, doc, getDoc, getDocs,
         setDoc, updateDoc, deleteDoc, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LOCALES, TURNOS, getItems, DEFAULT_RESTRICTIONS } from "./data.js";
import { configuracion, loadRutinas } from "./config.js";
import { resumen } from "./resumen.js";
import { home } from "./home.js";
import { nav, badge } from "./utils.js";

// ── Router ─────────────────────────────────────────────────────────────────────
const routes = { home, nuevo, editar, resumen, config: configuracion };

async function router() {
  const hash          = location.hash.slice(1) || "nuevo";
  const [page, ...rest] = hash.split("/");
  const fn            = routes[page] || home;
  document.getElementById("app").innerHTML =
    '<div class="flex justify-center py-16">' +
    '<div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>' +
    '</div>';
  try {
    await fn(rest.join("/"));
  } catch(err) {
    console.error(err);
    document.getElementById("app").innerHTML = `
      <div class="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p class="text-red-700 font-semibold mb-2">Error al cargar</p>
        <p class="text-red-500 text-sm">${err.message}</p>
        <a href="#home" class="mt-4 inline-block text-blue-600 underline text-sm">Volver al inicio</a>
      </div>`;
  }
}
window.addEventListener("hashchange", router);
window.addEventListener("load", router);

// Obtiene items desde Firestore (config/rutinas) con fallback a data.js
async function getItemsDB(seccion, turno) {
  try {
    const rutinas = await loadRutinas();
    const key     = `${seccion}_${turno}`;
    if (rutinas[key]?.length) return rutinas[key];
  } catch(_) {}
  return getItems(seccion, turno);
}

// ── NUEVO ───────────────────────────────────────────────────────────────────────
async function nuevo() {
  const today    = new Date().toISOString().slice(0, 10);
  const locOpts  = LOCALES.map(l => `<option value="${l}">Local ${l}</option>`).join("");
  const turnOpts = TURNOS.map(t => `<option value="${t}">${t}</option>`).join("");

  document.getElementById("app").innerHTML = `
    ${nav("Nuevo Checklist")}

    <!-- Ilustracion -->
    <div class="max-w-lg mb-5 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800
                text-white flex items-center gap-5 px-6 py-5 overflow-hidden relative">
      <!-- Circulos decorativos -->
      <div class="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5"></div>
      <div class="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5"></div>

      <!-- SVG Clipboard -->
      <svg width="72" height="84" viewBox="0 0 72 84" fill="none"
           xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
        <!-- Cuerpo del clipboard -->
        <rect x="6" y="12" width="60" height="68" rx="7" fill="white" fill-opacity=".15"/>
        <rect x="6" y="12" width="60" height="68" rx="7" stroke="white" stroke-opacity=".35" stroke-width="1.5"/>
        <!-- Gancho (spark amarillo) -->
        <rect x="24" y="6" width="24" height="14" rx="5" fill="#ffc220"/>
        <rect x="30" y="3" width="12" height="9" rx="3" fill="#ffc220"/>
        <circle cx="36" cy="9" r="3" fill="#0053e2"/>
        <!-- Fila 1 - tachada (cumple) -->
        <rect x="16" y="32" width="40" height="4" rx="2" fill="white" fill-opacity=".2"/>
        <!-- Check 1 -->
        <circle cx="22" cy="34" r="5" fill="#ffc220"/>
        <polyline points="19,34 21.5,36.5 26,31" stroke="#0053e2"
          stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Fila 2 - tachada (cumple) -->
        <rect x="16" y="46" width="40" height="4" rx="2" fill="white" fill-opacity=".2"/>
        <!-- Check 2 -->
        <circle cx="22" cy="48" r="5" fill="#ffc220"/>
        <polyline points="19,48 21.5,50.5 26,45" stroke="#0053e2"
          stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- Fila 3 - pendiente -->
        <rect x="16" y="60" width="40" height="4" rx="2" fill="white" fill-opacity=".2"/>
        <circle cx="22" cy="62" r="5" fill="white" fill-opacity=".3"/>
      </svg>

      <!-- Texto -->
      <div class="flex-1 min-w-0">
        <p class="text-xs font-bold text-yellow-300 uppercase tracking-widest mb-0.5">Walmart Chile</p>
        <h2 class="text-lg font-black leading-tight mb-1">Check Rutinas<br>Completitud</h2>
        <p class="text-blue-200 text-xs leading-snug">
          Completa los datos del local y turno<br>para iniciar el registro de rutinas.
        </p>
      </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      <form id="fmNuevo" class="space-y-4">
        <div>
          <label class="label">Local</label>
          <select name="local" required class="input">
            <option value="">-- Seleccionar --</option>${locOpts}
          </select>
        </div>
        <div>
          <label class="label">Fecha</label>
          <input type="date" name="fecha" value="${today}" min="${today}" required class="input">
        </div>
        <div>
          <label class="label">Seccion</label>
          <select name="seccion" required class="input">
            <option value="">-- Seleccionar --</option>
            <option value="SALA">SALA</option>
            <option value="BODEGA">BODEGA</option>
          </select>
        </div>
        <div>
          <label class="label">Turno</label>
          <select name="turno" required class="input">${turnOpts}</select>
        </div>
        <div>
          <label class="label">Responsable</label>
          <input type="text" name="responsable" placeholder="Nombre del encargado" class="input">
        </div>
        <button type="submit"
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
          Iniciar Checklist &rarr;
        </button>
        <div id="err" class="hidden bg-red-50 border border-red-300 text-red-700 text-sm font-medium px-4 py-3 rounded-lg"></div>
      </form>
    </div>`;

  document.getElementById("fmNuevo").addEventListener("submit", async e => {
    e.preventDefault();
    const btn    = e.target.querySelector("button[type=submit]");
    const errDiv = document.getElementById("err");
    const showErr = msg => {
      errDiv.classList.remove("hidden");
      errDiv.textContent = msg;
      btn.disabled = false;
      btn.textContent = "Iniciar Checklist \u2192";
    };
    btn.disabled = true;
    btn.textContent = "Creando...";
    errDiv.classList.add("hidden");

    try {
      const fd  = new FormData(e.target);
      const sec = fd.get("seccion"), tur = fd.get("turno");
      const ok  = await checkHorario(sec, tur);
      if (!ok.allowed) { showErr(ok.msg); return; }

      const ref = await addDoc(collection(db, "submissions"), {
        local:       Number(fd.get("local")),
        fecha:       fd.get("fecha"),
        seccion:     sec,
        turno:       tur,
        responsable: fd.get("responsable"),
        estado:      "borrador",
        created_at:  serverTimestamp(),
        updated_at:  serverTimestamp(),
      });
      location.hash = `editar/${ref.id}`;
    } catch(err) {
      console.error(err);
      showErr("Error al guardar: " + err.message);
    }
  });
}

// ── EDITAR ─────────────────────────────────────────────────────────────────────
async function editar(id) {
  if (!id) { location.hash = "home"; return; }
  const snap = await getDoc(doc(db, "submissions", id));
  if (!snap.exists()) { location.hash = "home"; return; }
  const sub   = snap.data();
  const items = await getItemsDB(sub.seccion, sub.turno);

  const rSnap = await getDocs(collection(db, "submissions", id, "responses"));
  const saved = {};
  rSnap.forEach(d => { saved[d.id] = d.data(); });

  // Cargar TODOS los horarios de la seccion para mostrarlos en pantalla
  let allRules = [];
  let ventana  = null;
  try {
    const cfgSnap = await getDoc(doc(db, "config", "time_restrictions"));
    allRules = cfgSnap.exists() ? cfgSnap.data().restrictions : DEFAULT_RESTRICTIONS;
    ventana  = allRules.find(r => r.seccion === sub.seccion && r.turno === sub.turno) || null;
  } catch(_) {}

  if (items.length === 0) {
    document.getElementById("app").innerHTML = `
      ${nav(`Local ${sub.local} &middot; ${sub.seccion} ${sub.turno} &middot; ${sub.fecha}`)}
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p class="text-yellow-800 font-semibold">Sin rutinas para ${sub.seccion} - ${sub.turno}</p>
        <p class="text-yellow-600 text-sm mt-1">Agrega rutinas desde Configuracion &rarr; Rutinas.</p>
        <a href="#home" class="mt-4 inline-block text-blue-600 underline text-sm">Volver al inicio</a>
      </div>`;
    return;
  }

  const cards = items.map(item => {
    const r = saved[item.id] || {};
    return `
      <div class="bg-white border rounded-xl p-4 shadow-sm space-y-3" id="card-${item.id}">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${item.id}</span>
            <span class="text-xs text-gray-400 ml-2">${item.horario}</span>
            <h3 class="font-semibold text-gray-800 mt-1">${item.rutina}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${item.accionable}</p>
            <p class="text-xs text-gray-400 mt-1">${item.responsable}</p>
          </div>
          <label class="flex-shrink-0 flex items-center gap-1 cursor-pointer">
            <input type="checkbox" class="chk-cumple w-4 h-4 accent-blue-600"
              data-id="${item.id}" ${r.cumple ? "checked" : ""}>
            <span class="text-xs font-medium">Cumple</span>
          </label>
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs">
          <div>
            <label class="text-gray-500">Detectados</label>
            <input type="number" min="0" placeholder="0" class="input-sm num-field"
              data-id="${item.id}" data-field="detectados" value="${r.detectados ?? ""}">
          </div>
          <div>
            <label class="text-gray-500">Gestionados</label>
            <input type="number" min="0" placeholder="0" class="input-sm num-field"
              data-id="${item.id}" data-field="gestionados" value="${r.gestionados ?? ""}">
          </div>
          <div>
            <label class="text-gray-500">Pendientes</label>
            <input type="number" min="0" placeholder="0" class="input-sm num-field"
              data-id="${item.id}" data-field="pendientes" value="${r.pendientes ?? ""}">
          </div>
        </div>
        <div>
          <label class="text-xs text-gray-500">Observaciones</label>
          <textarea rows="2" class="input-sm obs-field w-full resize-none"
            data-id="${item.id}" placeholder="Comentarios opcionales...">${r.observaciones || ""}</textarea>
        </div>
        <div id="saved-${item.id}" class="text-right text-xs text-green-600 hidden">Guardado</div>
        <div id="obs-err-${item.id}" class="hidden text-xs text-red-600 font-medium">
          Observacion requerida antes de enviar.
        </div>
      </div>`;
  }).join("");

  const isEnviado = sub.estado === "enviado";

  // Grilla de horarios — todos los turnos de la misma seccion
  const secRules = allRules.filter(r => r.seccion === sub.seccion);
  const turnoCards = secRules.map(r => {
    const esCurrent = r.turno === sub.turno;
    const base = esCurrent
      ? "border-2 border-blue-500 bg-blue-50"
      : "border border-gray-200 bg-white";
    const labelCls = esCurrent ? "font-black text-blue-700" : "font-semibold text-gray-600";
    const horaCls  = esCurrent ? "text-blue-600" : "text-gray-500";
    const tag = esCurrent
      ? `<span class="ml-1 text-xs bg-blue-600 text-white rounded px-1 py-0.5 align-middle">Actual</span>`
      : "";
    const hora = r.activo
      ? `<span class="${horaCls} font-semibold">${r.hora_inicio} &ndash; ${r.hora_fin}</span>`
      : `<span class="text-gray-300 text-xs">Sin restricci&oacute;n</span>`;
    return `
      <div class="rounded-xl px-3 py-2.5 text-xs ${base}">
        <div class="${labelCls} mb-0.5">${r.turno}${tag}</div>
        <div>&#9200; ${hora}</div>
      </div>`;
  }).join("");

  const horarioPanel = secRules.length
    ? `<div class="mb-4">
         <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
           &#9200; Horarios de ingreso &mdash; ${sub.seccion}
         </p>
         <div class="grid grid-cols-3 gap-2">${turnoCards}</div>
       </div>`
    : "";

  document.getElementById("app").innerHTML = `
    ${nav(`Local ${sub.local} &middot; ${sub.seccion} ${sub.turno} &middot; ${sub.fecha}`)}
    <div class="flex justify-between items-center mb-3">
      <div class="text-sm text-gray-500">Responsable: <strong>${sub.responsable || "&mdash;"}</strong></div>
      <div class="flex gap-2">
        ${badge(sub.estado)}
        ${!isEnviado
          ? `<button id="btnEnviar"
               class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-lg">
               Enviar
             </button>`
          : ""}
      </div>
    </div>
    ${horarioPanel}
    <div id="errEnviar" class="hidden mb-3 bg-red-50 border border-red-300 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
      Completa las <strong>observaciones</strong> de todos los items antes de enviar.
    </div>
    <!-- Barra de progreso sticky -->
    <div class="sticky top-0 z-10 bg-white border-b shadow-sm -mx-4 px-4 py-3 mb-4">
      <div class="flex justify-between items-center mb-1">
        <span class="text-xs font-semibold text-gray-600">Avance de tareas</span>
        <span id="progTxt" class="text-xs font-bold text-blue-700">0 / ${items.length} completadas</span>
      </div>
      <div class="h-2 bg-gray-100 rounded-full">
        <div id="progBar" class="h-2 bg-blue-600 rounded-full transition-all duration-300" style="width:0%"></div>
      </div>
    </div>
    <div class="space-y-4">${cards}</div>`;

  // Progreso inicial (items ya guardados)
  function updateProgress() {
    const fields = [...document.querySelectorAll(".obs-field")];
    const done   = fields.filter(el => el.value.trim()).length;
    const total  = fields.length;
    const pct    = total ? Math.round(done / total * 100) : 0;
    const txt    = document.getElementById("progTxt");
    const bar    = document.getElementById("progBar");
    if (txt) txt.textContent = `${done} / ${total} completadas`;
    if (bar) {
      bar.style.width  = `${pct}%`;
      bar.className    = `h-2 rounded-full transition-all duration-300 ${pct === 100 ? "bg-green-500" : "bg-blue-600"}`;
    }
  }
  updateProgress(); // estado inicial

  document.querySelectorAll(".chk-cumple").forEach(el => {
    el.addEventListener("change", () => { saveItem(id, el.dataset.id); updateProgress(); });
  });
  let timers = {};
  document.querySelectorAll(".num-field, .obs-field").forEach(el => {
    el.addEventListener("input", () => {
      updateProgress();
      clearTimeout(timers[el.dataset.id]);
      timers[el.dataset.id] = setTimeout(() => saveItem(id, el.dataset.id), 700);
    });
  });
  document.getElementById("btnEnviar")?.addEventListener("click", async () => {
    // Validar observaciones completas en todos los items
    let hayVacias = false;
    document.querySelectorAll(".obs-field").forEach(el => {
      const vacia = !el.value.trim();
      el.classList.toggle("ring-2",     vacia);
      el.classList.toggle("ring-red-500", vacia);
      const errEl = document.getElementById(`obs-err-${el.dataset.id}`);
      if (errEl) errEl.classList.toggle("hidden", !vacia);
      if (vacia) hayVacias = true;
    });
    if (hayVacias) {
      document.getElementById("errEnviar").classList.remove("hidden");
      document.querySelector(".ring-red-500")?.scrollIntoView({ behavior:"smooth", block:"center" });
      return;
    }
    document.getElementById("errEnviar").classList.add("hidden");
    // Calcular % de cumplimiento
    const chks = [...document.querySelectorAll(".chk-cumple")];
    const pct  = chks.length ? Math.round(chks.filter(c => c.checked).length / chks.length * 100) : 0;
    await updateDoc(doc(db, "submissions", id), {
      estado: "enviado", pct_cumplimiento: pct, updated_at: serverTimestamp()
    });
    location.hash = "home";
  });
}

async function saveItem(subId, itemId) {
  const card       = document.getElementById(`card-${itemId}`);
  const cumple     = card.querySelector(`.chk-cumple[data-id="${itemId}"]`).checked ? 1 : 0;
  const detectados = Number(card.querySelector(`[data-field="detectados"]`).value) || 0;
  const gestionados= Number(card.querySelector(`[data-field="gestionados"]`).value) || 0;
  const pendientes = Number(card.querySelector(`[data-field="pendientes"]`).value) || 0;
  const obs        = card.querySelector(".obs-field").value || "";
  await setDoc(doc(db, "submissions", subId, "responses", itemId),
    { cumple, detectados, gestionados, pendientes, observaciones: obs });
  const el = document.getElementById(`saved-${itemId}`);
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 2000);
}

// resumen() vive en resumen.js — importado arriba

// ── Check horario ──────────────────────────────────────────────────────────────
async function checkHorario(seccion, turno) {
  let restrictions = DEFAULT_RESTRICTIONS;
  try {
    const s = await getDoc(doc(db, "config", "time_restrictions"));
    if (s.exists()) restrictions = s.data().restrictions;
  } catch(_) {}

  const rule = restrictions.find(r => r.seccion === seccion && r.turno === turno);
  if (!rule || !rule.activo) return { allowed: true, msg: "" };

  const toMin = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
  const cur   = new Date().getHours()*60 + new Date().getMinutes();
  const ini   = toMin(rule.hora_inicio), fin = toMin(rule.hora_fin);
  const ok    = ini > fin ? (cur >= ini || cur <= fin) : (cur >= ini && cur <= fin);
  return ok
    ? { allowed:true, msg:"" }
    : { allowed:false, msg:`Fuera del horario para ${seccion}-${turno}. Ventana: ${rule.hora_inicio} a ${rule.hora_fin}.` };
}
