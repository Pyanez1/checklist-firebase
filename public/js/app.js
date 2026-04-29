import { initializeApp }           from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, doc, getDoc, getDocs,
         setDoc, updateDoc, query, orderBy, serverTimestamp }
         from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LOCALES, TURNOS, getItems, DEFAULT_RESTRICTIONS } from "./data.js";

// ── Firebase init ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDWym87qCZIZI53aJQzSc8G_a-mVWsUfsw",
  authDomain:        "checklist-completitud.firebaseapp.com",
  projectId:         "checklist-completitud",
  storageBucket:     "checklist-completitud.firebasestorage.app",
  messagingSenderId: "214618832835",
  appId:             "1:214618832835:web:a748c9f313cb155b9a0776"
};
const fbApp = initializeApp(firebaseConfig);
const db    = getFirestore(fbApp);

// ── Router ────────────────────────────────────────────────────────────────────
const routes = { home, nuevo, editar, resumen, config: configuracion };

async function router() {
  const hash   = location.hash.slice(1) || "home";
  const [page, ...rest] = hash.split("/");
  const fn = routes[page] || home;
  document.getElementById("app").innerHTML = '<div class="flex justify-center py-16"><div class="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>';
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
window.addEventListener("load",       router);

// ── Nav helper ────────────────────────────────────────────────────────────────
function nav(title) {
  return `<div class="flex items-center gap-3 mb-6">
    <a href="#home" class="text-blue-600 hover:underline text-sm">← Inicio</a>
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

// ── HOME ──────────────────────────────────────────────────────────────────────
async function home() {
  // Sin orderBy para evitar necesidad de índice compuesto
  let snpDocs = [];
  try {
    const q   = query(collection(db, "submissions"), orderBy("created_at", "desc"));
    const snp = await getDocs(q);
    snpDocs   = snp.docs;
  } catch(_) {
    // Fallback sin orden si no existe el índice aún
    const snp = await getDocs(collection(db, "submissions"));
    snpDocs   = snp.docs;
  }
  const rows = snpDocs.slice(0, 8).map(d => {
    const s = d.data();
    return `<tr class="hover:bg-gray-50 cursor-pointer" onclick="location.hash='editar/${d.id}'">
      <td class="px-4 py-3 font-medium">Local ${s.local}</td>
      <td class="px-4 py-3">${s.fecha}</td>
      <td class="px-4 py-3">${s.seccion} – ${s.turno}</td>
      <td class="px-4 py-3">${s.responsable || "—"}</td>
      <td class="px-4 py-3">${badge(s.estado)}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="5" class="text-center py-8 text-gray-400">Sin registros aún</td></tr>`;

  document.getElementById("app").innerHTML = `
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-blue-700 mb-1">📋 Control Completitud Mercado</h1>
      <p class="text-gray-500 text-sm">Registra y monitorea las rutinas de disponibilidad por local y turno</p>
    </div>
    <div class="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
      <a href="#nuevo"  class="card-btn bg-blue-600 text-white">＋ Nuevo Check</a>
      <a href="#resumen" class="card-btn bg-indigo-600 text-white">📊 Resumen</a>
      <a href="#config"  class="card-btn bg-gray-700  text-white">⚙️ Configuración</a>
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 border-b bg-gray-50 font-semibold text-gray-700">Últimos registros</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-2 text-left">Local</th>
              <th class="px-4 py-2 text-left">Fecha</th>
              <th class="px-4 py-2 text-left">Sección / Turno</th>
              <th class="px-4 py-2 text-left">Responsable</th>
              <th class="px-4 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── NUEVO ─────────────────────────────────────────────────────────────────────
async function nuevo() {
  const today = new Date().toISOString().slice(0, 10);
  const locOpts  = LOCALES.map(l => `<option value="${l}">Local ${l}</option>`).join("");
  const turnOpts = TURNOS.map(t => `<option value="${t}">${t}</option>`).join("");

  document.getElementById("app").innerHTML = `
    ${nav("Nuevo Checklist")}
    <div class="bg-white rounded-xl shadow-sm border p-6 max-w-lg">
      <form id="fmNuevo" class="space-y-4">
        <div>
          <label class="label">Local</label>
          <select name="local" required class="input">
            <option value="">— Seleccionar —</option>${locOpts}
          </select>
        </div>
        <div>
          <label class="label">Fecha</label>
          <input type="date" name="fecha" value="${today}" required class="input">
        </div>
        <div>
          <label class="label">Sección</label>
          <select name="seccion" required class="input">
            <option value="">— Seleccionar —</option>
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
        <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
          Iniciar Checklist →
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
      btn.textContent = "Iniciar Checklist →";
    };

    btn.disabled = true;
    btn.textContent = "Creando...";
    errDiv.classList.add("hidden");

    try {
      const fd  = new FormData(e.target);
      const sec = fd.get("seccion"), tur = fd.get("turno");

      // Verificar horario
      const ok = await checkHorario(sec, tur);
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
      console.error("Error creando checklist:", err);
      showErr("Error al guardar: " + err.message + " — revisa reglas de Firestore.");
    }
  });
}

// ── EDITAR ────────────────────────────────────────────────────────────────────
async function editar(id) {
  if (!id) { location.hash = "home"; return; }
  const snap = await getDoc(doc(db, "submissions", id));
  if (!snap.exists()) { location.hash = "home"; return; }
  const sub  = snap.data();
  const items = getItems(sub.seccion, sub.turno);

  // Cargar respuestas existentes
  const rSnap = await getDocs(collection(db, "submissions", id, "responses"));
  const saved = {};
  rSnap.forEach(d => { saved[d.id] = d.data(); });

  if (items.length === 0) {
    document.getElementById("app").innerHTML = `
      ${nav(`Local ${sub.local} · ${sub.seccion} ${sub.turno} · ${sub.fecha}`)}
      <div class="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p class="text-yellow-800 font-semibold">Sin rutinas para ${sub.seccion} - ${sub.turno}</p>
        <p class="text-yellow-600 text-sm mt-1">Verifica que la sección y turno sean correctos.</p>
        <a href="#home" class="mt-4 inline-block text-blue-600 underline text-sm">Volver al inicio</a>
      </div>`;
    return;
  }

  const cards = items.map(item => {
    const r = saved[item.id] || {};
    return `
      <div class="bg-white border rounded-xl p-4 shadow-sm space-y-3" id="card-${item.id}">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">${item.id}</span>
            <span class="text-xs text-gray-400 ml-2">${item.horario}</span>
            <h3 class="font-semibold text-gray-800 mt-1">${item.rutina}</h3>
            <p class="text-xs text-gray-500 mt-0.5">${item.accionable}</p>
            <p class="text-xs text-gray-400 mt-1">👤 ${item.responsable}</p>
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
        <div id="saved-${item.id}" class="text-right text-xs text-green-600 hidden">✓ Guardado</div>
      </div>`;
  }).join("");

  const isEnviado = sub.estado === "enviado";
  document.getElementById("app").innerHTML = `
    ${nav(`Local ${sub.local} · ${sub.seccion} ${sub.turno} · ${sub.fecha}`)}
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-gray-500">Responsable: <strong>${sub.responsable || "—"}</strong></div>
      <div class="flex gap-2">
        ${badge(sub.estado)}
        ${!isEnviado ? `<button id="btnEnviar" class="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1 rounded-lg">✓ Enviar</button>` : ""}
      </div>
    </div>
    <div class="space-y-4">${cards}</div>`;

  // Auto-save — checkboxes
  document.querySelectorAll(".chk-cumple").forEach(el => {
    el.addEventListener("change", () => saveItem(id, el.dataset.id));
  });

  // Auto-save — campos numéricos y observaciones (debounce)
  let timers = {};
  document.querySelectorAll(".num-field, .obs-field").forEach(el => {
    el.addEventListener("input", () => {
      clearTimeout(timers[el.dataset.id]);
      timers[el.dataset.id] = setTimeout(() => saveItem(id, el.dataset.id), 700);
    });
  });

  // Enviar
  document.getElementById("btnEnviar")?.addEventListener("click", async () => {
    await updateDoc(doc(db, "submissions", id), {
      estado: "enviado", updated_at: serverTimestamp()
    });
    location.hash = "home";
  });
}

async function saveItem(subId, itemId) {
  const card = document.getElementById(`card-${itemId}`);
  const cumple     = card.querySelector(`.chk-cumple[data-id="${itemId}"]`).checked ? 1 : 0;
  const detectados = Number(card.querySelector(`[data-field="detectados"]`).value) || 0;
  const gestionados= Number(card.querySelector(`[data-field="gestionados"]`).value) || 0;
  const pendientes = Number(card.querySelector(`[data-field="pendientes"]`).value) || 0;
  const obs        = card.querySelector(`.obs-field`).value || "";

  await setDoc(doc(db, "submissions", subId, "responses", itemId), {
    cumple, detectados, gestionados, pendientes, observaciones: obs
  });

  const saved = document.getElementById(`saved-${itemId}`);
  saved.classList.remove("hidden");
  setTimeout(() => saved.classList.add("hidden"), 2000);
}

// ── RESUMEN ──────────────────────────────────────────────────────────────────────
async function resumen() {
  let allDocs = [];
  try {
    const q   = query(collection(db, "submissions"), orderBy("fecha", "desc"));
    const snp = await getDocs(q);
    allDocs   = snp.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(_) {
    // Fallback sin orden si falta el índice Firestore
    const snp = await getDocs(collection(db, "submissions"));
    allDocs   = snp.docs.map(d => ({ id: d.id, ...d.data() }))
                        .sort((a,b) => (b.fecha||'').localeCompare(a.fecha||''));
  }

  // Agrupar por local
  const porLocal = {};
  allDocs.forEach(s => {
    if (!porLocal[s.local]) porLocal[s.local] = { total:0, enviados:0, ultima:"" };
    const g = porLocal[s.local];
    g.total++;
    if (s.estado === "enviado") g.enviados++;
    if (!g.ultima || s.fecha > g.ultima) g.ultima = s.fecha;
  });

  const summaryRows = Object.entries(porLocal).sort((a,b)=>a[0]-b[0]).map(([local, g]) => `
    <tr class="hover:bg-gray-50">
      <td class="px-4 py-3 font-bold text-blue-700">Local ${local}</td>
      <td class="px-4 py-3 text-center">${g.total}</td>
      <td class="px-4 py-3 text-center text-green-700 font-semibold">${g.enviados}</td>
      <td class="px-4 py-3 text-center text-yellow-700">${g.total - g.enviados}</td>
      <td class="px-4 py-3 text-center">${g.ultima || "—"}</td>
    </tr>`).join("") || `<tr><td colspan="5" class="text-center py-8 text-gray-400">Sin datos</td></tr>`;

  const detailRows = allDocs.slice(0, 50).map(s => `
    <tr class="hover:bg-gray-50 cursor-pointer" onclick="location.hash='editar/${s.id}'">
      <td class="px-3 py-2 font-medium text-blue-700">Local ${s.local}</td>
      <td class="px-3 py-2">${s.fecha}</td>
      <td class="px-3 py-2">${s.seccion}</td>
      <td class="px-3 py-2">${s.turno}</td>
      <td class="px-3 py-2">${s.responsable || "—"}</td>
      <td class="px-3 py-2">${badge(s.estado)}</td>
    </tr>`).join("");

  document.getElementById("app").innerHTML = `
    ${nav("Resumen por Local")}
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
      <div class="px-4 py-3 bg-indigo-50 border-b font-semibold text-indigo-800">📊 Consolidado por Local</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-2 text-left">Local</th>
              <th class="px-4 py-2 text-center">Total</th>
              <th class="px-4 py-2 text-center">Enviados</th>
              <th class="px-4 py-2 text-center">Borradores</th>
              <th class="px-4 py-2 text-center">Última fecha</th>
            </tr>
          </thead>
          <tbody>${summaryRows}</tbody>
        </table>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">📋 Detalle de registros (últimos 50)</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-3 py-2 text-left">Local</th>
              <th class="px-3 py-2 text-left">Fecha</th>
              <th class="px-3 py-2 text-left">Sección</th>
              <th class="px-3 py-2 text-left">Turno</th>
              <th class="px-3 py-2 text-left">Responsable</th>
              <th class="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── CONFIG ──────────────────────────────────────────────────────────────────────
async function configuracion() {
  // Cargar restricciones desde Firestore, si no existen usar defaults
  const cfgRef = doc(db, "config", "time_restrictions");
  let restrictions = DEFAULT_RESTRICTIONS;
  try {
    const cfgSnp = await getDoc(cfgRef);
    if (cfgSnp.exists()) restrictions = cfgSnp.data().restrictions;
  } catch(_) { /* usa defaults si Firestore falla */ }

  const rows = restrictions.map((r, i) => `
    <tr>
      <td class="px-4 py-3 font-medium">${r.seccion}</td>
      <td class="px-4 py-3">${r.turno}</td>
      <td class="px-4 py-3">
        <input type="time" class="input-sm" data-i="${i}" data-f="hora_inicio" value="${r.hora_inicio}">
      </td>
      <td class="px-4 py-3">
        <input type="time" class="input-sm" data-i="${i}" data-f="hora_fin" value="${r.hora_fin}">
      </td>
      <td class="px-4 py-3 text-center">
        <input type="checkbox" class="w-4 h-4 accent-blue-600" data-i="${i}" data-f="activo" ${r.activo ? "checked" : ""}>
      </td>
    </tr>`).join("");

  document.getElementById("app").innerHTML = `
    ${nav("Configuración de Horarios")}
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">⏰ Ventanas de ingreso por sección y turno</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-2 text-left">Sección</th>
              <th class="px-4 py-2 text-left">Turno</th>
              <th class="px-4 py-2 text-left">Hora inicio</th>
              <th class="px-4 py-2 text-left">Hora fin</th>
              <th class="px-4 py-2 text-center">Activo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="p-4 border-t flex justify-between items-center">
        <p class="text-xs text-gray-500">Los cambios se guardan automáticamente en la nube. No afectan registros existentes.</p>
        <button id="btnGuardar" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          💾 Guardar cambios
        </button>
      </div>
      <div id="cfgMsg" class="hidden px-4 pb-4 text-green-700 text-sm font-medium">✓ Configuración guardada en la nube</div>
    </div>`;

  document.getElementById("btnGuardar").addEventListener("click", async () => {
    const inputs = document.querySelectorAll("[data-i][data-f]");
    inputs.forEach(el => {
      const i = Number(el.dataset.i), f = el.dataset.f;
      restrictions[i][f] = el.type === "checkbox" ? el.checked : el.value;
    });
    await setDoc(cfgRef, { restrictions });
    const msg = document.getElementById("cfgMsg");
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 3000);
  });
}

// ── Verificación horaria ────────────────────────────────────────────
async function checkHorario(seccion, turno) {
  let restrictions = DEFAULT_RESTRICTIONS;
  try {
    const cfgSnp = await getDoc(doc(db, "config", "time_restrictions"));
    if (cfgSnp.exists()) restrictions = cfgSnp.data().restrictions;
  } catch(_) { /* usa defaults si Firestore no responde */ }

  const rule = restrictions.find(r => r.seccion === seccion && r.turno === turno);
  if (!rule || !rule.activo) return { allowed: true, msg: "" };

  const now  = new Date();
  const toMin = t => { const [h,m] = t.split(":").map(Number); return h*60+m; };
  const cur   = now.getHours()*60 + now.getMinutes();
  const ini   = toMin(rule.hora_inicio);
  const fin   = toMin(rule.hora_fin);
  const ok    = ini > fin
    ? (cur >= ini || cur <= fin)
    : (cur >= ini && cur <= fin);
  return ok
    ? { allowed: true, msg: "" }
    : { allowed: false, msg: `Fuera del horario permitido para ${seccion}–${turno}. Ventana: ${rule.hora_inicio} a ${rule.hora_fin}.` };
}
