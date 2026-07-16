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
    id: 'garden-double',
    name: 'Standard Double',
    description: 'A spacious, soundproofed retreat. Featuring a queen bed, a private bathroom, and a balcony that frames stunning mountain views. Your go-to spot for quiet, comfortable rest.',
    pricePerNight: 5000,
    maxGuests: 3,
    totalUnits: 2,
    imageUrl: '/frontend/assets/DOUBLE-ROOM-2.webp',
  },
  {
    id: 'budget-twin',
    name: 'Standard Twin',
    description: 'Ideal for friends or travel partners. Features two comfortable twin beds, a private bathroom, and a balcony to enjoy the fresh air and mountain scenery. Efficient and well-appointed.',
    pricePerNight: 4000,
    maxGuests: 2,
    totalUnits: 5,
    imageUrl: '/frontend/assets/TWIN-ROOM-3.webp',
  },
  {
    id: 'executive-suite',
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
    imageUrl: '/frontend/assets/SINGLE-ROOM-1.webp',
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
  if (USE_MOCKS) {
    await wait(MOCK_LATENCY_MS);
    const category = MOCK_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) throw new Error('Unknown category');
    const booked = mockBookedUnits(categoryId, checkIn);
    const unitsLeft = Math.max(0, category.totalUnits - booked);
    return { categoryId, checkIn, checkOut, unitsLeft, totalUnits: category.totalUnits };
  }

  const params = new URLSearchParams({ categoryId, checkIn, checkOut });
  const res = await fetch(`${WORKER_BASE_URL}/api/availability?${params}`);
  if (!res.ok) throw new Error(`Failed to check availability (${res.status})`);
  return res.json();
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