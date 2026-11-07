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
        "id": "text982552870",
        "max": 140,
        "min": 2,
        "name": "nombre",
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
        "id": "text540224921",
        "max": 40,
        "min": 1,
        "name": "codigo",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1309676077",
        "maxSelect": 1,
        "name": "categoria",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "Aceites y lubricantes",
          "Filtros",
          "Frenos",
          "Suspensión",
          "Motor",
          "Eléctrico",
          "Neumáticos",
          "Otros"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number380223906",
        "max": null,
        "min": 0,
        "name": "precio",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3236339369",
        "max": null,
        "min": 0,
        "name": "existencias",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2863527",
        "max": null,
        "min": 0,
        "name": "minimo",
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
        "id": "text3692399800",
        "max": 80,
        "min": 0,
        "name": "ubicacion",
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
        "id": "bool2882213148",
        "name": "activo",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1702323080",
        "max": 2000,
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
    "id": "pbc_590519246",
    "indexes": [
      "CREATE UNIQUE INDEX idx_repuestos_codigo ON repuestos (codigo)"
    ],
    "listRule": "",
    "name": "repuestos",
    "system": false,
    "type": "base",
    "updateRule": "",
    "viewRule": ""
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_590519246");

  return app.delete(collection);
})
