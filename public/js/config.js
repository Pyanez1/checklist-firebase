// ── Config page: clave + tabs Horarios / Rutinas / Seguridad ──────────────────
import { db } from "./firebase.js";
import { getDoc, setDoc, doc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { ITEMS_SALA, ITEMS_BODEGA, DEFAULT_RESTRICTIONS, TURNOS } from "./data.js";

const DEFAULT_PW   = "admin1234";
const SECCIONES    = ["SALA", "BODEGA"];
const AUTH_KEY     = "cfg_auth";

// ── Helpers ────────────────────────────────────────────────────────────────────
const nav = () => `
  <div class="flex items-center gap-3 mb-6">
    <a href="#home" class="text-blue-600 hover:underline text-sm">&larr; Inicio</a>
    <span class="text-gray-400">/</span>
    <h1 class="text-xl font-bold text-gray-800">Configuracion</h1>
    <button id="btnLogout" class="ml-auto text-xs text-gray-400 hover:text-red-500 underline">
      Cerrar sesion
    </button>
  </div>`;

const tabBtnClass = (active) => active
  ? "tab-btn px-4 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-600"
  : "tab-btn px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent";

// Normaliza un item de data.js al formato de Firestore
function normalizeItem(item) {
  return {
    id:          item.id,
    turno:       item.turno,
    horario:     item.horario     || "",
    rutina:      item.rutina      || "",
    accionable:  item.accionable  || "",
    responsable: item.responsable || "",
    control:     item.control     || "",
  };
}

// Carga rutinas desde Firestore; si no existen las inicializa desde data.js
export async function loadRutinas() {
  try {
    const snap = await getDoc(doc(db, "config", "rutinas"));
    if (snap.exists()) return snap.data();
  } catch(_) {}

  // Primera vez: inicializar desde data.js
  const initial = {};
  for (const sec of SECCIONES) {
    const src = sec === "SALA" ? ITEMS_SALA : ITEMS_BODEGA;
    for (const t of TURNOS) {
      initial[`${sec}_${t}`] = src.filter(i => i.turno === t).map(normalizeItem);
    }
  }
  try { await setDoc(doc(db, "config", "rutinas"), initial); } catch(_) {}
  return initial;
}

// ── Entry point ────────────────────────────────────────────────────────────────
export async function configuracion() {
  if (!sessionStorage.getItem(AUTH_KEY)) { renderGate(); return; }
  await renderConfig("horarios");
}

// ── Password gate ──────────────────────────────────────────────────────────────
function renderGate(msg = "") {
  document.getElementById("app").innerHTML = `
    <div class="flex justify-center py-16">
      <div class="bg-white rounded-xl shadow-sm border p-6 w-full max-w-sm">
        <h2 class="text-lg font-bold text-gray-800 mb-1">Configuracion</h2>
        <p class="text-gray-500 text-sm mb-4">Acceso restringido. Ingresa la contrasena.</p>
        <input type="password" id="pwIn" placeholder="Contrasena"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400">
        <button id="pwBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm">
          Ingresar
        </button>
        ${msg ? `<p class="text-red-600 text-sm mt-2">${msg}</p>` : ""}
        <a href="#home" class="block text-center text-blue-600 underline text-sm mt-3">&larr; Volver al inicio</a>
      </div>
    </div>`;

  const go = async () => {
    const val = document.getElementById("pwIn").value.trim();
    let stored = DEFAULT_PW;
    try {
      const s = await getDoc(doc(db, "config", "auth"));
      if (s.exists()) stored = s.data().password || DEFAULT_PW;
    } catch(_) {}
    if (val === stored) {
      sessionStorage.setItem(AUTH_KEY, "1");
      await renderConfig("horarios");
    } else {
      renderGate("Contrasena incorrecta. Intenta de nuevo.");
    }
  };
  document.getElementById("pwBtn").addEventListener("click", go);
  document.getElementById("pwIn").addEventListener("keydown", e => { if (e.key === "Enter") go(); });
}

// ── Shell de config con tabs ───────────────────────────────────────────────────
async function renderConfig(activeTab) {
  const tabs = [
    { id: "horarios",  label: "Horarios" },
    { id: "rutinas",   label: "Rutinas" },
    { id: "seguridad", label: "Seguridad" },
  ];
  document.getElementById("app").innerHTML = `
    ${nav()}
    <div class="flex gap-1 mb-6 border-b">
      ${tabs.map(t => `
        <button class="${tabBtnClass(t.id === activeTab)}" data-tab="${t.id}">
          ${t.label}
        </button>`).join("")}
    </div>
    <div id="tabContent"></div>`;

  document.getElementById("btnLogout").addEventListener("click", () => {
    sessionStorage.removeItem(AUTH_KEY);
    renderGate();
  });
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.className = tabBtnClass(false);
      });
      btn.className = tabBtnClass(true);
      loadTab(btn.dataset.tab);
    });
  });
  loadTab(activeTab);
}

