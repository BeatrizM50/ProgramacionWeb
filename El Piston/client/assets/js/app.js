import { fullList, PB_URL } from "./api.js";
import { openOrderForm } from "./actions.js";
import { icon } from "./icons.js";
import { esc, friendlyError } from "./ui.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderOrders } from "./views/orders.js";
import { renderOrderDetail } from "./views/order-detail.js";
import { renderClients } from "./views/clients.js";
import { renderClientDetail } from "./views/client-detail.js";
import { renderVehicles } from "./views/vehicles.js";
import { renderVehicleDetail } from "./views/vehicle-detail.js";
import { renderInventory } from "./views/inventory.js";
import { renderMechanics } from "./views/mechanics.js";
import { renderReports } from "./views/reports.js";

const routes = [
  { test: /^panel$/, view: renderDashboard, label: "Panel" },
  { test: /^ordenes$/, view: renderOrders, label: "Órdenes" },
  { test: /^ordenes\/[^/]+$/, view: renderOrderDetail, label: "Detalle de orden" },
  { test: /^clientes$/, view: renderClients, label: "Clientes" },
  { test: /^clientes\/[^/]+$/, view: renderClientDetail, label: "Detalle de cliente" },
  { test: /^vehiculos$/, view: renderVehicles, label: "Vehículos" },
  { test: /^vehiculos\/[^/]+$/, view: renderVehicleDetail, label: "Detalle de vehículo" },
  { test: /^inventario$/, view: renderInventory, label: "Inventario" },
  { test: /^mecanicos$/, view: renderMechanics, label: "Mecánicos" },
  { test: /^reportes$/, view: renderReports, label: "Reportes" },
];

const main = document.getElementById("main-content");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebar-overlay");
const menuToggle = document.getElementById("menu-toggle");
let navigationToken = 0;

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, "") || "panel";
  const [path, queryString = ""] = raw.split("?");
  const segments = path.split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryString));
  const route = routes.find((item) => item.test.test(path)) || routes[0];
  return {
    path,
    base: segments[0] || "panel",
    params: segments.length > 1 ? { id: decodeURIComponent(segments[1]) } : {},
    query,
    route,
  };
}

function loadingHtml() {
  return `
    <div class="loading-state" aria-label="Cargando contenido">
      <div class="skeleton skeleton--eyebrow"></div>
      <div class="skeleton skeleton--title"></div>
      <div class="skeleton skeleton--subtitle"></div>
      <div class="skeleton-grid">
        <div class="skeleton skeleton--card"></div>
        <div class="skeleton skeleton--card"></div>
        <div class="skeleton skeleton--card"></div>
        <div class="skeleton skeleton--card"></div>
      </div>
      <div class="skeleton skeleton--panel"></div>
    </div>`;
}

function errorHtml(error) {
  return `
    <div class="error-state">
      <div class="error-state__icon">${icon("alert", 30)}</div>
      <p class="eyebrow">Sin conexión</p>
      <h1>No se pudo cargar el taller</h1>
      <p>${friendlyError(error)}</p>
      <div class="error-state__actions">
        <button class="btn btn--primary" type="button" data-retry>${icon("refresh", 17)}Reintentar</button>
        <a class="btn btn--ghost" href="${PB_URL}/_/" target="_blank" rel="noopener">Abrir PocketBase</a>
      </div>
      <small>Servidor esperado: <code>${esc(PB_URL)}</code></small>
    </div>`;
}

function updateChrome(routeInfo) {
  document.title = `${routeInfo.route.label} · El Pistón`;
  const section = document.getElementById("topbar-section");
  if (section) section.textContent = routeInfo.route.label;

  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.dataset.route === routeInfo.base;
    link.classList.toggle("is-active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

async function navigate() {
  const token = ++navigationToken;
  const info = parseRoute();
  updateChrome(info);
  closeSidebar();
  main.innerHTML = loadingHtml();
  main.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: "instant" });

  try {
    const result = await info.route.view({ params: info.params, query: info.query });
    if (token !== navigationToken) return;
    main.innerHTML = result.html;
    main.classList.remove("view-enter");
    void main.offsetWidth;
    main.classList.add("view-enter");
    if (result.mount) result.mount(main);
  } catch (error) {
    if (token !== navigationToken) return;
    console.error(error);
    main.innerHTML = errorHtml(error);
    main.querySelector("[data-retry]")?.addEventListener("click", navigate);
  }
}

function openSidebar() {
  document.body.classList.add("sidebar-open");
  menuToggle?.setAttribute("aria-expanded", "true");
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
  menuToggle?.setAttribute("aria-expanded", "false");
}

async function refreshBadges() {
  try {
    const [parts, orders] = await Promise.all([
      fullList("repuestos", { fields: "id,existencias,minimo,activo" }),
      fullList("ordenes", { fields: "id,estado" }),
    ]);
    const low = parts.filter(
      (part) => part.activo !== false && Number(part.existencias) <= Number(part.minimo),
    ).length;
    const open = orders.filter((order) => order.estado !== "entregada" && order.estado !== "cancelada").length;

    const orderBadge = document.getElementById("nav-orders-badge");
    const stockBadge = document.getElementById("nav-stock-badge");
    const notifBadge = document.getElementById("notif-badge");

    if (orderBadge) {
      orderBadge.textContent = String(open);
      orderBadge.hidden = open === 0;
    }
    if (stockBadge) {
      stockBadge.textContent = String(low);
      stockBadge.hidden = low === 0;
    }
    if (notifBadge) {
      notifBadge.textContent = String(low);
      notifBadge.hidden = low === 0;
    }
  } catch {
    // Badges are supplementary; ignore transient errors.
  }
}

function initIcons() {
  document.querySelectorAll("[data-icon]").forEach((node) => {
    const size = node.closest(".nav-link") ? 19 : 20;
    node.innerHTML = icon(node.dataset.icon, size);
  });
}

function setDateChip() {
  const chip = document.getElementById("topbar-date");
  if (!chip) return;
  const text = new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
    .format(new Date())
    .replaceAll(".", "");
  chip.innerHTML = `${icon("calendar", 15)}<span>${text.charAt(0).toUpperCase()}${text.slice(1)}</span>`;
}

function init() {
  initIcons();
  setDateChip();
  refreshBadges();

  menuToggle?.addEventListener("click", () => {
    if (document.body.classList.contains("sidebar-open")) closeSidebar();
    else openSidebar();
  });
  overlay?.addEventListener("click", closeSidebar);
  sidebar?.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeSidebar));

  document.getElementById("sidebar-new-order")?.addEventListener("click", () => {
    closeSidebar();
    openOrderForm();
  });
  document.getElementById("notif-btn")?.addEventListener("click", () => {
    location.hash = "#/inventario?bajo=1";
  });

  window.addEventListener("hashchange", navigate);
  window.addEventListener("piston:data-changed", refreshBadges);
  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) closeSidebar();
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing =
      target instanceof HTMLElement &&
      (target.matches("input, textarea, select") || target.isContentEditable);
    if (document.body.classList.contains("modal-open")) return;
    if (event.key === "Escape") closeSidebar();
    if (!typing && !event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "n") {
      event.preventDefault();
      openOrderForm();
    }
  });

  if (!location.hash) history.replaceState(null, "", "#/panel");
  navigate();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
