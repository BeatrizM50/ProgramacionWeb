/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_279994318")

  // remove field
  collection.fields.removeById("email3885137012")

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_279994318")

  // add field
  collection.fields.addAt(4, new Field({
    "exceptDomains": [],
    "help": "",
    "hidden": false,
    "id": "email3885137012",
    "name": "email",
    "onlyDomains": [],
    "presentable": false,
    "required": false,
    "system": false,
    "type": "email"
  }))

  return app.save(collection)
})
