// services/api.js
//
// Talks to Airtable directly end-to-end. This is a known temporary
// security shortcut — the PAT below ships to every visitor's browser —
// acceptable for a prototype at this scale, but must move behind a
// Cloudflare Worker gateway before this goes live for real.

const AIRTABLE_BASE_ID = "appy89xrqTChzanDq";
const AIRTABLE_TOKEN = "pat8QF6HLm4msqOmj.6d84422f5599d3d7245dc968b0c9925c1c72bb77ccf53dc9c60b2f1f37f245bf";
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const getAirtableHeaders = () => ({
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
});

// ─────────────────────────────────────────────────────
// Shared snapshot: rooms / bookings / reservations / reservation_line_items
// ─────────────────────────────────────────────────────

const AVAILABILITY_CACHE_TTL_MS = 15000;
let _availabilityCache = null;
let _availabilityCachePromise = null;

function _dateOnly(isoLike) {
  return new Date(`${String(isoLike).slice(0, 10)}T00:00:00`);
}

function _addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d;
}

// Same-day turnover is free — a checkout on day N and a check-in on day N
// do not clash — so both sides use a strict inequality.
function _rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Add near the top of api.js
function _formatReservationRef(rawRef) {
  const n = Number(rawRef);
  if (!Number.isFinite(n)) return String(rawRef ?? "");
  return `VGH-${String(n).padStart(4, "0")}`;
}

async function _getAvailabilitySnapshot() {
  const now = Date.now();
  if (_availabilityCache && now - _availabilityCache.timestamp < AVAILABILITY_CACHE_TTL_MS) {
    return _availabilityCache;
  }
  if (_availabilityCachePromise) return _availabilityCachePromise;

  _availabilityCachePromise = (async () => {
    const [roomsRes, bookingsRes, reservationsRes, lineItemsRes] = await Promise.all([
      fetch(`${AIRTABLE_URL}/rooms`, { headers: getAirtableHeaders() }),
      fetch(`${AIRTABLE_URL}/bookings`, { headers: getAirtableHeaders() }),
      fetch(`${AIRTABLE_URL}/reservations`, { headers: getAirtableHeaders() }),
      fetch(`${AIRTABLE_URL}/reservation_line_items`, { headers: getAirtableHeaders() })
    ]);

    for (const [label, res] of [
      ["rooms", roomsRes],
      ["bookings", bookingsRes],
      ["reservations", reservationsRes],
      ["reservation_line_items", lineItemsRes]
    ]) {
      if (!res.ok) throw new Error(`Failed to load ${label} (${res.status})`);
    }

    const [roomsData, bookingsData, reservationsData, lineItemsData] = await Promise.all([
      roomsRes.json(),
      bookingsRes.json(),
      reservationsRes.json(),
      lineItemsRes.json()
    ]);

    _availabilityCache = {
      timestamp: now,
      rooms: roomsData.records.map((r) => ({ airtable_id: r.id, ...r.fields })),
      bookings: bookingsData.records.map((r) => ({ airtable_id: r.id, ...r.fields })),
      reservations: reservationsData.records.map((r) => ({
        airtable_id: r.id,
        ...r.fields,
        status: r.fields.status_reading
      })),
      reservationLineItems: lineItemsData.records.map((r) => ({
        line_item_id: r.id,
        ...r.fields,
        status: r.fields.status_reading
      }))
    };
    return _availabilityCache;
  })();

  try {
    return await _availabilityCachePromise;
  } finally {
    _availabilityCachePromise = null;
  }
}

function _invalidateAvailabilityCache() {
  _availabilityCache = null;
}

// ─────────────────────────────────────────────────────
// Category display content — Airtable has no "categories" table, so
// name/description/images/maxGuests live here. totalUnits and
// pricePerNight are ALWAYS derived live from `rooms` below, never
// hand-entered, so the two can't drift out of sync again.
// ─────────────────────────────────────────────────────

