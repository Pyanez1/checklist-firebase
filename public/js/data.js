// ── Locales y turnos ────────────────────────────────────────────────────────
export const LOCALES = [93, 94, 96, 99, 120, 121, 456, 618, 670, 929];
export const TURNOS  = ["AM", "PM", "NOCHE"];

// ── Ítems SALA ──────────────────────────────────────────────────────────────
export const ITEMS_SALA = [
  { id:"S01", turno:"AM",    horario:"07:30–08:00", rutina:"Análisis de Datos",
    accionable:"Descargar y analizar reportes de disponibilidad (DPP), ítems futuros y quiebres para definir estrategia operativa",
    responsable:"Jefe sala / Encargado / Subgerente", control:"Registro en bitácora o sistema" },
  { id:"S02", turno:"AM",    horario:"08:00–08:15", rutina:"Planificación de Sala",
    accionable:"Comunicar prioridades de reposición y metas de completitud al equipo",
    responsable:"Jefe sala / Encargado / Subgerente", control:"Evidencia fotográfica en grupo interno" },
  { id:"S03", turno:"AM",    horario:"08:15–09:00", rutina:"Primer Ajuste de Disponibilidad (DPO)",
    accionable:"Ejecutar primer ajuste para sincronizar sistema con inventario real de góndola, responder check grupo Ecommerce y completar ficha en OneDrive",
    responsable:"Jefe / Encargado Ecommerce", control:"Registro en OneDrive y grupo Ecommerce" },
  { id:"S04", turno:"AM",    horario:"08:15–09:00", rutina:"Caminata de Validación",
    accionable:"Verificar reposición en categorías críticas, detectar quiebres visuales y asegurar disponibilidad en góndola",
    responsable:"Subgerente / Jefe en turno", control:"Registro en grupo interno y medición avance cada 2 horas" },
  { id:"S05", turno:"AM",    horario:"09:00–12:00", rutina:"Gestión de Disponibilidad",
    accionable:"Reporte MAX: informar categorías bajas y avance en corrección de estantes. Llenado de góndola (DPP), inyección de picks y corrección de inconsistencias",
    responsable:"Jefa sala / Subgerente", control:"Evidencia de avances por categoría (reporte)" },
  { id:"S06", turno:"AM",    horario:"10:00–13:00", rutina:"Gestión Continua de Ítems Futuros",
    accionable:"Asegurar disponibilidad en góndola para ventanas horarias 10:00–18:00",
    responsable:"Jefe de Sala", control:"Registro de productos disponibles vs pendientes" },
  { id:"S07", turno:"AM",    horario:"13:00–14:00", rutina:"Segundo Ajuste de Disponibilidad (DPO)",
    accionable:"Ajuste clave de mediodía, responder check grupo Ecommerce y completar ficha en OneDrive",
    responsable:"Jefe Ecommerce", control:"Registro en OneDrive" },
  { id:"S08", turno:"AM",    horario:"14:00–15:00", rutina:"Segunda Revisión de Disponibilidad",
    accionable:"Revisar macro DPP, inyectar pick manual y gestionar inconsistencias",
    responsable:"Jefe sala", control:"Registro de productos disponibles y quiebres gestionados" },
  { id:"S09", turno:"PM",    horario:"15:00–15:15", rutina:"Coordinación de Turno PM",
    accionable:"Reunión de planificación turno tarde: metas, indicadores, pick, inconsistencias y llenado de góndola",
    responsable:"Jefe turno / Subgerente / Gerente", control:"Evidencia fotográfica en grupo interno" },
  { id:"S10", turno:"PM",    horario:"15:15–21:00", rutina:"Gestión Continua de Ítems Futuros",
    accionable:"Revisar y reponer cada 1 hora: verificar stock en góndola categorías foco, reponer desde camilla/zona de tránsito, registrar quiebres identificados y gestionados",
    responsable:"Jefe / Encargado Ecommerce", control:"Bitácora o sistema, reporte de avance al final de ventana" },
  { id:"S11", turno:"PM",    horario:"21:00–22:00", rutina:"Traspaso a Turno Nocturno",
    accionable:"Caminata de entrega de turno, indicar oportunidades y quiebres pendientes",
    responsable:"Jefe de turno", control:"Evidencia en grupo interno" },
  { id:"S12", turno:"NOCHE", horario:"22:00–22:30", rutina:"Consolidación de Gestión",
    accionable:"Extraer reporte de ítems futuros por categoría y planificar acciones nocturnas",
    responsable:"Jefe Nocturno", control:"Registro en sistema / bitácora" },
  { id:"S13", turno:"NOCHE", horario:"22:30–23:00", rutina:"Gestión de Reportes",
    accionable:"Entregar a pasilleros reporte impreso de ítems futuros y coordinar gestión de 22:30–10:00",
    responsable:"Jefe Nocturno", control:"Evidencia de entrega, registro de ítems gestionados" },
  { id:"S14", turno:"NOCHE", horario:"23:00–05:30", rutina:"Reposición Nocturna Enfocada",
    accionable:"Gestionar reposición categorías foco y ajustar según necesidad",
    responsable:"Jefe Nocturno", control:"Bitácora de ítems repuestos y quiebres gestionados" },
  { id:"S15", turno:"NOCHE", horario:"05:30–06:30", rutina:"Consolidación Final",
    accionable:"Entregar reporte de ítems futuros trabajado, informar novedades al jefe / subgerente",
    responsable:"Jefe Nocturno", control:"Registro en bitácora y evidencia fotográfica" },
];

