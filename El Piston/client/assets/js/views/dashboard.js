import {
  isOpen,
  loadWorkspace,
  lowStock,
  openOrders,
  paymentsInRange,
  totalReceivable,
} from "../api.js";
import { openOrderForm } from "../actions.js";
import { icon } from "../icons.js";
import {
  avatar,
  dateLong,
  dateShort,
  dateInput,
  esc,
  ESTADOS,
  money,
  num,
  pageHeader,
  pct,
  progress,
  relativeDate,
  statusBadge,
} from "../ui.js";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function startOfMonth(offset = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function endOfMonth(offset = 0) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function lastSevenDays(payments) {
  const days = [];
  const today = new Date();
  for (let index = 6; index >= 0; index -= 1) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - index);
    days.push({
      date: day,
      key: dayKey(day),
      label: new Intl.DateTimeFormat("es-CR", { weekday: "short" }).format(day).replace(".", ""),
      amount: 0,
    });
  }
  const map = new Map(days.map((day) => [day.key, day]));
  payments.forEach((payment) => {
    const parsed = new Date(String(payment.fecha).replace(" ", "T"));
    const key = dayKey(parsed);
    const bucket = map.get(key);
    if (bucket) bucket.amount += Number(payment.monto) || 0;
  });
  return days;
}