const CATEGORY_DISPLAY = {
  "family-room": {
    name: "Family Room",
    description:
      "Designed for groups and families who need extra space. Features one queen bed and a bunk bed, providing a comfortable home base for up to four guests after a day of exploring Kimana.",
    maxGuests: 4,
    imageUrl: "/frontend/assets/family-room-2.jpg"
  },
  "standard-double": {
    name: "Standard Double",
    description:
      "A spacious, soundproofed retreat. Featuring a queen bed, a private bathroom, and a balcony that frames stunning mountain views. Your go-to spot for quiet, comfortable rest.",
    maxGuests: 3,
    imageUrl: "/frontend/assets/DOUBLE-ROOM-2.jpg"
  },
  "standard-twin": {
    name: "Standard Twin",
    description:
      "Ideal for friends or travel partners. Features two comfortable twin beds, a private bathroom, and a balcony to enjoy the fresh air and mountain scenery. Efficient and well-appointed.",
    maxGuests: 2,
    imageUrl: "/frontend/assets/TWIN-ROOM-3.webp"
  },
  "standard-queen": {
    name: "Standard Queen",
    description:
      "Our premier room for solo travelers or couples who prefer extra breathing room. Includes a queen bed, dedicated workspace, and a private balcony with panoramic mountain views.",
    maxGuests: 2,
    imageUrl: "/frontend/assets/QUEEN-WADROP-1.jpg"
  },
  "single-room": {
    name: "Single Room",
    description:
      "Your private sanctuary in Kimana. A compact and comfortable space featuring a single bed, a dedicated desk for your travel planning, and a balcony overlooking the mountains.",
    maxGuests: 1,
    imageUrl: "/frontend/assets/SINGLE-ROOM-3.jpg"
  }
};

/**
 * GET /api/categories (real)
 * pricePerNight is the MINIMUM base_rate among a category's rooms — shown
 * as a "from KSh X" starting price, since rooms within a category aren't
 * priced uniformly (e.g. one single-room is priced like a premium room).
 */
export async function getCategories() {
  const snapshot = await _getAvailabilitySnapshot();

  const byCategoryId = new Map();
  for (const room of snapshot.rooms) {
    if (!room.category_id) continue;
    const entry = byCategoryId.get(room.category_id) ?? { totalUnits: 0, minRate: Infinity };
    entry.totalUnits += 1;
    const rate = Number(room.base_rate) || 0;
    if (rate > 0 && rate < entry.minRate) entry.minRate = rate;
    byCategoryId.set(room.category_id, entry);
  }

  return Object.entries(CATEGORY_DISPLAY)
    .filter(([id]) => byCategoryId.has(id))
    .map(([id, display]) => {
      const { totalUnits, minRate } = byCategoryId.get(id);
      return {
        id,
        ...display,
        totalUnits,
        pricePerNight: Number.isFinite(minRate) ? minRate : 0
      };
    });
}

/**
 * GET /api/availability (real)
 * unitsUnavailable = (active PMS bookings in this category overlapping
 * the range) + (pending/confirmed reservation_line_items in this
 * category whose parent reservation overlaps the range). 'checked_in'
 * line items are skipped — already counted as a booking above, counting
 * both would double-count the same room. 'cancelled' holds nothing.
 */
export async function checkAvailability({ categoryId, checkIn, checkOut }) {
  const snapshot = await _getAvailabilitySnapshot();

  const proposedStart = _dateOnly(checkIn);
  const proposedEnd = _dateOnly(checkOut);

  const roomsInCategory = snapshot.rooms.filter((r) => r.category_id === categoryId);
  const totalUnits = roomsInCategory.length;
  const roomCategoryByName = new Map(snapshot.rooms.map((r) => [r.room_name, r.category_id]));

  const overlappingBookings = snapshot.bookings.filter((b) => {
    if (!b.is_active) return false;
    if (roomCategoryByName.get(b.room_name) !== categoryId) return false;
    if (!b.check_in || !b.nights) return false;
    const bookingStart = _dateOnly(b.check_in);
    const bookingEnd = _addDays(bookingStart, b.nights);
    return _rangesOverlap(proposedStart, proposedEnd, bookingStart, bookingEnd);
  });

  const reservationsById = new Map(snapshot.reservations.map((r) => [r.airtable_id, r]));
  const overlappingLineItemUnits = snapshot.reservationLineItems
    .filter((li) => {
      if (li.category_id !== categoryId) return false;
      if (li.status !== "pending" && li.status !== "confirmed") return false;
      const reservationId = Array.isArray(li.reservation_id) ? li.reservation_id[0] : li.reservation_id;
      const reservation = reservationsById.get(reservationId);
      if (!reservation?.check_in || !reservation?.check_out) return false;
      const resStart = _dateOnly(reservation.check_in);
      const resEnd = _dateOnly(reservation.check_out);
      return _rangesOverlap(proposedStart, proposedEnd, resStart, resEnd);
    })
    .reduce((sum, li) => sum + (Number(li.quantity) || 0), 0);

  const unitsUnavailable = overlappingBookings.length + overlappingLineItemUnits;
  const unitsLeft = Math.max(0, totalUnits - unitsUnavailable);

  return { categoryId, checkIn, checkOut, unitsLeft, totalUnits };
}

