// ── consolidado.js — Tab Consolidado del Resumen ─────────────────────────────
import { LOCALES } from "./data.js";

const TURNOS_ORDER = ["AM", "PM", "NOCHE"];

const fmtDate = iso => {
  const meses = ["Ene","Feb","Mar","Abr","May","Jun",
                  "Jul","Ago","Sep","Oct","Nov","Dic"];
  const [, mm, dd] = iso.split("-");
  return `${parseInt(dd)} ${meses[parseInt(mm) - 1]}`;
};

const cellCls = p => p == null
  ? "bg-gray-50 text-gray-300"
  : p >= 80 ? "bg-green-100 text-green-800"
  : p >= 60 ? "bg-yellow-100 text-yellow-700"
  :           "bg-red-100 text-red-700";

function buildSection(seccion, dates, docs) {
  // Pivot: local → turno → fecha → [pcts]
  const pivot = {};
  LOCALES.forEach(l => {
    pivot[l] = {};
    TURNOS_ORDER.forEach(t => { pivot[l][t] = {}; });
  });

  docs.filter(d => d.seccion === seccion && d.pct_cumplimiento != null)
      .forEach(d => {
        if (!pivot[d.local]) return;
        const arr = pivot[d.local][d.turno][d.fecha] ||= [];
        arr.push(d.pct_cumplimiento);
      });

  const pctOf = (local, turno, fecha) => {
    const arr = pivot[local]?.[turno]?.[fecha];
    if (!arr?.length) return null;
    return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
  };

  const turnoHeaders = TURNOS_ORDER.map(t =>
    `<th colspan="${dates.length}"
         class="px-2 py-2 text-center text-xs font-black text-white
                ${t==="AM"?"bg-blue-700":t==="PM"?"bg-indigo-700":"bg-slate-700"}
                border-r border-white/20">${t}</th>`
  ).join("");

  const dateHeaders = TURNOS_ORDER.map(t =>
    dates.map(f =>
      `<th class="px-2 py-1.5 text-center text-xs font-semibold text-white/80
                  ${t==="AM"?"bg-blue-800":t==="PM"?"bg-indigo-800":"bg-slate-800"}
                  whitespace-nowrap border-r border-white/10">
         ${fmtDate(f)}
       </th>`
    ).join("")
  ).join("");

  const dataRows = LOCALES.map(local => {
    const cells = TURNOS_ORDER.map(turno =>
      dates.map(fecha => {
        const p = pctOf(local, turno, fecha);
        return `<td class="px-2 py-2 text-center text-xs font-bold
                          border-r border-gray-100 ${cellCls(p)}">
                  ${p != null ? p + "%" : "—"}
                </td>`;
      }).join("")
    ).join("");

    return `<tr class="border-t border-gray-100 hover:brightness-95 transition-all">
      <td class="px-3 py-2 text-sm font-semibold text-gray-800 whitespace-nowrap
                 bg-white border-r border-gray-200 sticky left-0 z-10">${local}</td>
      ${cells}
    </tr>`;
  }).join("");

  const totalCells = TURNOS_ORDER.map(turno =>
    dates.map(fecha => {
      const vals = LOCALES.map(l => pctOf(l, turno, fecha)).filter(v => v != null);
      const avg  = vals.length
        ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
        : null;
      return `<td class="px-2 py-2 text-center text-xs font-black
                        border-r border-gray-200 ${cellCls(avg)}">
                ${avg != null ? avg + "%" : "—"}
              </td>`;
    }).join("")
  ).join("");

  const accentBar = seccion === "SALA" ? "bg-[#0053e2]" : "bg-[#ffc220]";

  return `
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-1 h-7 ${accentBar} rounded-full"></div>
        <h2 class="font-black text-gray-800 text-base">Consolidado ${seccion}</h2>
        <span class="text-xs text-gray-400 ml-1">
          ${dates.length} fecha(s) &middot; ${TURNOS_ORDER.length} turnos
        </span>
      </div>
      <div class="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table class="text-sm border-collapse min-w-full">
          <thead>
            <tr>
              <th rowspan="2" class="px-3 py-2 text-left text-xs font-bold text-white
                                     bg-gray-700 border-r border-gray-600
                                     sticky left-0 z-20 min-w-44">Local</th>
              ${turnoHeaders}
            </tr>
            <tr>${dateHeaders}</tr>
          </thead>
          <tbody>
            ${dataRows}
            <tr class="border-t-2 border-gray-300">
              <td class="px-3 py-2 text-xs font-black text-gray-700
                         border-r border-gray-200 sticky left-0 z-10 bg-gray-100">
                Mercado Sur
              </td>
              ${totalCells}
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

const leyenda = `
  <div class="flex flex-wrap gap-3 mb-5 text-xs">
    <span class="px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold">&#8805; 80% Cumple</span>
    <span class="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 font-semibold">60&ndash;79% Parcial</span>
    <span class="px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold">&lt; 60% No cumple</span>
    <span class="px-3 py-1 rounded-full bg-gray-100 text-gray-400 font-semibold">&mdash; Sin registro</span>
  </div>`;

export function renderTabConsolidado(docs) {
  const dates = [...new Set(docs.map(d => d.fecha).filter(Boolean))].sort();

  if (!dates.length) {
    document.getElementById("resContent").innerHTML =
      `<div class="text-center py-16 text-gray-400">
         <p class="text-4xl mb-3">&#128203;</p>
         <p class="font-semibold">Sin registros para el per&iacute;odo seleccionado</p>
         <p class="text-sm mt-1">Usa el filtro de fecha para ver el consolidado.</p>
       </div>`;
    return;
  }

  document.getElementById("resContent").innerHTML =
    leyenda +
    buildSection("SALA",   dates, docs) +
    buildSection("BODEGA", dates, docs);
}