export async function renderDashboard() {
  const data = await loadWorkspace();
  const open = openOrders(data);
  const low = lowStock(data);
  const now = new Date();
  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();
  const previousStart = startOfMonth(-1);
  const previousEnd = endOfMonth(-1);
  const monthPayments = paymentsInRange(data.pagos, monthStart, monthEnd);
  const previousPayments = paymentsInRange(data.pagos, previousStart, previousEnd);
  const monthRevenue = monthPayments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
  const previousRevenue = previousPayments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
  const revenueDelta = previousRevenue ? Math.round(((monthRevenue - previousRevenue) / previousRevenue) * 100) : 0;
  const receivable = totalReceivable(data.ordenes);
  const ordersWithBalance = data.ordenes.filter((order) => order.totals.saldo > 0 && order.estado !== "cancelada");
  const recent = data.ordenes.slice(0, 6);
  const week = lastSevenDays(data.pagos);
  const weekMax = Math.max(1, ...week.map((day) => day.amount));
  const weekTotal = week.reduce((sum, day) => sum + day.amount, 0);

  const activeMechanics = data.mecanicos.filter((mechanic) => mechanic.activo !== false);
  const maxLoad = Math.max(1, ...activeMechanics.map((mechanic) => mechanic.ordenes.filter(isOpen).length));

  const stateCounts = Object.keys(ESTADOS).reduce((acc, key) => {
    acc[key] = data.ordenes.filter((order) => order.estado === key).length;
    return acc;
  }, {});

  const html = `
    ${pageHeader({
      eyebrow: "Panel de control",
      title: `${greeting()}, recepción`,
      subtitle: `${dateLong(now.toISOString())} · ${esc(data.ordenes.length)} órdenes registradas en total`,
      actions: `<button class="btn btn--primary" type="button" data-new-order>${icon("plus", 18)}Nueva orden</button>`,
    })}

    <section class="kpi-grid">
      <article class="kpi-card kpi-card--accent">
        <div class="kpi-card__top">
          <span class="kpi-card__icon">${icon("orders", 21)}</span>
          <span class="chip chip--dark">${open.length} activas</span>
        </div>
        <p class="kpi-card__label">Órdenes abiertas</p>
        <strong class="kpi-card__value">${open.length}</strong>
        <p class="kpi-card__detail">${stateCounts.reparacion || 0} en reparación · ${stateCounts.lista || 0} lista(s) para entregar</p>
      </article>

      <article class="kpi-card">
        <div class="kpi-card__top">
          <span class="kpi-card__icon">${icon("circleDollar", 21)}</span>
          <span class="chip ${revenueDelta >= 0 ? "chip--up" : "chip--down"}">${icon(revenueDelta >= 0 ? "trendingUp" : "trendingDown", 13)}${revenueDelta >= 0 ? "+" : ""}${revenueDelta}%</span>
        </div>
        <p class="kpi-card__label">Facturado este mes</p>
        <strong class="kpi-card__value">${money(monthRevenue)}</strong>
        <p class="kpi-card__detail">Mes anterior: ${money(previousRevenue)}</p>
      </article>

      <article class="kpi-card">
        <div class="kpi-card__top">
          <span class="kpi-card__icon kpi-card__icon--amber">${icon("wallet", 21)}</span>
          <span class="chip chip--warn">${ordersWithBalance.length} con saldo</span>
        </div>
        <p class="kpi-card__label">Saldo por cobrar</p>
        <strong class="kpi-card__value">${money(receivable)}</strong>
        <p class="kpi-card__detail">${ordersWithBalance.length} orden(es) pendientes de pago</p>
      </article>

      <article class="kpi-card">
        <div class="kpi-card__top">
          <span class="kpi-card__icon kpi-card__icon--red">${icon("alert", 21)}</span>
          <span class="chip chip--danger">${low.filter((part) => part.existencias <= 0).length} agotados</span>
        </div>
        <p class="kpi-card__label">Repuestos por agotarse</p>
        <strong class="kpi-card__value">${low.length}</strong>
        <p class="kpi-card__detail">Artículos en o por debajo del mínimo</p>
      </article>
    </section>

    <section class="status-strip" aria-label="Órdenes por estado">
      ${Object.entries(ESTADOS)
        .map(
          ([key, meta]) => `
        <a class="status-strip__item ${meta.className}" href="#/ordenes?estado=${key}">
          <span class="status-strip__bar"></span>
          <span class="status-strip__label">${meta.label}</span>
          <strong>${stateCounts[key] || 0}</strong>
        </a>`,
        )
        .join("")}
    </section>

    <div class="dashboard-grid">
      <section class="card card--flush dashboard-orders">
        <header class="card__head">
          <div>
            <p class="eyebrow">Movimiento del taller</p>
            <h2>Órdenes recientes</h2>
          </div>
          <a class="btn btn--ghost btn--sm" href="#/ordenes">Ver todas ${icon("arrowRight", 16)}</a>
        </header>
        <div class="table-wrap">
          <table class="data-table data-table--compact">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Vehículo</th>
                <th>Estado</th>
                <th>Mecánico</th>
                <th class="t-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${recent
                .map(
                  (order) => `
                <tr data-href="#/ordenes/${order.id}" tabindex="0" class="is-clickable">
                  <td>
                    <div class="cell-stack">
                      <strong>${esc(order.folio)}</strong>
                      <span>${relativeDate(order.fecha_entrada)}</span>
                    </div>
                  </td>
                  <td>
                    <div class="cell-stack">
                      <strong>${esc(order.vehiculoData?.matricula || "—")}</strong>
                      <span>${esc(order.vehiculoData ? `${order.vehiculoData.marca} ${order.vehiculoData.modelo}` : "Sin vehículo")}</span>
                    </div>
                  </td>
                  <td>${statusBadge(order.estado)}</td>
                  <td>
                    <div class="cell-person">
                      ${avatar(order.mecanicoData?.nombre || "Sin asignar", { size: "xs" })}
                      <span>${esc(order.mecanicoData?.nombre || "Sin asignar")}</span>
                    </div>
                  </td>
                  <td class="t-right"><strong>${money(order.totals.total)}</strong></td>
                </tr>`,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="card dashboard-mechanics">
        <header class="card__head">
          <div>
            <p class="eyebrow">Equipo</p>
            <h2>Carga de mecánicos</h2>
          </div>
          <a class="icon-link" href="#/mecanicos" aria-label="Ver mecánicos">${icon("arrowRight", 18)}</a>
        </header>
        <div class="mechanic-load">
          ${activeMechanics
            .map((mechanic) => {
              const assigned = mechanic.ordenes.filter(isOpen).length;
              return `
              <a class="mechanic-load__row" href="#/ordenes?mecanico=${mechanic.id}">
                <div class="mechanic-load__person">
                  ${avatar(mechanic.nombre, { size: "sm", index: mechanic.colorIndex })}
                  <div>
                    <strong>${esc(mechanic.nombre)}</strong>
                    <span>${esc(mechanic.especialidad || "Mecánica general")}</span>
                  </div>
                </div>
                <div class="mechanic-load__meter">
                  <span class="mechanic-load__count">${assigned} <small>abierta${assigned === 1 ? "" : "s"}</small></span>
                  ${progress(assigned, maxLoad, "progress--red")}
                </div>
              </a>`;
            })
            .join("")}
        </div>
        <footer class="card__foot">
          <a href="#/ordenes?estado=reparacion" class="link-inline">Ver órdenes en reparación ${icon("chevronRight", 15)}</a>
        </footer>
      </section>

      <section class="card dashboard-chart">
        <header class="card__head">
          <div>
            <p class="eyebrow">Caja</p>
            <h2>Ingresos de los últimos 7 días</h2>
          </div>
          <div class="card__head-stat">
            <strong>${money(weekTotal)}</strong>
            <span>total cobrado</span>
          </div>
        </header>
        <div class="bar-chart">
          ${week
            .map(
              (day) => `
            <div class="bar-chart__col">
              <div class="bar-chart__value">${day.amount ? money(day.amount) : ""}</div>
              <div class="bar-chart__track">
                <span class="bar-chart__bar ${day.amount ? "has-value" : ""}" style="height:${Math.max(4, Math.round((day.amount / weekMax) * 100))}%"></span>
              </div>
              <span class="bar-chart__label">${esc(day.label)}</span>
            </div>`,
            )
            .join("")}
        </div>
      </section>

      <section class="card dashboard-stock">
        <header class="card__head">
          <div>
            <p class="eyebrow">Inventario</p>
            <h2>Repuestos por agotarse</h2>
          </div>
          <a class="icon-link" href="#/inventario?bajo=1" aria-label="Ver inventario bajo">${icon("arrowRight", 18)}</a>
        </header>
        <div class="stock-list">
          ${low.slice(0, 5).map((part) => `
            <a class="stock-list__row" href="#/inventario?q=${encodeURIComponent(part.codigo)}">
              <div class="stock-list__name">
                <strong>${esc(part.nombre)}</strong>
                <span>${esc(part.codigo)} · ${esc(part.ubicacion || "Sin ubicación")}</span>
              </div>
              <div class="stock-list__meter">
                <span class="${Number(part.existencias) <= 0 ? "text-danger" : "text-warn"}">${part.existencias}</span>
                <small>/ ${part.minimo} mín.</small>
                ${progress(part.existencias, Math.max(1, part.minimo), Number(part.existencias) <= 0 ? "progress--red" : "progress--amber")}
              </div>
            </a>`).join("")}
          ${!low.length ? `<div class="empty empty--plain"><p>Todo el inventario está por encima del mínimo.</p></div>` : ""}
        </div>
        <footer class="card__foot">
          <a href="#/inventario?bajo=1" class="link-inline">Revisar inventario ${icon("chevronRight", 15)}</a>
        </footer>
      </section>
    </div>`;

  return {
    html,
    mount(root) {
      root.querySelector("[data-new-order]")?.addEventListener("click", () => openOrderForm());
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
    },
  };
}
