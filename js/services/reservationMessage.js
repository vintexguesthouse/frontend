// services/reservationMessage.js
//
// ONE function builds the reservation summary. WhatsApp text, mailto body,
// and the on-screen/print receipt all render from this object rather than
// keeping three copies of the same content in sync by hand.

import { ksh, fmtDate, nightsBetween, escapeHtml } from "../utils.js";

const GUESTHOUSE_NAME = "Vintex Guest House";
const GUESTHOUSE_PHONE_DISPLAY = "+254 726 766 023";
const GUESTHOUSE_WHATSAPP_NUMBER = "254726766023"; // no + or leading zero, wa.me format

/**
 * @param {object} reservation
 * @param {string} reservation.id
 * @param {string} reservation.categoryName
 * @param {number} reservation.quantity
 * @param {number} reservation.pricePerNight
 * @param {string} reservation.checkIn  ISO date
 * @param {string} reservation.checkOut ISO date
 * @param {string} reservation.guestName
 * @param {string} reservation.guestPhone
 * @param {string} [reservation.guestEmail]
 * @param {number} reservation.numGuests
 * @param {string} [reservation.notes]
 */
export function buildReservationSummary(reservation) {
  const nights = nightsBetween(reservation.checkIn, reservation.checkOut);
  const subtotal = nights * reservation.quantity * reservation.pricePerNight;

  const lines = [
    `${GUESTHOUSE_NAME} — Reservation ${reservation.id}`,
    "",
    `${reservation.categoryName} × ${reservation.quantity}`,
    `Check-in:  ${fmtDate(reservation.checkIn)}`,
    `Check-out: ${fmtDate(reservation.checkOut)}`,
    `${nights} night${nights === 1 ? "" : "s"} · ${reservation.numGuests} guest${
      reservation.numGuests === 1 ? "" : "s"
    }`,
    "",
    `Guest: ${reservation.guestName}`,
    `Phone: ${reservation.guestPhone}`,
    reservation.guestEmail ? `Email: ${reservation.guestEmail}` : null,
    reservation.notes ? `Notes: ${reservation.notes}` : null,
    "",
    `Estimated total: ${ksh(subtotal)}`,
    "",
    "Status: Pending — we will confirm shortly.",
    `Questions? Call or WhatsApp ${GUESTHOUSE_PHONE_DISPLAY}.`
  ].filter((line) => line !== null);

  const text = lines.join("\n");

  const html = `
    <div class="receipt">
      <div class="receipt__header">
        <div class="receipt__eyebrow">${escapeHtml(GUESTHOUSE_NAME)}</div>
        <div class="receipt__ref">${escapeHtml(reservation.id)}</div>
      </div>

      <div class="receipt__status receipt__status--pending">Pending confirmation</div>

      <div class="receipt__row receipt__row--main">
        <span>${escapeHtml(reservation.categoryName)} × ${reservation.quantity}</span>
        <span>${ksh(subtotal)}</span>
      </div>

      <div class="receipt__divider"></div>

      <dl class="receipt__details">
        <dt>Check-in</dt><dd>${escapeHtml(fmtDate(reservation.checkIn))}</dd>
        <dt>Check-out</dt><dd>${escapeHtml(fmtDate(reservation.checkOut))}</dd>
        <dt>Nights</dt><dd>${nights}</dd>
        <dt>Guests</dt><dd>${reservation.numGuests}</dd>
      </dl>

      <div class="receipt__divider"></div>

      <dl class="receipt__details">
        <dt>Name</dt><dd>${escapeHtml(reservation.guestName)}</dd>
        <dt>Phone</dt><dd>${escapeHtml(reservation.guestPhone)}</dd>
        ${reservation.guestEmail ? `<dt>Email</dt><dd>${escapeHtml(reservation.guestEmail)}</dd>` : ""}
        ${reservation.notes ? `<dt>Notes</dt><dd>${escapeHtml(reservation.notes)}</dd>` : ""}
      </dl>

      <div class="receipt__divider"></div>

      <div class="receipt__row receipt__row--total">
        <span>Estimated total</span>
        <span>${ksh(subtotal)}</span>
      </div>

      <p class="receipt__footnote">
        This confirms we have received your request — it is not yet a confirmed
        booking. We will reach you on ${escapeHtml(reservation.guestPhone)} shortly.
        Questions in the meantime? Call or WhatsApp ${escapeHtml(GUESTHOUSE_PHONE_DISPLAY)}.
      </p>
    </div>
  `;

  return { text, html, subtotal, nights };
}

/**
 * Builds a wa.me link prefilled with the reservation summary, addressed
 * to the guesthouse's own WhatsApp line (the attendant reads it there).
 */
export function buildWhatsAppLink(reservation, summaryText) {
  const encoded = encodeURIComponent(summaryText);
  return `https://wa.me/${GUESTHOUSE_WHATSAPP_NUMBER}?text=${encoded}`;
}

/**
 * Builds a mailto: link prefilled with subject + body. Only meaningful
 * when the guest supplied an email — callers should gate on that.
 */
export function buildMailtoLink(reservation, summaryText) {
  const subject = encodeURIComponent(`Your reservation ${reservation.id} — ${GUESTHOUSE_NAME}`);
  const body = encodeURIComponent(summaryText);
  return `mailto:${reservation.guestEmail || ""}?subject=${subject}&body=${body}`;
}

export const GUESTHOUSE = {
  name: GUESTHOUSE_NAME,
  phoneDisplay: GUESTHOUSE_PHONE_DISPLAY,
  whatsappNumber: GUESTHOUSE_WHATSAPP_NUMBER
};