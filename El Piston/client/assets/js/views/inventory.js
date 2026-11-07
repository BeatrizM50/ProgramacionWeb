import { deletePart, loadWorkspace } from "../api.js";
import { openPartForm, openStockAdjustForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  confirmDialog,
  debounce,
  emitDataChanged,
  esc,
  friendlyError,
  money,
  pageHeader,
  pct,
  stockBadge,
  stockInfo,
  toast,
} from "../ui.js";

function rowHtml(part) {
  const info = stockInfo(part);
  const max = Math.max(1, Number(part.minimo) * 2, Number(part.existencias));
  return `
    <tr>
      <td>
        <div class="cell-stack">
          <span class="cell-stack__title">${esc(part.nombre)}</span>
          <span>${esc(part.codigo)} · ${esc(part.ubicacion || "Sin ubicación")}</span>
        </div>
      </td>
      <td><span class="category-pill">${esc(part.categoria || "Otros")}</span></td>
      <td>
        <div class="stock-cell">
          <div class="stock-cell__top">
            <strong class="${info.key === "ok" ? "" : info.key === "bajo" ? "text-warn" : "text-danger"}">${part.existencias}</strong>
            <span>unidades</span>
          </div>
          <span class="progress ${info.key === "ok" ? "" : info.key === "bajo" ? "progress--amber" : "progress--red"}"><span style="width:${pct(part.existencias, max)}%"></span></span>
        </div>
      </td>
      <td class="t-center">${part.minimo}</td>
      <td class="t-right">${money(part.precio)}</td>
      <td class="t-right"><strong>${money(part.valor)}</strong></td>
      <td>${stockBadge(part)}</td>
      <td class="t-right">
        <div class="row-actions">
          <button class="icon-btn" type="button" data-adjust="${part.id}" aria-label="Ajustar existencias" title="Ajustar existencias">${icon("layers", 16)}</button>
          <button class="icon-btn" type="button" data-edit="${part.id}" aria-label="Editar repuesto" title="Editar">${icon("edit", 16)}</button>
          <button class="icon-btn icon-btn--danger" type="button" data-delete="${part.id}" aria-label="Eliminar repuesto" title="Eliminar">${icon("trash", 16)}</button>
        </div>
      </td>
    </tr>`;
}

