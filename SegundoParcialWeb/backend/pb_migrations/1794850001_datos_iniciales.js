
// Datos iniciales de prueba: 2 clientes y 3 ordenes en etapas distintas,
// con su historial de eventos para las ordenes que ya avanzaron.
// Los acentos van como escapes \u para evitar problemas de codificacion
// al leer el archivo desde el motor JavaScript de PocketBase.
migrate((app) => {
  const clientes = app.findCollectionByNameOrId("clientes");
  const ordenes = app.findCollectionByNameOrId("ordenes");
  const eventos = app.findCollectionByNameOrId("eventos");

  // Clientes
  const carlos = new Record(clientes);
  carlos.set("nombre", "Carlos P\u00e9rez");
  carlos.set("telefono", "555-1010");
  app.save(carlos);

  const maria = new Record(clientes);
  maria.set("nombre", "Mar\u00eda Rodr\u00edguez");
  maria.set("telefono", "555-2020");
  app.save(maria);

  // Orden 1: recien registrada
  const orden1 = new Record(ordenes);
  orden1.set("cliente", carlos.id);
  orden1.set("equipo", "Laptop HP Pavilion");
  orden1.set("problema", "No enciende al presionar el bot\u00f3n de encendido");
  orden1.set("estado", "solicitada");
  app.save(orden1);

  // Orden 2: en reparacion (presupuesto ya aprobado)
  const orden2 = new Record(ordenes);
  orden2.set("cliente", maria.id);
  orden2.set("equipo", "Tel\u00e9fono Samsung Galaxy A54");
  orden2.set("problema", "Pantalla rota tras una ca\u00edda");
  orden2.set("estado", "en_reparacion");
  orden2.set("diagnostico", "Reemplazo de pantalla y marco intermedio");
  orden2.set("manoObra", 400);
  orden2.set("piezas", [
    { descripcion: "Pantalla AMOLED", cantidad: 1, precio: 850 },
    { descripcion: "Marco intermedio", cantidad: 1, precio: 300 },
    { descripcion: "Adhesivo", cantidad: 1, precio: 50 },
  ]);
  app.save(orden2);

  // Orden 3: lista para entregar
  const orden3 = new Record(ordenes);
  orden3.set("cliente", carlos.id);
  orden3.set("equipo", "Televisor LG 43 pulgadas");
  orden3.set("problema", "No muestra imagen, solo sonido");
  orden3.set("estado", "lista");
  orden3.set("diagnostico", "Cambio de tarjeta principal");
  orden3.set("manoObra", 350);
  orden3.set("piezas", [
    { descripcion: "Tarjeta principal", cantidad: 1, precio: 1200 },
  ]);
  app.save(orden3);

  // Historial de eventos de las ordenes que ya avanzaron
  const registrar = (ordenId, de, a) => {
    const evento = new Record(eventos);
    evento.set("orden", ordenId);
    evento.set("de", de);
    evento.set("a", a);
    app.save(evento);
  };

  registrar(orden2.id, "solicitada", "en_diagnostico");
  registrar(orden2.id, "en_diagnostico", "presupuestada");
  registrar(orden2.id, "presupuestada", "aprobada");
  registrar(orden2.id, "aprobada", "en_reparacion");

  registrar(orden3.id, "solicitada", "en_diagnostico");
  registrar(orden3.id, "en_diagnostico", "presupuestada");
  registrar(orden3.id, "presupuestada", "aprobada");
  registrar(orden3.id, "aprobada", "en_reparacion");
  registrar(orden3.id, "en_reparacion", "lista");
}, (app) => {
  // Revertir: borrar primero eventos y ordenes, luego clientes
  const equipos = [
    "Laptop HP Pavilion",
    "Tel\u00e9fono Samsung Galaxy A54",
    "Televisor LG 43 pulgadas",
  ];

  for (const equipo of equipos) {
    const ordenes = app.findRecordsByFilter(
      "ordenes",
      "equipo = {:equipo}",
      { equipo: equipo }
    );

    for (const orden of ordenes) {
      const eventos = app.findRecordsByFilter(
        "eventos",
        "orden = {:orden}",
        { orden: orden.id }
      );

      for (const evento of eventos) {
        app.delete(evento);
      }

      app.delete(orden);
    }
  }

  for (const nombre of ["Carlos P\u00e9rez", "Mar\u00eda Rodr\u00edguez"]) {
    const clientes = app.findRecordsByFilter(
      "clientes",
      "nombre = {:nombre}",
      { nombre: nombre }
    );

    for (const cliente of clientes) {
      app.delete(cliente);
    }
  }
});
