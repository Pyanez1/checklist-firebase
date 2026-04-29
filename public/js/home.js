// ── home.js  Página de inicio + helpers admin ─────────────────────────────────
import { db } from "./firebase.js";
import { collection, addDoc, doc, getDoc, getDocs, deleteDoc,
         query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { badge, statCard } from "./utils.js";

// ── Admin ─────────────────────────────────────────────────────────────────────
export const isAdmin = () => !!sessionStorage.getItem("cfg_auth");

export function showAdminModal(onSuccess) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm";
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
      <h2 class="text-lg font-bold text-gray-800 mb-1">Acceso administrador</h2>
      <p class="text-sm text-gray-500 mb-4">Ingresa la contrasena para continuar.</p>
      <input type="password" id="adminPwIn" placeholder="Contrasena"
        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3
               focus:outline-none focus:ring-2 focus:ring-blue-400">
      <div class="flex gap-2">
        <button id="adminPwBtn"
          class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm">
          Ingresar
        </button>
        <button id="adminCancelBtn"
          class="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm">
          Cancelar
        </button>
      </div>
      <p id="adminErr" class="hidden text-red-600 text-xs mt-2 font-medium">Contrasena incorrecta.</p>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById("adminPwIn")?.focus(), 80);

  document.getElementById("adminCancelBtn").onclick = () => overlay.remove();
  const verify = async () => {
    const val = document.getElementById("adminPwIn").value.trim();
    let stored = "admin1234";
    try {
      const s = await getDoc(doc(db, "config", "auth"));
      if (s.exists()) stored = s.data().password || stored;
    } catch(_) {}
    if (val === stored) {
      sessionStorage.setItem("cfg_auth", "1");
      overlay.remove();
      onSuccess();
    } else {
      document.getElementById("adminErr").classList.remove("hidden");
      document.getElementById("adminPwIn").value = "";
      document.getElementById("adminPwIn").focus();
    }
  };
  document.getElementById("adminPwBtn").onclick = verify;
  document.getElementById("adminPwIn").onkeydown = e => { if (e.key === "Enter") verify(); };
}

async function deleteSubmission(subId) {
  if (!confirm("Eliminar est y todas sus respuestas? Esta accion no se puede deshacer.")) return;
  try {
    const respDocs = await getDocs(collection(db, "submissions", subId, "responses"));
    await Promise.all(respDocs.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(db, "submissions", subId));
    home();
  } catch(e) { alert("Error al eliminar: " + e.message); }
}