function loadTab(tab) {
  if (tab === "horarios")  renderHorarios();
  if (tab === "rutinas")   renderRutinas();
  if (tab === "seguridad") renderSeguridad();
}

// ── TAB: Horarios ──────────────────────────────────────────────────────────────
async function renderHorarios() {
  let restrictions = DEFAULT_RESTRICTIONS;
  const cfgRef = doc(db, "config", "time_restrictions");
  try {
    const s = await getDoc(cfgRef);
    if (s.exists()) restrictions = s.data().restrictions;
  } catch(_) {}

  document.getElementById("tabContent").innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
        Ventanas de ingreso por seccion y turno
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-600">
            <tr>
              <th class="px-4 py-2 text-left">Seccion</th>
              <th class="px-4 py-2 text-left">Turno</th>
              <th class="px-4 py-2 text-left">Inicio</th>
              <th class="px-4 py-2 text-left">Fin</th>
              <th class="px-4 py-2 text-center">Activo</th>
            </tr>
          </thead>
          <tbody>
            ${restrictions.map((r, i) => `
              <tr>
                <td class="px-4 py-3 font-medium">${r.seccion}</td>
                <td class="px-4 py-3">${r.turno}</td>
                <td class="px-4 py-3">
                  <input type="time" data-i="${i}" data-f="hora_inicio" value="${r.hora_inicio}"
                    class="border border-gray-300 rounded px-2 py-1 text-xs w-28">
                </td>
                <td class="px-4 py-3">
                  <input type="time" data-i="${i}" data-f="hora_fin" value="${r.hora_fin}"
                    class="border border-gray-300 rounded px-2 py-1 text-xs w-28">
                </td>
                <td class="px-4 py-3 text-center">
                  <input type="checkbox" data-i="${i}" data-f="activo"
                    class="w-4 h-4 accent-blue-600" ${r.activo ? "checked" : ""}>
                </td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="p-4 border-t flex justify-between items-center">
        <p class="text-xs text-gray-500">Los cambios no afectan registros existentes.</p>
        <button id="btnGuardarH" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          Guardar horarios
        </button>
      </div>
      <div id="msgH" class="hidden px-4 pb-3 text-green-700 text-sm font-medium">Guardado correctamente.</div>
    </div>`;

  document.getElementById("btnGuardarH").addEventListener("click", async () => {
    document.querySelectorAll("[data-i][data-f]").forEach(el => {
      const i = Number(el.dataset.i), f = el.dataset.f;
      restrictions[i][f] = el.type === "checkbox" ? el.checked : el.value;
    });
    await setDoc(cfgRef, { restrictions });
    const m = document.getElementById("msgH");
    m.classList.remove("hidden");
    setTimeout(() => m.classList.add("hidden"), 3000);
  });
}

// ── TAB: Rutinas ───────────────────────────────────────────────────────────────
let _rutinas = null;
let _sec = "SALA", _tur = "AM";

async function renderRutinas() {
  if (!_rutinas) _rutinas = await loadRutinas();
  showRutinasTable();
}

function showRutinasTable() {
  const key   = `${_sec}_${_tur}`;
  const items = _rutinas[key] || [];

  document.getElementById("tabContent").innerHTML = `
    <div class="flex gap-3 mb-4 flex-wrap items-center">
      <select id="selSec" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
        ${SECCIONES.map(s => `<option ${s===_sec?"selected":""}>${s}</option>`).join("")}
      </select>
      <select id="selTur" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
        ${TURNOS.map(t => `<option ${t===_tur?"selected":""}>${t}</option>`).join("")}
      </select>
      <button id="btnAdd" class="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
        + Agregar rutina
      </button>
      <button id="btnSaveR" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
        Guardar cambios
      </button>
    </div>
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm" id="tblRutinas">
          <thead class="bg-gray-50 text-gray-600 text-xs">
            <tr>
              <th class="px-3 py-2 text-left w-16">ID</th>
              <th class="px-3 py-2 text-left w-24">Horario</th>
              <th class="px-3 py-2 text-left">Rutina</th>
              <th class="px-3 py-2 text-left">Responsable</th>
              <th class="px-3 py-2 text-center w-24">Acciones</th>
            </tr>
          </thead>
          <tbody id="tbodyR">
            ${items.map((item, idx) => rowHtml(item, idx, false)).join("")
              || `<tr><td colspan="5" class="text-center py-6 text-gray-400">Sin rutinas. Agrega una.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
    <div id="msgR" class="hidden mt-3 text-green-700 text-sm font-medium">Rutinas guardadas en la nube.</div>`;

  document.getElementById("selSec").addEventListener("change", e => { _sec = e.target.value; showRutinasTable(); });
  document.getElementById("selTur").addEventListener("change", e => { _tur = e.target.value; showRutinasTable(); });
  document.getElementById("btnAdd").addEventListener("click", () => addRutina());
  document.getElementById("btnSaveR").addEventListener("click", () => saveRutinas());
  bindRowActions();
}

function rowHtml(item, idx, editing) {
  if (editing) {
    return `<tr data-idx="${idx}" class="bg-blue-50">
      <td class="px-3 py-2"><input class="border rounded px-1 py-0.5 w-14 text-xs" data-f="id" value="${item.id}"></td>
      <td class="px-3 py-2"><input class="border rounded px-1 py-0.5 w-20 text-xs" data-f="horario" value="${item.horario}"></td>
      <td class="px-3 py-2">
        <input class="border rounded px-1 py-0.5 w-full text-xs mb-1" data-f="rutina" value="${item.rutina}">
        <input class="border rounded px-1 py-0.5 w-full text-xs mb-1" placeholder="Accionable" data-f="accionable" value="${item.accionable}">
        <input class="border rounded px-1 py-0.5 w-full text-xs" placeholder="Control" data-f="control" value="${item.control}">
      </td>
      <td class="px-3 py-2"><input class="border rounded px-1 py-0.5 w-full text-xs" data-f="responsable" value="${item.responsable}"></td>
      <td class="px-3 py-2 text-center space-y-1">
        <button class="btn-save block w-full bg-green-600 text-white text-xs px-2 py-1 rounded" data-idx="${idx}">OK</button>
        <button class="btn-cancel block w-full bg-gray-300 text-gray-700 text-xs px-2 py-1 rounded" data-idx="${idx}">X</button>
      </td>
    </tr>`;
  }
  return `<tr data-idx="${idx}" class="hover:bg-gray-50 border-t">
    <td class="px-3 py-2 font-bold text-blue-600 text-xs">${item.id}</td>
    <td class="px-3 py-2 text-gray-500 text-xs">${item.horario}</td>
    <td class="px-3 py-2">
      <p class="font-medium">${item.rutina}</p>
      <p class="text-xs text-gray-400">${item.accionable}</p>
    </td>
    <td class="px-3 py-2 text-xs text-gray-500">${item.responsable}</td>
    <td class="px-3 py-2 text-center space-x-1 whitespace-nowrap">
      <button class="btn-edit bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded" data-idx="${idx}">Editar</button>
      <button class="btn-del bg-red-100 text-red-600 text-xs px-2 py-1 rounded" data-idx="${idx}">Eliminar</button>
    </td>
  </tr>`;
}

function bindRowActions() {
  document.querySelectorAll(".btn-edit").forEach(b => {
    b.addEventListener("click", () => {
      const idx  = Number(b.dataset.idx);
      const key  = `${_sec}_${_tur}`;
      const row  = document.querySelector(`tr[data-idx="${idx}"]`);
      row.outerHTML = rowHtml(_rutinas[key][idx], idx, true);
      bindRowActions();
    });
  });
  document.querySelectorAll(".btn-save").forEach(b => {
    b.addEventListener("click", () => {
      const idx  = Number(b.dataset.idx);
      const key  = `${_sec}_${_tur}`;
      const row  = document.querySelector(`tr[data-idx="${idx}"]`);
      ["id","horario","rutina","accionable","control","responsable"].forEach(f => {
        const el = row.querySelector(`[data-f="${f}"]`);
        if (el) _rutinas[key][idx][f] = el.value.trim();
      });
      row.outerHTML = rowHtml(_rutinas[key][idx], idx, false);
      bindRowActions();
    });
  });
  document.querySelectorAll(".btn-cancel").forEach(b => {
    b.addEventListener("click", () => {
      const idx  = Number(b.dataset.idx);
      const key  = `${_sec}_${_tur}`;
      const row  = document.querySelector(`tr[data-idx="${idx}"]`);
      row.outerHTML = rowHtml(_rutinas[key][idx], idx, false);
      bindRowActions();
    });
  });
  document.querySelectorAll(".btn-del").forEach(b => {
    b.addEventListener("click", () => {
      const idx = Number(b.dataset.idx);
      const key = `${_sec}_${_tur}`;
      if (confirm("Eliminar esta rutina?")) {
        _rutinas[key].splice(idx, 1);
        showRutinasTable();
      }
    });
  });
}

function addRutina() {
  const key  = `${_sec}_${_tur}`;
  const n    = (_rutinas[key]?.length || 0) + 1;
  const pref = _sec === "SALA" ? "S" : "B";
  if (!_rutinas[key]) _rutinas[key] = [];
  _rutinas[key].push({
    id: `${pref}${String(n).padStart(2,"0")}`, turno: _tur,
    horario:"", rutina:"Nueva rutina", accionable:"", responsable:"", control:""
  });
  showRutinasTable();
  // Abrir en modo edicion el ultimo item
  const lastIdx = _rutinas[key].length - 1;
  const row = document.querySelector(`tr[data-idx="${lastIdx}"]`);
  if (row) { row.outerHTML = rowHtml(_rutinas[key][lastIdx], lastIdx, true); bindRowActions(); }
}

async function saveRutinas() {
  try {
    await setDoc(doc(db, "config", "rutinas"), _rutinas);
    const m = document.getElementById("msgR");
    m.classList.remove("hidden");
    setTimeout(() => m.classList.add("hidden"), 3000);
  } catch(e) { alert("Error al guardar: " + e.message); }
}

// ── TAB: Seguridad ─────────────────────────────────────────────────────────────
function renderSeguridad() {
  document.getElementById("tabContent").innerHTML = `
    <div class="bg-white rounded-xl shadow-sm border p-6 max-w-sm">
      <h3 class="font-semibold text-gray-800 mb-4">Cambiar contrasena</h3>
      <div class="space-y-3">
        <input type="password" id="pwNueva" placeholder="Nueva contrasena"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
        <input type="password" id="pwConfirm" placeholder="Confirmar contrasena"
          class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
        <button id="btnCambiar" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold text-sm">
          Cambiar contrasena
        </button>
        <div id="msgSeg" class="hidden text-sm font-medium"></div>
      </div>
    </div>`;

  document.getElementById("btnCambiar").addEventListener("click", async () => {
    const nueva    = document.getElementById("pwNueva").value.trim();
    const confirm2 = document.getElementById("pwConfirm").value.trim();
    const msg      = document.getElementById("msgSeg");
    msg.classList.remove("hidden");
    if (!nueva || nueva.length < 4) {
      msg.className = "text-sm font-medium text-red-600";
      msg.textContent = "La contrasena debe tener al menos 4 caracteres.";
      return;
    }
    if (nueva !== confirm2) {
      msg.className = "text-sm font-medium text-red-600";
      msg.textContent = "Las contrasenas no coinciden.";
      return;
    }
    try {
      await setDoc(doc(db, "config", "auth"), { password: nueva });
      msg.className = "text-sm font-medium text-green-600";
      msg.textContent = "Contrasena actualizada correctamente.";
      document.getElementById("pwNueva").value = "";
      document.getElementById("pwConfirm").value = "";
    } catch(e) {
      msg.className = "text-sm font-medium text-red-600";
      msg.textContent = "Error: " + e.message;
    }
  });
}
