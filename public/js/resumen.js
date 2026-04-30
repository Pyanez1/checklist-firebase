// ── resumen.js  Tab: Resumen (dashboard + gráfico) | Desempeño por Local ───────
import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LOCALES } from "./data.js";
import { renderTabConsolidado } from "./consolidado.js";

const BLUE  = "#0053e2";
const SPARK = "#ffc220";
const SECS  = ["SALA", "BODEGA"];

// ─ Estado de filtro de fecha ───────────────────────────────────────────────
let _filterFrom = "";
let _filterTo   = "";
let _filterMode = "rango"; // "rango" | "fecha"
let _allDocs    = null;    // cache

function tabBtnCls(active) {
  return active
    ? "res-tab px-4 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-600"
    : "res-tab px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent";
}

// ─ Carga docs (una sola vez) y computa stats con filtro activo ────────────────
async function loadAllDocs() {
  if (_allDocs) return _allDocs;
  try {
    const q = query(collection(db, "submissions"), orderBy("fecha", "desc"));
    _allDocs = (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {
    _allDocs = (await getDocs(collection(db, "submissions"))).docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }
  return _allDocs;
}

function applyFilter(docs) {
  return docs.filter(d => {
    if (_filterFrom && d.fecha < _filterFrom) return false;
    if (_filterTo   && d.fecha > _filterTo)   return false;
    return true;
  });
}

function computeStats(docs) {
  const stats = {};
  SECS.forEach(s => {
    stats[s] = { total: 0, enviados: 0, pctSum: 0, pctN: 0, locales: {} };
  });
  docs.forEach(sub => {
    const g = stats[sub.seccion];
    if (!g) return;
    g.total++;
    if (sub.estado === "enviado") g.enviados++;
    if (sub.pct_cumplimiento != null) { g.pctSum += sub.pct_cumplimiento; g.pctN++; }
    if (!g.locales[sub.local])
      g.locales[sub.local] = { total: 0, enviados: 0, pctSum: 0, pctN: 0, ultima: "", rows: [] };
    const gl = g.locales[sub.local];
    gl.total++;
    if (sub.estado === "enviado") gl.enviados++;
    if (sub.pct_cumplimiento != null) { gl.pctSum += sub.pct_cumplimiento; gl.pctN++; }
    if (!gl.ultima || sub.fecha > gl.ultima) gl.ultima = sub.fecha;
    gl.rows.push(sub);
  });
  return stats;
}

async function loadStats() {
  const all      = await loadAllDocs();
  const filtered = applyFilter(all);
  return { stats: computeStats(filtered), docs: filtered, allDocs: all };
}

// ── Helpers visuales ───────────────────────────────────────────────────────────
const pctOf  = g  => g.pctN ? Math.round(g.pctSum / g.pctN) : null;
const barCls = p  => p == null ? "bg-gray-300" : p >= 80 ? "bg-green-500" : p >= 60 ? "bg-yellow-400" : "bg-red-500";
const txtCls = p  => p == null ? "text-gray-400" : p >= 80 ? "text-green-700" : p >= 60 ? "text-yellow-600" : "text-red-600";
const badge  = st => st === "enviado"
  ? `<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">enviado</span>`
  : `<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">avance</span>`;

function destroyChart(id) {
  const existing = window.Chart?.getChart(id);
  if (existing) existing.destroy();
}

// ── ENTRY POINT ──────────────────────────────────────────────────────────────
export async function resumen() {
  _allDocs = null; // forzar recarga al navegar
  const { stats, docs } = await loadStats();
  renderShell();
  bindTabs(stats, docs);
  renderTabResumen(stats, docs);
}

function renderShell() {
  const tabs = [
    { id: "dashboard",   label: "Resumen" },
    { id: "desempeno",   label: "Desempeno por Local" },
    { id: "consolidado", label: "Consolidado" },
  ];

  const hasFilter = _filterFrom || _filterTo;

  // Sub-tabs del modo de filtro
  const modeBtnCls = active => active
    ? "px-3 py-1 text-xs font-semibold rounded-md bg-blue-600 text-white"
    : "px-3 py-1 text-xs font-medium rounded-md text-gray-500 hover:bg-gray-100";

  const filterBody = _filterMode === "fecha"
    ? `<div>
         <label class="label text-xs">Fecha</label>
         <input type="date" id="filterFecha" value="${_filterFrom}"
           class="input text-sm" style="width:160px">
       </div>`
    : `<div>
         <label class="label text-xs">Desde</label>
         <input type="date" id="filterFrom" value="${_filterFrom}"
           class="input text-sm" style="width:140px">
       </div>
       <div>
         <label class="label text-xs">Hasta</label>
         <input type="date" id="filterTo" value="${_filterTo}"
           class="input text-sm" style="width:140px">
       </div>`;

  document.getElementById("app").innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <a href="#home" class="text-blue-600 hover:underline text-sm">&larr; Inicio</a>
      <span class="text-gray-300">/</span>
      <h1 class="text-xl font-bold text-gray-800">Resumen</h1>
    </div>

    <!-- Filtro de fecha -->
    <div class="bg-white border border-gray-200 rounded-xl px-4 pt-3 pb-4 mb-5 shadow-sm">

      <!-- Modo tabs -->
      <div class="flex items-center gap-1 mb-3 pb-2 border-b border-gray-100">
        <span class="text-xs font-semibold text-gray-400 mr-2 uppercase tracking-wide">Filtrar por</span>
        <button id="modeRango" class="${modeBtnCls(_filterMode === "rango")}">Rango de fechas</button>
        <button id="modeFecha" class="${modeBtnCls(_filterMode === "fecha")}">Fecha espec&iacute;fica</button>
      </div>

      <!-- Inputs según modo -->
      <div class="flex flex-wrap gap-3 items-end">
        ${filterBody}
        <button id="btnFiltrar"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          Aplicar
        </button>
        ${hasFilter
          ? `<button id="btnLimpiar"
               class="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700
                      border border-gray-300 hover:bg-gray-50">
               Limpiar
             </button>
             <span class="text-xs text-blue-600 font-semibold self-center">Filtro activo</span>`
          : ""}
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 border-b">
      ${tabs.map((t, i) => `
        <button class="${tabBtnCls(i === 0)}" data-tab="${t.id}">${t.label}</button>
      `).join("")}
    </div>
    <div id="resContent"></div>`;
}

function bindTabs(stats, docs) {
  let activeTab = "dashboard";

  // ─ Cambio de modo del filtro ─────────────────────────────────────────────
  const switchMode = mode => {
    _filterMode = mode;
    _filterFrom = _filterTo = ""; // reset al cambiar modo
    renderShell();
    bindTabs(stats, docs); // re-bind con los mismos datos (sin recargar Firebase)
    if      (activeTab === "dashboard")   renderTabResumen(stats, docs);
    else if (activeTab === "consolidado") renderTabConsolidado(docs);
    else                                  renderTabDesempeno(stats, docs);
  };
  document.getElementById("modeRango")?.addEventListener("click", () => switchMode("rango"));
  document.getElementById("modeFecha")?.addEventListener("click", () => switchMode("fecha"));

  // ─ Aplicar filtro ──────────────────────────────────────────────────────
  const applyDateFilter = async () => {
    if (_filterMode === "fecha") {
      const d = document.getElementById("filterFecha")?.value || "";
      _filterFrom = _filterTo = d;
    } else {
      _filterFrom = document.getElementById("filterFrom")?.value || "";
      _filterTo   = document.getElementById("filterTo")?.value   || "";
    }
    const { stats: s2, docs: d2 } = await loadStats();
    renderShell();
    bindTabs(s2, d2);
    if      (activeTab === "dashboard")   renderTabResumen(s2, d2);
    else if (activeTab === "consolidado") renderTabConsolidado(d2);
    else                                  renderTabDesempeno(s2, d2);
  };
  document.getElementById("btnFiltrar")?.addEventListener("click", applyDateFilter);
  document.getElementById("filterFecha")?.addEventListener("keydown", e => e.key === "Enter" && applyDateFilter());
  document.getElementById("filterFrom")?.addEventListener("keydown",  e => e.key === "Enter" && applyDateFilter());
  document.getElementById("filterTo")?.addEventListener("keydown",    e => e.key === "Enter" && applyDateFilter());

  // ─ Limpiar ───────────────────────────────────────────────────────────
  document.getElementById("btnLimpiar")?.addEventListener("click", async () => {
    _filterFrom = _filterTo = "";
    const { stats: s2, docs: d2 } = await loadStats();
    renderShell();
    bindTabs(s2, d2);
    renderTabResumen(s2, d2);
  });

  // ─ Tabs de contenido ──────────────────────────────────────────────────
  document.querySelectorAll(".res-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll(".res-tab").forEach(b => b.className = tabBtnCls(false));
      btn.className = tabBtnCls(true);
      if      (activeTab === "dashboard")   renderTabResumen(stats, docs);
      else if (activeTab === "consolidado") renderTabConsolidado(docs);
      else                                  renderTabDesempeno(stats, docs);
    });
  });
}

// ── TAB 1: Resumen ──────────────────────────────────────────────────────────────
function renderTabResumen(stats, docs) {
  const totalDocs = docs?.length ?? 0;
  const hasFilter = _filterFrom || _filterTo;
  const periodoBanner = hasFilter
    ? `<div class="text-xs text-blue-600 bg-blue-50 border border-blue-100
                  rounded-lg px-3 py-2 mb-4 font-medium">
         Mostrando <strong>${totalDocs}</strong> registro(s) &mdash;
         ${_filterMode === "fecha" && _filterFrom
           ? `Fecha: <strong>${_filterFrom}</strong>`
           : `${_filterFrom ? `desde <strong>${_filterFrom}</strong>` : ""}
              ${_filterTo   ? `hasta <strong>${_filterTo}</strong>`   : ""}`}
       </div>` : "";
  // Panel por sección
  const secPanel = sec => {
    const g = stats[sec], p = pctOf(g);
    return `
      <div class="bg-white rounded-xl shadow-sm border p-5">
        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">${sec}</p>
        <div class="flex items-end gap-2 mb-2">
          <span class="text-5xl font-black ${txtCls(p)}">${p != null ? p + "%" : "—"}</span>
          <span class="text-sm text-gray-400 mb-1">adherencia</span>
        </div>
        <div class="h-3 bg-gray-100 rounded-full mb-4">
          <div class="${barCls(p)} h-3 rounded-full" style="width:${p || 0}%"></div>
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

  // Tabla aderencia por local (SALA + BODEGA juntos)
  const allLocales = [...new Set([
    ...Object.keys(stats.SALA.locales),
    ...Object.keys(stats.BODEGA.locales),
  ])].sort((a, b) => Number(a) - Number(b));

  const localRows = allLocales.map(loc => {
    const sa = stats.SALA.locales[loc],   ps = sa ? pctOf(sa) : null;
    const bo = stats.BODEGA.locales[loc], pb = bo ? pctOf(bo) : null;
    const miniBar = (p) => p != null
      ? `<div class="flex items-center gap-1">
           <div class="flex-1 h-2 bg-gray-100 rounded-full min-w-16">
             <div class="${barCls(p)} h-2 rounded-full" style="width:${p}%"></div>
           </div>
           <span class="text-xs font-bold w-9 text-right ${txtCls(p)}">${p}%</span>
         </div>`
      : `<span class="text-xs text-gray-300">Sin dato</span>`;
    return `<tr class="border-t hover:bg-gray-50">
      <td class="px-3 py-2 font-bold text-blue-700 text-sm">Local ${loc}</td>
      <td class="px-3 py-2 w-40">${miniBar(ps)}</td>
      <td class="px-3 py-2 w-40">${miniBar(pb)}</td>
      <td class="px-3 py-2 text-center text-xs text-gray-500">${sa?.ultima || bo?.ultima || "—"}</td>
    </tr>`;
  }).join("") || `<tr><td colspan="4" class="text-center py-6 text-gray-400">Sin registros</td></tr>`;

  document.getElementById("resContent").innerHTML = `
    ${periodoBanner}
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      ${secPanel("SALA")}${secPanel("BODEGA")}
    </div>

    <!-- Gráfico adherencia por local -->
    <div class="bg-white rounded-xl shadow-sm border p-5 mb-6">
      <h2 class="font-semibold text-gray-700 mb-4">Adherencia por Local</h2>
      <div style="height:280px; position:relative;">
        <canvas id="chartAdherencia"></canvas>
      </div>
    </div>

    <!-- Tabla por local -->
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
        Adherencia por Local
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th class="px-3 py-2 text-left">Local</th>
              <th class="px-3 py-2 text-left">SALA</th>
              <th class="px-3 py-2 text-left">BODEGA</th>
              <th class="px-3 py-2 text-center">Ultima fecha</th>
            </tr>
          </thead>
          <tbody>${localRows}</tbody>
        </table>
      </div>
    </div>`;

  // Chart.js — gráfico de barras agrupado
  destroyChart("chartAdherencia");
  const labels    = allLocales.map(l => `L${l}`);
  const salaVals  = allLocales.map(l => { const g = stats.SALA.locales[l];   return g ? pctOf(g) : null; });
  const bodVals   = allLocales.map(l => { const g = stats.BODEGA.locales[l]; return g ? pctOf(g) : null; });

  new window.Chart(document.getElementById("chartAdherencia"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "SALA",   data: salaVals, backgroundColor: BLUE,  borderRadius: 5, barPercentage: 0.7 },
        { label: "BODEGA", data: bodVals,  backgroundColor: SPARK, borderRadius: 5, barPercentage: 0.7 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw ?? "Sin dato"}%` } },
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { callback: v => v + "%" },
          grid: { color: "#f3f4f6" },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── TAB 2: Desempeño por Local ─────────────────────────────────────────────────
function renderTabDesempeno(stats, docs) {
  const localOpts = LOCALES.map(l =>
    `<option value="${l}">Local ${l}</option>`).join("");

  document.getElementById("resContent").innerHTML = `
    <div class="flex gap-3 items-center mb-5">
      <label class="text-sm font-medium text-gray-600">Seleccionar local:</label>
      <select id="selLocal" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
        <option value="">-- Seleccionar --</option>${localOpts}
      </select>
    </div>
    <div id="localPanel" class="text-gray-400 text-sm">Selecciona un local para ver su historial.</div>`;

  document.getElementById("selLocal").addEventListener("change", e => {
    const loc = e.target.value;
    if (!loc) return;
    renderLocalPanel(loc, stats, docs);
  });
}

function renderLocalPanel(loc, stats, docs) {
  const locDocs = docs.filter(d => String(d.local) === String(loc))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  // Métricas rápidas
  const sa = stats.SALA.locales[loc],   ps = sa ? pctOf(sa) : null;
  const bo = stats.BODEGA.locales[loc], pb = bo ? pctOf(bo) : null;
  const totalEnv  = locDocs.filter(d => d.estado === "enviado").length;

  const statCard = (label, val, cls) =>
    `<div class="bg-white rounded-xl border p-4 text-center">
       <div class="text-2xl font-black ${cls}">${val}</div>
       <div class="text-xs text-gray-400 mt-1">${label}</div>
     </div>`;

  const tableRows = locDocs.map(s =>
    `<tr class="border-t hover:bg-gray-50 cursor-pointer" onclick="location.hash='editar/${s.id}'">
      <td class="px-3 py-2 text-xs text-gray-500">${s.fecha}</td>
      <td class="px-3 py-2">${s.seccion}</td>
      <td class="px-3 py-2">${s.turno}</td>
      <td class="px-3 py-2">${s.responsable || "—"}</td>
      <td class="px-3 py-2 text-center font-bold ${txtCls(s.pct_cumplimiento ?? null)}">
        ${s.pct_cumplimiento != null ? s.pct_cumplimiento + "%" : "—"}
      </td>
      <td class="px-3 py-2">${badge(s.estado)}</td>
    </tr>`).join("") || `<tr><td colspan="6" class="text-center py-6 text-gray-400">Sin registros</td></tr>`;

  document.getElementById("localPanel").innerHTML = `
    <!-- Métricas -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      ${statCard("Registros totales", locDocs.length, "text-gray-800")}
      ${statCard("Enviados",          totalEnv,       "text-green-700")}
      ${statCard("Adherencia SALA",   ps != null ? ps + "%" : "—", txtCls(ps))}
      ${statCard("Adherencia BODEGA", pb != null ? pb + "%" : "—", txtCls(pb))}
    </div>

    <!-- Gráfico tendencia -->
    <div class="bg-white rounded-xl shadow-sm border p-5 mb-5">
      <h3 class="font-semibold text-gray-700 mb-3">Tendencia de Adherencia — Local ${loc}</h3>
      <div style="height:240px; position:relative;">
        <canvas id="chartTendencia"></canvas>
      </div>
    </div>

    <!-- Historial -->
    <div class="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div class="px-4 py-3 bg-gray-50 border-b font-semibold text-gray-700">
        Historial de registros — Local ${loc}
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th class="px-3 py-2 text-left">Fecha</th>
              <th class="px-3 py-2 text-left">Seccion</th>
              <th class="px-3 py-2 text-left">Turno</th>
              <th class="px-3 py-2 text-left">Responsable</th>
              <th class="px-3 py-2 text-center">Adherencia</th>
              <th class="px-3 py-2 text-left">Estado</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;

  // Gráfico de tendencia por sección
  destroyChart("chartTendencia");
  const enviados  = locDocs.filter(d => d.pct_cumplimiento != null)
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));

  const fechas    = [...new Set(enviados.map(d => d.fecha))].sort();
  const avgBy     = (sec) => fechas.map(f => {
    const pts = enviados.filter(d => d.fecha === f && d.seccion === sec);
    if (!pts.length) return null;
    return Math.round(pts.reduce((s, d) => s + d.pct_cumplimiento, 0) / pts.length);
  });

  new window.Chart(document.getElementById("chartTendencia"), {
    type: "line",
    data: {
      labels: fechas,
      datasets: [
        {
          label: "SALA", data: avgBy("SALA"),
          borderColor: BLUE, backgroundColor: BLUE + "22",
          tension: 0.3, fill: true, pointRadius: 4, spanGaps: true,
        },
        {
          label: "BODEGA", data: avgBy("BODEGA"),
          borderColor: SPARK, backgroundColor: SPARK + "22",
          tension: 0.3, fill: true, pointRadius: 4, spanGaps: true,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.raw ?? "Sin dato"}%` } },
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { callback: v => v + "%" },
          grid: { color: "#f3f4f6" },
        },
        x: { grid: { display: false } },
      },
    },
  });
}