// ── HOME ──────────────────────────────────────────────────────────────────────
export async function home() {
  let snpDocs = [];
  try {
    const q = query(collection(db, "submissions"), orderBy("created_at", "desc"));
    snpDocs = (await getDocs(q)).docs;
  } catch(_) {
    snpDocs = (await getDocs(collection(db, "submissions"))).docs;
  }

  const admin = isAdmin();
  const today = new Date().toISOString().slice(0, 10);

  const total    = snpDocs.length;
  const enviados = snpDocs.filter(d => d.data().estado === "enviado").length;
  const hoy      = snpDocs.filter(d => d.data().fecha === today).length;
  const conPct   = snpDocs.filter(d => d.data().pct_cumplimiento != null);
  const pctGlobal = conPct.length
    ? Math.round(conPct.reduce((s, d) => s + d.data().pct_cumplimiento, 0) / conPct.length)
    : null;
  const pctCls = pctGlobal == null ? "text-gray-400"
               : pctGlobal >= 80   ? "text-green-600"
               : pctGlobal >= 60   ? "text-yellow-500" : "text-red-600";

  // Chart data por local
  const locStats = {};
  snpDocs.forEach(d => {
    const s = d.data();
    if (!locStats[s.local]) locStats[s.local] = { SALA:{n:0,s:0}, BODEGA:{n:0,s:0} };
    const sec = ["SALA","BODEGA"].includes(s.seccion) ? s.seccion : null;
    if (sec && s.pct_cumplimiento != null) {
      locStats[s.local][sec].n++;
      locStats[s.local][sec].s += s.pct_cumplimiento;
    }
  });
  const labels   = Object.keys(locStats).sort((a,b)=>Number(a)-Number(b));
  const salaVals = labels.map(l => locStats[l].SALA.n   ? Math.round(locStats[l].SALA.s   / locStats[l].SALA.n)   : null);
  const bodVals  = labels.map(l => locStats[l].BODEGA.n ? Math.round(locStats[l].BODEGA.s / locStats[l].BODEGA.n) : null);

  // Tabla
  const rows = snpDocs.slice(0, 15).map(d => {
    const s = d.data(), p = s.pct_cumplimiento;
    const pBadge = p != null
      ? `<span class="font-semibold ${p>=80?"text-green-700":p>=60?"text-yellow-600":"text-red-600"}">${p}%</span>`
      : `<span class="text-gray-300 text-xs">--</span>`;
    const del = admin
      ? `<button class="btn-del text-xs px-2 py-0.5 bg-red-50 hover:bg-red-100
                       text-red-500 hover:text-red-700 rounded font-medium"
               data-id="${d.id}" onclick="event.stopPropagation()">Eliminar</button>` : "";
    return `<tr class="hover:bg-blue-50/40 cursor-pointer border-t border-gray-100 text-sm"
                onclick="location.hash='editar/${d.id}'">
      <td class="px-3 py-2.5 font-semibold text-blue-700">Local ${s.local}</td>
      <td class="px-3 py-2.5 text-gray-500">${s.fecha}</td>
      <td class="px-3 py-2.5">${s.seccion} &ndash; ${s.turno}</td>
      <td class="px-3 py-2.5 text-gray-500">${s.responsable || "&mdash;"}</td>
      <td class="px-3 py-2.5">${pBadge}</td>
      <td class="px-3 py-2.5">${badge(s.estado)}</td>
      ${admin ? `<td class="px-3 py-2.5">${del}</td>` : ""}
    </tr>`;
  }).join("") || `<tr><td colspan="${admin?7:6}" class="text-center py-10 text-gray-400">Sin registros</td></tr>`;

  const adminBar = admin
    ? `<div class="flex items-center gap-2 mb-4 bg-yellow-50 border border-yellow-200
                   rounded-xl px-4 py-2 text-xs text-yellow-800 font-medium">
        &#9888; Modo Admin activo &mdash; puedes eliminar registros.
        <button id="btnSalirAdmin" class="ml-auto underline hover:text-yellow-900">Salir</button>
       </div>`
    : `<div class="flex justify-end mb-2">
        <button id="btnAdmin" class="text-xs text-gray-400 hover:text-gray-600 underline">Acceso admin</button>
       </div>`;

  document.getElementById("app").innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-gray-800">Control Completitud Mercado</h1>
        <p class="text-gray-400 text-sm">Rutinas de disponibilidad por local y turno</p>
      </div>
      <div class="flex gap-2">
        <a href="#nuevo"   class="card-btn bg-blue-600 text-white text-sm px-4 py-2">&#43; Nuevo Check</a>
        <a href="#resumen" class="card-btn bg-slate-700 text-white text-sm px-4 py-2">Resumen</a>
      </div>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      ${statCard("Total registros",   total,                              "text-gray-800")}
      ${statCard("Enviados",          enviados,                           "text-green-600")}
      ${statCard("Hoy",               hoy,                                "text-blue-600")}
      ${statCard("Adherencia global", pctGlobal != null ? pctGlobal+"%" : "&mdash;", pctCls)}
    </div>
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-gray-700">Cumplimiento por Local</h2>
        <span class="text-xs text-gray-400">% adherencia promedio por secci&oacute;n</span>
      </div>
      <div style="height:220px;position:relative;"><canvas id="chartHome"></canvas></div>
    </div>
    ${adminBar}
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="panel-hdr">&#128203; Registros recientes</div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th class="px-3 py-2 text-left">Local</th>
              <th class="px-3 py-2 text-left">Fecha</th>
              <th class="px-3 py-2 text-left">Secci&oacute;n / Turno</th>
              <th class="px-3 py-2 text-left">Responsable</th>
              <th class="px-3 py-2 text-left">Adherencia</th>
              <th class="px-3 py-2 text-left">Estado</th>
              ${admin ? `<th class="px-3 py-2 text-left">Acci&oacute;n</th>` : ""}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  // Chart
  const existing = window.Chart?.getChart("chartHome");
  if (existing) existing.destroy();
  if (labels.length) {
    new window.Chart(document.getElementById("chartHome"), {
      type: "bar",
      data: {
        labels: labels.map(l => `L${l}`),
        datasets: [
          { label:"SALA",   data:salaVals, backgroundColor:"#0053e2", borderRadius:5, barPercentage:.75 },
          { label:"BODEGA", data:bodVals,  backgroundColor:"#ffc220", borderRadius:5, barPercentage:.75 },
        ],
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend: { position:"top", labels:{ boxWidth:12, font:{ size:11 } } },
          tooltip: { callbacks:{ label: ctx => `${ctx.dataset.label}: ${ctx.raw ?? "Sin dato"}%` } },
        },
        scales: {
          y: { min:0, max:100, ticks:{ callback: v => v+"%" }, grid:{ color:"#f1f5f9" } },
          x: { grid:{ display:false } },
        },
      },
    });
  } else {
    document.getElementById("chartHome").parentElement.innerHTML =
      `<p class="text-center text-gray-400 text-sm py-12">Sin datos de adherencia aun. Env&iacute;a checklists para ver el gr&aacute;fico.</p>`;
  }

  // Eventos admin
  document.getElementById("btnAdmin")?.addEventListener("click", () => showAdminModal(() => home()));
  document.getElementById("btnSalirAdmin")?.addEventListener("click", () => {
    sessionStorage.removeItem("cfg_auth"); home();
  });
  document.querySelectorAll(".btn-del").forEach(btn =>
    btn.addEventListener("click", () => deleteSubmission(btn.dataset.id))
  );
}
