import {
  deleteOrder,
  deletePayment,
  deleteTask,
  loadWorkspace,
  removePartFromOrder,
  setOrderStatus,
} from "../api.js";
import {
  openAddPartForm,
  openOrderForm,
  openPaymentForm,
  openTaskForm,
} from "../actions.js";
import { icon } from "../icons.js";
import {
  avatar,
  confirmDialog,
  dateInput,
  dateShort,
  emitDataChanged,
  esc,
  ESTADOS,
  friendlyError,
  METODOS_PAGO,
  money,
  priorityBadge,
  refresh,
  relativeDate,
  statusBadge,
  timeShort,
  toast,
} from "../ui.js";

const FLOW = ["recibida", "diagnostico", "reparacion", "lista", "entregada"];

function nextStatus(order) {
  const index = FLOW.indexOf(order.estado);
  if (index < 0 || index >= FLOW.length - 1) return null;
  return FLOW[index + 1];
}

function stepper(order) {
  if (order.estado === "cancelada") {
    return `<div class="cancelled-banner">${icon("xCircle", 20)}<div><strong>Orden cancelada</strong><span>Esta orden no forma parte del flujo activo del taller.</span></div></div>`;
  }
  const current = ESTADOS[order.estado]?.step || 1;
  return `
    <ol class="stepper">
      ${FLOW.map((state, index) => {
        const meta = ESTADOS[state];
        const number = index + 1;
        const completed = number < current;
        const active = number === current;
        return `<li class="stepper__step ${completed ? "is-complete" : ""} ${active ? "is-active" : ""}">
          <span class="stepper__marker">${completed ? icon("check", 14) : number}</span>
          <span class="stepper__label">${meta.label}</span>
        </li>`;
      }).join("")}
    </ol>`;
}

function taskRows(order) {
  if (!order.trabajos.length) {
    return `<tr><td colspan="4"><div class="empty empty--table"><p>Aún no hay trabajos de mano de obra registrados.</p><button class="btn btn--ghost btn--sm" type="button" data-add-task>${icon("plus", 15)}Agregar trabajo</button></div></td></tr>`;
  }
  return order.trabajos
    .map(
      (task) => `
    <tr>
      <td>
        <div class="cell-stack">
          <span class="cell-stack__title">${esc(task.descripcion)}</span>
          <span>Mano de obra</span>
        </div>
      </td>
      <td class="t-right">${task.cantidad} × ${money(task.precio_unitario)}</td>
      <td class="t-right"><strong>${money((Number(task.cantidad) || 0) * (Number(task.precio_unitario) || 0))}</strong></td>
      <td class="t-right t-action"><button class="icon-btn icon-btn--danger" type="button" data-remove-task="${task.id}" aria-label="Eliminar trabajo">${icon("trash", 16)}</button></td>
    </tr>`,
    )
    .join("");
}

function partRows(order) {
  if (!order.repuestosUsados.length) {
    return `<tr><td colspan="5"><div class="empty empty--table"><p>Aún no hay repuestos asociados a esta orden.</p><button class="btn btn--ghost btn--sm" type="button" data-add-part>${icon("plus", 15)}Agregar repuesto</button></div></td></tr>`;
  }
  return order.repuestosUsados
    .map(
      (item) => `
    <tr>
      <td>
        <div class="cell-stack">
          <span class="cell-stack__title">${esc(item.repuestoData?.nombre || "Repuesto eliminado")}</span>
          <span>${esc(item.repuestoData?.codigo || "—")} · stock actual: ${item.repuestoData?.existencias ?? "—"}</span>
        </div>
      </td>
      <td class="t-right">${item.cantidad}</td>
      <td class="t-right">${money(item.precio_unitario)}</td>
      <td class="t-right"><strong>${money((Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0))}</strong></td>
      <td class="t-right t-action"><button class="icon-btn icon-btn--danger" type="button" data-remove-part="${item.id}" aria-label="Quitar repuesto">${icon("trash", 16)}</button></td>
    </tr>`,
    )
    .join("");
}

