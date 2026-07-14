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

const MOCK_CATEGORIES = [
  {
    id: 'family-room',
    name: 'Family Room',
    description:
      'Two queen beds and a fold-out for little ones, with a private lounge nook. Our most requested room for groups of 3–5.',
    pricePerNight: 8500,
    maxGuests: 5,
    totalUnits: 4,
    imageUrl: '/assets/room-family.svg',
  },
  {
    id: 'garden-double',
    name: 'Garden Double',
    description:
      'A queen bed opening onto the courtyard garden. Quiet, ground-floor, and closest to the breakfast terrace.',
    pricePerNight: 6000,
    maxGuests: 2,
    totalUnits: 6,
    imageUrl: '/assets/room-garden.svg',
  },
  {
    id: 'budget-twin',
    name: 'Budget Twin',
    description:
      'Two single beds, compact and comfortable. Popular with students and solo travellers sharing costs.',
    pricePerNight: 3800,
    maxGuests: 2,
    totalUnits: 5,
    imageUrl: '/assets/room-twin.svg',
  },
  {
    id: 'executive-suite',
    name: 'Executive Suite',
    description:
      'Our largest room: king bed, work desk, and a separate sitting area. Best for longer business stays.',
    pricePerNight: 12000,
    maxGuests: 3,
    totalUnits: 2,
    imageUrl: '/assets/room-suite.svg',
  },
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
 * Throws on failure so the caller can show the retry/error state rather
 * than a receipt for a booking that never landed.
 */
export async function submitReservation(payload) {
  if (USE_MOCKS) {
    await wait(MOCK_LATENCY_MS + 400);

    // Simulate the rare last-second collision described in §4: the slot
    // filled between checkAvailability() and submit. ~6% of the time.
    if (Math.random() < 0.06) {
      const err = new Error('That category just filled up for those dates.');
      err.code = 'SLOT_UNAVAILABLE';
      throw err;
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
      const err = new Error('That category just filled up for those dates.');
      err.code = 'SLOT_UNAVAILABLE';
      throw err;
    }
    throw new Error(`Failed to submit reservation (${res.status})`);
  }

  return res.json();
}
