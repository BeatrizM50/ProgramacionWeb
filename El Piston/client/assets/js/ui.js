import { icon } from "./icons.js";

export const ESTADOS = {
  recibida: { label: "Recibida", className: "status-recibida", step: 1 },
  diagnostico: { label: "En diagnóstico", className: "status-diagnostico", step: 2 },
  reparacion: { label: "En reparación", className: "status-reparacion", step: 3 },
  lista: { label: "Lista para entregar", className: "status-lista", step: 4 },
  entregada: { label: "Entregada", className: "status-entregada", step: 5 },
  cancelada: { label: "Cancelada", className: "status-cancelada", step: 0 },
};

export const PRIORIDADES = {
  baja: { label: "Baja", className: "prio-baja" },
  media: { label: "Media", className: "prio-media" },
  alta: { label: "Alta", className: "prio-alta" },
};

export const METODOS_PAGO = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
};

export const COLORES_MECANICO = [
  "#d8232a",
  "#1d4ed8",
  "#0f766e",
  "#b45309",
  "#7c3aed",
  "#be123c",
];

export function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const numberFormatter = new Intl.NumberFormat("es-CR", {
  maximumFractionDigits: 0,
});

export function money(value) {
  return `$${numberFormatter.format(Number(value) || 0).replace(/\s/g, " ")}`;
}

export function num(value) {
  return numberFormatter.format(Number(value) || 0);
}