function paymentRows(order) {
  if (!order.pagos.length) {
    return `<tr><td colspan="5"><div class="empty empty--table"><p>No se han registrado pagos para esta orden.</p>${order.totals.saldo > 0 ? `<button class="btn btn--ghost btn--sm" type="button" data-add-payment>${icon("plus", 15)}Registrar pago</button>` : ""}</div></td></tr>`;
  }
  return order.pagos
    .map(
      (payment) => `
    <tr>
      <td>${dateShort(payment.fecha)} <span class="text-muted">${timeShort(payment.fecha)}</span></td>
      <td><span class="method-pill">${esc(METODOS_PAGO[payment.metodo] || payment.metodo)}</span></td>
      <td>${esc(payment.nota || "—")}</td>
      <td class="t-right"><strong class="text-success">${money(payment.monto)}</strong></td>
      <td class="t-right t-action"><button class="icon-btn icon-btn--danger" type="button" data-remove-payment="${payment.id}" aria-label="Eliminar pago">${icon("trash", 16)}</button></td>
    </tr>`,
    )
    .join("");
}

export async function renderOrderDetail(ctx = {}) {
  const data = await loadWorkspace();
  const order = data.ordenes.find((item) => item.id === ctx.params?.id);

  if (!order) {
    return {
      html: `
        <div class="page-head">
          <div class="page-head__copy">
            <p class="eyebrow">Órdenes</p>
            <h1>Orden no encontrada</h1>
            <p class="page-head__subtitle">El registro pudo haber sido eliminado o el enlace es incorrecto.</p>
          </div>
        </div>
        <div class="card"><div class="empty"><div class="empty__icon">${icon("search", 26)}</div><h3>No encontramos esa orden</h3><p>Vuelve a la lista para seleccionar una orden existente.</p><a class="btn btn--primary btn--sm" href="#/ordenes">Volver a órdenes</a></div></div>`,
      mount() {},
    };
  }

  const totals = order.totals;
  const next = nextStatus(order);
  const canPay = totals.saldo > 0 && order.estado !== "cancelada";

  const html = `
    <div class="detail-nav no-print">
      <a href="#/ordenes" class="back-link">${icon("arrowLeft", 18)}Órdenes</a>
      <div class="detail-nav__actions">
        <button class="btn btn--ghost btn--sm" type="button" data-print>${icon("printer", 16)}Imprimir</button>
        <button class="btn btn--ghost btn--sm" type="button" data-edit-order>${icon("edit", 16)}Editar</button>
        <button class="btn btn--ghost btn--sm btn--danger-ghost" type="button" data-delete-order>${icon("trash", 16)}Eliminar</button>
      </div>
    </div>

    <header class="detail-head">
      <div>
        <p class="eyebrow">Orden de servicio · ${esc(relativeDate(order.fecha_entrada))}</p>
        <div class="detail-title">
          <h1>${esc(order.folio)}</h1>
          ${statusBadge(order.estado)}
          ${priorityBadge(order.prioridad)}
        </div>
        <p class="detail-subtitle">${esc(order.vehiculoData ? `${order.vehiculoData.marca} ${order.vehiculoData.modelo} · ${order.vehiculoData.matricula}` : "Sin vehículo")} · ${esc(order.clienteData?.nombre || "Cliente sin asignar")}</p>
      </div>
      ${next && order.estado !== "cancelada" ? `<button class="btn btn--primary no-print" type="button" data-advance-status="${next}">${icon("arrowRight", 17)}Pasar a ${ESTADOS[next].label.toLowerCase()}</button>` : ""}
    </header>

    <div class="detail-grid">
      <div class="detail-main">
        <section class="card order-journey">
          <div class="card__head">
            <div>
              <p class="eyebrow">Flujo de trabajo</p>
              <h2>Estado de la orden</h2>
            </div>
            <div class="status-changer no-print">
              <select class="input select select--compact" id="status-select" aria-label="Cambiar estado">
                ${Object.entries(ESTADOS).map(([key, meta]) => `<option value="${key}" ${order.estado === key ? "selected" : ""}>${meta.label}</option>`).join("")}
              </select>
              <button class="btn btn--ghost btn--sm" type="button" data-change-status>Actualizar</button>
            </div>
          </div>
          ${stepper(order)}
          <div class="journey-meta">
            <span>${icon("calendar", 15)} Entrada: <strong>${dateShort(order.fecha_entrada)}</strong></span>
            <span>${icon("clock", 15)} Estimada: <strong>${dateShort(order.fecha_estimada, "Sin fecha")}</strong></span>
            <span>${icon("checkCircle", 15)} Entrega: <strong>${dateShort(order.fecha_entrega, "Pendiente")}</strong></span>
          </div>
        </section>

        <section class="card">
          <header class="card__head">
            <div>
              <p class="eyebrow">Recepción</p>
              <h2>Cliente y vehículo</h2>
            </div>
          </header>
          <div class="entity-pair">
            <a class="entity-tile" href="#/clientes/${order.clienteData?.id || ""}">
              ${avatar(order.clienteData?.nombre || "Sin cliente", { size: "md" })}
              <div class="entity-tile__body">
                <span class="entity-tile__label">Cliente</span>
                <strong>${esc(order.clienteData?.nombre || "Sin asignar")}</strong>
                <small>${esc(order.clienteData?.telefono || "Sin teléfono")}</small>
              </div>
              ${icon("chevronRight", 18)}
            </a>
            <a class="entity-tile" href="#/vehiculos/${order.vehiculoData?.id || ""}">
              <span class="entity-tile__icon">${icon("car", 22)}</span>
              <div class="entity-tile__body">
                <span class="entity-tile__label">Vehículo</span>
                <strong>${esc(order.vehiculoData?.matricula || "—")}</strong>
                <small>${esc(order.vehiculoData ? `${order.vehiculoData.marca} ${order.vehiculoData.modelo} ${order.vehiculoData.anio || ""}` : "Sin vehículo")} · ${order.vehiculoData?.kilometraje ? `${order.vehiculoData.kilometraje.toLocaleString("es-CR")} km` : "sin km"}</small>
              </div>
              ${icon("chevronRight", 18)}
            </a>
          </div>
          <div class="report-grid">
            <div class="report-block">
              <span class="report-block__label">${icon("alert", 15)} Problema reportado</span>
              <p>${esc(order.problema || "Sin descripción.")}</p>
            </div>
            <div class="report-block">
              <span class="report-block__label">${icon("wrench", 15)} Diagnóstico</span>
              <p>${esc(order.diagnostico || "Pendiente de diagnóstico.")}</p>
            </div>
          </div>
          ${order.notas ? `<div class="note-block"><strong>Notas internas</strong><p>${esc(order.notas)}</p></div>` : ""}
        </section>

        <section class="card card--flush">
          <div class="section-head">
            <div>
              <p class="eyebrow">Mano de obra</p>
              <h2>Trabajos realizados</h2>
            </div>
            <button class="btn btn--ghost btn--sm no-print" type="button" data-add-task>${icon("plus", 16)}Agregar trabajo</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Trabajo</th>
                  <th class="t-right">Cantidad × precio</th>
                  <th class="t-right">Subtotal</th>
                  <th class="t-right"></th>
                </tr>
              </thead>
              <tbody>${taskRows(order)}</tbody>
            </table>
          </div>
        </section>

        <section class="card card--flush">
          <div class="section-head">
            <div>
              <p class="eyebrow">Inventario</p>
              <h2>Repuestos utilizados</h2>
            </div>
            <button class="btn btn--ghost btn--sm no-print" type="button" data-add-part>${icon("plus", 16)}Agregar repuesto</button>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Repuesto</th>
                  <th class="t-right">Cantidad</th>
                  <th class="t-right">Precio</th>
                  <th class="t-right">Subtotal</th>
                  <th class="t-right"></th>
                </tr>
              </thead>
              <tbody>${partRows(order)}</tbody>
            </table>
          </div>
        </section>

        <section class="card card--flush">
          <div class="section-head">
            <div>
              <p class="eyebrow">Pagos</p>
              <h2>Historial de pagos</h2>
            </div>
            ${canPay ? `<button class="btn btn--ghost btn--sm no-print" type="button" data-add-payment>${icon("plus", 16)}Registrar pago</button>` : ""}
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Nota</th>
                  <th class="t-right">Monto</th>
                  <th class="t-right"></th>
                </tr>
              </thead>
              <tbody>${paymentRows(order)}</tbody>
            </table>
          </div>
        </section>
      </div>

      <aside class="detail-side">
        <section class="card totals-card">
          <div class="totals-card__head">
            <div>
              <p class="eyebrow">Resumen</p>
              <h2>Total de la orden</h2>
            </div>
            ${totals.pagada ? `<span class="paid-pill paid-pill--lg">${icon("checkCircle", 14)}Pagada</span>` : ""}
          </div>
          <dl class="totals-list">
            <div><dt>Mano de obra</dt><dd>${money(totals.manoObra)}</dd></div>
            <div><dt>Repuestos</dt><dd>${money(totals.repuestos)}</dd></div>
            <div class="totals-list__total"><dt>Total</dt><dd>${money(totals.total)}</dd></div>
            <div><dt>Pagado</dt><dd class="text-success">${money(totals.pagado)}</dd></div>
            <div class="totals-list__balance"><dt>Saldo pendiente</dt><dd class="${totals.saldo > 0 ? "text-danger" : "text-success"}">${money(totals.saldo)}</dd></div>
          </dl>
          <div class="payment-progress">
            <div class="payment-progress__bar"><span style="width:${totals.progreso}%"></span></div>
            <span>${totals.progreso}% pagado</span>
          </div>
          ${canPay ? `<button class="btn btn--primary btn--block no-print" type="button" data-add-payment>${icon("card", 17)}Registrar pago</button>` : ""}
          ${order.estado === "cancelada" ? `<p class="totals-card__note">Orden cancelada. No se pueden registrar nuevos pagos.</p>` : ""}
        </section>

        <section class="card">
          <div class="card__head">
            <div>
              <p class="eyebrow">Asignación</p>
              <h2>Mecánico responsable</h2>
            </div>
          </div>
          <div class="mechanic-profile">
            ${avatar(order.mecanicoData?.nombre || "Sin asignar", { size: "lg", index: order.mecanicoData?.colorIndex || 0 })}
            <div>
              <strong>${esc(order.mecanicoData?.nombre || "Sin asignar")}</strong>
              <span>${esc(order.mecanicoData?.especialidad || "Mecánica general")}</span>
              ${order.mecanicoData?.telefono ? `<a href="tel:${esc(order.mecanicoData.telefono)}" class="link-inline">${icon("phone", 14)}${esc(order.mecanicoData.telefono)}</a>` : ""}
            </div>
          </div>
          <div class="meta-list">
            <div><span>Prioridad</span>${priorityBadge(order.prioridad)}</div>
            <div><span>Kilometraje de entrada</span><strong>${order.kilometraje_entrada ? `${order.kilometraje_entrada.toLocaleString("es-CR")} km` : "—"}</strong></div>
            <div><span>Entrada</span><strong>${dateShort(order.fecha_entrada)}</strong></div>
            <div><span>Entrega estimada</span><strong>${dateShort(order.fecha_estimada, "Sin fecha")}</strong></div>
          </div>
        </section>

        <section class="card card--danger-zone no-print">
          <div>
            <strong>Eliminar orden</strong>
            <p>Se eliminarán trabajos, repuestos y pagos. El stock de repuestos se devolverá al inventario.</p>
          </div>
          <button class="btn btn--danger-ghost btn--sm" type="button" data-delete-order>${icon("trash", 15)}Eliminar</button>
        </section>
      </aside>
    </div>`;

  return {
    html,
    mount(root) {
      const refreshDetail = () => refresh();

      root.querySelector("[data-print]")?.addEventListener("click", () => window.print());
      root.querySelectorAll("[data-edit-order]").forEach((button) => {
        button.addEventListener("click", () => openOrderForm({ order, onSaved: refreshDetail }));
      });
      root.querySelectorAll("[data-add-task]").forEach((button) => {
        button.addEventListener("click", () => openTaskForm({ order, onSaved: refreshDetail }));
      });
      root.querySelectorAll("[data-add-part]").forEach((button) => {
        button.addEventListener("click", () =>
          openAddPartForm({
            order,
            repuestos: data.repuestos.filter((part) => part.activo !== false && part.existencias > 0),
            onSaved: refreshDetail,
          }),
        );
      });
      root.querySelectorAll("[data-add-payment]").forEach((button) => {
        button.addEventListener("click", () => openPaymentForm({ order, onSaved: refreshDetail }));
      });

      root.querySelectorAll("[data-remove-task]").forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: "Eliminar trabajo",
            message: "¿Quitar este trabajo de mano de obra de la orden?",
            confirmText: "Eliminar",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await deleteTask(button.dataset.removeTask);
            toast("Trabajo eliminado.");
            emitDataChanged();
            refreshDetail();
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });

      root.querySelectorAll("[data-remove-part]").forEach((button) => {
        button.addEventListener("click", async () => {
          const item = order.repuestosUsados.find((part) => part.id === button.dataset.removePart);
          if (!item) return;
          const confirmed = await confirmDialog({
            title: "Quitar repuesto",
            message: `¿Quitar ${item.repuestoData?.nombre || "este repuesto"} de la orden? Se devolverán ${item.cantidad} unidad(es) al inventario.`,
            confirmText: "Quitar y devolver stock",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await removePartFromOrder(item);
            toast("Repuesto devuelto al inventario.");
            emitDataChanged();
            refreshDetail();
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });

      root.querySelectorAll("[data-remove-payment]").forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: "Eliminar pago",
            message: "¿Eliminar este pago? El saldo de la orden volverá a aumentar.",
            confirmText: "Eliminar pago",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await deletePayment(button.dataset.removePayment);
            toast("Pago eliminado.");
            emitDataChanged();
            refreshDetail();
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });

      const changeStatus = async (target) => {
        if (!target || target === order.estado) {
          toast("La orden ya está en ese estado.", "warning");
          return;
        }
        let confirmMessage = `¿Cambiar el estado a “${ESTADOS[target]?.label || target}”?`;
        if (target === "entregada") {
          confirmMessage =
            "¿Marcar la orden como entregada? Se registrará la fecha de entrega y se actualizará el kilometraje del vehículo.";
        }
        if (target === "cancelada") {
          confirmMessage = "¿Cancelar esta orden? Seguirá visible en el historial, pero saldrá del flujo activo.";
        }
        const confirmed = await confirmDialog({
          title: "Cambiar estado",
          message: confirmMessage,
          confirmText: target === "cancelada" ? "Cancelar orden" : "Confirmar",
          danger: target === "cancelada",
        });
        if (!confirmed) return;
        try {
          await setOrderStatus(order, target);
          toast(`Estado actualizado a ${ESTADOS[target]?.label.toLowerCase() || target}.`);
          emitDataChanged();
          refreshDetail();
        } catch (error) {
          toast(friendlyError(error), "error");
        }
      };

      root.querySelectorAll("[data-advance-status]").forEach((button) => {
        button.addEventListener("click", () => changeStatus(button.dataset.advanceStatus));
      });
      root.querySelector("[data-change-status]")?.addEventListener("click", () => {
        changeStatus(root.querySelector("#status-select")?.value);
      });

      root.querySelectorAll("[data-delete-order]").forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: `Eliminar ${order.folio}`,
            message:
              "Esta acción eliminará la orden, sus trabajos, repuestos y pagos. El stock de los repuestos usados se devolverá al inventario. No se puede deshacer.",
            confirmText: "Sí, eliminar orden",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await deleteOrder(order);
            toast("Orden eliminada y stock restaurado.");
            emitDataChanged();
            location.hash = "#/ordenes";
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });
    },
  };
}
