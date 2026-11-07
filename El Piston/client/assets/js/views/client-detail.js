import { isOpen, loadWorkspace, deleteClient } from "../api.js";
import { openClientForm, openOrderForm, openVehicleForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  avatar,
  confirmDialog,
  dateLong,
  dateShort,
  emitDataChanged,
  esc,
  friendlyError,
  money,
  relativeDate,
  statusBadge,
  toast,
} from "../ui.js";

function vehicleCard(vehicle, client) {
  const lastOrder = vehicle.ordenes?.[0];
  const open = (vehicle.ordenes || []).filter(isOpen).length;
  return `
    <article class="vehicle-card">
      <div class="vehicle-card__head">
        <span class="plate">${esc(vehicle.matricula)}</span>
        ${open ? `<span class="chip chip--dark">${open} abierta${open === 1 ? "" : "s"}</span>` : `<span class="chip">${vehicle.ordenes?.length || 0} visita(s)</span>`}
      </div>
      <h3>${esc(vehicle.marca)} ${esc(vehicle.modelo)}</h3>
      <p>${vehicle.anio || "Año s/d"} · ${vehicle.kilometraje ? `${vehicle.kilometraje.toLocaleString("es-CR")} km` : "Kilometraje s/d"}</p>
      <div class="vehicle-card__meta">
        <span>${icon("clock", 14)} ${lastOrder ? relativeDate(lastOrder.fecha_entrada) : "Sin visitas"}</span>
        <span>${icon("orders", 14)} ${vehicle.ordenes?.length || 0} órdenes</span>
      </div>
      <div class="vehicle-card__actions">
        <a class="btn btn--ghost btn--sm" href="#/vehiculos/${vehicle.id}">Ver historial</a>
        <button class="btn btn--primary btn--sm" type="button" data-new-order-vehicle="${vehicle.id}" data-client="${client.id}">${icon("plus", 14)}Orden</button>
      </div>
    </article>`;
}