export async function renderInventory(ctx = {}) {
  const data = await loadWorkspace();
  const parts = data.repuestos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre));
  const categories = Array.from(new Set(parts.map((part) => part.categoria).filter(Boolean))).sort();
  const low = parts.filter((part) => Number(part.existencias) <= Number(part.minimo));
  const out = parts.filter((part) => Number(part.existencias) <= 0);
  const value = parts.reduce((sum, part) => sum + (Number(part.precio) || 0) * (Number(part.existencias) || 0), 0);
  const query = ctx.query || {};

  const html = `
    ${pageHeader({
      eyebrow: "Almacén",
      title: "Inventario de repuestos",
      subtitle: "Controla existencias, precios y alertas de reposición.",
      actions: `<button class="btn btn--primary" type="button" data-new-part>${icon("plus", 18)}Nuevo repuesto</button>`,
    })}

    <section class="mini-stats">
      <div class="mini-stat"><span>Repuestos registrados</span><strong>${parts.length}</strong><small>${categories.length} categorías</small></div>
      <div class="mini-stat"><span>Valor del inventario</span><strong>${money(value)}</strong><small>Precio de venta × existencias</small></div>
      <div class="mini-stat"><span>Bajo stock</span><strong class="text-warn">${low.length}</strong><small>En o por debajo del mínimo</small></div>
      <div class="mini-stat"><span>Agotados</span><strong class="text-danger">${out.length}</strong><small>Requieren compra urgente</small></div>
    </section>

    ${low.length ? `<div class="alert-banner">${icon("alert", 20)}<div><strong>${low.length} repuesto(s) requieren reposición</strong><span>${low.slice(0, 3).map((part) => esc(part.nombre)).join(", ")}${low.length > 3 ? ` y ${low.length - 3} más` : ""}.</span></div><button class="btn btn--ghost btn--sm" type="button" data-show-low>Ver solo bajos</button></div>` : ""}

    <section class="card card--flush">
      <div class="toolbar">
        <div class="searchbox">
          ${icon("search", 18)}
          <input type="search" id="inventory-search" placeholder="Buscar por nombre, código, categoría o ubicación…" value="${esc(query.q || "")}" autocomplete="off">
        </div>
        <div class="toolbar__filters">
          <label class="select-wrap">
            ${icon("tag", 17)}
            <select id="filter-category" class="input select select--compact">
              <option value="todas">Todas las categorías</option>
              ${categories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join("")}
            </select>
          </label>
          <label class="check-inline">
            <input type="checkbox" id="only-low" ${query.bajo ? "checked" : ""}>
            <span>Solo bajo stock</span>
          </label>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Repuesto</th>
              <th>Categoría</th>
              <th>Existencias</th>
              <th class="t-center">Mínimo</th>
              <th class="t-right">Precio</th>
              <th class="t-right">Valor</th>
              <th>Estado</th>
              <th class="t-right"></th>
            </tr>
          </thead>
          <tbody id="inventory-body"></tbody>
        </table>
      </div>
      <div id="inventory-empty"></div>
      <footer class="table-foot">
        <span id="inventory-count"></span>
        <span class="table-foot__hint">El stock se descuenta automáticamente al usarse en una orden.</span>
      </footer>
    </section>`;

  return {
    html,
    mount(root) {
      const body = root.querySelector("#inventory-body");
      const empty = root.querySelector("#inventory-empty");
      const count = root.querySelector("#inventory-count");
      const search = root.querySelector("#inventory-search");
      const category = root.querySelector("#filter-category");
      const onlyLow = root.querySelector("#only-low");
      let term = query.q || "";

      const render = () => {
        const q = term.trim().toLowerCase();
        const rows = parts.filter((part) => {
          if (onlyLow.checked && Number(part.existencias) > Number(part.minimo)) return false;
          if (category.value !== "todas" && part.categoria !== category.value) return false;
          if (!q) return true;
          return [part.nombre, part.codigo, part.categoria, part.ubicacion, part.notas]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        });
        body.innerHTML = rows.map(rowHtml).join("");
        empty.innerHTML = rows.length
          ? ""
          : `<div class="empty"><div class="empty__icon">${icon("package", 24)}</div><h3>No hay repuestos con esos filtros</h3><p>Prueba con otro término o registra un repuesto nuevo.</p></div>`;
        count.textContent = `Mostrando ${rows.length} de ${parts.length} repuestos`;

        body.querySelectorAll("[data-edit]").forEach((button) => {
          button.addEventListener("click", () => {
            const part = parts.find((item) => item.id === button.dataset.edit);
            if (part) openPartForm({ part });
          });
        });
        body.querySelectorAll("[data-adjust]").forEach((button) => {
          button.addEventListener("click", () => {
            const part = parts.find((item) => item.id === button.dataset.adjust);
            if (part) openStockAdjustForm({ part });
          });
        });
        body.querySelectorAll("[data-delete]").forEach((button) => {
          button.addEventListener("click", async () => {
            const part = parts.find((item) => item.id === button.dataset.delete);
            if (!part) return;
            const confirmed = await confirmDialog({
              title: `Eliminar ${part.nombre}`,
              message: "Solo se puede eliminar un repuesto que no se haya usado en órdenes. Esta acción no se puede deshacer.",
              confirmText: "Eliminar repuesto",
              danger: true,
            });
            if (!confirmed) return;
            try {
              await deletePart(part);
              toast("Repuesto eliminado.");
              emitDataChanged();
              window.dispatchEvent(new Event("hashchange"));
            } catch (error) {
              toast(friendlyError(error), "error");
            }
          });
        });
      };

      root.querySelector("[data-new-part]")?.addEventListener("click", () => openPartForm());
      root.querySelector("[data-show-low]")?.addEventListener("click", () => {
        onlyLow.checked = true;
        render();
      });
      search.addEventListener("input", debounce(() => {
        term = search.value;
        render();
      }, 160));
      category.addEventListener("change", render);
      onlyLow.addEventListener("change", render);
      render();
    },
  };
}