// ── Ítems BODEGA ─────────────────────────────────────────────────────────────
export const ITEMS_BODEGA = [
  { id:"B01", turno:"AM",    horario:"07:30–08:00", rutina:"Análisis de Datos",
    accionable:"Imprimir y revisar reportes de completitud y quiebres para identificar tendencias y definir estrategia y prioridades del día",
    frecuencia:"Una vez al inicio", responsable:"Jefe de bodega / Encargado", control:"Registro de análisis y tendencias" },
  { id:"B02", turno:"AM",    horario:"08:00–08:30", rutina:"Alineación de Equipo",
    accionable:"Comunicar KPIs del día, meta de completitud y top 3 prioridades de reposición por quiebres recurrentes. Asignar tareas y metas a cada colaborador",
    frecuencia:"Una vez", responsable:"Jefe de bodega / Encargado", control:"Evidencia fotográfica del equipo reunido" },
  { id:"B03", turno:"AM",    horario:"08:30–14:30", rutina:"Gestión Activa de Quiebres",
    accionable:"Monitorear quiebres OmniOps: validar estado de productos (bineados o en tránsito) y posicionarlos en camilla para reposición inmediata",
    frecuencia:"Revisiones cada 2 horas (4 veces por turno)", responsable:"Jefe de bodega / Encargado", control:"Registro en sistema y reporte de avance" },
  { id:"B04", turno:"PM",    horario:"15:00",       rutina:"Traspaso de Turno",
    accionable:"Entrega de turno formal: KPIs, quiebres pendientes, avance vs plan, brechas, tareas críticas, dotación y metas por colaborador",
    frecuencia:"Una vez", responsable:"Jefe de bodega / Encargado", control:"Registro de traspaso firmado / evidencia fotográfica" },
  { id:"B05", turno:"PM",    horario:"15:30–21:30", rutina:"Gestión Activa de Quiebres",
    accionable:"Monitorear quiebres OmniOps cada 1 hora: validar estado de productos, posicionar en camilla",
    frecuencia:"Revisiones cada 2 horas", responsable:"Jefe de bodega / Encargado / Jefe Omni", control:"Registro en sistema y reporte de avance" },
  { id:"B06", turno:"NOCHE", horario:"22:00–22:30", rutina:"Planificación Nocturna",
    accionable:"Revisar reportes SB, quiebres e ítems futuros para definir objetivos y responsables del turno",
    frecuencia:"Una vez al inicio", responsable:"Jefe nocturno / Encargado", control:"Registro de plan nocturno y asignación de tareas" },
  { id:"B07", turno:"NOCHE", horario:"22:30–23:00", rutina:"Directrices Nocturnas",
    accionable:"Reunión de 10 min: comunicar meta de completitud, KPIs, top 3 prioridades (SB, GAP, inconsistencias) y asignar tareas",
    frecuencia:"Una vez", responsable:"Jefe nocturno / Encargado", control:"Evidencia fotográfica / checklist de asistencia" },
  { id:"B08", turno:"NOCHE", horario:"23:30–05:00", rutina:"Ejecución Nocturna – Bineo",
    accionable:"Corregir bineo de categorías foco: identificar productos mal ubicados, regularizar en sistema, clasificar en zona de tránsito",
    frecuencia:"2 revisiones por turno (inicio y mitad)", responsable:"Jefe nocturno / Encargado", control:"Registro de bineos corregidos" },
  { id:"B09", turno:"NOCHE", horario:"23:30–05:00", rutina:"Ejecución Nocturna – Ítems Futuros",
    accionable:"Identificar ítems futuros disponibles (bineados o en tránsito), trasladar a camilla y priorizar categorías foco",
    frecuencia:"Revisiones cada 2 horas (4 veces por turno)", responsable:"Jefe nocturno / Encargado", control:"Bitácora de ítems futuros gestionados" },
];

// ── Helper ────────────────────────────────────────────────────────────────────
export function getItems(seccion, turno) {
  const src = seccion === "SALA" ? ITEMS_SALA : ITEMS_BODEGA;
  return src.filter(i => i.turno === turno);
}

// ── Restricciones horarias por defecto ───────────────────────────────────────
export const DEFAULT_RESTRICTIONS = [
  { seccion:"SALA",   turno:"AM",    hora_inicio:"07:00", hora_fin:"15:30", activo:true },
  { seccion:"SALA",   turno:"PM",    hora_inicio:"14:30", hora_fin:"22:30", activo:true },
  { seccion:"SALA",   turno:"NOCHE", hora_inicio:"21:30", hora_fin:"07:30", activo:true },
  { seccion:"BODEGA", turno:"AM",    hora_inicio:"07:00", hora_fin:"15:30", activo:true },
  { seccion:"BODEGA", turno:"PM",    hora_inicio:"14:30", hora_fin:"22:30", activo:true },
  { seccion:"BODEGA", turno:"NOCHE", hora_inicio:"21:30", hora_fin:"07:30", activo:true },
];
