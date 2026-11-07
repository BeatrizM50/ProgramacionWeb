/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "",
    "deleteRule": "",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2615807174",
        "max": 30,
        "min": 0,
        "name": "folio",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3873800767",
        "help": "",
        "hidden": false,
        "id": "relation3388610051",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "vehiculo",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_3475497903",
        "help": "",
        "hidden": false,
        "id": "relation3528597114",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "mecanico",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date2309940515",
        "max": "",
        "min": "",
        "name": "fecha_entrada",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date1779086175",
        "max": "",
        "min": "",
        "name": "fecha_estimada",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date2777292348",
        "max": "",
        "min": "",
        "name": "fecha_entrega",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2111771405",
        "max": 3000,
        "min": 3,
        "name": "problema",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2610025544",
        "max": 3000,
        "min": 0,
        "name": "diagnostico",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select643686883",
        "maxSelect": 1,
        "name": "estado",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "recibida",
          "diagnostico",
          "reparacion",
          "lista",
          "entregada",
          "cancelada"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2743624274",
        "maxSelect": 1,
        "name": "prioridad",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "baja",
          "media",
          "alta"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3369572152",
        "max": null,
        "min": 0,
        "name": "kilometraje_entrada",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1702323080",
        "max": 3000,
        "min": 0,
        "name": "notas",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_3299786656",
    "indexes": [
      "CREATE UNIQUE INDEX idx_ordenes_folio ON ordenes (folio)",
      "CREATE INDEX idx_ordenes_estado ON ordenes (estado)",
      "CREATE INDEX idx_ordenes_fecha_entrada ON ordenes (fecha_entrada)"
    ],
    "listRule": "",
    "name": "ordenes",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3299786656");

  return app.delete(collection);
})
