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
        "cascadeDelete": true,
        "collectionId": "pbc_3299786656",
        "help": "",
        "hidden": false,
        "id": "relation3777548247",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "orden",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number282232229",
        "max": null,
        "min": 0.01,
        "name": "monto",
        "onlyInt": false,
        "presentable": false,
        "required": true,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date27834329",
        "max": "",
        "min": "",
        "name": "fecha",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select791686310",
        "maxSelect": 1,
        "name": "metodo",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "efectivo",
          "tarjeta",
          "transferencia",
          "otro"
        ]
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3369090573",
        "max": 500,
        "min": 0,
        "name": "nota",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      }
    ],
    "id": "pbc_299741972",
    "indexes": [],
    "listRule": "",
    "name": "pagos",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_299741972");

  return app.delete(collection);
})
