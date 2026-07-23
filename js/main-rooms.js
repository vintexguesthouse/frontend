// main-rooms.js
import { renderNav } from "./components/Nav.js";
import { renderHero } from "./components/Gallery.js";
import { CategoryCard } from "./components/CategoryCard.js";
import { createReservationModal } from "./components/ReservationModal.js";
import { getCategories } from "./services/api.js";
import { el } from "./utils.js";
import { CurrencySelect } from "./components/CurrencySelect.js";
import { getPreferredCurrency } from "./services/currency.js";

const navMount = document.getElementById("nav-root");
const heroMount = document.getElementById("hero-root");
const gridMount = document.getElementById("rooms-grid-root");
const modalMount = document.getElementById("modal-root");
const currencyMount = document.getElementById("currency-select-root");

// Each mount point is rendered independently and wrapped in its own
// try/catch. A missing element or a bug in one section (e.g. the hero)
// should never prevent the others (e.g. the room categories) from loading —
// previously a single thrown error here would halt the whole script.

if (navMount) {
  try {
    renderNav(navMount, "rooms");
  } catch (err) {
    console.error("Failed to render nav:", err);
  }
} else {
  console.error("main-rooms.js: #nav-root not found in the page.");
}

if (heroMount) {
  try {
    renderHero(heroMount, "/frontend/assets/exterior.webp", {
      eyebrow: "Rooms & Rates",
      title: ["Five room types,", null, "one perfect fit for your stay."],
      lede: "From cosy singles to spacious family rooms, every Vintex room comes with fresh linens, hot water, and a warm welcome. Browse what\u2019s available below and request your dates.",
      actions: [
        { href: "#rooms-grid-root", label: "Browse rooms", variant: "primary" },
        { href: "contact.html", label: "Ask a question", variant: "ghost" }
      ]
    });
  } catch (err) {
    console.error("Failed to render hero:", err);
  }
} else {
  console.error("main-rooms.js: #hero-root not found in the page — check rooms.html for a matching id.");
}

let modal = null;
if (modalMount) {
  try {
    modal = createReservationModal(modalMount);
  } catch (err) {
    console.error("Failed to create reservation modal:", err);
  }
} else {
  console.error("main-rooms.js: #modal-root not found in the page — check rooms.html for a matching id.");
}

let currentCategories = [];
let displayCurrency = getPreferredCurrency();

function renderCategoryCards() {
  gridMount.querySelectorAll(".category-card").forEach((node) => node.remove());
  for (const category of currentCategories) {
    gridMount.append(
      CategoryCard(
        category,
        (selected) => {
          modal ? modal.open(selected) : console.error("Reservation modal unavailable");
        },
        displayCurrency
      )
    );
  }
}

if (currencyMount) {
  currencyMount.append(
    CurrencySelect((code) => {
      displayCurrency = code;
      renderCategoryCards();
    })
  );
}

async function init() {
  if (!gridMount) {
    console.error("main-rooms.js: #rooms-grid-root not found in the page — room categories cannot render.");
    return;
  }

  gridMount.innerHTML = "";
  gridMount.append(el("p", { class: "rooms-grid__status" }, "Loading rooms…"));

  try {
    const categories = await getCategories();
    gridMount.innerHTML = "";

    if (categories.length === 0) {
      gridMount.append(
        el("p", { class: "rooms-grid__status" }, "No rooms are listed right now — please check back soon.")
      );
      return;
    }

    currentCategories = categories;
    renderCategoryCards();
  } catch (err) {
    console.error("Failed to load room categories:", err);
    gridMount.innerHTML = "";
    gridMount.append(
      el("div", { class: "form-alert", role: "alert" }, [
        el("p", {}, "We couldn't load room availability. Please refresh the page, or reach us directly."),
        el("a", { class: "button button--ghost", href: "contact.html" }, "Contact us")
      ])
    );
  }
}

init();
