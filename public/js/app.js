import { db } from "./firebase.js";
import { collection, addDoc, doc, getDoc, getDocs,
         setDoc, updateDoc, query, orderBy, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LOCALES, TURNOS, getItems, DEFAULT_RESTRICTIONS } from "./data.js";
import { configuracion, loadRutinas } from "./config.js";

// ── Router ─────────────────────────────────────────────────────────────────────
const routes = { home, nuevo, editar, resumen, config: configuracion };

async function router() {
  const hash          = location.hash.slice(1) || "home";
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

// ── Helpers ────────────────────────────────────────────────────────────────────
function nav(title) {
  return `<div class="flex items-center gap-3 mb-6">
    <a href="#home" class="text-blue-600 hover:underline text-sm">&larr; Inicio</a>
    <span class="text-gray-400">/</span>
    <h1 class="text-xl font-bold text-gray-800">${title}</h1>
  </div>`;
}

function badge(estado) {
  const cls = estado === "enviado"
    ? "bg-green-100 text-green-800"
    : "bg-yellow-100 text-yellow-800";
  return `<span class="text-xs px-2 py-0.5 rounded-full font-medium ${cls}">${estado}</span>`;
}

// Obtiene items desde Firestore (config/rutinas) con fallback a data.js
async function getItemsDB(seccion, turno) {
  try {
    const rutinas = await loadRutinas();
    const key     = `${seccion}_${turno}`;
    if (rutinas[key]?.length) return rutinas[key];
  } catch(_) {}
  return getItems(seccion, turno);
}

// ── HOME ───────────────────────────────────────────────────────────────────────
async function home() {
  let snpDocs = [];
  try {
    const q = query(collection(db, "submissions"), orderBy("created_at", "desc"));
    snpDocs = (await getDocs(q)).docs;
  } catch(_) {
    snpDocs = (await getDocs(collection(db, "submissions"))).docs;
  }

  const rows = snpDocs.slice(0, 10).map(d => {
    const s = d.data();
    return `<tr class="hover:bg-gray-50 cursor-pointer" onclick="location.hash='editar/${d.id}'">
      <td class="px-4 py-3 font-medium">Local ${s.local}</td>
      <td class="px-4 py-3">${s.fecha}</td>
      <td class="px-4 py-3">${s.seccion} &ndash; ${s.turno}</td>
      <td class="px-4 py-3">${s.responsable || "&mdash;"}</td>
      <td class="px-4 py-3">${badge(s.estado)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="text-center py-8 text-gray-400">Sin registros aun</td></tr>`;

  document.getElementById("app").innerHTML = `
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-blue-700 mb-1">Control Completitud Mercado</h1>
      <p class="text-gray-500 text-sm">Registra y monitorea las rutinas de disponibilidad por local y turno</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
      <a href="#nuevo"   class="card-btn bg-blue-600   text-white">+ Nuevo Check</a>
      <a href="#resumen" class="card-btn bg-indigo-600 text-white">Resumen</a>
      <a href="#config"  class="card-btn bg-gray-700   text-white">Configuracion</a>
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-700">Ultimos registros</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-2 text-left">Local</th>
              <th class="px-4 py-2 text-left">Fecha</th>
              <th class="px-4 py-2 text-left">Seccion / Turno</th>
              <th class="px-4 py-2 text-left">Responsable</th>
              <th class="px-4 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── NUEVO ──────────────────────────────────────────────────────────────────────
async function nuevo() {
  const today    = new Date().toISOString().slice(0, 10);
  const locOpts  = LOCALES.map(l => `<option value="${l}">Local ${l}</option>`).join("");
  const turnOpts = TURNOS.map(t => `<option value="${t}">${t}</option>`).join("");

  document.getElementById("app").innerHTML = `
    ${nav("Nuevo Checklist")}
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
          <input type="date" name="fecha" value="${today}" required class="input">
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
  document.getElementById("app").innerHTML = `
    ${nav(`Local ${sub.local} &middot; ${sub.seccion} ${sub.turno} &middot; ${sub.fecha}`)}
    <div class="flex justify-between items-center mb-4">
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
    <div id="errEnviar" class="hidden mb-3 bg-red-50 border border-red-300 text-red-700 text-sm font-medium px-4 py-3 rounded-lg">
      Completa las <strong>observaciones</strong> de todos los items antes de enviar.
    </div>
    <div class="space-y-4">${cards}</div>`;

  document.querySelectorAll(".chk-cumple").forEach(el => {
    el.addEventListener("change", () => saveItem(id, el.dataset.id));
  });
  let timers = {};
  document.querySelectorAll(".num-field, .obs-field").forEach(el => {
    el.addEventListener("input", () => {
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

// ── RESUMEN DASHBOARD ─────────────────────────────────────────────────────────
async function resumen() {
  let allDocs = [];
  try {
    const q = query(collection(db, "submissions"), orderBy("fecha", "desc"));
    allDocs = (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(_) {
    allDocs = (await getDocs(collection(db, "submissions"))).docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a,b) => (b.fecha||"").localeCompare(a.fecha||""));
  }

  // Acumular métricas por sección y local ──────────────────────────────────────
  const SECS = ["SALA", "BODEGA"];
  const stats = {};
  SECS.forEach(s => { stats[s] = { total:0, enviados:0, pctSum:0, pctN:0, locales:{} }; });

  allDocs.forEach(sub => {
    const g = stats[sub.seccion];
    if (!g) return;
    g.total++;
    if (sub.estado === "enviado") g.enviados++;
    if (sub.pct_cumplimiento != null) { g.pctSum += sub.pct_cumplimiento; g.pctN++; }

    if (!g.locales[sub.local]) g.locales[sub.local] = { total:0, enviados:0, pctSum:0, pctN:0, ultima:"" };
    const gl = g.locales[sub.local];
    gl.total++;
    if (sub.estado === "enviado") gl.enviados++;
    if (sub.pct_cumplimiento != null) { gl.pctSum += sub.pct_cumplimiento; gl.pctN++; }
    if (!gl.ultima || sub.fecha > gl.ultima) gl.ultima = sub.fecha;
  });

  // Helpers de presentación ───────────────────────────────────────────────────
  const pctOf  = (g)  => g.pctN ? Math.round(g.pctSum / g.pctN) : null;
  const barCls = (p)  => p == null ? "bg-gray-300" : p >= 80 ? "bg-green-500" : p >= 60 ? "bg-yellow-400" : "bg-red-500";
  const txtCls = (p)  => p == null ? "text-gray-400" : p >= 80 ? "text-green-700" : p >= 60 ? "text-yellow-600" : "text-red-600";

  // Panel por sección (SALA / BODEGA) ─────────────────────────────────────────
  const secPanel = (sec) => {
    const g   = stats[sec];
    const pct = pctOf(g);
    const lbl = pct != null ? `${pct}%` : "Sin datos";
    return `
      <div class="bg-white rounded-xl shadow-sm border p-5">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">${sec}</p>
        <div class="flex items-end gap-2 mb-2">
          <span class="text-5xl font-black ${txtCls(pct)}">${lbl}</span>
          <span class="text-sm text-gray-400 mb-1">cumplimiento</span>
        </div>
        <div class="h-3 bg-gray-100 rounded-full mb-4">
          <div class="${barCls(pct)} h-3 rounded-full" style="width:${pct||0}%"></div>
        </div>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div class="bg-gray-50 rounded-lg py-2">
            <div class="text-lg font-bold text-gray-700">${g.total}</div>
            <div class="text-xs text-gray-400">Total</div>
          </div>
          <div class="bg-green-50 rounded-lg py-2">
            <div class="text-lg font-bold text-green-700">${g.enviados}</div>
            <div class="text-xs text-gray-400">Enviados</div>
          </div>
          <div class="bg-yellow-50 rounded-lg py-2">
            <div class="text-lg font-bold text-yellow-600">${g.total - g.enviados}</div>
            <div class="text-xs text-gray-400">Borrador</div>
          </div>
        </div>
      </div>`;
  };

  // Tabla por local de cada sección ───────────────────────────────────────────
  const localTable = (sec) => {
    const entries = Object.entries(stats[sec].locales)
      .sort((a,b) => Number(a[0]) - Number(b[0]));
    if (!entries.length)
      return `<p class="text-sm text-gray-400 px-4 py-4">Sin registros.</p>`;
    return `
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-xs text-gray-500">
          <tr>
            <th class="px-3 py-2 text-left">Local</th>
            <th class="px-3 py-2 text-left">Cumplimiento</th>
            <th class="px-3 py-2 text-center">Enviados</th>
            <th class="px-3 py-2 text-center">Borrador</th>
            <th class="px-3 py-2 text-center">Ultima fecha</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(([local, gl]) => {
            const p = pctOf(gl);
            const bar = p != null
              ? `<div class="flex items-center gap-2">
                   <div class="flex-1 h-2 bg-gray-100 rounded-full">
                     <div class="${barCls(p)} h-2 rounded-full" style="width:${p}%"></div>
                   </div>
                   <span class="text-xs font-bold w-9 text-right ${txtCls(p)}">${p}%</span>
                 </div>`
              : `<span class="text-xs text-gray-400">Sin dato</span>`;
            return `<tr class="border-t hover:bg-gray-50">
              <td class="px-3 py-2 font-bold text-blue-700">Local ${local}</td>
              <td class="px-3 py-2 w-44">${bar}</td>
              <td class="px-3 py-2 text-center font-semibold text-green-700">${gl.enviados}</td>
              <td class="px-3 py-2 text-center text-yellow-600">${gl.total - gl.enviados}</td>
              <td class="px-3 py-2 text-center text-gray-500 text-xs">${gl.ultima || "&mdash;"}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  };

  // Tabla detalle ─────────────────────────────────────────────────────────────
  const detRows = allDocs.slice(0, 50).map(s => {
    const p = s.pct_cumplimiento;
    return `
    <tr class="border-t hover:bg-gray-50 cursor-pointer" onclick="location.hash='editar/${s.id}'">
      <td class="px-3 py-2 font-medium text-blue-700">Local ${s.local}</td>
      <td class="px-3 py-2 text-xs">${s.fecha}</td>
      <td class="px-3 py-2">${s.seccion}</td>
      <td class="px-3 py-2">${s.turno}</td>
      <td class="px-3 py-2">${s.responsable || "&mdash;"}</td>
      <td class="px-3 py-2 text-center font-semibold ${txtCls(p ?? null)}">${p != null ? p+"%" : "&mdash;"}</td>
      <td class="px-3 py-2">${badge(s.estado)}</td>
    </tr>`;
  }).join("");

  document.getElementById("app").innerHTML = `
    ${nav("Dashboard de Cumplimiento")}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      ${secPanel("SALA")}
      ${secPanel("BODEGA")}
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden mb-4">
      <div class="px-4 py-3 bg-blue-50 border-b font-semibold text-blue-800">Cumplimiento por Local &mdash; SALA</div>
      ${localTable("SALA")}
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
      <div class="px-4 py-3 bg-indigo-50 border-b font-semibold text-indigo-800">Cumplimiento por Local &mdash; BODEGA</div>
      ${localTable("BODEGA")}
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">Detalle (ultimos 50)</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th class="px-3 py-2 text-left">Local</th>
              <th class="px-3 py-2 text-left">Fecha</th>
              <th class="px-3 py-2 text-left">Seccion</th>
              <th class="px-3 py-2 text-left">Turno</th>
              <th class="px-3 py-2 text-left">Responsable</th>
              <th class="px-3 py-2 text-center">Cumplimiento</th>
              <th class="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>${detRows}</tbody>
        </table>
      </div>
    </div>`;
}

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
