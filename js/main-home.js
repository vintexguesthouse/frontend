// main-home.js
import { renderNav } from './components/Nav.js';
import { renderHero, renderGallery, renderAbout } from './components/Gallery.js';

const navMount = document.getElementById('nav-root');
const heroMount = document.getElementById('hero-root');
const galleryMount = document.getElementById('gallery-root');
const aboutMount = document.getElementById('about-root');

renderNav(navMount, 'home');
renderHero(heroMount, '/frontend/assets/EXTERIOR-5.webp');
renderGallery(galleryMount);
renderAbout(aboutMount);
