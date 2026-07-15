// main-rooms.js
import { renderNav } from './components/Nav.js';
import { renderHero } from "./components/Gallery.js";
import { CategoryCard } from './components/CategoryCard.js';
import { createReservationModal } from './components/ReservationModal.js';
import { getCategories } from './services/api.js';
import { el } from './utils.js';

const navMount = document.getElementById('nav-root');
const heroMount = document.getElementById('hero-root');
const gridMount = document.getElementById('rooms-grid-root');
const modalMount = document.getElementById('modal-root');

renderNav(navMount, 'rooms');
renderHero(heroMount, '/frontend/assets/exterior.webp');


const modal = createReservationModal(modalMount);

async function init() {
  gridMount.innerHTML = '';
  gridMount.append(el('p', { class: 'rooms-grid__status' }, 'Loading rooms…'));

  try {
    const categories = await getCategories();
    gridMount.innerHTML = '';

    if (categories.length === 0) {
      gridMount.append(el('p', { class: 'rooms-grid__status' }, 'No rooms are listed right now — please check back soon.'));
      return;
    }

    for (const category of categories) {
      gridMount.append(CategoryCard(category, (selected) => modal.open(selected)));
    }
  } catch (err) {
    gridMount.innerHTML = '';
    gridMount.append(
      el('div', { class: 'form-alert', role: 'alert' }, [
        el('p', {}, "We couldn't load room availability. Please refresh the page, or reach us directly."),
        el('a', { class: 'button button--ghost', href: 'contact.html' }, 'Contact us'),
      ])
    );
  }
}

init();
