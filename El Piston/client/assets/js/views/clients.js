import { isOpen, loadWorkspace } from "../api.js";
import { openClientForm, openOrderForm, openVehicleForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  avatar,
  debounce,
  esc,
  money,
  pageHeader,
  relativeDate,
} from "../ui.js";

function clientStats(client) {
  const orders = client.ordenes || [];
  const total = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
  const pending = orders
    .filter((order) => order.estado !== "cancelada")
    .reduce((sum, order) => sum + (order.totals?.saldo || 0), 0);
  const open = orders.filter(isOpen).length;
  return { orders, total, pending, open };
}

function rowHtml(client) {
  const stats = clientStats(client);
  return `
    <tr data-href="#/clientes/${client.id}" tabindex="0" class="is-clickable">
      <td>
        <div class="cell-person cell-person--lg">
          ${avatar(client.nombre, { size: "sm" })}
          <div class="cell-stack">
            <span class="cell-stack__title">${esc(client.nombre)}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="cell-stack">
          <span>${esc(client.telefono || "Sin teléfono")}</span>
          <span class="text-muted">${esc(client.direccion || "Sin dirección")}</span>
        </div>
      </td>
      <td class="t-center"><span class="count-pill">${client.vehiculos.length}</span></td>
      <td class="t-center"><span class="count-pill">${stats.orders.length}</span></td>
      <td>
        <div class="cell-stack">
          <span>${stats.orders[0] ? relativeDate(stats.orders[0].fecha_entrada) : "Sin visitas"}</span>
          <span class="text-muted">${stats.open ? `${stats.open} orden(es) abierta(s)` : "Sin órdenes abiertas"}</span>
        </div>
      </td>
      <td class="t-right">
        ${stats.pending > 0 ? `<span class="balance-due">${money(stats.pending)}</span>` : '<span class="paid-pill">Al día</span>'}
      </td>
      <td class="t-right t-action"><span class="row-arrow">${icon("chevronRight", 18)}</span></td>
    </tr>`;
}

export async function renderClients() {
  const data = await loadWorkspace();
  const clients = data.clientes.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const withDebt = clients.filter((client) => clientStats(client).pending > 0);
  const withVehicles = clients.filter((client) => client.vehiculos.length > 0);

  const html = `
    ${pageHeader({
      eyebrow: "Directorio",
      title: "Clientes",
      subtitle: "Datos de contacto, vehículos e historial de cada cliente.",
      actions: `<button class="btn btn--primary" type="button" data-new-client>${icon("plus", 18)}Nuevo cliente</button>`,
    })}

    <section class="mini-stats">
      <div class="mini-stat"><span>Clientes registrados</span><strong>${clients.length}</strong><small>${withVehicles.length} con vehículos</small></div>
      <div class="mini-stat"><span>Con saldo pendiente</span><strong>${withDebt.length}</strong><small>${money(withDebt.reduce((sum, client) => sum + clientStats(client).pending, 0))} por cobrar</small></div>
      <div class="mini-stat"><span>Vehículos en cartera</span><strong>${data.vehiculos.length}</strong><small>${data.ordenes.length} órdenes históricas</small></div>
    </section>

    <section class="card card--flush">
      <div class="toolbar">
        <div class="searchbox">
          ${icon("search", 18)}
          <input type="search" id="clients-search" placeholder="Buscar por nombre, teléfono o dirección…" autocomplete="off">
        </div>
        <label class="check-inline">
          <input type="checkbox" id="only-debt">
          <span>Solo con saldo pendiente</span>
        </label>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contacto</th>
              <th class="t-center">Vehículos</th>
              <th class="t-center">Órdenes</th>
              <th>Última visita</th>
              <th class="t-right">Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="clients-body"></tbody>
        </table>
      </div>
      <div id="clients-empty"></div>
      <footer class="table-foot">
        <span id="clients-count"></span>
        <span class="table-foot__hint">Cada cliente puede tener varios vehículos y visitas.</span>
      </footer>
    </section>`;

  return {
    html,
    mount(root) {
      const body = root.querySelector("#clients-body");
      const empty = root.querySelector("#clients-empty");
      const count = root.querySelector("#clients-count");
      const search = root.querySelector("#clients-search");
      const onlyDebt = root.querySelector("#only-debt");
      let term = "";

      const render = () => {
        const q = term.trim().toLowerCase();
        const rows = clients.filter((client) => {
          if (onlyDebt.checked && clientStats(client).pending <= 0) return false;
          if (!q) return true;
          return [client.nombre, client.telefono, client.direccion, ...client.vehiculos.map((v) => `${v.matricula} ${v.marca} ${v.modelo}`)]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
        body.innerHTML = rows.map(rowHtml).join("");
        empty.innerHTML = rows.length
          ? ""
          : `<div class="empty"><div class="empty__icon">${icon("clients", 24)}</div><h3>No hay clientes con esos filtros</h3><p>Prueba con otro término o registra un cliente nuevo.</p></div>`;
        count.textContent = `Mostrando ${rows.length} de ${clients.length} clientes`;
        body.querySelectorAll("tr[data-href]").forEach((row) => {
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
      };

      root.querySelector("[data-new-client]")?.addEventListener("click", () => openClientForm());
      search.addEventListener("input", debounce(() => {
        term = search.value;
        render();
      }, 160));
      onlyDebt.addEventListener("change", render);
      render();
    },
  };
}
