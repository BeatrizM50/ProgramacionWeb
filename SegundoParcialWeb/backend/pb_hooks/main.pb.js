
// Una orden siempre nace en "solicitada" y sin presupuesto:
// ninguna peticion puede saltarse etapas creando una orden ya avanzada.
onRecordCreateRequest((e) => {
  e.record.set("estado", "solicitada");
  e.record.set("diagnostico", "");
  e.record.set("manoObra", 0);
  e.record.set("piezas", null);

  e.next();
}, "ordenes");


onRecordUpdateRequest((e) => {
  const original = e.record.original();
  const estadoAnterior = original.getString("estado");
  const estadoNuevo = e.record.getString("estado");

  // 1. Solo se permiten las transiciones de la tabla
  if (estadoAnterior !== estadoNuevo) {
    const transiciones = {
      solicitada: ["en_diagnostico", "cancelada"],
      en_diagnostico: ["presupuestada"],
      presupuestada: ["aprobada", "rechazada"],
      aprobada: ["en_reparacion"],
      en_reparacion: ["lista"],
      lista: ["entregada"],
      rechazada: [],
      cancelada: [],
      entregada: []
    };

    const permitidos = transiciones[estadoAnterior] || [];

    if (!permitidos.includes(estadoNuevo)) {
      throw new BadRequestError(
        "No se permite cambiar de " +
        estadoAnterior + " a " + estadoNuevo
      );
    }

    // 2. Al presupuestar es obligatorio registrar el diagnostico
    if (estadoNuevo === "presupuestada" && !e.record.getString("diagnostico")) {
      throw new BadRequestError(
        "El diagn\u00f3stico es obligatorio para presupuestar la orden"
      );
    }
  }

  // 3. El presupuesto se registra al presupuestar y no se modifica después
  const estadosConPresupuesto = [
    "presupuestada",
    "aprobada",
    "rechazada",
    "en_reparacion",
    "lista",
    "entregada"
  ];

  if (estadosConPresupuesto.includes(estadoAnterior)) {
    const cambioDiagnostico =
      e.record.getString("diagnostico") !== original.getString("diagnostico");

    const cambioManoObra =
      e.record.getFloat("manoObra") !== original.getFloat("manoObra");

    const cambioPiezas =
      JSON.stringify(e.record.get("piezas")) !==
      JSON.stringify(original.get("piezas"));

    if (cambioDiagnostico || cambioManoObra || cambioPiezas) {
      throw new BadRequestError(
        "El presupuesto no se puede modificar despu\u00e9s de presupuestar la orden"
      );
    }
  }

  // Continuar con la actualización normal
  e.next();
}, "ordenes");


// Registrar el historial después de cada cambio exitoso
onRecordAfterUpdateSuccess((e) => {
  const estadoAnterior = e.record.original().getString("estado");
  const estadoNuevo = e.record.getString("estado");

  if (estadoAnterior !== estadoNuevo) {
    const coleccion = $app.findCollectionByNameOrId("eventos");

    const evento = new Record(coleccion);
    evento.set("orden", e.record.id);
    evento.set("de", estadoAnterior);
    evento.set("a", estadoNuevo);

    $app.save(evento);
  }

  e.next();
}, "ordenes");
