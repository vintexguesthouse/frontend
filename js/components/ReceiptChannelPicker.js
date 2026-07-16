// components/ReceiptChannelPicker.js
import { el, ksh, fmtDate } from '../utils.js';
import { buildWhatsAppLink, buildMailtoLink, GUESTHOUSE } from '../services/reservationMessage.js';

/**
 * Renders the on-screen receipt card plus the channel actions.
 * The on-screen card and the PDF are both built from the same
 * `reservation`/`summary` data (from reservationMessage.js) so they never
 * drift apart, even though the PDF is generated independently rather than
 * printed from the card's HTML.
 *
 * @param {HTMLElement} mountEl
 * @param {object} reservation
 * @param {{ text: string, html: string, nights: number, subtotal: number }} summary
 */
export function ReceiptChannelPicker(mountEl, reservation, summary) {
  const card = el('div', { class: 'receipt-card', html: summary.html });

  const downloadBtn = el(
    'button',
    {
      type: 'button',
      class: 'button button--ghost',
      onClick: async () => {
        downloadBtn.disabled = true;
        const originalLabel = downloadBtn.textContent;
        downloadBtn.textContent = 'Preparing PDF…';
        try {
          await downloadReceiptPdf(reservation, summary);
        } catch (err) {
          console.error('Failed to generate receipt PDF', err);
          window.alert("Sorry, we couldn't generate the PDF. Please try again.");
        } finally {
          downloadBtn.disabled = false;
          downloadBtn.textContent = originalLabel;
        }
      },
    },
    'Download PDF'
  );

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
    el(
      'a',
      {
        class: 'button button--ghost',
        href: buildMailtoLink(reservation, summary.text),
      },
      'Email the guesthouse'
    ),
    downloadBtn,
  ]);

  mountEl.append(card, actions);
}

/**
 * Loads jsPDF on demand (no build step in this project, so it's pulled
 * from a CDN as an ES module rather than bundled) and caches the module
 * so repeat downloads in the same session don't re-fetch it.
 */
let jsPDFModulePromise = null;
function loadJsPDF() {
  if (!jsPDFModulePromise) {
    jsPDFModulePromise = import('https://esm.sh/jspdf@2.5.2').then((mod) => mod.jsPDF);
  }
  return jsPDFModulePromise;
}

/**
 * Builds a real PDF client-side from the reservation data (not a browser
 * print of the on-screen HTML) and triggers a Reservation-{id}.pdf
 * download. Renders every line item in `reservation.lineItems`, not a
 * single category/quantity pair.
 *
 * @param {object} reservation
 * @param {{ nights: number, subtotal: number }} summary
 */
async function downloadReceiptPdf(reservation, summary) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'a4' });

  const marginX = 56;
  let y = 64;
  const lineItems = reservation.lineItems || [];

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(GUESTHOUSE.name, marginX, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reservation ${reservation.id}`, marginX, (y += 20));
  doc.text('Status: Pending — we will confirm shortly.', marginX, (y += 16));

  y += 24;
  doc.setFont('helvetica', 'bold');
  doc.text('Rooms', marginX, y);
  doc.setFont('helvetica', 'normal');
  y += 18;
  for (const item of lineItems) {
    const lineTotal = ksh(summary.nights * item.quantity * item.pricePerNight);
    doc.text(`${item.categoryName} × ${item.quantity}`, marginX, y);
    doc.text(lineTotal, 540, y, { align: 'right' });
    y += 18;
  }

  y += 12;
  doc.setDrawColor(200);
  doc.line(marginX, y, 540, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.text('Stay details', marginX, y);
  doc.setFont('helvetica', 'normal');
  y += 18;
  doc.text(`Check-in:  ${fmtDate(reservation.checkIn)}`, marginX, y);
  y += 16;
  doc.text(`Check-out: ${fmtDate(reservation.checkOut)}`, marginX, y);
  y += 16;
  doc.text(
    `${summary.nights} night${summary.nights === 1 ? '' : 's'} · ${reservation.numGuests} guest${
      reservation.numGuests === 1 ? '' : 's'
    }`,
    marginX,
    y
  );

  y += 32;
  doc.setFont('helvetica', 'bold');
  doc.text('Guest', marginX, y);
  doc.setFont('helvetica', 'normal');
  y += 18;
  doc.text(`Name:  ${reservation.guestName}`, marginX, y);
  y += 16;
  doc.text(`Phone: ${reservation.guestPhone}`, marginX, y);
  if (reservation.guestEmail) {
    y += 16;
    doc.text(`Email: ${reservation.guestEmail}`, marginX, y);
  }
  if (reservation.notes) {
    y += 16;
    doc.text(`Notes: ${reservation.notes}`, marginX, y);
  }

  y += 12;
  doc.setDrawColor(200);
  doc.line(marginX, y, 540, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Estimated total', marginX, y);
  doc.text(ksh(summary.subtotal), 540, y, { align: 'right' });

  y += 36;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    'This confirms we have received your request — it is not yet a confirmed booking.',
    marginX,
    y,
    { maxWidth: 484 }
  );
  y += 14;
  doc.text(`Questions? Call or WhatsApp ${GUESTHOUSE.phoneDisplay}.`, marginX, y);

  doc.save(`Reservation-${reservation.id}.pdf`);
}
