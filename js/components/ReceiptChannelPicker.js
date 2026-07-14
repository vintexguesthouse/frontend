// components/ReceiptChannelPicker.js
import { el } from '../utils.js';
import { buildWhatsAppLink, buildMailtoLink } from '../services/reservationMessage.js';

/**
 * Renders the on-screen receipt card plus the three channel actions.
 * The receipt itself renders once here (on-screen) and once again,
 * print-optimized, inside the hidden #print-root when Download is used —
 * both read from the same `summary.html` from reservationMessage.js.
 *
 * @param {HTMLElement} mountEl
 * @param {object} reservation
 * @param {{ text: string, html: string }} summary
 */
export function ReceiptChannelPicker(mountEl, reservation, summary) {
  const card = el('div', { class: 'receipt-card', html: summary.html });

  const actions = el('div', { class: 'receipt-actions' }, [
    el(
      'a',
      {
        class: 'button button--primary',
        href: buildWhatsAppLink(reservation, summary.text),
        target: '_blank',
        rel: 'noopener',
      },
      'Send to WhatsApp'
    ),
    reservation.guestEmail
      ? el(
          'a',
          {
            class: 'button button--ghost',
            href: buildMailtoLink(reservation, summary.text),
          },
          'Email it to me'
        )
      : null,
    el(
      'button',
      {
        type: 'button',
        class: 'button button--ghost',
        onClick: () => printReceipt(summary.html),
      },
      'Download / print'
    ),
  ]);

  mountEl.append(card, actions);
}

/**
 * Renders the receipt into the page's hidden #print-root (A4/letter print
 * rules, defined separately from the thermal 80mm receipt stylesheet used
 * at the PMS front desk) and triggers window.print(). Zero libraries,
 * works the same on iOS Safari and Android Chrome.
 */
function printReceipt(html) {
  let printRoot = document.getElementById('print-root');
  if (!printRoot) {
    printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    document.body.append(printRoot);
  }
  printRoot.innerHTML = html;
  window.print();
}
