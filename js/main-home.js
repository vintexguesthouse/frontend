// main-home.js
import { renderNav } from './components/Nav.js';
import { renderHero, renderGallery, renderAbout } from './components/Gallery.js';

const navMount = document.getElementById('nav-root');
const heroMount = document.getElementById('hero-root');
const galleryMount = document.getElementById('gallery-root');
const aboutMount = document.getElementById('about-root');

renderNav(navMount, 'home');
renderHero(heroMount, '/frontend/assets/TWIN-ROOM.jpg', {
  eyebrow: 'Kajiado · Kimana',
  title: ['A welcoming guest house,', null, 'located in the heart of Kimana.'],
  lede:
    'Five room types, home-cooked meals, and a peaceful courtyard. Vintex Guest House has provided comfortable, affordable stays for travellers and families since 2024.',
  actions: [
    { href: 'rooms.html', label: 'See rooms & rates', variant: 'primary' },
    { href: 'contact.html', label: 'Ask a question', variant: 'ghost' }
  ]
});
renderGallery(galleryMount);
renderAbout(aboutMount);
