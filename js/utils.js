// utils.js
// Shared, dependency-free helpers used across all three pages.

/**
 * Format a number as Kenyan Shillings, e.g. 4500 -> "KSh 4,500"
 */
export function ksh(amount) {
  const n = Number(amount) || 0;
  return `KSh ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

/**
 * Format an ISO date string (YYYY-MM-DD) as "Mon, 14 Jul 2026"
 */
export function fmtDate(isoDate) {
  if (!isoDate) return '';
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Number of nights between two ISO date strings. Minimum 0.
 */
export function nightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(`${checkIn}T00:00:00`);
  const b = new Date(`${checkOut}T00:00:00`);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Today as an ISO date string, used as the min value for date inputs.
 */
export function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

/**
 * Add `n` days to an ISO date string, returning a new ISO date string.
 */
export function addDaysISO(isoDate, n) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Tiny DOM builder so components stay readable without a framework.
 * el('div', { class: 'card', onClick: fn }, [child1, child2, 'text'])
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'class') {
      node.className = value;
    } else if (key === 'html') {
      node.innerHTML = value;
    } else if (key in node) {
      // supports .value, .checked, .disabled etc. directly
      try {
        node[key] = value;
      } catch {
        node.setAttribute(key, value);
      }
    } else {
      node.setAttribute(key, value);
    }
  }

  const kids = Array.isArray(children) ? children : [children];
  for (const child of kids) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  return node;
}

/**
 * Escape a string for safe insertion into innerHTML contexts
 * (used by reservationMessage.js when building the printable receipt).
 */
export function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/**
 * Simple id generator for client-side draft references before the
 * server assigns a real Reservation id (e.g. "RES-9F2K3A").
 */
export function draftRef() {
  return `RES-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/**
 * Basic focus trap for modals: keeps Tab cycling within `container`.
 * Returns a cleanup function.
 */
export function trapFocus(container) {
  const selector =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

  function handleKeydown(e) {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(container.querySelectorAll(selector)).filter(
      (node) => node.offsetParent !== null
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', handleKeydown);
  return () => container.removeEventListener('keydown', handleKeydown);
}
