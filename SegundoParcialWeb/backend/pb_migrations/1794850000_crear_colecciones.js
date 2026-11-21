
migrate((app) => {
  // 1. Colección de clientes
  const clientes = new Collection({
    type: "base",
    name: "clientes",
    fields: [
      { name: "nombre", type: "text", required: true },
      { name: "telefono", type: "text", required: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
  });

  app.save(clientes);

  // Obtenemos el ID de la colección clientes
  const coleccionClientes = app.findCollectionByNameOrId("clientes");

  // 2. Colección de órdenes
  const ordenes = new Collection({
    type: "base",
    name: "ordenes",
    fields: [
      {
        name: "cliente",
        type: "relation",
        required: true,
        collectionId: coleccionClientes.id,
        maxSelect: 1,
      },
      { name: "equipo", type: "text", required: true },
      { name: "problema", type: "text", required: true },
      {
        name: "estado",
        type: "select",
        required: true,
        values: [
          "solicitada",
          "en_diagnostico",
          "presupuestada",
          "aprobada",
          "rechazada",
          "en_reparacion",
          "lista",
          "entregada",
          "cancelada",
        ],
        maxSelect: 1,
      },
      { name: "diagnostico", type: "text" },
      { name: "manoObra", type: "number", min: 0 },
      { name: "piezas", type: "json" },
      {
        name: "fotos",
        type: "file",
        maxSelect: 3,
        mimeTypes: ["image/jpeg", "image/png", "image/webp"],
      },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: "",
    deleteRule: null,
  });

  app.save(ordenes);

  // Obtenemos el ID de la colección ordenes
  const coleccionOrdenes = app.findCollectionByNameOrId("ordenes");

  // 3. Colección de eventos
  const eventos = new Collection({
    type: "base",
    name: "eventos",
    fields: [
      {
        name: "orden",
        type: "relation",
        required: true,
        collectionId: coleccionOrdenes.id,
        maxSelect: 1,
      },
      { name: "de", type: "text", required: true },
      { name: "a", type: "text", required: true },
      { name: "created", type: "autodate", onCreate: true, onUpdate: false },
      { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
    ],
    listRule: "",
    viewRule: "",
    createRule: "",
    updateRule: null,
    deleteRule: null,
  });

  app.save(eventos);

}, (app) => {
  // Revertir la migración en orden inverso
  app.delete(app.findCollectionByNameOrId("eventos"));
  app.delete(app.findCollectionByNameOrId("ordenes"));
  app.delete(app.findCollectionByNameOrId("clientes"));
});
