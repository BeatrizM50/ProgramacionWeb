import {
  addPartToOrder,
  addPayment,
  addTask,
  createOrder,
  loadWorkspace,
  nextFolio,
  saveClient,
  saveMechanic,
  savePart,
  saveVehicle,
  touchVehicleKilometrage,
  updateOrder,
} from "./api.js";
import { icon } from "./icons.js";
import {
  dateInput,
  emitDataChanged,
  esc,
  friendlyError,
  METODOS_PAGO,
  money,
  openModal,
  refresh,
  setButtonLoading,
  toast,
  todayInput,
  validateForm,
} from "./ui.js";

function control(name, { type = "text", value = "", required = false, placeholder = "", min, max, step, minlength, pattern, error, autocomplete } = {}) {
  return `<input class="input" id="f-${name}" name="${name}" type="${type}" value="${esc(value)}"
    ${required ? "required" : ""} ${placeholder ? `placeholder="${esc(placeholder)}"` : ""}
    ${min !== undefined ? `min="${min}"` : ""} ${max !== undefined ? `max="${max}"` : ""}
    ${step !== undefined ? `step="${step}"` : ""} ${minlength !== undefined ? `minlength="${minlength}"` : ""}
    ${pattern ? `pattern="${esc(pattern)}"` : ""} ${error ? `data-error="${esc(error)}"` : ""}
    ${autocomplete ? `autocomplete="${autocomplete}"` : ""}>`;
}

function textarea(name, { value = "", required = false, rows = 3, placeholder = "", minlength, error } = {}) {
  return `<textarea class="input textarea" id="f-${name}" name="${name}" rows="${rows}"
    ${required ? "required" : ""} ${minlength !== undefined ? `minlength="${minlength}"` : ""}
    ${error ? `data-error="${esc(error)}"` : ""}
    ${placeholder ? `placeholder="${esc(placeholder)}"` : ""}>${esc(value)}</textarea>`;
}

