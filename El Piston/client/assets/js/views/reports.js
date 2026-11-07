import { isOpen, loadWorkspace, lowStock, paymentsInRange, totalReceivable } from "../api.js";
import { icon } from "../icons.js";
import {
  avatar,
  dateShort,
  downloadCsv,
  esc,
  ESTADOS,
  money,
  pageHeader,
  pct,
  progress,
} from "../ui.js";

const PERIODS = {
  mes: "Este mes",
  anterior: "Mes anterior",
  trimestre: "Últimos 3 meses",
  anio: "Este año",
};

function rangeFor(period) {
  const now = new Date();
  if (period === "anterior") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      previousStart: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      previousEnd: new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === "trimestre") {
    return {
      start: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
      previousStart: new Date(now.getFullYear(), now.getMonth() - 5, 1),
      previousEnd: new Date(now.getFullYear(), now.getMonth() - 2, 0, 23, 59, 59, 999),
    };
  }
  if (period === "anio") {
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
      previousStart: new Date(now.getFullYear() - 1, 0, 1),
      previousEnd: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
    };
  }
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    previousStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
    previousEnd: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
  };
}

function sumPayments(payments) {
  return payments.reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0);
}

function groupRevenue(payments, period) {
  const now = new Date();
  const groups = [];
  if (period === "mes" || period === "anterior") {
    for (let week = 1; week <= 5; week += 1) groups.push({ label: `Sem ${week}`, amount: 0 });
    payments.forEach((payment) => {
      const date = new Date(String(payment.fecha).replace(" ", "T"));
      const index = Math.min(4, Math.floor((date.getDate() - 1) / 7));
      groups[index].amount += Number(payment.monto) || 0;
    });
    return groups;
  }
  if (period === "trimestre") {
    for (let index = 2; index >= 0; index -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
      groups.push({
        label: new Intl.DateTimeFormat("es-CR", { month: "short" }).format(date).replace(".", ""),
        amount: 0,
        month: date.getMonth(),
        year: date.getFullYear(),
      });
    }
    payments.forEach((payment) => {
      const date = new Date(String(payment.fecha).replace(" ", "T"));
      const group = groups.find((item) => item.month === date.getMonth() && item.year === date.getFullYear());
      if (group) group.amount += Number(payment.monto) || 0;
    });
    return groups;
  }
  for (let month = 0; month < 12; month += 1) {
    groups.push({
      label: new Intl.DateTimeFormat("es-CR", { month: "short" }).format(new Date(now.getFullYear(), month, 1)).replace(".", ""),
      amount: 0,
      month,
    });
  }
  payments.forEach((payment) => {
    const date = new Date(String(payment.fecha).replace(" ", "T"));
    if (date.getFullYear() === now.getFullYear()) groups[date.getMonth()].amount += Number(payment.monto) || 0;
  });
  return groups;
}

const STATUS_COLORS = {
  recibida: "#2563eb",
  diagnostico: "#7c3aed",
  reparacion: "#d97706",
  lista: "#0f766e",
  entregada: "#15803d",
  cancelada: "#9ca3af",
};