/**
 * POST /api/reservations (real)
 * Rechecks availability per line item right before writing (still no
 * server-side lock), then writes the reservation and its line items.
 *
 * Returns `id` as the guest-facing reservation_ref (the reservations
 * table's new primary field) rather than the raw Airtable record id.
 * `airtableId` carries the raw record id for callers that still need
 * it (e.g. to look the reservation up directly in Airtable).
 * reservation_line_items' own new primary field (line_item_ref) isn't
 * surfaced here — line items are already keyed by their Airtable
 * record id (`line_item_id`) everywhere else in the PMS.
 */
export async function submitReservation(payload) {
  for (const item of payload.lineItems || []) {
    const avail = await checkAvailability({
      categoryId: item.categoryId,
      checkIn: payload.checkIn,
      checkOut: payload.checkOut
    });
    if (item.quantity > avail.unitsLeft) {
      const err = new Error(`${item.categoryName} just filled up for those dates.`);
      err.code = "SLOT_UNAVAILABLE";
      err.categoryId = item.categoryId;
      throw err;
    }
  }

  const reservationRes = await fetch(`${AIRTABLE_URL}/reservations`, {
    method: "POST",
    headers: getAirtableHeaders(),
    body: JSON.stringify({
      fields: {
        guest_name: payload.guestName,
        guest_phone: payload.guestPhone,
        guest_email: payload.guestEmail || undefined,
        check_in: payload.checkIn,
        check_out: payload.checkOut,
        num_guests: payload.numGuests,
        notes: payload.notes || undefined,
        payment_preference: payload.paymentPreference,
        status_reading: "pending",
        source: "website",
        created_at: new Date().toISOString()
      }
    })
  });
  if (!reservationRes.ok) {
    // Airtable's response body names the exact offending field/value —
    // res.ok being false alone doesn't tell us that, so log it before
    // throwing the generic error the UI shows.
    const errorBody = await reservationRes.json().catch(() => null);
    console.error("[submitReservation] Airtable rejected the reservation write:", errorBody);
    throw new Error(`Failed to create reservation (${reservationRes.status})`);
  }
  const reservationRecord = await reservationRes.json();
  // reservationId is the raw Airtable record id — still needed to link the
  // reservation_line_items writes below via reservation_id: [reservationId].
  // reservationRef is the guest-facing reference (new primary field on
  // `reservations`) shown on the receipt / WhatsApp / PDF.
  const reservationId = reservationRecord.id;
  const reservationRef = _formatReservationRef(reservationRecord.fields.reservation_ref);

  const lineItemsRes = await fetch(`${AIRTABLE_URL}/reservation_line_items`, {
    method: "POST",
    headers: getAirtableHeaders(),
    body: JSON.stringify({
      records: payload.lineItems.map((item) => ({
        fields: {
          reservation_id: [reservationId],
          category_id: item.categoryId,
          category_name: item.categoryName,
          quantity: item.quantity,
          price_per_night_at_booking: item.pricePerNight,
          status_reading: "pending"
        }
      }))
    })
  });
  if (!lineItemsRes.ok) {
    const errorBody = await lineItemsRes.json().catch(() => null);
    console.error("[submitReservation] Airtable rejected the line items write:", errorBody);
    throw new Error(`Failed to create reservation line items (${lineItemsRes.status})`);
  }

  _invalidateAvailabilityCache();

  return {
    id: reservationRef,
    airtableId: reservationId,
    status: "pending",
    createdAt: new Date().toISOString(),
    ...payload
  };
}
