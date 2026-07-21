// services/api.js
//
// Every function here is written the way it will look once it talks to the
// real Worker: async, returns plain data or throws. The mock bodies are the
// only thing that will change — call sites in the components should never
// need to change when this file starts making real fetch() calls.
//
// Real endpoints this stands in for (see architecture doc §5):
//   GET  /api/categories
//   GET  /api/availability?categoryId=&checkIn=&checkOut=
//   POST /api/reservations

const WORKER_BASE_URL = ''; // e.g. 'https://booking.oakview-guesthouse.workers.dev'
const USE_MOCKS = true; // flip to false once WORKER_BASE_URL is live

const MOCK_LATENCY_MS = 550;

// ─────────────────────────────────────────────────────
// Airtable direct-access (checkAvailability() only)
// ─────────────────────────────────────────────────────
//
// Same base/token/header pattern as the PMS's services/api.js. This is
// a known temporary security shortcut — the PAT below ships to every
// visitor's browser — until the Cloudflare Worker gateway exists.
// getCategories() and submitReservation() are untouched and keep using
// the mock/Worker path above; only checkAvailability() talks to
// Airtable directly.
const AIRTABLE_BASE_ID = "appy89xrqTChzanDq";
const AIRTABLE_TOKEN = "pat8QF6HLm4msqOmj.6d84422f5599d3d7245dc968b0c9925c1c72bb77ccf53dc9c60b2f1f37f245bf";
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;

const getAirtableHeaders = () => ({
  Authorization: `Bearer ${AIRTABLE_TOKEN}`,
  "Content-Type": "application/json"
});

// In-memory snapshot of rooms/bookings/reservations/reservation_line_items,
// refreshed at most every ~15s so flipping between room categories in the
// modal doesn't refetch all four tables on every keystroke/tab change.
const AVAILABILITY_CACHE_TTL_MS = 15000;
let _availabilityCache = null; // { timestamp, rooms, bookings, reservations, reservationLineItems }
let _availabilityCachePromise = null; // in-flight fetch, so concurrent calls share one request

/**
 * Normalizes an ISO date (or ISO timestamp) string down to a Date at
 * local midnight for that calendar day, so overlap math only ever
 * compares whole days.
 */
function _dateOnly(isoLike) {
  const datePart = String(isoLike).slice(0, 10);
  return new Date(`${datePart}T00:00:00`);
}

/** Returns a new Date `days` after `date`. */
function _addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number(days) || 0));
  return d;
}

/**
 * Overlap test for two [start, end) date ranges. Same-day turnover is
 * free — a checkout on day N and a check-in on day N do not clash —
 * so both sides use a strict inequality.
 */
function _rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Fetches rooms, bookings, reservations, and reservation_line_items
 * from Airtable and caches the combined snapshot for ~15s.
 * `reservations` and `reservation_line_items` alias Airtable's real
 * `status_reading` field to `.status`, same as the PMS's api.js does
 * at its fetch boundary.
 */