export async function renderReports(ctx = {}) {
  const period = PERIODS[ctx.query?.periodo] ? ctx.query.periodo : "mes";
  const data = await loadWorkspace();
  const range = rangeFor(period);
  const payments = paymentsInRange(data.pagos, range.start, range.end).sort((a, b) =>
    String(b.fecha).localeCompare(String(a.fecha)),
  );
  const previousPayments = paymentsInRange(data.pagos, range.previousStart, range.previousEnd);
  const revenue = sumPayments(payments);
  const previousRevenue = sumPayments(previousPayments);
  const delta = previousRevenue ? Math.round(((revenue - previousRevenue) / previousRevenue) * 100) : 0;
  const ticket = new Set(payments.map((payment) => payment.orden)).size
    ? revenue / new Set(payments.map((payment) => payment.orden)).size
    : 0;
  const receivable = totalReceivable(data.ordenes);
  const groups = groupRevenue(payments, period);
  const maxGroup = Math.max(1, ...groups.map((group) => group.amount));

  const orderMap = new Map(data.ordenes.map((order) => [order.id, order]));
  const byMechanic = data.mecanicos.map((mechanic) => {
    const amount = payments.reduce((sum, payment) => {
      const order = orderMap.get(payment.orden);
      return order?.mecanico === mechanic.id ? sum + (Number(payment.monto) || 0) : sum;
    }, 0);
    const ordersCount = new Set(
      payments
        .filter((payment) => orderMap.get(payment.orden)?.mecanico === mechanic.id)
        .map((payment) => payment.orden),
    ).size;
    return { mechanic, amount, ordersCount };
  });
  const maxMechanic = Math.max(1, ...byMechanic.map((item) => item.amount));

  const byMethod = ["efectivo", "tarjeta", "transferencia", "otro"].map((method) => ({
    method,
    amount: payments
      .filter((payment) => payment.method === method || payment.metodo === method)
      .reduce((sum, payment) => sum + (Number(payment.monto) || 0), 0),
  }));
  const maxMethod = Math.max(1, ...byMethod.map((item) => item.amount));

  const partsByPeriod = new Map();
  data.ordenes
    .filter((order) => {
      const date = new Date(String(order.fecha_entrada).replace(" ", "T"));
      return date >= range.start && date <= range.end && order.estado !== "cancelada";
    })
    .forEach((order) => {
      order.repuestosUsados.forEach((item) => {
        const key = item.repuesto;
        const current = partsByPeriod.get(key) || {
          name: item.repuestoData?.nombre || "Repuesto",
          code: item.repuestoData?.codigo || "—",
          quantity: 0,
          amount: 0,
        };
        current.quantity += Number(item.cantidad) || 0;
        current.amount += (Number(item.cantidad) || 0) * (Number(item.precio_unitario) || 0);
        partsByPeriod.set(key, current);
      });
    });
  const topParts = Array.from(partsByPeriod.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const stateCounts = Object.keys(ESTADOS).map((key) => ({
    key,
    label: ESTADOS[key].label,
    count: data.ordenes.filter((order) => order.estado === key).length,
    color: STATUS_COLORS[key],
  }));
  const totalOrders = data.ordenes.length || 1;
  let accumulated = 0;
  const stops = stateCounts
    .map((state) => {
      const start = (accumulated / totalOrders) * 100;
      accumulated += state.count;
      const end = (accumulated / totalOrders) * 100;
      return `${state.color} ${start}% ${end}%`;
    })
    .join(", ");

  const receivableMap = new Map();
  data.ordenes
    .filter((order) => order.estado !== "cancelada" && order.totals.saldo > 0)
    .forEach((order) => {
      const client = order.clienteData;
      if (!client) return;
      const current = receivableMap.get(client.id) || {
        client,
        orders: 0,
        balance: 0,
        lastDate: order.fecha_entrada,
      };
      current.orders += 1;
      current.balance += order.totals.saldo;
      if (String(order.fecha_entrada) > String(current.lastDate)) current.lastDate = order.fecha_entrada;
      receivableMap.set(client.id, current);
    });
  const receivables = Array.from(receivableMap.values()).sort((a, b) => b.balance - a.balance);
  const low = lowStock(data);

  const periodLabel = PERIODS[period];

  const html = `
    ${pageHeader({
      eyebrow: "Análisis",
      title: "Reportes del taller",
      subtitle: "Facturación, cobros pendientes y rendimiento del equipo.",
      actions: `<button class="btn btn--ghost" type="button" data-export>${icon("download", 17)}Exportar pagos</button>`,
    })}

    <div class="period-bar no-print">
      ${Object.entries(PERIODS)
        .map(
          ([key, label]) => `<button class="period-btn ${key === period ? "is-active" : ""}" type="button" data-period="${key}">${label}</button>`,
        )
        .join("")}
      <span class="period-bar__range">${dateShort(range.start.toISOString())} — ${dateShort(range.end.toISOString())}</span>
    </div>

    <section class="kpi-grid">
      <article class="kpi-card kpi-card--accent">
        <div class="kpi-card__top"><span class="kpi-card__icon">${icon("circleDollar", 21)}</span><span class="chip ${delta >= 0 ? "chip--up" : "chip--down"}">${icon(delta >= 0 ? "trendingUp" : "trendingDown", 13)}${delta >= 0 ? "+" : ""}${delta}%</span></div>
        <p class="kpi-card__label">Facturado · ${esc(periodLabel)}</p>
        <strong class="kpi-card__value">${money(revenue)}</strong>
        <p class="kpi-card__detail">Periodo anterior: ${money(previousRevenue)}</p>
      </article>
      <article class="kpi-card">
        <div class="kpi-card__top"><span class="kpi-card__icon">${icon("card", 21)}</span><span class="chip">${payments.length} pagos</span></div>
        <p class="kpi-card__label">Pagos registrados</p>
        <strong class="kpi-card__value">${payments.length}</strong>
        <p class="kpi-card__detail">${new Set(payments.map((payment) => payment.orden)).size} orden(es) con movimiento</p>
      </article>
      <article class="kpi-card">
        <div class="kpi-card__top"><span class="kpi-card__icon kpi-card__icon--amber">${icon("activity", 21)}</span><span class="chip chip--warn">Promedio</span></div>
        <p class="kpi-card__label">Ticket promedio</p>
        <strong class="kpi-card__value">${money(ticket)}</strong>
        <p class="kpi-card__detail">Por orden con pagos en el periodo</p>
      </article>
      <article class="kpi-card">
        <div class="kpi-card__top"><span class="kpi-card__icon kpi-card__icon--red">${icon("wallet", 21)}</span><span class="chip chip--danger">${receivables.length} clientes</span></div>
        <p class="kpi-card__label">Saldo por cobrar</p>
        <strong class="kpi-card__value">${money(receivable)}</strong>
        <p class="kpi-card__detail">Deuda histórica de órdenes abiertas y entregadas</p>
      </article>
    </section>

    <div class="report-grid">
      <section class="card report-span2">
        <header class="card__head">
          <div><p class="eyebrow">Caja</p><h2>Facturación por ${period === "mes" || period === "anterior" ? "semana" : "mes"}</h2></div>
          <div class="card__head-stat"><strong>${money(revenue)}</strong><span>${esc(periodLabel)}</span></div>
        </header>
        <div class="bar-chart bar-chart--report">
          ${groups
            .map(
              (group) => `
            <div class="bar-chart__col">
              <div class="bar-chart__value">${group.amount ? money(group.amount) : ""}</div>
              <div class="bar-chart__track"><span class="bar-chart__bar ${group.amount ? "has-value" : ""}" style="height:${Math.max(4, Math.round((group.amount / maxGroup) * 100))}%"></span></div>
              <span class="bar-chart__label">${esc(group.label)}</span>
            </div>`,
            )
            .join("")}
        </div>
        <footer class="report-caption">${icon("activity", 15)} Total cobrado en el periodo: <strong>${money(revenue)}</strong></footer>
      </section>

      <section class="card">
        <header class="card__head"><div><p class="eyebrow">Equipo</p><h2>Facturación por mecánico</h2></div></header>
        <div class="rank-list">
          ${byMechanic
            .sort((a, b) => b.amount - a.amount)
            .map(
              (item) => `
            <div class="rank-row">
              <div class="rank-row__head">
                ${avatar(item.mechanic.nombre, { size: "xs", index: item.mechanic.colorIndex })}
                <span>${esc(item.mechanic.nombre)}</span>
                <strong>${money(item.amount)}</strong>
              </div>
              ${progress(item.amount, maxMechanic, "progress--red")}
              <span class="rank-row__meta">${item.ordersCount} orden(es) con pagos</span>
            </div>`,
            )
            .join("")}
        </div>
      </section>

      <section class="card">
        <header class="card__head"><div><p class="eyebrow">Operación</p><h2>Órdenes por estado</h2></div><span class="chip">${data.ordenes.length} total</span></header>
        <div class="donut-wrap">
          <div class="donut" style="background:conic-gradient(${stops})" role="img" aria-label="Distribución de órdenes por estado">
            <div class="donut__hole"><strong>${data.ordenes.length}</strong><span>órdenes</span></div>
          </div>
          <ul class="donut-legend">
            ${stateCounts
              .map(
                (state) => `<li><span class="legend-dot" style="background:${state.color}"></span><span>${state.label}</span><strong>${state.count}</strong></li>`,
              )
              .join("")}
          </ul>
        </div>
      </section>

      <section class="card">
        <header class="card__head"><div><p class="eyebrow">Cobros</p><h2>Métodos de pago</h2></div></header>
        <div class="method-list">
          ${byMethod
            .filter((item) => item.amount > 0)
            .map(
              (item) => `
            <div class="method-row">
              <div class="method-row__head"><span>${item.method === "efectivo" ? "Efectivo" : item.method === "tarjeta" ? "Tarjeta" : item.method === "transferencia" ? "Transferencia" : "Otro"}</span><strong>${money(item.amount)}</strong></div>
              ${progress(item.amount, maxMethod, "progress--dark")}
              <span class="method-row__pct">${pct(item.amount, revenue || 1)}% del total</span>
            </div>`,
            )
            .join("") || `<div class="empty empty--plain empty--small"><p>Sin pagos en el periodo seleccionado.</p></div>`}
        </div>
      </section>

      <section class="card">
        <header class="card__head"><div><p class="eyebrow">Inventario</p><h2>Repuestos más usados</h2></div><span class="chip">${esc(periodLabel)}</span></header>
        <div class="top-parts">
          ${topParts
            .map(
              (part, index) => `
            <div class="top-part">
              <span class="top-part__rank">${index + 1}</span>
              <div class="top-part__copy"><strong>${esc(part.name)}</strong><span>${esc(part.code)}</span></div>
              <div class="top-part__numbers"><strong>${part.quantity}</strong><span>${money(part.amount)}</span></div>
            </div>`,
            )
            .join("") || `<div class="empty empty--plain empty--small"><p>Sin repuestos usados en el periodo.</p></div>`}
        </div>
      </section>

      <section class="card report-span2 card--flush">
        <header class="card__head">
          <div><p class="eyebrow">Cuentas por cobrar</p><h2>Clientes con saldo pendiente</h2></div>
          <span class="chip chip--danger">${money(receivable)}</span>
        </header>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Cliente</th><th>Teléfono</th><th class="t-center">Órdenes</th><th>Última actividad</th><th class="t-right">Saldo</th><th></th></tr>
            </thead>
            <tbody>
              ${
                receivables.length
                  ? receivables
                      .map(
                        (row) => `
                <tr>
                  <td><div class="cell-person">${avatar(row.client.nombre, { size: "xs" })}<span>${esc(row.client.nombre)}</span></div></td>
                  <td>${esc(row.client.telefono || "—")}</td>
                  <td class="t-center"><span class="count-pill">${row.orders}</span></td>
                  <td>${dateShort(row.lastDate)}</td>
                  <td class="t-right"><span class="balance-due">${money(row.balance)}</span></td>
                  <td class="t-right"><a class="btn btn--ghost btn--sm" href="#/clientes/${row.client.id}">Ver cliente</a></td>
                </tr>`,
                      )
                      .join("")
                  : `<tr><td colspan="6"><div class="empty empty--table"><p>No hay saldos pendientes. Todo está al día.</p></div></td></tr>`
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="card report-span2">
        <header class="card__head"><div><p class="eyebrow">Reposición</p><h2>Alertas de inventario</h2></div><a class="btn btn--ghost btn--sm" href="#/inventario?bajo=1">Ver inventario ${icon("arrowRight", 15)}</a></header>
        <div class="alert-grid">
          ${low.length
            ? low
                .slice(0, 6)
                .map(
                  (part) => `
            <div class="alert-chip">
              <span class="alert-chip__icon">${icon("package", 17)}</span>
              <div><strong>${esc(part.nombre)}</strong><span>${part.existencias} de ${part.minimo} mín. · ${esc(part.codigo)}</span></div>
              <span class="stock ${Number(part.existencias) <= 0 ? "stock-agotado" : "stock-bajo"}">${Number(part.existencias) <= 0 ? "Agotado" : "Bajo"}</span>
            </div>`,
                )
                .join("")
            : `<div class="empty empty--plain empty--small"><p>Sin alertas de inventario.</p></div>`}
        </div>
      </section>
    </div>`;

  return {
    html,
    mount(root) {
      root.querySelectorAll("[data-period]").forEach((button) => {
        button.addEventListener("click", () => {
          location.hash = `#/reportes?periodo=${button.dataset.period}`;
        });
      });
      root.querySelector("[data-export]")?.addEventListener("click", () => {
        downloadCsv(
          `pagos-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
          [
            ["Fecha", "Orden", "Cliente", "Vehículo", "Método", "Monto", "Nota"],
            ...payments.map((payment) => {
              const order = orderMap.get(payment.orden);
              return [
                dateShort(payment.fecha),
                order?.folio || "—",
                order?.clienteData?.nombre || "—",
                order?.vehiculoData?.matricula || "—",
                payment.metodo || "—",
                Number(payment.monto) || 0,
                payment.nota || "",
              ];
            }),
          ],
        );
      });
    },
  };
}