export async function renderClientDetail(ctx = {}) {
  const data = await loadWorkspace();
  const client = data.clientes.find((item) => item.id === ctx.params?.id);

  if (!client) {
    return {
      html: `
        <div class="page-head"><div class="page-head__copy"><p class="eyebrow">Clientes</p><h1>Cliente no encontrado</h1><p class="page-head__subtitle">El registro pudo haber sido eliminado.</p></div></div>
        <div class="card"><div class="empty"><div class="empty__icon">${icon("search", 26)}</div><h3>No encontramos ese cliente</h3><p>Vuelve al directorio para seleccionar un cliente existente.</p><a class="btn btn--primary btn--sm" href="#/clientes">Volver a clientes</a></div></div>`,
      mount() {},
    };
  }

  const orders = (client.ordenes || []).slice().sort((a, b) => String(b.fecha_entrada).localeCompare(String(a.fecha_entrada)));
  const total = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
  const pending = orders.filter((order) => order.estado !== "cancelada").reduce((sum, order) => sum + (order.totals?.saldo || 0), 0);
  const open = orders.filter(isOpen).length;
  const firstOrder = orders[orders.length - 1];
  const clientSince = firstOrder ? dateLong(firstOrder.fecha_entrada) : "Sin historial";

  const html = `
    <div class="detail-nav no-print">
      <a href="#/clientes" class="back-link">${icon("arrowLeft", 18)}Clientes</a>
      <div class="detail-nav__actions">
        <button class="btn btn--ghost btn--sm" type="button" data-edit-client>${icon("edit", 16)}Editar</button>
        <button class="btn btn--ghost btn--sm" type="button" data-new-vehicle>${icon("plus", 16)}Agregar vehículo</button>
        <button class="btn btn--primary btn--sm" type="button" data-new-order>${icon("plus", 16)}Nueva orden</button>
      </div>
    </div>

    <header class="profile-head">
      ${avatar(client.nombre, { size: "xl" })}
      <div class="profile-head__copy">
        <p class="eyebrow">Cliente desde ${firstOrder ? dateShort(firstOrder.fecha_entrada) : "su primera visita"}</p>
        <h1>${esc(client.nombre)}</h1>
        <p>${esc(client.telefono || "Sin teléfono")} ${client.direccion ? `· ${esc(client.direccion)}` : ""}</p>
      </div>
      <div class="profile-head__badges">
        ${open ? `<span class="chip chip--dark">${open} orden(es) abierta(s)</span>` : `<span class="chip">Sin órdenes abiertas</span>`}
        ${pending > 0 ? `<span class="chip chip--danger">${money(pending)} pendiente</span>` : `<span class="chip chip--up">Al día</span>`}
      </div>
    </header>

    <section class="mini-stats">
      <div class="mini-stat"><span>Vehículos</span><strong>${client.vehiculos.length}</strong><small>${client.vehiculos.map((v) => v.matricula).join(" · ") || "Sin vehículos"}</small></div>
      <div class="mini-stat"><span>Órdenes históricas</span><strong>${orders.length}</strong><small>${open} actualmente abiertas</small></div>
      <div class="mini-stat"><span>Total facturado</span><strong>${money(total)}</strong><small>En todas las visitas</small></div>
      <div class="mini-stat"><span>Saldo pendiente</span><strong class="${pending > 0 ? "text-danger" : "text-success"}">${money(pending)}</strong><small>${pending ? "Requiere seguimiento" : "Sin deudas"}</small></div>
    </section>

    <div class="profile-grid">
      <div class="profile-main">
        <section class="card card--flush">
          <div class="section-head">
            <div>
              <p class="eyebrow">Garaje</p>
              <h2>Vehículos del cliente</h2>
            </div>
            <button class="btn btn--ghost btn--sm no-print" type="button" data-new-vehicle>${icon("plus", 16)}Agregar vehículo</button>
          </div>
          <div class="vehicle-grid">
            ${client.vehiculos.length ? client.vehiculos.map((vehicle) => vehicleCard(vehicle, client)).join("") : `<div class="empty empty--plain"><div class="empty__icon">${icon("car", 24)}</div><h3>Sin vehículos registrados</h3><p>Agrega el primer vehículo de este cliente.</p><button class="btn btn--primary btn--sm" type="button" data-new-vehicle>Agregar vehículo</button></div>`}
          </div>
        </section>

        <section class="card card--flush">
          <div class="section-head">
            <div>
              <p class="eyebrow">Historial</p>
              <h2>Servicios del cliente</h2>
            </div>
            <span class="chip">${orders.length} órdenes</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Vehículo</th>
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
                    <td><div class="cell-stack"><span class="cell-stack__title">${esc(order.folio)}</span><span>${dateShort(order.fecha_entrada)}</span></div></td>
                    <td><div class="cell-stack"><span>${esc(order.vehiculoData?.matricula || "—")}</span><span class="text-muted">${esc(order.vehiculoData ? `${order.vehiculoData.marca} ${order.vehiculoData.modelo}` : "")}</span></div></td>
                    <td>${statusBadge(order.estado)}</td>
                    <td>${esc(order.mecanicoData?.nombre || "Sin asignar")}</td>
                    <td class="t-right"><strong>${money(order.totals.total)}</strong></td>
                    <td class="t-right">${order.totals.saldo > 0 ? `<span class="balance-due">${money(order.totals.saldo)}</span>` : '<span class="paid-pill">Pagada</span>'}</td>
                  </tr>`,
                        )
                        .join("")
                    : `<tr><td colspan="6"><div class="empty empty--table"><p>Este cliente todavía no tiene órdenes de servicio.</p></div></td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside class="profile-side">
        <section class="card">
          <div class="card__head">
            <div><p class="eyebrow">Contacto</p><h2>Datos del cliente</h2></div>
          </div>
          <div class="contact-list">
            <a href="tel:${esc(client.telefono || "")}" class="contact-row">
              <span class="contact-row__icon">${icon("phone", 17)}</span>
              <div><span>Teléfono</span><strong>${esc(client.telefono || "No registrado")}</strong></div>
            </a>
            <div class="contact-row">
              <span class="contact-row__icon">${icon("pin", 17)}</span>
              <div><span>Dirección</span><strong>${esc(client.direccion || "No registrada")}</strong></div>
            </div>
            <div class="contact-row">
              <span class="contact-row__icon">${icon("calendar", 17)}</span>
              <div><span>Cliente desde</span><strong>${clientSince}</strong></div>
            </div>
          </div>
          ${client.notas ? `<div class="note-block"><strong>Notas</strong><p>${esc(client.notas)}</p></div>` : ""}
        </section>

        <section class="card card--danger-zone no-print">
          <div>
            <strong>Eliminar cliente</strong>
            <p>Solo es posible eliminarlo si no tiene vehículos registrados.</p>
          </div>
          <button class="btn btn--danger-ghost btn--sm" type="button" data-delete-client>${icon("trash", 15)}Eliminar</button>
        </section>
      </aside>
    </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll("[data-edit-client]").forEach((button) => {
        button.addEventListener("click", () => openClientForm({ client, onSaved: () => window.dispatchEvent(new Event("hashchange")) }));
      });
      root.querySelectorAll("[data-new-vehicle]").forEach((button) => {
        button.addEventListener("click", () => openVehicleForm({ preselectedClient: client.id, onSaved: () => window.dispatchEvent(new Event("hashchange")) }));
      });
      root.querySelectorAll("[data-new-order]").forEach((button) => {
        button.addEventListener("click", () => openOrderForm({ preselectedClient: client.id }));
      });
      root.querySelectorAll("[data-new-order-vehicle]").forEach((button) => {
        button.addEventListener("click", () =>
          openOrderForm({ preselectedClient: button.dataset.client, preselectedVehicle: button.dataset.newOrderVehicle }),
        );
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
      root.querySelectorAll("[data-delete-client]").forEach((button) => {
        button.addEventListener("click", async () => {
          const confirmed = await confirmDialog({
            title: `Eliminar a ${client.nombre}`,
            message: "Solo se puede eliminar un cliente sin vehículos registrados. Esta acción no se puede deshacer.",
            confirmText: "Eliminar cliente",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await deleteClient(client);
            toast("Cliente eliminado.");
            emitDataChanged();
            location.hash = "#/clientes";
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });
    },
  };
}
