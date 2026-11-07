import PocketBase from "../vendor/pocketbase.es.mjs";

const fallback = "http://127.0.0.1:8091";
const origin = window.PB_URL || (location.protocol === "http:" || location.protocol === "https:" ? location.origin : fallback);

export const pb = new PocketBase(origin);
pb.autoCancellation(false);

export const PB_URL = origin;

const collections = {
  clientes: "clientes",
  mecanicos: "mecanicos",
  vehiculos: "vehiculos",
  repuestos: "repuestos",
  ordenes: "ordenes",
  trabajos: "orden_trabajos",
  usados: "orden_repuestos",
  pagos: "pagos",
};

export function fullList(collection, options = {}) {
  return pb.collection(collection).getFullList({ batch: 500, ...options });
}

export function byId(items) {
  return new Map(items.map((item) => [item.id, item]));
}

export function groupBy(items, key) {
  const map = new Map();
  items.forEach((item) => {
    const groupKey = typeof key === "function" ? key(item) : item[key];
    if (!map.has(groupKey)) map.set(groupKey, []);
    map.get(groupKey).push(item);
  });
  return map;
}

function lineTotal(item) {
  return (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
}

export function totalsFor(trabajos = [], usados = [], pagos = []) {
  const manoObra = trabajos.reduce((sum, item) => sum + lineTotal(item), 0);
  const repuestos = usados.reduce((sum, item) => sum + lineTotal(item), 0);
  const total = manoObra + repuestos;
  const pagado = pagos.reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
  const saldo = Math.max(0, total - pagado);
  return {
    manoObra,
    repuestos,
    total,
    pagado,
    saldo,
    progreso: total ? Math.min(100, Math.round((pagado / total) * 100)) : 0,
    pagada: total > 0 && pagado >= total,
  };
}

export function isOpen(order) {
  return order.estado !== "entregada" && order.estado !== "cancelada";
}

export async function loadWorkspace() {
  const [clientes, mecanicos, vehiculos, repuestos, ordenes, trabajos, usados, pagos] =
    await Promise.all([
      fullList(collections.clientes, { sort: "nombre" }),
      fullList(collections.mecanicos, { sort: "nombre" }),
      fullList(collections.vehiculos, { sort: "marca,modelo" }),
      fullList(collections.repuestos, { sort: "nombre" }),
      fullList(collections.ordenes, { sort: "-fecha_entrada" }),
      fullList(collections.trabajos),
      fullList(collections.usados),
      fullList(collections.pagos, { sort: "-fecha" }),
    ]);

  const clientesById = byId(clientes);
  const mecanicosById = byId(mecanicos);
  const repuestosById = byId(repuestos);
  const vehiculosById = byId(vehiculos);

  clientes.forEach((cliente) => {
    cliente.vehiculos = [];
    cliente.ordenes = [];
  });

  vehiculos.forEach((vehiculo) => {
    vehiculo.ordenes = [];
    vehiculo.clienteData = clientesById.get(vehiculo.cliente) || null;
    if (vehiculo.clienteData) vehiculo.clienteData.vehiculos.push(vehiculo);
  });

  mecanicos.forEach((mecanico, index) => {
    mecanico.colorIndex = index;
    mecanico.ordenes = [];
  });

  repuestos.forEach((repuesto) => {
    repuesto.stockInfo =
      Number(repuesto.existencias) <= 0
        ? "agotado"
        : Number(repuesto.existencias) <= Number(repuesto.minimo)
          ? "bajo"
          : "ok";
    repuesto.valor = (Number(repuesto.existencias) || 0) * (Number(repuesto.precio) || 0);
  });

  const trabajosByOrder = groupBy(trabajos, "orden");
  const usadosByOrder = groupBy(usados, "orden");
  const pagosByOrder = groupBy(pagos, "orden");

  const enrichedOrders = ordenes.map((order) => {
    const orderTasks = trabajosByOrder.get(order.id) || [];
    const orderParts = (usadosByOrder.get(order.id) || []).map((item) => ({
      ...item,
      repuestoData: repuestosById.get(item.repuesto) || null,
    }));
    const orderPayments = (pagosByOrder.get(order.id) || []).slice().sort((a, b) => {
      return String(b.fecha).localeCompare(String(a.fecha));
    });
    const vehiculo = vehiculosById.get(order.vehiculo) || null;
    const cliente = vehiculo?.clienteData || null;
    const mecanico = mecanicosById.get(order.mecanico) || null;
    const totals = totalsFor(orderTasks, orderParts, orderPayments);

    const enriched = {
      ...order,
      vehiculoData: vehiculo,
      clienteData: cliente,
      mecanicoData: mecanico,
      trabajos: orderTasks,
      repuestosUsados: orderParts,
      pagos: orderPayments,
      totals,
    };

    if (cliente) cliente.ordenes.push(enriched);
    if (vehiculo) {
      vehiculo.ordenes = vehiculo.ordenes || [];
      vehiculo.ordenes.push(enriched);
    }
    if (mecanico) mecanico.ordenes.push(enriched);
    return enriched;
  });

  clientes.forEach((cliente) => {
    cliente.ordenes.sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)));
    cliente.vehiculos.sort((a, b) => a.matricula.localeCompare(b.matricula));
  });
  vehiculos.forEach((vehiculo) => {
    vehiculo.ordenes.sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)));
  });
  mecanicos.forEach((mecanico) => {
    mecanico.ordenes.sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)));
  });

  return {
    clientes,
    mecanicos,
    vehiculos,
    repuestos,
    ordenes: enrichedOrders,
    trabajos,
    usados,
    pagos,
    maps: {
      clientes: clientesById,
      mecanicos: mecanicosById,
      vehiculos: vehiculosById,
      repuestos: repuestosById,
    },
  };
}

