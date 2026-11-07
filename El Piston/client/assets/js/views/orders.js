import { isOpen, loadWorkspace } from "../api.js";
import { openOrderForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  avatar,
  debounce,
  esc,
  ESTADOS,
  money,
  pageHeader,
  PRIORIDADES,
  priorityBadge,
  relativeDate,
  statusBadge,
} from "../ui.js";

function isOverdue(order) {
  if (!isOpen(order) || !order.fecha_estimada) return false;
  const estimated = new Date(String(order.fecha_estimada).replace(" ", "T"));
  const today = new Date();
  return estimated < new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function rowHtml(order) {
  const overdue = isOverdue(order);
  return `
    <tr data-href="#/ordenes/${order.id}" tabindex="0" class="is-clickable">
      <td>
        <div class="cell-stack">
          <span class="cell-stack__title">${esc(order.folio)} ${overdue ? '<span class="mini-flag mini-flag--red">Atrasada</span>' : ""}</span>
          <span>${esc(relativeDate(order.fecha_entrada))} · ${esc(order.fecha_entrada ? new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "short" }).format(new Date(String(order.fecha_entrada).replace(" ", "T"))) : "—")}</span>
        </div>
      </td>
      <td>
        <div class="cell-stack">
          <span class="cell-stack__title">${esc(order.clienteData?.nombre || "Cliente sin asignar")}</span>
          <span>${esc(order.vehiculoData ? `${order.vehiculoData.matricula} · ${order.vehiculoData.marca} ${order.vehiculoData.modelo}` : "Sin vehículo")}</span>
        </div>
      </td>
      <td>${statusBadge(order.estado)}</td>
      <td>
        <div class="cell-person">
          ${avatar(order.mecanicoData?.nombre || "Sin asignar", { size: "xs" })}
          <span>${esc(order.mecanicoData?.nombre || "Sin asignar")}</span>
        </div>
      </td>
      <td>${priorityBadge(order.prioridad)}</td>
      <td class="t-right"><strong>${money(order.totals.total)}</strong></td>
      <td class="t-right">
        ${
          order.estado === "cancelada"
            ? '<span class="text-muted">—</span>'
            : order.totals.saldo > 0
              ? `<span class="balance-due">${money(order.totals.saldo)}</span>`
              : '<span class="paid-pill">Pagada</span>'
        }
      </td>
      <td class="t-right t-action"><span class="row-arrow">${icon("chevronRight", 18)}</span></td>
    </tr>`;
}

export async function renderOrders(ctx = {}) {
  const data = await loadWorkspace();
  const query = ctx.query || {};
  const state = {
    q: query.q || "",
    estado: query.estado || "todas",
    mecanico: query.mecanico || "todas",
    prioridad: query.prioridad || "todas",
  };

  const counts = {
    todas: data.ordenes.length,
    abiertas: data.ordenes.filter(isOpen).length,
    ...Object.keys(ESTADOS).reduce((acc, key) => {
      acc[key] = data.ordenes.filter((order) => order.estado === key).length;
      return acc;
    }, {}),
  };

  const html = `
    ${pageHeader({
      eyebrow: "Operación",
      title: "Órdenes de servicio",
      subtitle: "Controla el ingreso, el avance y la entrega de cada vehículo.",
      actions: `<button class="btn btn--primary" type="button" data-new-order>${icon("plus", 18)}Nueva orden</button>`,
    })}

    <div class="filter-tabs" role="tablist" aria-label="Filtrar por estado">
      ${[
        ["todas", "Todas"],
        ["abiertas", "Abiertas"],
        ...Object.entries(ESTADOS).map(([key, meta]) => [key, meta.label]),
      ]
        .map(
          ([key, label]) => `
        <button type="button" class="filter-tab ${state.estado === key ? "is-active" : ""}" data-estado="${key}" role="tab" aria-selected="${state.estado === key}">
          ${esc(label)} <span>${counts[key] || 0}</span>
        </button>`,
        )
        .join("")}
    </div>

    <section class="card card--flush">
      <div class="toolbar">
        <div class="searchbox">
          ${icon("search", 18)}
          <input type="search" id="orders-search" placeholder="Buscar por folio, cliente, matrícula o marca…" value="${esc(state.q)}" autocomplete="off">
        </div>
        <div class="toolbar__filters">
          <label class="select-wrap">
            ${icon("mechanics", 17)}
            <select id="filter-mechanic" class="input select select--compact">
              <option value="todas">Todos los mecánicos</option>
              ${data.mecanicos.map((mechanic) => `<option value="${mechanic.id}" ${state.mecanico === mechanic.id ? "selected" : ""}>${esc(mechanic.nombre)}</option>`).join("")}
            </select>
          </label>
          <label class="select-wrap">
            ${icon("filter", 17)}
            <select id="filter-priority" class="input select select--compact">
              <option value="todas">Toda prioridad</option>
              ${Object.entries(PRIORIDADES).map(([key, meta]) => `<option value="${key}" ${state.prioridad === key ? "selected" : ""}>${meta.label}</option>`).join("")}
            </select>
          </label>
          <button class="btn btn--ghost btn--sm" type="button" id="clear-filters">Limpiar</button>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table orders-table">
          <thead>
            <tr>
              <th>Orden</th>
              <th>Cliente / Vehículo</th>
              <th>Estado</th>
              <th>Mecánico</th>
              <th>Prioridad</th>
              <th class="t-right">Total</th>
              <th class="t-right">Saldo</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="orders-body"></tbody>
        </table>
      </div>
      <div id="orders-empty"></div>
      <footer class="table-foot">
        <span id="orders-count"></span>
        <span class="table-foot__hint">Haz clic en una orden para ver el detalle y registrar avances.</span>
      </footer>
    </section>`;

  return {
    html,
    mount(root) {
      const body = root.querySelector("#orders-body");
      const empty = root.querySelector("#orders-empty");
      const count = root.querySelector("#orders-count");
      const search = root.querySelector("#orders-search");
      const mechanic = root.querySelector("#filter-mechanic");
      const priority = root.querySelector("#filter-priority");
      const clear = root.querySelector("#clear-filters");
      const tabs = Array.from(root.querySelectorAll("[data-estado]"));

      const filtered = () => {
        const q = state.q.trim().toLowerCase();
        return data.ordenes.filter((order) => {
          if (state.estado === "abiertas" && !isOpen(order)) return false;
          if (state.estado !== "todas" && state.estado !== "abiertas" && order.estado !== state.estado) return false;
          if (state.mecanico !== "todas" && order.mecanico !== state.mecanico) return false;
          if (state.prioridad !== "todas" && order.prioridad !== state.prioridad) return false;
          if (!q) return true;
          const haystack = [
            order.folio,
            order.clienteData?.nombre,
            order.clienteData?.telefono,
            order.vehiculoData?.matricula,
            order.vehiculoData?.marca,
            order.vehiculoData?.modelo,
            order.problema,
            order.diagnostico,
            order.mecanicoData?.nombre,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        });
      };

      const syncUrl = () => {
        const params = new URLSearchParams();
        if (state.estado !== "todas") params.set("estado", state.estado);
        if (state.mecanico !== "todas") params.set("mecanico", state.mecanico);
        if (state.prioridad !== "todas") params.set("prioridad", state.prioridad);
        if (state.q) params.set("q", state.q);
        const suffix = params.toString();
        history.replaceState(null, "", `#/ordenes${suffix ? `?${suffix}` : ""}`);
      };

      const bindRows = () => {
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

      const render = () => {
        const rows = filtered();
        body.innerHTML = rows.map(rowHtml).join("");
        empty.innerHTML = rows.length
          ? ""
          : `<div class="empty"><div class="empty__icon">${icon("search", 24)}</div><h3>No hay órdenes con esos filtros</h3><p>Prueba con otro estado, mecánico o término de búsqueda.</p><button class="btn btn--ghost btn--sm" type="button" data-empty-clear>Limpiar filtros</button></div>`;
        count.textContent = `Mostrando ${rows.length} de ${data.ordenes.length} órdenes`;
        tabs.forEach((tab) => {
          const active = tab.dataset.estado === state.estado;
          tab.classList.toggle("is-active", active);
          tab.setAttribute("aria-selected", String(active));
        });
        bindRows();
        empty.querySelector("[data-empty-clear]")?.addEventListener("click", reset);
        syncUrl();
      };

      const reset = () => {
        state.q = "";
        state.estado = "todas";
        state.mecanico = "todas";
        state.prioridad = "todas";
        search.value = "";
        mechanic.value = "todas";
        priority.value = "todas";
        render();
      };

      root.querySelector("[data-new-order]")?.addEventListener("click", () => openOrderForm());
      search.addEventListener(
        "input",
        debounce(() => {
          state.q = search.value;
          render();
        }, 160),
      );
      mechanic.addEventListener("change", () => {
        state.mecanico = mechanic.value;
        render();
      });
      priority.addEventListener("change", () => {
        state.prioridad = priority.value;
        render();
      });
      clear.addEventListener("click", reset);
      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          state.estado = tab.dataset.estado;
          render();
        });
      });

      render();
    },
  };
}
