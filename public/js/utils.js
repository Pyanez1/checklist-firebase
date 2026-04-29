// ── utils.js  Helpers de UI compartidos ───────────────────────────────────────

export function nav(title) {
  return `
  <div class="flex items-center gap-2 mb-5">
    <a href="#home" class="text-blue-600 hover:underline text-sm">&larr; Inicio</a>
    <span class="text-gray-400">/</span>
    <h1 class="text-xl font-bold text-gray-800">${title}</h1>
  </div>`;
}

export function badge(estado) {
  if (estado === "enviado") {
    return `<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">enviado</span>`;
  }
  // "avance" + retrocompat con registros viejos "borrador"
  return `<span class="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-800">avance</span>`;
}

export const statCard = (label, val, cls = "text-gray-800") => `
  <div class="stat-card">
    <p class="text-xs text-gray-400 font-medium uppercase tracking-wide">${label}</p>
    <p class="text-3xl font-black ${cls}">${val}</p>
  </div>`;