export function openOrders(data) {
  return data.ordenes.filter(isOpen);
}

export function lowStock(data) {
  return data.repuestos
    .filter((repuesto) => repuesto.activo !== false && Number(repuesto.existencias) <= Number(repuesto.minimo))
    .sort((a, b) => {
      const ratioA = Number(a.existencias) / Math.max(1, Number(a.minimo));
      const ratioB = Number(b.existencias) / Math.max(1, Number(b.minimo));
      return ratioA - ratioB;
    });
}

export function paymentsInRange(payments, start, end) {
  return payments.filter((payment) => {
    const date = new Date(String(payment.fecha).replace(" ", "T"));
    return date >= start && date <= end;
  });
}

export function orderBalance(order) {
  return order.totals?.saldo || 0;
}

export function totalReceivable(orders) {
  return orders
    .filter((order) => order.estado !== "cancelada")
    .reduce((sum, order) => sum + (order.totals?.saldo || 0), 0);
}

export function createOrder(data) {
  return pb.collection(collections.ordenes).create(data);
}

export function updateOrder(id, data) {
  return pb.collection(collections.ordenes).update(id, data);
}

export async function touchVehicleKilometrage(vehicleId, kilometraje) {
  if (!vehicleId || !kilometraje) return;
  const vehicle = await pb.collection(collections.vehiculos).getOne(vehicleId);
  if (Number(kilometraje) > Number(vehicle.kilometraje || 0)) {
    await pb.collection(collections.vehiculos).update(vehicleId, { kilometraje: Number(kilometraje) });
  }
}

export async function setOrderStatus(order, estado) {
  const data = { estado };
  if (estado === "entregada" && !order.fecha_entrega) {
    data.fecha_entrega = new Date().toISOString().replace("T", " ").replace("Z", "Z");
  }
  const updated = await pb.collection(collections.ordenes).update(order.id, data);
  if (estado === "entregada") {
    await touchVehicleKilometrage(order.vehiculo, order.kilometraje_entrada);
  }
  return updated;
}