async function _getAvailabilitySnapshot() {
  const now = Date.now();
  if (_availabilityCache && now - _availabilityCache.timestamp < AVAILABILITY_CACHE_TTL_MS) {
    return _availabilityCache;
  }
  if (_availabilityCachePromise) {
    return _availabilityCachePromise;
  }

  _availabilityCachePromise = (async () => {
    const [roomsRes, bookingsRes, reservationsRes, lineItemsRes] = await Promise.all([
      fetch(`${AIRTABLE_URL}/rooms`, { method: "GET", headers: getAirtableHeaders() }),
      fetch(`${AIRTABLE_URL}/bookings`, { method: "GET", headers: getAirtableHeaders() }),
      fetch(`${AIRTABLE_URL}/reservations`, { method: "GET", headers: getAirtableHeaders() }),
      fetch(`${AIRTABLE_URL}/reservation_line_items`, { method: "GET", headers: getAirtableHeaders() })
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

    const snapshot = {
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

    _availabilityCache = snapshot;
    return snapshot;
  })();

  try {
    return await _availabilityCachePromise;
  } finally {
    _availabilityCachePromise = null;
  }
}

// services/api.js
const MOCK_CATEGORIES = [
  {
    id: 'family-room',
    name: 'Family Room',
    description: 'Designed for groups and families who need extra space. Features one queen bed and a bunk bed, providing a comfortable home base for up to four guests after a day of exploring Kimana.',
    pricePerNight: 6000,
    maxGuests: 4,
    totalUnits: 1,
    imageUrl: '/frontend/assets/family-room-2.webp',
  },
  {
    id: 'standard-double',
    name: 'Standard Double',
    description: 'A spacious, soundproofed retreat. Featuring a queen bed, a private bathroom, and a balcony that frames stunning mountain views. Your go-to spot for quiet, comfortable rest.',
    pricePerNight: 5000,
    maxGuests: 3,
    totalUnits: 2,
    imageUrl: '/frontend/assets/DOUBLE-ROOM-2.webp',
  },
  {
    id: 'standard-twin',
    name: 'Standard Twin',
    description: 'Ideal for friends or travel partners. Features two comfortable twin beds, a private bathroom, and a balcony to enjoy the fresh air and mountain scenery. Efficient and well-appointed.',
    pricePerNight: 4000,
    maxGuests: 2,
    totalUnits: 5,
    imageUrl: '/frontend/assets/TWIN-ROOM-3.webp',
  },
  {
    id: 'standard-queen',
    name: 'Standard Queen',
    description: 'Our premier room for solo travelers or couples who prefer extra breathing room. Includes a queen bed, dedicated workspace, and a private balcony with panoramic mountain views.',
    pricePerNight: 4000,
    maxGuests: 2,
    totalUnits: 1,
    imageUrl: '/frontend/assets/QUEEN-WADROP-1.webp',
  },
  {
    id: 'single-room',
    name: 'Single Room',
    description: 'Your private sanctuary in Kimana. A compact and comfortable space featuring a single bed, a dedicated desk for your travel planning, and a balcony overlooking the mountains.',
    pricePerNight: 2500,
    maxGuests: 1,
    totalUnits: 6,
    imageUrl: '/frontend/assets/SINGLE-ROOM-3.jpg',
  }
];

// Deterministic-ish mock "booked units" so availability actually varies
// by date without needing a real datastore in the prototype.
function mockBookedUnits(categoryId, checkIn) {
  const seed = `${categoryId}:${checkIn}`.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const category = MOCK_CATEGORIES.find((c) => c.id === categoryId);
  const total = category ? category.totalUnits : 0;
  return seed % (total + 1);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET /api/categories
 * Returns the list of room categories the guest can choose from.
 */
export async function getCategories() {
  if (USE_MOCKS) {
    await wait(MOCK_LATENCY_MS);
    return structuredClone(MOCK_CATEGORIES);
  }

  const res = await fetch(`${WORKER_BASE_URL}/api/categories`);
  if (!res.ok) throw new Error(`Failed to load categories (${res.status})`);
  return res.json();
}

/**
 * GET /api/availability
 * Tells the guest how many units of a category are free for their dates,
 * BEFORE they reach the reservation form, so a hard collision at submit
 * time is rare rather than the normal path.
 */
export async function checkAvailability({ categoryId, checkIn, checkOut }) {
  // Deliberately ignores USE_MOCKS — this is the one function on this
  // page that talks to Airtable directly already (see the header
  // comment above), independent of whether the Worker is live yet.
  const snapshot = await _getAvailabilitySnapshot();

  const proposedStart = _dateOnly(checkIn);
  const proposedEnd = _dateOnly(checkOut);

  const roomsInCategory = snapshot.rooms.filter((r) => r.category_id === categoryId);
  const totalUnits = roomsInCategory.length;
  const roomCategoryByName = new Map(snapshot.rooms.map((r) => [r.room_name, r.category_id]));

  // Active PMS bookings in this category that overlap the requested range.
  const overlappingBookings = snapshot.bookings.filter((b) => {
    if (!b.is_active) return false;
    if (roomCategoryByName.get(b.room_name) !== categoryId) return false;
    if (!b.check_in || !b.nights) return false;
    const bookingStart = _dateOnly(b.check_in);
    const bookingEnd = _addDays(bookingStart, b.nights);
    return _rangesOverlap(proposedStart, proposedEnd, bookingStart, bookingEnd);
  });

  // pending/confirmed website reservation_line_items in this category whose
  // parent reservation's dates overlap the range. 'checked_in' line items
  // are skipped — they already exist as a real booking above, and counting
  // both would double-count the same room. 'cancelled' holds nothing.
  const reservationsById = new Map(snapshot.reservations.map((r) => [r.airtable_id, r]));
  const overlappingLineItemUnits = snapshot.reservationLineItems
    .filter((li) => {
      if (li.category_id !== categoryId) return false;
      if (li.status !== "pending" && li.status !== "confirmed") return false;
      const reservationId = Array.isArray(li.reservation_id) ? li.reservation_id[0] : li.reservation_id;
      const reservation = reservationsById.get(reservationId);
      if (!reservation || !reservation.check_in || !reservation.check_out) return false;
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
 * POST /api/reservations
 * Writes a `pending` Reservation to Airtable via the Worker. This must
 * succeed before the guest is shown any receipt (architecture doc §4/§5) —
 * callers should not render ReceiptChannelPicker until this resolves.
 *
 * @param {object} payload
 * @param {Array<{categoryId: string, categoryName: string, pricePerNight: number, quantity: number}>} payload.lineItems
 * @param {string} payload.checkIn
 * @param {string} payload.checkOut
 * @param {string} payload.guestName
 * @param {string} payload.guestPhone
 * @param {string} [payload.guestEmail]
 * @param {number} payload.numGuests
 * @param {string} [payload.notes]
 *
 * Throws on failure so the caller can show the retry/error state rather
 * than a receipt for a booking that never landed. On a SLOT_UNAVAILABLE
 * error, err.categoryId identifies which line item collided so the caller
 * can send the guest back to fix just that room type.
 */
export async function submitReservation(payload) {
  if (USE_MOCKS) {
    await wait(MOCK_LATENCY_MS + 400);

    // Simulate the rare last-second collision described in §4: a slot
    // filled between checkAvailability() and submit. Checked per line
    // item, ~6% chance each, so a multi-room-type cart can still fail on
    // just the one category that lost the race.
    for (const item of payload.lineItems || []) {
      const category = MOCK_CATEGORIES.find((c) => c.id === item.categoryId);
      const booked = mockBookedUnits(item.categoryId, payload.checkIn);
      const unitsLeft = category ? Math.max(0, category.totalUnits - booked) : 0;

      if (item.quantity > unitsLeft || Math.random() < 0.06) {
        const err = new Error(`${item.categoryName} just filled up for those dates.`);
        err.code = 'SLOT_UNAVAILABLE';
        err.categoryId = item.categoryId;
        throw err;
      }
    }

    return {
      id: `RES-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...payload,
    };
  }

  const res = await fetch(`${WORKER_BASE_URL}/api/reservations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 409) {
      let categoryId;
      try {
        categoryId = (await res.json()).categoryId;
      } catch {
        // response body wasn't JSON / didn't include it — non-fatal
      }
      const err = new Error('One of the selected room types just filled up for those dates.');
      err.code = 'SLOT_UNAVAILABLE';
      err.categoryId = categoryId;
      throw err;
    }
    throw new Error(`Failed to submit reservation (${res.status})`);
  }

  return res.json();
}