function select(name, options, selected = "", { required = false, placeholder = "", error } = {}) {
  const optionsHtml = options
    .map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : option.label;
      return `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
    })
    .join("");
  return `<select class="input select" id="f-${name}" name="${name}" ${required ? "required" : ""} ${error ? `data-error="${esc(error)}"` : ""}>
    ${placeholder ? `<option value="">${esc(placeholder)}</option>` : ""}
    ${optionsHtml}
  </select>`;
}

function field(label, input, help = "", className = "") {
  const isRequired = /\srequired(?=[\s>])/.test(input);
  return `<label class="field ${className}" for="f-${input.match(/id="f-([^"]+)"/)?.[1] || ""}">
    <span class="field__label">${esc(label)}${isRequired ? ' <span class="field__req" aria-hidden="true">*</span>' : ""}</span>
    ${input}
    ${help ? `<span class="field__help">${help}</span>` : ""}
    <span class="field__error" data-field-error></span>
  </label>`;
}

function footerButtons(confirmText = "Guardar", cancelText = "Cancelar") {
  return `
    <button type="button" class="btn btn--ghost" data-modal-close>${esc(cancelText)}</button>
    <button type="submit" class="btn btn--primary" form="entity-form">${icon("check", 17)}${esc(confirmText)}</button>`;
}

function vehicleLabel(vehicle) {
  if (!vehicle) return "—";
  return `${vehicle.matricula} · ${vehicle.marca} ${vehicle.modelo}`;
}

function afterSave(message, { navigateTo, onSaved } = {}) {
  toast(message);
  emitDataChanged();
  if (typeof onSaved === "function") onSaved();
  if (navigateTo) {
    if (location.hash === navigateTo) refresh();
    else location.hash = navigateTo;
  } else {
    refresh();
  }
}

export async function openOrderForm({ order = null, preselectedClient = "", preselectedVehicle = "", onSaved } = {}) {
  let data;
  let folio;
  try {
    data = await loadWorkspace();
  } catch (error) {
    toast(friendlyError(error), "error");
    return;
  }

  const editing = Boolean(order);
  if (!editing) {
    try {
      folio = await nextFolio();
    } catch {
      folio = `ORD-${new Date().getFullYear()}-001`;
    }
  }

  const currentVehicle = editing ? data.maps.vehiculos.get(order.vehiculo) : data.maps.vehiculos.get(preselectedVehicle);
  const currentClient = editing
    ? currentVehicle?.clienteData
    : data.maps.clientes.get(preselectedClient) || currentVehicle?.clienteData;
  const initialClient = currentClient?.id || data.clientes[0]?.id || "";
  let initialVehicle = currentVehicle?.id || "";
  const clientVehicles = data.vehiculos.filter((vehicle) => vehicle.cliente === initialClient);
  if (!initialVehicle && clientVehicles[0]) initialVehicle = clientVehicles[0].id;

  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="form__grid form__grid--2">
        ${field("Cliente", select("cliente", data.clientes.map((c) => ({ value: c.id, label: c.nombre })), initialClient, { required: true, placeholder: "Selecciona un cliente", error: "Selecciona un cliente." }))}
        ${field("Vehículo", select("vehiculo", [], initialVehicle, { required: true, placeholder: "Selecciona un vehículo", error: "Selecciona un vehículo." }), "", "field--wide")}
      </div>
      <div class="order-form__vehicle-note" id="vehicle-note"></div>
      <div class="form__grid form__grid--2">
        ${field("Mecánico asignado", select("mecanico", data.mecanicos.filter((m) => m.activo !== false).map((m) => ({ value: m.id, label: `${m.nombre} · ${m.especialidad || "General"}` })), editing ? order.mecanico : data.mecanicos[0]?.id, { required: true, placeholder: "Selecciona un mecánico", error: "Selecciona un mecánico." }))}
        ${field("Prioridad", select("prioridad", [
          { value: "baja", label: "Baja" },
          { value: "media", label: "Media" },
          { value: "alta", label: "Alta" },
        ], editing ? order.prioridad : "media", { required: true }))}
        ${field("Fecha de entrada", control("fecha_entrada", { type: "date", value: editing ? dateInput(order.fecha_entrada) : todayInput(), required: true, error: "La fecha de entrada es obligatoria." }))}
        ${field("Fecha estimada", control("fecha_estimada", { type: "date", value: editing ? dateInput(order.fecha_estimada) : todayInput() }))}
        ${field("Kilometraje de entrada", control("kilometraje_entrada", { type: "number", value: editing ? order.kilometraje_entrada : currentVehicle?.kilometraje || "", min: 0, step: 1, placeholder: "Ej. 86500", error: "El kilometraje no puede ser negativo." }))}
        ${field("Folio", control("folio", { value: editing ? order.folio : folio, required: true, error: "El folio es obligatorio." }), "Se genera automáticamente, puedes editarlo.")}
      </div>
      ${field("Problema reportado por el cliente", textarea("problema", { value: editing ? order.problema : "", required: true, minlength: 3, rows: 3, placeholder: "Describe el síntoma, ruido o falla que reporta el cliente…", error: "Describe el problema que reporta el cliente (mínimo 3 caracteres)." }), "", "field--wide")}
      ${field("Diagnóstico del mecánico", textarea("diagnostico", { value: editing ? order.diagnostico : "", rows: 3, placeholder: "Se completa cuando el mecánico revisa el vehículo…" }), "", "field--wide")}
      ${field("Notas internas", textarea("notas", { value: editing ? order.notas : "", rows: 2, placeholder: "Indicaciones, acuerdos o recordatorios…" }), "", "field--wide")}
    </form>`;

  const modal = openModal({
    title: editing ? `Editar ${order.folio}` : "Nueva orden de servicio",
    eyebrow: editing ? "Órdenes" : "Recepción",
    subtitle: editing
      ? "Actualiza los datos generales de la orden."
      : "Registra el ingreso del vehículo y asigna el trabajo.",
    size: "lg",
    content: body,
    footer: footerButtons(editing ? "Guardar cambios" : "Crear orden"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      const clientSelect = form.querySelector("#f-cliente");
      const vehicleSelect = form.querySelector("#f-vehiculo");
      const note = el.querySelector("#vehicle-note");
      const kmInput = form.querySelector("#f-kilometraje_entrada");
      const folioInput = form.querySelector("#f-folio");

      const fillVehicles = (preferredId = "") => {
        const vehicles = data.vehiculos.filter((vehicle) => vehicle.cliente === clientSelect.value);
        vehicleSelect.innerHTML = vehicles.length
          ? vehicles
              .map(
                (vehicle) =>
                  `<option value="${esc(vehicle.id)}" ${vehicle.id === preferredId ? "selected" : ""}>${esc(vehicleLabel(vehicle))} · ${vehicle.anio || "s/f"}</option>`,
              )
              .join("")
          : '<option value="">Sin vehículos registrados</option>';
        note.innerHTML = vehicles.length
          ? ""
          : `<div class="inline-alert">${icon("alert", 17)} Este cliente no tiene vehículos. Regístralo desde la sección Vehículos antes de crear la orden.</div>`;
        const selected = vehicles.find((vehicle) => vehicle.id === vehicleSelect.value);
        if (selected && !editing) kmInput.value = selected.kilometraje || "";
      };

      fillVehicles(initialVehicle);
      clientSelect.addEventListener("change", () => fillVehicles());
      vehicleSelect.addEventListener("change", () => {
        const vehicle = data.vehiculos.find((item) => item.id === vehicleSelect.value);
        if (vehicle && !editing) kmInput.value = vehicle.kilometraje || "";
      });

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        if (!values.cliente || !values.vehiculo) {
          toast("Selecciona un cliente y un vehículo.", "warning");
          return;
        }
        if (!values.folio.trim()) {
          toast("El folio es obligatorio.", "warning");
          folioInput.focus();
          return;
        }

        const payload = {
          folio: values.folio.trim(),
          vehiculo: values.vehiculo,
          mecanico: values.mecanico || "",
          // Se guarda al mediodía UTC para que la fecha no cambie de día
          // al mostrarla en zonas horarias como la de Costa Rica (UTC-6).
          fecha_entrada: values.fecha_entrada ? `${values.fecha_entrada} 12:00:00.000Z` : "",
          fecha_estimada: values.fecha_estimada ? `${values.fecha_estimada} 17:00:00.000Z` : "",
          problema: values.problema.trim(),
          diagnostico: values.diagnostico.trim(),
          prioridad: values.prioridad,
          kilometraje_entrada: values.kilometraje_entrada ? Number(values.kilometraje_entrada) : 0,
          notas: values.notas.trim(),
        };

        setButtonLoading(submit, true, editing ? "Guardando…" : "Creando…");
        try {
          if (editing) {
            await updateOrder(order.id, payload);
            close();
            afterSave("Orden actualizada.", { onSaved });
          } else {
            const created = await createOrder({ ...payload, estado: "recibida" });
            await touchVehicleKilometrage(values.vehiculo, payload.kilometraje_entrada);
            close();
            toast("Orden creada correctamente.");
            emitDataChanged();
            if (typeof onSaved === "function") onSaved(created);
            location.hash = `#/ordenes/${created.id}`;
          }
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });

  return modal;
}

export async function openClientForm({ client = null, onSaved } = {}) {
  const editing = Boolean(client);
  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="form__grid form__grid--2">
        ${field("Nombre completo", control("nombre", { value: editing ? client.nombre : "", required: true, minlength: 2, placeholder: "Ej. María Fernández", autocomplete: "name", error: "Escribe el nombre completo (mínimo 2 letras)." }))}
        ${field("Teléfono", control("telefono", { type: "tel", value: editing ? client.telefono : "", placeholder: "8888-0000", autocomplete: "tel", required: true, pattern: "[0-9\\s\\-\\(\\)\\+]{7,20}", error: "El teléfono debe tener entre 7 y 20 números." }))}
        ${field("Dirección", control("direccion", { value: editing ? client.direccion : "", placeholder: "Barrio, casa, señas…" }))}
      </div>
      ${field("Notas", textarea("notas", { value: editing ? client.notas : "", rows: 3, placeholder: "Preferencias de contacto, observaciones…" }), "", "field--wide")}
    </form>`;

  openModal({
    title: editing ? "Editar cliente" : "Nuevo cliente",
    eyebrow: "Clientes",
    subtitle: editing ? "Actualiza los datos de contacto." : "Registra al dueño del vehículo.",
    size: "md",
    content: body,
    footer: footerButtons(editing ? "Guardar cambios" : "Registrar cliente"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        const payload = {
          nombre: values.nombre.trim(),
          telefono: values.telefono.trim(),
          direccion: values.direccion.trim(),
          notas: values.notas.trim(),
        };
        setButtonLoading(submit, true);
        try {
          const saved = await saveClient(payload, editing ? client.id : null);
          close();
          afterSave(editing ? "Cliente actualizado." : "Cliente registrado.", { onSaved });
          if (!editing && location.hash === "#/clientes") {
            // Keep the user in the list; the new row is visible immediately.
          }
          return saved;
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

export async function openVehicleForm({ vehicle = null, preselectedClient = "", onSaved } = {}) {
  let data;
  try {
    data = await loadWorkspace();
  } catch (error) {
    toast(friendlyError(error), "error");
    return;
  }
  const editing = Boolean(vehicle);
  const selectedClient = editing ? vehicle.cliente : preselectedClient || data.clientes[0]?.id || "";
  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="form__grid form__grid--2">
        ${field("Cliente", select("cliente", data.clientes.map((c) => ({ value: c.id, label: c.nombre })), selectedClient, { required: true, placeholder: "Selecciona un cliente", error: "Selecciona el cliente dueño del vehículo." }))}
        ${field("Matrícula", control("matricula", { value: editing ? vehicle.matricula : "", required: true, minlength: 2, placeholder: "SJ-0000", error: "La matrícula es obligatoria." }))}
        ${field("Marca", control("marca", { value: editing ? vehicle.marca : "", required: true, minlength: 2, placeholder: "Toyota", error: "La marca es obligatoria." }))}
        ${field("Modelo", control("modelo", { value: editing ? vehicle.modelo : "", required: true, minlength: 2, placeholder: "Corolla", error: "El modelo es obligatorio." }))}
        ${field("Año", control("anio", { type: "number", value: editing ? vehicle.anio : "", min: 1950, max: 2100, step: 1, required: true, placeholder: "2018", error: "El año es obligatorio y debe estar entre 1950 y 2100." }))}
        ${field("Kilometraje actual", control("kilometraje", { type: "number", value: editing ? vehicle.kilometraje : "", min: 0, step: 1, placeholder: "86500", error: "El kilometraje no puede ser negativo." }))}
      </div>
      ${field("Notas", textarea("notas", { value: editing ? vehicle.notas : "", rows: 3, placeholder: "Detalles del vehículo, accesorios, observaciones…" }), "", "field--wide")}
    </form>`;

  openModal({
    title: editing ? "Editar vehículo" : "Nuevo vehículo",
    eyebrow: "Vehículos",
    subtitle: editing ? "Actualiza los datos del vehículo." : "Asocia un vehículo a un cliente.",
    size: "md",
    content: body,
    footer: footerButtons(editing ? "Guardar cambios" : "Registrar vehículo"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        const payload = {
          cliente: values.cliente,
          matricula: values.matricula.trim().toUpperCase(),
          marca: values.marca.trim(),
          modelo: values.modelo.trim(),
          anio: values.anio ? Number(values.anio) : 0,
          kilometraje: values.kilometraje ? Number(values.kilometraje) : 0,
          notas: values.notas.trim(),
        };
        setButtonLoading(submit, true);
        try {
          await saveVehicle(payload, editing ? vehicle.id : null);
          close();
          afterSave(editing ? "Vehículo actualizado." : "Vehículo registrado.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

export async function openMechanicForm({ mechanic = null, onSaved } = {}) {
  const editing = Boolean(mechanic);
  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="form__grid form__grid--2">
        ${field("Nombre", control("nombre", { value: editing ? mechanic.nombre : "", required: true, minlength: 2, placeholder: "Nombre del mecánico", error: "El nombre es obligatorio (mínimo 2 letras)." }))}
        ${field("Teléfono", control("telefono", { type: "tel", value: editing ? mechanic.telefono : "", placeholder: "7000-0000", pattern: "[0-9\\s\\-\\(\\)\\+]{7,20}", error: "El teléfono debe tener entre 7 y 20 números." }))}
      </div>
      ${field("Especialidad", control("especialidad", { value: editing ? mechanic.especialidad : "", placeholder: "Motor, frenos, electricidad…" }))}
      ${field("Notas", textarea("notas", { value: editing ? mechanic.notas : "", rows: 3 }), "", "field--wide")}
      <label class="switch-field">
        <input type="checkbox" name="activo" ${editing ? (mechanic.activo !== false ? "checked" : "") : "checked"}>
        <span class="switch-field__control"></span>
        <span><strong>Activo</strong><small>Puede recibir órdenes de servicio.</small></span>
      </label>
    </form>`;

  openModal({
    title: editing ? "Editar mecánico" : "Nuevo mecánico",
    eyebrow: "Equipo",
    size: "sm",
    content: body,
    footer: footerButtons(editing ? "Guardar cambios" : "Agregar mecánico"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        const payload = {
          nombre: values.nombre.trim(),
          telefono: values.telefono.trim(),
          especialidad: values.especialidad.trim(),
          activo: Boolean(values.activo),
          notas: values.notas.trim(),
        };
        setButtonLoading(submit, true);
        try {
          await saveMechanic(payload, editing ? mechanic.id : null);
          close();
          afterSave(editing ? "Mecánico actualizado." : "Mecánico agregado.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

const CATEGORIAS = [
  "Aceites y lubricantes",
  "Filtros",
  "Frenos",
  "Suspensión",
  "Motor",
  "Eléctrico",
  "Neumáticos",
  "Otros",
];

export async function openPartForm({ part = null, onSaved } = {}) {
  const editing = Boolean(part);
  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="form__grid form__grid--2">
        ${field("Nombre del repuesto", control("nombre", { value: editing ? part.nombre : "", required: true, minlength: 2, placeholder: "Ej. Filtro de aceite", error: "El nombre es obligatorio (mínimo 2 letras)." }))}
        ${field("Código", control("codigo", { value: editing ? part.codigo : "", required: true, minlength: 2, placeholder: "FIL-ACE-01", error: "El código es obligatorio (mínimo 2 caracteres)." }))}
        ${field("Categoría", select("categoria", CATEGORIAS, editing ? part.categoria : "Filtros", { placeholder: "Selecciona una categoría" }))}
        ${field("Ubicación", control("ubicacion", { value: editing ? part.ubicacion : "", placeholder: "Estante A1" }))}
        ${field("Precio de venta", control("precio", { type: "number", value: editing ? part.precio : "", min: 0, step: 1, required: true, placeholder: "0", error: "El precio es obligatorio y no puede ser negativo." }))}
        ${field("Existencias", control("existencias", { type: "number", value: editing ? part.existencias : 0, min: 0, step: 1, required: true, error: "Las existencias son obligatorias y no pueden ser negativas." }))}
        ${field("Mínimo deseado", control("minimo", { type: "number", value: editing ? part.minimo : 4, min: 0, step: 1, required: true, error: "El mínimo es obligatorio y no puede ser negativo." }), "Se avisa cuando el stock llega a este valor.")}
      </div>
      ${field("Notas", textarea("notas", { value: editing ? part.notas : "", rows: 2 }), "", "field--wide")}
      <label class="switch-field">
        <input type="checkbox" name="activo" ${editing ? (part.activo !== false ? "checked" : "") : "checked"}>
        <span class="switch-field__control"></span>
        <span><strong>Activo</strong><small>Disponible para usar en órdenes.</small></span>
      </label>
    </form>`;

  openModal({
    title: editing ? "Editar repuesto" : "Nuevo repuesto",
    eyebrow: "Inventario",
    subtitle: editing ? "Actualiza los datos del repuesto." : "Registra un artículo en el inventario del taller.",
    size: "md",
    content: body,
    footer: footerButtons(editing ? "Guardar cambios" : "Registrar repuesto"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        const payload = {
          nombre: values.nombre.trim(),
          codigo: values.codigo.trim().toUpperCase(),
          categoria: values.categoria,
          ubicacion: values.ubicacion.trim(),
          precio: Number(values.precio) || 0,
          existencias: Number(values.existencias) || 0,
          minimo: Number(values.minimo) || 0,
          activo: Boolean(values.activo),
          notas: values.notas.trim(),
        };
        setButtonLoading(submit, true);
        try {
          await savePart(payload, editing ? part.id : null);
          close();
          afterSave(editing ? "Repuesto actualizado." : "Repuesto registrado.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

export function openTaskForm({ order, onSaved } = {}) {
  const body = `
    <form id="entity-form" class="form" novalidate>
      ${field("Trabajo realizado", control("descripcion", { required: true, minlength: 2, placeholder: "Ej. Cambio de aceite y filtro", error: "Describe el trabajo realizado (mínimo 2 caracteres)." }))}
      <div class="form__grid form__grid--3">
        ${field("Cantidad", control("cantidad", { type: "number", value: 1, min: 0.5, step: 0.5, required: true, error: "La cantidad debe ser al menos 0.5." }))}
        ${field("Precio unitario", control("precio_unitario", { type: "number", min: 0, step: 1, required: true, placeholder: "0", error: "El precio unitario es obligatorio y no puede ser negativo." }))}
        <div class="field field--preview">
          <span class="field__label">Subtotal</span>
          <strong class="field__preview-value" data-subtotal>${money(0)}</strong>
        </div>
      </div>
    </form>`;

  openModal({
    title: "Agregar trabajo de mano de obra",
    eyebrow: order.folio,
    subtitle: "Registra el trabajo realizado y su precio.",
    size: "md",
    content: body,
    footer: footerButtons("Agregar trabajo"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      const qty = form.querySelector("#f-cantidad");
      const price = form.querySelector("#f-precio_unitario");
      const subtotal = el.querySelector("[data-subtotal]");
      const update = () => {
        subtotal.textContent = money((Number(qty.value) || 0) * (Number(price.value) || 0));
      };
      qty.addEventListener("input", update);
      price.addEventListener("input", update);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        setButtonLoading(submit, true);
        try {
          await addTask(order.id, {
            descripcion: values.descripcion.trim(),
            cantidad: Number(values.cantidad) || 0,
            precio_unitario: Number(values.precio_unitario) || 0,
          });
          close();
          afterSave("Trabajo agregado a la orden.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

export async function openAddPartForm({ order, repuestos = null, onSaved } = {}) {
  let parts = repuestos;
  if (!parts) {
    try {
      parts = (await loadWorkspace()).repuestos.filter((part) => part.activo !== false && part.existencias > 0);
    } catch (error) {
      toast(friendlyError(error), "error");
      return;
    }
  }
  if (!parts.length) {
    toast("No hay repuestos disponibles en inventario.", "warning");
    return;
  }

  const body = `
    <form id="entity-form" class="form" novalidate>
      ${field("Repuesto", select("repuesto", parts.map((part) => ({
        value: part.id,
        label: `${part.nombre} · ${part.codigo} · ${part.existencias} disp.`,
      })), parts[0]?.id, { required: true, error: "Selecciona un repuesto." }))}
      <div class="form__grid form__grid--3">
        ${field("Cantidad", control("cantidad", { type: "number", value: 1, min: 1, step: 1, required: true, error: "La cantidad debe ser al menos 1." }))}
        ${field("Precio unitario", control("precio_unitario", { type: "number", value: parts[0]?.precio || 0, min: 0, step: 1, required: true, error: "El precio unitario es obligatorio y no puede ser negativo." }))}
        <div class="field field--preview">
          <span class="field__label">Subtotal</span>
          <strong class="field__preview-value" data-subtotal>${money(parts[0]?.precio || 0)}</strong>
        </div>
      </div>
      <div class="stock-peek" data-stock-peek></div>
    </form>`;

  openModal({
    title: "Agregar repuesto a la orden",
    eyebrow: order.folio,
    subtitle: "El stock del inventario se descuenta automáticamente.",
    size: "md",
    content: body,
    footer: footerButtons("Agregar repuesto"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      const partSelect = form.querySelector("#f-repuesto");
      const qty = form.querySelector("#f-cantidad");
      const price = form.querySelector("#f-precio_unitario");
      const subtotal = el.querySelector("[data-subtotal]");
      const peek = el.querySelector("[data-stock-peek]");

      const selectedPart = () => parts.find((part) => part.id === partSelect.value);

      const update = () => {
        const part = selectedPart();
        const available = part?.existencias || 0;
        subtotal.textContent = money((Number(qty.value) || 0) * (Number(price.value) || 0));
        if (part) {
          const after = available - (Number(qty.value) || 0);
          peek.innerHTML = `
            <span>Disponible: <strong>${available}</strong></span>
            <span>Quedarían: <strong class="${after < 0 ? "text-danger" : ""}">${after}</strong></span>`;
          qty.max = available;
        }
      };

      partSelect.addEventListener("change", () => {
        const part = selectedPart();
        if (part) price.value = part.precio || 0;
        update();
      });
      qty.addEventListener("input", update);
      price.addEventListener("input", update);
      update();

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        const part = selectedPart();
        const quantity = Number(values.cantidad) || 0;
        if (quantity > (part?.existencias || 0)) {
          toast(`Solo hay ${part?.existencias || 0} unidad(es) disponibles.`, "warning");
          return;
        }
        setButtonLoading(submit, true);
        try {
          await addPartToOrder({
            orderId: order.id,
            repuestoId: values.repuesto,
            cantidad: quantity,
            precio: Number(values.precio_unitario) || 0,
          });
          close();
          afterSave("Repuesto agregado y stock actualizado.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

export function openPaymentForm({ order, onSaved } = {}) {
  const balance = order.totals?.saldo || 0;
  const methods = Object.entries(METODOS_PAGO).map(([value, label]) => ({ value, label }));
  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="payment-summary">
        <div><span>Total de la orden</span><strong>${money(order.totals?.total || 0)}</strong></div>
        <div><span>Ya pagado</span><strong class="text-success">${money(order.totals?.pagado || 0)}</strong></div>
        <div><span>Saldo pendiente</span><strong class="text-danger">${money(balance)}</strong></div>
      </div>
      <div class="form__grid form__grid--2">
        ${field("Monto del pago", control("monto", { type: "number", value: balance, min: 1, max: balance, step: 1, required: true, error: `El monto debe estar entre $1 y ${money(balance)}.` }), `Máximo ${money(balance)}.`)}
        ${field("Fecha", control("fecha", { type: "date", value: todayInput(), required: true, error: "La fecha del pago es obligatoria." }))}
        ${field("Método de pago", select("metodo", methods, "efectivo", { required: true, error: "Selecciona el método de pago." }))}
        ${field("Nota", control("nota", { placeholder: "Ej. Abono inicial, pago final…" }))}
      </div>
    </form>`;

  openModal({
    title: "Registrar pago",
    eyebrow: order.folio,
    subtitle: "Puedes registrar pagos parciales.",
    size: "md",
    content: body,
    footer: footerButtons("Registrar pago"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        const amount = Number(values.monto) || 0;
        if (amount <= 0) {
          toast("El monto debe ser mayor que cero.", "warning");
          return;
        }
        if (amount > balance) {
          toast("El pago no puede superar el saldo pendiente.", "warning");
          return;
        }
        setButtonLoading(submit, true);
        try {
          await addPayment(order.id, {
            monto: amount,
            fecha: `${values.fecha} 12:00:00.000Z`,
            metodo: values.metodo,
            nota: values.nota.trim(),
          });
          close();
          afterSave("Pago registrado.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}

export function openStockAdjustForm({ part, onSaved } = {}) {
  const body = `
    <form id="entity-form" class="form" novalidate>
      <div class="stock-adjust">
        <div class="stock-adjust__current">
          <span>Existencias actuales</span>
          <strong>${part.existencias}</strong>
          <small>${esc(part.nombre)} · ${esc(part.codigo)}</small>
        </div>
        ${field("Nuevas existencias", control("existencias", { type: "number", value: part.existencias, min: 0, step: 1, required: true, error: "Las existencias no pueden ser negativas." }), "Usa este ajuste para entradas de compra o correcciones de inventario.")}
      </div>
    </form>`;

  openModal({
    title: "Ajustar existencias",
    eyebrow: "Inventario",
    size: "sm",
    content: body,
    footer: footerButtons("Actualizar stock"),
    onMount(el, { close }) {
      const form = el.querySelector("#entity-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = el.querySelector('button[type="submit"]');
        const validation = validateForm(form);
        if (!validation.valid) return;
        const values = validation.values;
        setButtonLoading(submit, true);
        try {
          await savePart({ existencias: Number(values.existencias) || 0 }, part.id);
          close();
          afterSave("Existencias actualizadas.", { onSaved });
        } catch (error) {
          setButtonLoading(submit, false);
          toast(friendlyError(error), "error");
        }
      });
    },
  });
}