export async function nextFolio() {
  const orders = await fullList(collections.ordenes, { fields: "id,folio", sort: "-folio" });
  const year = new Date().getFullYear();
  const max = orders.reduce((value, order) => {
    const match = String(order.folio || "").match(/(\d+)\s*$/);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `ORD-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function saveClient(data, id) {
  return id
    ? pb.collection(collections.clientes).update(id, data)
    : pb.collection(collections.clientes).create(data);
}

export function saveVehicle(data, id) {
  return id
    ? pb.collection(collections.vehiculos).update(id, data)
    : pb.collection(collections.vehiculos).create(data);
}

export function saveMechanic(data, id) {
  return id
    ? pb.collection(collections.mecanicos).update(id, data)
    : pb.collection(collections.mecanicos).create(data);
}

export function savePart(data, id) {
  return id
    ? pb.collection(collections.repuestos).update(id, data)
    : pb.collection(collections.repuestos).create(data);
}

export function addTask(orderId, data) {
  return pb.collection(collections.trabajos).create({ orden: orderId, ...data });
}

export function deleteTask(id) {
  return pb.collection(collections.trabajos).delete(id);
}

export async function addPartToOrder({ orderId, repuestoId, cantidad, precio }) {
  const repuesto = await pb.collection(collections.repuestos).getOne(repuestoId);
  const qty = Number(cantidad) || 0;
  const stock = Number(repuesto.existencias) || 0;
  if (qty <= 0) throw new Error("La cantidad debe ser mayor que cero.");
  if (qty > stock) {
    throw new Error(`Stock insuficiente: solo hay ${stock} unidad(es) de ${repuesto.nombre}.`);
  }

  const created = await pb.collection(collections.usados).create({
    orden: orderId,
    repuesto: repuestoId,
    cantidad: qty,
    precio_unitario: Number(precio) || Number(repuesto.precio) || 0,
  });

  try {
    await pb.collection(collections.repuestos).update(repuestoId, { existencias: stock - qty });
    return created;
  } catch (error) {
    await pb.collection(collections.usados).delete(created.id).catch(() => {});
    throw error;
  }
}

export async function removePartFromOrder(partRecord) {
  const repuesto = await pb.collection(collections.repuestos).getOne(partRecord.repuesto);
  await pb.collection(collections.usados).delete(partRecord.id);
  const stock = Number(repuesto.existencias) || 0;
  await pb
    .collection(collections.repuestos)
    .update(partRecord.repuesto, { existencias: stock + (Number(partRecord.cantidad) || 0) })
    .catch(() => {});
}

export function addPayment(orderId, data) {
  return pb.collection(collections.pagos).create({ orden: orderId, ...data });
}

export function deletePayment(id) {
  return pb.collection(collections.pagos).delete(id);
}

export async function deleteOrder(order) {
  const parts = order.repuestosUsados || [];
  for (const part of parts) {
    const repuesto = await pb.collection(collections.repuestos).getOne(part.repuesto);
    await pb
      .collection(collections.repuestos)
      .update(part.repuesto, {
        existencias: (Number(repuesto.existencias) || 0) + (Number(part.cantidad) || 0),
      })
      .catch(() => {});
  }

  try {
    await pb.collection(collections.ordenes).delete(order.id);
  } catch (error) {
    for (const part of parts) {
      const repuesto = await pb.collection(collections.repuestos).getOne(part.repuesto);
      await pb
        .collection(collections.repuestos)
        .update(part.repuesto, {
          existencias: Math.max(0, (Number(repuesto.existencias) || 0) - (Number(part.cantidad) || 0)),
        })
        .catch(() => {});
    }
    throw error;
  }
}

export async function deleteClient(client) {
  const vehicles = await fullList(collections.vehiculos, {
    filter: `cliente = "${client.id}"`,
    fields: "id",
  });
  if (vehicles.length) {
    throw new Error("No se puede eliminar: el cliente tiene vehículos registrados.");
  }
  return pb.collection(collections.clientes).delete(client.id);
}

export async function deleteVehicle(vehicle) {
  const orders = await fullList(collections.ordenes, {
    filter: `vehiculo = "${vehicle.id}"`,
    fields: "id",
  });
  if (orders.length) {
    throw new Error("No se puede eliminar: el vehículo tiene órdenes de servicio.");
  }
  return pb.collection(collections.vehiculos).delete(vehicle.id);
}

export async function deleteMechanic(mechanic) {
  const orders = await fullList(collections.ordenes, {
    filter: `mecanico = "${mechanic.id}"`,
    fields: "id",
  });
  if (orders.length) {
    throw new Error("No se puede eliminar: el mecánico tiene órdenes asignadas.");
  }
  return pb.collection(collections.mecanicos).delete(mechanic.id);
}

export async function deletePart(part) {
  const used = await fullList(collections.usados, {
    filter: `repuesto = "${part.id}"`,
    fields: "id",
  });
  if (used.length) {
    throw new Error("No se puede eliminar: el repuesto se ha usado en órdenes.");
  }
  return pb.collection(collections.repuestos).delete(part.id);
}
