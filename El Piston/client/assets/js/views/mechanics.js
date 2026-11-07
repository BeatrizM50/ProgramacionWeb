import { deleteMechanic, isOpen, loadWorkspace } from "../api.js";
import { openMechanicForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  avatar,
  confirmDialog,
  dateShort,
  emitDataChanged,
  esc,
  friendlyError,
  money,
  pageHeader,
  progress,
  statusBadge,
  toast,
} from "../ui.js";

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function renderMechanics() {
  const data = await loadWorkspace();
  const mechanics = data.mecanicos.slice().sort((a, b) => Number(b.activo !== false) - Number(a.activo !== false) || a.nombre.localeCompare(b.nombre));
  const monthStart = startOfMonth();
  const loads = mechanics.map((mechanic) => mechanic.ordenes.filter(isOpen).length);
  const maxLoad = Math.max(1, ...loads);
  const openTotal = mechanics.reduce((sum, mechanic) => sum + mechanic.ordenes.filter(isOpen).length, 0);

  const html = `
    ${pageHeader({
      eyebrow: "Equipo del taller",
      title: "Mecánicos",
      subtitle: "Carga de trabajo, especialidades y órdenes asignadas.",
      actions: `<button class="btn btn--primary" type="button" data-new-mechanic>${icon("plus", 18)}Nuevo mecánico</button>`,
    })}

    <section class="mini-stats">
      <div class="mini-stat"><span>Mecánicos activos</span><strong>${mechanics.filter((mechanic) => mechanic.activo !== false).length}</strong><small>${mechanics.length} en total</small></div>
      <div class="mini-stat"><span>Órdenes abiertas asignadas</span><strong>${openTotal}</strong><small>Repartidas entre el equipo</small></div>
      <div class="mini-stat"><span>Órdenes entregadas este mes</span><strong>${data.ordenes.filter((order) => order.estado === "entregada" && order.fecha_entrega && new Date(String(order.fecha_entrega).replace(" ", "T")) >= monthStart).length}</strong><small>Trabajo cerrado en ${new Intl.DateTimeFormat("es-CR", { month: "long" }).format(new Date())}</small></div>
    </section>

    <div class="mechanic-grid">
      ${mechanics
        .map((mechanic) => {
          const open = mechanic.ordenes.filter(isOpen);
          const inRepair = open.filter((order) => order.estado === "reparacion").length;
          const deliveredMonth = mechanic.ordenes.filter(
            (order) =>
              order.estado === "entregada" &&
              order.fecha_entrega &&
              new Date(String(order.fecha_entrega).replace(" ", "T")) >= monthStart,
          );
          const laborMonth = deliveredMonth.reduce((sum, order) => sum + (order.totals?.manoObra || 0), 0);
          return `
          <article class="mechanic-card ${mechanic.activo === false ? "is-inactive" : ""}">
            <header class="mechanic-card__head">
              ${avatar(mechanic.nombre, { size: "lg", index: mechanic.colorIndex })}
              <div class="mechanic-card__identity">
                <div class="mechanic-card__title">
                  <h2>${esc(mechanic.nombre)}</h2>
                  ${mechanic.activo === false ? '<span class="chip">Inactivo</span>' : '<span class="chip chip--up">Activo</span>'}
                </div>
                <p>${esc(mechanic.especialidad || "Mecánica general")}</p>
                ${mechanic.telefono ? `<a href="tel:${esc(mechanic.telefono)}" class="link-inline">${icon("phone", 14)}${esc(mechanic.telefono)}</a>` : ""}
              </div>
              <div class="row-actions no-print">
                <button class="icon-btn" type="button" data-edit="${mechanic.id}" aria-label="Editar mecánico">${icon("edit", 17)}</button>
                <button class="icon-btn icon-btn--danger" type="button" data-delete="${mechanic.id}" aria-label="Eliminar mecánico">${icon("trash", 17)}</button>
              </div>
            </header>

            <div class="mechanic-card__stats">
              <div><strong>${open.length}</strong><span>abiertas</span></div>
              <div><strong>${inRepair}</strong><span>en reparación</span></div>
              <div><strong>${deliveredMonth.length}</strong><span>entregadas</span></div>
              <div><strong>${money(laborMonth)}</strong><span>mano de obra</span></div>
            </div>

            <div class="mechanic-card__load">
              <div class="mechanic-card__load-label"><span>Carga actual</span><strong>${open.length} / ${maxLoad} máximo del equipo</strong></div>
              ${progress(open.length, maxLoad, "progress--red")}
            </div>

            <div class="mechanic-card__orders">
              <div class="mechanic-card__orders-head">
                <span>Órdenes asignadas</span>
                <a href="#/ordenes?mecanico=${mechanic.id}">Ver todas ${icon("chevronRight", 14)}</a>
              </div>
              ${
                open.length
                  ? open
                      .slice(0, 3)
                      .map(
                        (order) => `
                  <a class="assigned-order" href="#/ordenes/${order.id}">
                    <div>
                      <strong>${esc(order.folio)}</strong>
                      <span>${esc(order.vehiculoData?.matricula || "—")} · ${esc(order.clienteData?.nombre || "Sin cliente")}</span>
                    </div>
                    ${statusBadge(order.estado)}
                  </a>`,
                      )
                      .join("")
                  : `<div class="empty empty--plain empty--small"><p>Sin órdenes abiertas. Disponible para asignar.</p></div>`
              }
            </div>

            ${mechanic.notas ? `<p class="mechanic-card__note">${esc(mechanic.notas)}</p>` : ""}
          </article>`;
        })
        .join("")}
    </div>`;

  return {
    html,
    mount(root) {
      root.querySelector("[data-new-mechanic]")?.addEventListener("click", () => openMechanicForm());
      root.querySelectorAll("[data-edit]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const mechanic = mechanics.find((item) => item.id === button.dataset.edit);
          if (mechanic) openMechanicForm({ mechanic });
        });
      });
      root.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", async (event) => {
          event.stopPropagation();
          const mechanic = mechanics.find((item) => item.id === button.dataset.delete);
          if (!mechanic) return;
          const confirmed = await confirmDialog({
            title: `Eliminar a ${mechanic.nombre}`,
            message: "Solo se puede eliminar un mecánico sin órdenes asignadas. Esta acción no se puede deshacer.",
            confirmText: "Eliminar mecánico",
            danger: true,
          });
          if (!confirmed) return;
          try {
            await deleteMechanic(mechanic);
            toast("Mecánico eliminado.");
            emitDataChanged();
            window.dispatchEvent(new Event("hashchange"));
          } catch (error) {
            toast(friendlyError(error), "error");
          }
        });
      });
    },
  };
}
