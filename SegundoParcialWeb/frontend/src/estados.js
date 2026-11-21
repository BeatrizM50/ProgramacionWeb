export const ETIQUETAS_ESTADO = {
  solicitada: "Solicitada",
  en_diagnostico: "En diagnóstico",
  presupuestada: "Presupuestada",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  en_reparacion: "En reparación",
  lista: "Lista",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

// Cambios de etapa permitidos (los mismos que valida el backend)
export const TRANSICIONES = {
  solicitada: ["en_diagnostico", "cancelada"],
  en_diagnostico: ["presupuestada"],
  presupuestada: ["aprobada", "rechazada"],
  aprobada: ["en_reparacion"],
  en_reparacion: ["lista"],
  lista: ["entregada"],
  rechazada: [],
  cancelada: [],
  entregada: [],
};

// Texto del botón según la etapa a la que se avanza
export const ETIQUETAS_ACCION = {
  en_diagnostico: "Empezar diagnóstico",
  cancelada: "Cancelar orden",
  presupuestada: "Registrar presupuesto",
  aprobada: "Cliente acepta el presupuesto",
  rechazada: "Cliente rechaza el presupuesto",
  en_reparacion: "Empezar reparación",
  lista: "Terminar reparación",
  entregada: "Entregar equipo",
};

export function etiquetaEstado(estado) {
  return ETIQUETAS_ESTADO[estado] || estado;
}
