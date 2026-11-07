import { deleteVehicle, isOpen, loadWorkspace } from "../api.js";
import { openOrderForm, openVehicleForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  confirmDialog,
  dateShort,
  emitDataChanged,
  esc,
  friendlyError,
  money,
  relativeDate,
  statusBadge,
  toast,
} from "../ui.js";

export async function renderVehicleDetail(ctx = {}) {
  const data = await loadWorkspace();
  const vehicle = data.vehiculos.find((item) => item.id === ctx.params?.id);

  if (!vehicle) {
    return {
      html: `
        <div class="page-head"><div class="page-head__copy"><p class="eyebrow">Vehículos</p><h1>Vehículo no encontrado</h1><p class="page-head__subtitle">El registro pudo haber sido eliminado.</p></div></div>
        <div class="card"><div class="empty"><div class="empty__icon">${icon("search", 26)}</div><h3>No encontramos ese vehículo</h3><p>Vuelve a la lista para seleccionar un vehículo existente.</p><a class="btn btn--primary btn--sm" href="#/vehiculos">Volver a vehículos</a></div></div>`,
      mount() {},
    };
  }

  const orders = (vehicle.ordenes || []).slice().sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)));
  const total = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
  const pending = orders.filter((order) => order.estado !== "cancelada").reduce((sum, order) => sum + (order.totals?.saldo || 0), 0);
  const open = orders.filter(isOpen).length;
  const lastOrder = orders[0];
  const client = vehicle.clienteData;

  const html = `
    <div class="detail-nav no-print">
      <a href="#/vehiculos" class="back-link">${icon("arrowLeft", 18)}Vehículos</a>
      <div class="detail-nav__actions">
        <button class="btn btn--ghost btn--sm" type="button" data-edit-vehicle>${icon("edit", 16)}Editar</button>
        <button class="btn btn--primary btn--sm" type="button" data-new-order>${icon("plus", 16)}Nueva orden</button>
      </div>
    </div>

    <header class="profile-head">
      <span class="profile-head__vehicle">${icon("car", 34)}</span>
      <div class="profile-head__copy">
        <p class="eyebrow">Vehículo · ${vehicle.anio || "Año s/d"}</p>
        <div class="detail-title">
          <h1>${esc(vehicle.marca)} ${esc(vehicle.modelo)}</h1>
          <span class="plate">${esc(vehicle.matricula)}</span>
        </div>
        <p>${esc(client?.nombre || "Cliente sin asignar")} ${client?.telefono ? `· ${esc(client.telefono)}` : ""} · ${vehicle.kilometraje ? `${vehicle.kilometraje.toLocaleString("es-CR")} km` : "Kilometraje s/d"}</p>
      </div>
      <div class="profile-head__badges">
        ${open ? `<span class="chip chip--dark">${open} orden(es) abierta(s)</span>` : '<span class="chip">Sin órdenes abiertas</span>'}
        ${pending > 0 ? `<span class="chip chip--danger">${money(pending)} pendiente</span>` : '<span class="chip chip--up">Al día</span>'}
      </div>
    </header>

    <section class="mini-stats">
      <div class="mini-stat"><span>Visitas al taller</span><strong>${orders.length}</strong><small>${open} actualmente abiertas</small></div>
      <div class="mini-stat"><span>Total facturado</span><strong>${money(total)}</strong><small>En todo el historial</small></div>
      <div class="mini-stat"><span>Saldo pendiente</span><strong class="${pending > 0 ? "text-danger" : "text-success"}">${money(pending)}</strong><small>${pending ? "Requiere seguimiento" : "Sin deudas"}</small></div>
      <div class="mini-stat"><span>Última visita</span><strong>${lastOrder ? relativeDate(lastOrder.fecha_entrada) : "—"}</strong><small>${lastOrder ? esc(lastOrder.folio) : "Sin órdenes"}</small></div>
    </section>

    <div class="profile-grid">
      <div class="profile-main">
        <section class="card card--flush">
          <div class="section-head">
            <div><p class="eyebrow">Historial</p><h2>Órdenes de servicio</h2></div>
            <span class="chip">${orders.length} registros</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Entrada</th>
                  <th>Estado</th>
                  <th>Mecánico</th>
                  <th class="t-right">Total</th>
                  <th class="t-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${
                  orders.length
                    ? orders
                        .map(
                          (order) => `
                  <tr data-href="#/ordenes/${order.id}" tabindex="0" class="is-clickable">
                    <td><div class="cell-stack"><span class="cell-stack__title">${esc(order.folio)}</span><span class="text-muted">${esc(order.problema?.slice(0, 50) || "Sin descripción")}${order.problema?.length > 50 ? "…" : ""}</span></div></td>
                    <td>${dateShort(order.fecha_entrada)}</td>
                    <td>${statusBadge(order.estado)}</td>
                    <td>${esc(order.mecanicoData?.nombre || "Sin asignar")}</td>
                    <td class="t-right"><strong>${money(order.totals.total)}</strong></td>
                    <td class="t-right">${order.totals.saldo > 0 ? `<span class="balance-due">${money(order.totals.saldo)}</span>` : '<span class="paid-pill">Pagada</span>'}</td>
                  </tr>`,
                        )
                        .join("")
                    : `<tr><td colspan="6"><div class="empty empty--table"><p>Este vehículo todavía no tiene órdenes de servicio.</p><button class="btn btn--ghost btn--sm" type="button" data-new-order>${icon("plus", 15)}Crear primera orden</button></div></td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="card__head"><div><p class="eyebrow">Observaciones</p><h2>Notas del vehículo</h2></div></div>
          <p class="prose">${esc(vehicle.notas || "Sin notas registradas para este vehículo.")}</p>
        </section>
      </div>

      <aside class="profile-side">
        <section class="card">
          <div class="card__head"><div><p class="eyebrow">Propietario</p><h2>Cliente</h2></div></div>
          ${client ? `<a class="owner-card" href="#/clientes/${client.id}">
            <span class="owner-card__icon">${icon("user", 22)}</span>
            <div><strong>${esc(client.nombre)}</strong><span>${esc(client.telefono || "Sin teléfono")}</span></div>
            ${icon("chevronRight", 18)}
          </a>` : `<p class="prose">Sin cliente asociado.</p>`}
          <div class="meta-list">
            <div><span>Matrícula</span><strong>${esc(vehicle.matricula)}</strong></div>
            <div><span>Marca / modelo</span><strong>${esc(vehicle.marca)} ${esc(vehicle.modelo)}</strong></div>
            <div><span>Año</span><strong>${vehicle.anio || "—"}</strong></div>
            <div><span>Kilometraje</span><strong>${vehicle.kilometraje ? `${vehicle.kilometraje.toLocaleString("es-CR")} km` : "—"}</strong></div>
          </div>
        </section>

        <section class="card card--danger-zone no-print">
          <div>
            <strong>Eliminar vehículo</strong>
            <p>Solo es posible eliminarlo si no tiene órdenes de servicio.</p>
          </div>
          <button class="btn btn--danger-ghost btn--sm" type="button" data-delete-vehicle>${icon("trash", 15)}Eliminar</button>
        </section>
      </aside>
    </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll("[data-edit-vehicle]").forEach((button) => {
        button.addEventListener("click", () => openVehicleForm({ vehicle, onSaved: () => window.dispatchEvent(new Event("hashchange")) }));
      });
      root.querySelectorAll("[data-new-order]").forEach((button) => {
        button.addEventListener("click", () => openOrderForm({ preselectedClient: client?.id || "", preselectedVehicle: vehicle.id }));
      });
      root.querySelectorAll("tr[data-href]").forEach((row) => {
        const go = () => {
          location.hash = row.dataset.href;
        };
        row.addEventListener("click", go);
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            go();
          }
        });
      });
      root.querySelectorAll("[data-delete-vehicle]").forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: `Eliminar ${vehicle.matricula}`,
            message: "Solo se puede eliminar un vehículo sin órdenes de servicio. Esta acción no se puede deshacer.",
            confirmText: "Eliminar vehículo",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await deleteVehicle(vehicle);
            toast("Vehículo eliminado.");
            emitDataChanged();
            location.hash = "#/vehiculos";
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });
    },
  };
}