export function pct(value, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

export function parseDate(value) {
  if (!value) return null;
  const normalized = String(value).includes("T") ? value : String(value).replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateShort(value, fallback = "—") {
  const date = parseDate(value);
  if (!date) return fallback;
  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(date)
    .replace(".", "");
}

export function dateLong(value) {
  const date = parseDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function dateInput(value) {
  const date = parseDate(value);
  if (!date) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export function timeShort(value) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeDate(value) {
  const date = parseDate(value);
  if (!date) return "Sin visitas";
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((start - target) / 86_400_000);
  if (days === 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days > 1 && days < 8) return `Hace ${days} días`;
  return dateShort(value);
}

export function initials(name) {
  const parts = String(name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function avatar(name, options = {}) {
  const { size = "md", index = 0, className = "" } = options;
  const color = COLORES_MECANICO[index % COLORES_MECANICO.length];
  return `<span class="avatar avatar--${size} ${className}" style="--avatar-color:${color}" aria-hidden="true">${esc(initials(name))}</span>`;
}

export function statusBadge(estado) {
  const meta = ESTADOS[estado] || { label: estado || "—", className: "" };
  return `<span class="status ${meta.className}"><span class="status__dot"></span>${esc(meta.label)}</span>`;
}

export function priorityBadge(prioridad) {
  const meta = PRIORIDADES[prioridad] || { label: prioridad || "—", className: "" };
  return `<span class="prio ${meta.className}">${esc(meta.label)}</span>`;
}

export function stockInfo(repuesto) {
  const stock = Number(repuesto?.existencias) || 0;
  const min = Number(repuesto?.minimo) || 0;
  if (stock <= 0) return { key: "agotado", label: "Agotado", className: "stock-agotado" };
  if (stock <= min) return { key: "bajo", label: "Bajo stock", className: "stock-bajo" };
  return { key: "ok", label: "Disponible", className: "stock-ok" };
}

export function stockBadge(repuesto) {
  const info = stockInfo(repuesto);
  return `<span class="stock ${info.className}"><span></span>${info.label}</span>`;
}

export function pageHeader({ eyebrow = "", title, subtitle = "", actions = "" }) {
  return `
    <div class="page-head">
      <div class="page-head__copy">
        ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
        <h1>${esc(title)}</h1>
        ${subtitle ? `<p class="page-head__subtitle">${subtitle}</p>` : ""}
      </div>
      ${actions ? `<div class="page-head__actions">${actions}</div>` : ""}
    </div>`;
}

export function emptyState({ iconName = "inbox", title, text = "", action = "" }) {
  return `
    <div class="empty">
      <div class="empty__icon">${icon(iconName, 26)}</div>
      <h3>${esc(title)}</h3>
      ${text ? `<p>${esc(text)}</p>` : ""}
      ${action}
    </div>`;
}

export function progress(value, total, className = "") {
  const width = pct(value, total);
  return `<span class="progress ${className}"><span style="width:${width}%"></span></span>`;
}

export function debounce(fn, wait = 220) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export function formObject(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll("input[type=checkbox]").forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

export function validateForm(form) {
  form.querySelectorAll(".field.has-error").forEach((node) => node.classList.remove("has-error"));
  const invalid = form.querySelector(":invalid");
  if (!invalid) return { valid: true, values: formObject(form) };
  const wrap = invalid.closest(".field");
  const message = invalid.dataset.error || invalid.validationMessage || "Revisa este campo.";
  if (wrap) {
    wrap.classList.add("has-error");
    const errorNode = wrap.querySelector("[data-field-error]");
    if (errorNode) errorNode.textContent = message;
  }
  invalid.focus({ preventScroll: true });
  invalid.scrollIntoView({ block: "center", behavior: "smooth" });
  toast(message, "warning");
  return { valid: false };
}

export function refresh() {
  window.dispatchEvent(new Event("hashchange"));
}

export function emitDataChanged() {
  window.dispatchEvent(new Event("piston:data-changed"));
}

export function toast(message, type = "success", timeout = 4200) {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const node = document.createElement("div");
  const iconName = type === "error" ? "xCircle" : type === "warning" ? "alert" : "checkCircle";
  node.className = `toast toast--${type}`;
  node.innerHTML = `
    <span class="toast__icon">${icon(iconName, 19)}</span>
    <span class="toast__text">${esc(message)}</span>
    <button class="toast__close" type="button" aria-label="Cerrar">${icon("close", 16)}</button>`;
  root.appendChild(node);
  requestAnimationFrame(() => node.classList.add("is-visible"));
  const remove = () => {
    node.classList.remove("is-visible");
    setTimeout(() => node.remove(), 220);
  };
  node.querySelector(".toast__close").addEventListener("click", remove);
  setTimeout(remove, timeout);
}

export function openModal({
  title,
  subtitle = "",
  eyebrow = "",
  content = "",
  footer = "",
  size = "md",
  onMount,
  onClose,
  className = "",
}) {
  const root = document.getElementById("modal-root");
  const previousFocus = document.activeElement;
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <section class="modal modal--${size} ${className}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header class="modal__head">
          <div>
            ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ""}
            <h2 id="modal-title">${esc(title)}</h2>
            ${subtitle ? `<p class="modal__subtitle">${esc(subtitle)}</p>` : ""}
          </div>
          <button type="button" class="icon-btn icon-btn--lg" data-modal-close aria-label="Cerrar">${icon("close", 20)}</button>
        </header>
        <div class="modal__body">${content}</div>
        ${footer ? `<footer class="modal__foot">${footer}</footer>` : ""}
      </section>
    </div>`;

  const backdrop = root.querySelector("[data-modal-backdrop]");
  const modal = root.querySelector(".modal");
  let closed = false;
  let onKeyDown = () => {};

  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown);
    backdrop.classList.remove("is-visible");
    document.body.classList.remove("modal-open");
    setTimeout(() => {
      root.innerHTML = "";
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true });
    }, 180);
    if (typeof onClose === "function") onClose();
  };

  backdrop.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", close);
  });
  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) close();
  });

  onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = modal.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKeyDown);

  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    backdrop.classList.add("is-visible");
    const firstInput = modal.querySelector(
      "input:not([type=hidden]), select, textarea, button:not([data-modal-close])",
    );
    if (firstInput) firstInput.focus({ preventScroll: true });
  });

  if (typeof onMount === "function") onMount(modal, { close });

  return { el: modal, close };
}

export function confirmDialog({
  title = "¿Confirmar acción?",
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  danger = false,
  eyebrow = "Confirmación",
}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const { close } = openModal({
      title,
      eyebrow,
      size: "sm",
      content: `<p class="confirm-text">${esc(message)}</p>`,
      footer: `
        <button type="button" class="btn btn--ghost" data-cancel>${esc(cancelText)}</button>
        <button type="button" class="btn ${danger ? "btn--danger" : "btn--primary"}" data-confirm>${esc(confirmText)}</button>`,
      onMount(el) {
        el.querySelector("[data-cancel]").addEventListener("click", () => {
          finish(false);
          close();
        });
        el.querySelector("[data-confirm]").addEventListener("click", () => {
          finish(true);
          close();
        });
      },
      onClose: () => finish(false),
    });
  });
}

export function downloadCsv(filename, rows) {
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = rows.map((row) => row.map(escapeCell).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function friendlyError(error) {
  if (!error) return "Ocurrió un error inesperado.";
  if (error.status === 0 || error.name === "TypeError") {
    return "No se pudo conectar con PocketBase. Verifica que el servidor esté en ejecución.";
  }
  if (error.status === 404) return "El registro ya no existe o fue eliminado.";
  if (error.status === 403) return "No tienes permiso para realizar esta acción.";
  const data = error.response?.data;
  if (data && typeof data === "object") {
    const messages = Object.entries(data)
      .map(([field, detail]) => {
        const text = detail?.message || "";
        return text ? `${field}: ${text}` : "";
      })
      .filter(Boolean);
    if (messages.length) return messages.join(" · ");
  }
  return error.message || "No se pudo completar la operación.";
}

export function setButtonLoading(button, loading, text = "Guardando…") {
  if (!button) return;
  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<span class="spinner spinner--sm"></span>${esc(text)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

export function todayInput() {
  return dateInput(new Date().toISOString());
}
