import { isOpen, loadWorkspace } from "../api.js";
import { openVehicleForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  debounce,
  esc,
  money,
  pageHeader,
  relativeDate,
} from "../ui.js";

function rowHtml(vehicle) {
  const orders = vehicle.ordenes || [];
  const open = orders.filter(isOpen);
  const total = orders.reduce((sum, order) => sum + (order.totals?.total || 0), 0);
  return `
    <tr data-href="#/vehiculos/${vehicle.id}" tabindex="0" class="is-clickable">
      <td><span class="plate plate--sm">${esc(vehicle.matricula)}</span></td>
      <td>
        <div class="cell-stack">
          <span class="cell-stack__title">${esc(vehicle.marca)} ${esc(vehicle.modelo)}</span>
          <span>${vehicle.anio || "Año s/d"} · ${vehicle.kilometraje ? `${vehicle.kilometraje.toLocaleString("es-CR")} km` : "Km s/d"}</span>
        </div>
      </td>
      <td>
        <a class="cell-person cell-link" href="#/clientes/${vehicle.clienteData?.id || ""}">
          <span>${esc(vehicle.clienteData?.nombre || "Sin cliente")}</span>
        </a>
      </td>
      <td class="t-center"><span class="count-pill">${orders.length}</span></td>
      <td>${orders[0] ? relativeDate(orders[0].fecha_entrada) : "Sin visitas"}</td>
      <td class="t-right"><strong>${money(total)}</strong></td>
      <td>${open.length ? `<span class="chip chip--dark">${open.length} abierta${open.length === 1 ? "" : "s"}</span>` : '<span class="chip">Disponible</span>'}</td>
      <td class="t-right t-action"><span class="row-arrow">${icon("chevronRight", 18)}</span></td>
    </tr>`;
}

export async function renderVehicles() {
  const data = await loadWorkspace();
  const vehicles = data.vehiculos.slice().sort((a, b) => a.matricula.localeCompare(b.matricula));
  const withOpen = vehicles.filter((vehicle) => (vehicle.ordenes || []).some(isOpen));
  const brands = new Set(vehicles.map((vehicle) => vehicle.marca).filter(Boolean));

  const html = `
    ${pageHeader({
      eyebrow: "Flota de clientes",
      title: "Vehículos",
      subtitle: "Matrícula, kilometraje e historial de servicios de cada vehículo.",
      actions: `<button class="btn btn--primary" type="button" data-new-vehicle>${icon("plus", 18)}Nuevo vehículo</button>`,
    })}

    <section class="mini-stats">
      <div class="mini-stat"><span>Vehículos registrados</span><strong>${vehicles.length}</strong><small>${brands.size} marcas distintas</small></div>
      <div class="mini-stat"><span>Actualmente en taller</span><strong>${withOpen.length}</strong><small>Con al menos una orden abierta</small></div>
      <div class="mini-stat"><span>Clientes con flota</span><strong>${data.clientes.filter((client) => client.vehiculos.length > 1).length}</strong><small>Más de un vehículo</small></div>
    </section>

    <section class="card card--flush">
      <div class="toolbar">
        <div class="searchbox">
          ${icon("search", 18)}
          <input type="search" id="vehicles-search" placeholder="Buscar por matrícula, marca, modelo o cliente…" autocomplete="off">
        </div>
        <label class="check-inline">
          <input type="checkbox" id="only-open">
          <span>Solo con orden abierta</span>
        </label>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Vehículo</th>
              <th>Cliente</th>
              <th class="t-center">Órdenes</th>
              <th>Última visita</th>
              <th class="t-right">Facturado</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="vehicles-body"></tbody>
        </table>
      </div>
      <div id="vehicles-empty"></div>
      <footer class="table-foot">
        <span id="vehicles-count"></span>
        <span class="table-foot__hint">Un vehículo puede volver muchas veces; el historial se conserva.</span>
      </footer>
    </section>`;

  return {
    html,
    mount(root) {
      const body = root.querySelector("#vehicles-body");
      const empty = root.querySelector("#vehicles-empty");
      const count = root.querySelector("#vehicles-count");
      const search = root.querySelector("#vehicles-search");
      const onlyOpen = root.querySelector("#only-open");
      let term = "";

      const render = () => {
        const q = term.trim().toLowerCase();
        const rows = vehicles.filter((vehicle) => {
          if (onlyOpen.checked && !(vehicle.ordenes || []).some(isOpen)) return false;
          if (!q) return true;
          return [vehicle.matricula, vehicle.marca, vehicle.modelo, vehicle.anio, vehicle.clienteData?.nombre]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
        body.innerHTML = rows.map(rowHtml).join("");
        empty.innerHTML = rows.length
          ? ""
          : `<div class="empty"><div class="empty__icon">${icon("car", 24)}</div><h3>No hay vehículos con esos filtros</h3><p>Prueba con otro término o registra un vehículo nuevo.</p></div>`;
        count.textContent = `Mostrando ${rows.length} de ${vehicles.length} vehículos`;
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
        body.querySelectorAll("a[href]").forEach((link) => {
          link.addEventListener("click", (event) => event.stopPropagation());
        });
      };

      root.querySelector("[data-new-vehicle]")?.addEventListener("click", () => openVehicleForm());
      search.addEventListener("input", debounce(() => {
        term = search.value;
        render();
      }, 160));
      onlyOpen.addEventListener("change", render);
      render();
    },
  };
}
