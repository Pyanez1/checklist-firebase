// ── resumen.js  Tab: Resumen (dashboard + gráfico) | Desempeño por Local ───────
import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { LOCALES } from "./data.js";

const BLUE   = "#0053e2"; // Walmart blue
const SPARK  = "#ffc220"; // Walmart spark
const SECS   = ["SALA", "BODEGA"];

function tabBtnCls(active) {
  return active
    ? "res-tab px-4 py-2 text-sm font-semibold border-b-2 border-blue-600 text-blue-600"
    : "res-tab px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 border-b-2 border-transparent";
}

// ── Carga y agrega datos ───────────────────────────────────────────────────────
async function loadStats() {
  let docs = [];
  try {
    const q = query(collection(db, "submissions"), orderBy("fecha", "desc"));
    docs = (await getDocs(q)).docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {
    docs = (await getDocs(collection(db, "submissions"))).docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
  }

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
  return { stats, docs };
}

// ── Helpers visuales ───────────────────────────────────────────────────────────
const pctOf  = g  => g.pctN ? Math.round(g.pctSum / g.pctN) : null;
const barCls = p  => p == null ? "bg-gray-300" : p >= 80 ? "bg-green-500" : p >= 60 ? "bg-yellow-400" : "bg-red-500";
const txtCls = p  => p == null ? "text-gray-400" : p >= 80 ? "text-green-700" : p >= 60 ? "text-yellow-600" : "text-red-600";
const badge  = st => st === "enviado"
  ? `<span class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">enviado</span>`
  : `<span class="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-medium">borrador</span>`;

function destroyChart(id) {
  const existing = window.Chart?.getChart(id);
  if (existing) existing.destroy();
}

// ── ENTRY POINT ────────────────────────────────────────────────────────────────
export async function resumen() {
  const { stats, docs } = await loadStats();
  renderShell();
  bindTabs(stats, docs);
  renderTabResumen(stats);
}

function renderShell() {
  const tabs = [
    { id: "dashboard", label: "Resumen" },
    { id: "desempeno", label: "Desempeno por Local" },
  ];
  document.getElementById("app").innerHTML = `
    <div class="flex items-center gap-3 mb-4">
      <a href="#home" class="text-blue-600 hover:underline text-sm">&larr; Inicio</a>
      <span class="text-gray-400">/</span>
      <h1 class="text-xl font-bold text-gray-800">Resumen</h1>
    </div>
    <div class="flex gap-1 mb-6 border-b">
      ${tabs.map((t, i) => `
        <button class="${tabBtnCls(i === 0)}" data-tab="${t.id}">${t.label}</button>
      `).join("")}
    </div>
    <div id="resContent"></div>`;
}

function bindTabs(stats, docs) {
  document.querySelectorAll(".res-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".res-tab").forEach(b => b.className = tabBtnCls(false));
      btn.className = tabBtnCls(true);
      if (btn.dataset.tab === "dashboard") renderTabResumen(stats);
      else                                 renderTabDesempeno(stats, docs);
    });
  });
}

// ── TAB 1: Resumen ─────────────────────────────────────────────────────────────
function renderTabResumen(stats) {
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
