// components/Gallery.js
<<<<<<< HEAD
import { el } from '../utils.js';

const GALLERY_IMAGES = [
  { src: '/assets/gallery-courtyard.svg', alt: 'Courtyard garden with breakfast tables under a jacaranda tree' },
  { src: '/assets/gallery-terrace.svg', alt: 'Breakfast terrace overlooking the garden at sunrise' },
  { src: '/assets/gallery-lounge.svg', alt: 'Shared lounge with woven furniture and reading corner' },
  { src: '/assets/gallery-room.svg', alt: 'Interior of the Garden Double room' },
  { src: '/assets/gallery-path.svg', alt: 'Stone path through the garden toward the guest rooms' },
  { src: '/assets/gallery-night.svg', alt: 'The main house lit up in the evening' },
];

export function renderHero(mountEl) {
  const hero = el('section', { class: 'hero' }, [
    el('div', { class: 'hero__inner' }, [
      el('p', { class: 'hero__eyebrow' }, 'Nairobi · Karen'),
      el('h1', { class: 'hero__title' }, [
        'A quiet garden guest house,',
        el('br'),
        'ten minutes from the forest.',
      ]),
      el(
        'p',
        { class: 'hero__lede' },
        'Four room types, home-cooked breakfast, and a courtyard that stays green through both rainy seasons. Oakview has hosted travellers, families and long-stay guests since 2016.'
      ),
      el('div', { class: 'hero__actions' }, [
        el('a', { href: 'rooms.html', class: 'button button--primary' }, 'See rooms & rates'),
        el('a', { href: 'contact.html', class: 'button button--ghost' }, 'Ask a question'),
      ]),
    ]),
=======
import { el } from "../utils.js";

const GALLERY_IMAGES = [
  // Exterior
  { src: "/assets/EXTERIOR 1.jpg", alt: "The guest house exterior courtyard" },

  // Rooms
  { src: "/assets/family room 1.jpg", alt: "Family room interior with bunk beds and double bed" },
  { src: "/assets/DOUBLE ROOM 1.jpg", alt: "Interior of the Double room" },
  { src: "/assets/SINGLE ROOM 1.jpg", alt: "Interior of the Single room" },
  { src: "/assets/TWIN ROOM 4.jpg", alt: "Interior of the Twin room with mosquito nets" },
  { src: "/assets/QUEEN WADROP 1.jpg", alt: "Interior of the Queen room featuring the wardrobe" },
  { src: "/assets/SINGLE WADROP 1.jpg", alt: "Interior of the Single room featuring the wardrobe" },

  // Dining / Restaurant
  { src: "/assets/RESTURANT 3.jpg", alt: "Restaurant seating area with checkered tables" },
  { src: "/assets/RESTURANT 6.jpg", alt: "Dish drying rack in the kitchen area" }
];

export function renderHero(mountEl) {
  const hero = el("section", { class: "hero" }, [
    el("div", { class: "hero__inner" }, [
      el("p", { class: "hero__eyebrow" }, "Kajiado · Kimana"),
      el("h1", { class: "hero__title" }, ["A welcoming guest house,", el("br"), "located in the heart of Kimana."]),
      el(
        "p",
        { class: "hero__lede" },
        "Five room types, home-cooked meals, and a peaceful courtyard. Vintex Guest House has provided comfortable, affordable stays for travellers and families since 2016."
      ),
      el("div", { class: "hero__actions" }, [
        el("a", { href: "rooms.html", class: "button button--primary" }, "See rooms & rates"),
        el("a", { href: "contact.html", class: "button button--ghost" }, "Ask a question")
      ])
    ])
>>>>>>> d761f55 (Initial commit with gallery images)
  ]);
  mountEl.append(hero);
}

export function renderGallery(mountEl) {
  const grid = el(
<<<<<<< HEAD
    'div',
    { class: 'gallery__grid' },
    GALLERY_IMAGES.map((img, i) =>
      el('figure', { class: `gallery__item gallery__item--${(i % 3) + 1}` }, [
        el('img', { src: img.src, alt: img.alt, loading: 'lazy', width: '640', height: '480' }),
=======
    "div",
    { class: "gallery__grid" },
    GALLERY_IMAGES.map((img, i) =>
      el("figure", { class: `gallery__item gallery__item--${(i % 3) + 1}` }, [
        el("img", { src: img.src, alt: img.alt, loading: "lazy", width: "640", height: "480" })
>>>>>>> d761f55 (Initial commit with gallery images)
      ])
    )
  );

<<<<<<< HEAD
  const section = el('section', { class: 'section', id: 'gallery' }, [
    el('div', { class: 'section__header' }, [
      el('span', { class: 'section__eyebrow' }, 'Around the house'),
      el('h2', { class: 'section__title' }, 'A look at Oakview'),
    ]),
    grid,
=======
  const section = el("section", { class: "section", id: "gallery" }, [
    el("div", { class: "section__header" }, [
      el("span", { class: "section__eyebrow" }, "Around the house"),
      el("h2", { class: "section__title" }, "A look at Vintex")
    ]),
    grid
>>>>>>> d761f55 (Initial commit with gallery images)
  ]);

  mountEl.append(section);
}

export function renderAbout(mountEl) {
  const section = el('section', { class: 'section section--alt', id: 'about' }, [
    el('div', { class: 'about' }, [
      el('div', { class: 'about__text' }, [
<<<<<<< HEAD
        el('span', { class: 'section__eyebrow' }, 'About us'),
        el('h2', { class: 'section__title' }, 'Run by the Wanjiru family, one room at a time'),
        el(
          'p',
          {},
          'Oakview started as a single spare room in 2016 and grew, one renovation at a time, into four room types around a shared courtyard. We still cook breakfast ourselves, keep the garden by hand, and answer the phone in person.'
=======
        el('span', { class: 'section__eyebrow' }, 'About Us'),
        el('h2', { class: 'section__title' }, 'Comfortable stays, one room at a time'),
        el(
          'p',
          {},
          'Vintex Guest House has grown into a trusted home away from home. We pride ourselves on personal service, clean rooms, and ensuring every guest feels welcomed, whether you are here for a quick stop or a longer stay.'
>>>>>>> d761f55 (Initial commit with gallery images)
        ),
        el(
          'p',
          {},
<<<<<<< HEAD
          "Most guests find us through a returning friend or a long stay that turned into a habit. If you're new here, the fastest way to get a feel for the place is the gallery above, or just a call — we're glad to talk you through which room fits your trip."
=======
          "We offer five distinct room types to suit your needs. Check out our gallery to see which room fits your trip, or give us a call—we're always happy to help you choose."
>>>>>>> d761f55 (Initial commit with gallery images)
        ),
      ]),
      el('dl', { class: 'about__facts' }, [
        el('div', { class: 'about__fact' }, [el('dt', {}, 'Opened'), el('dd', {}, '2016')]),
<<<<<<< HEAD
        el('div', { class: 'about__fact' }, [el('dt', {}, 'Room types'), el('dd', {}, '4')]),
        el('div', { class: 'about__fact' }, [el('dt', {}, 'Check-in'), el('dd', {}, 'From 2:00 PM')]),
        el('div', { class: 'about__fact' }, [el('dt', {}, 'Check-out'), el('dd', {}, 'By 11:00 AM')]),
=======
        el('div', { class: 'about__fact' }, [el('dt', {}, 'Room types'), el('dd', {}, '5')]),
        el('div', { class: 'about__fact' }, [
          el('dt', {}, 'Our Rooms'), 
          el('dd', {}, 'Single, Double, Twin, Queen, & Family')
        ]),
        el('div', { class: 'about__fact' }, [el('dt', {}, 'Check-in/out'), el('dd', {}, 'Flexible')]),
>>>>>>> d761f55 (Initial commit with gallery images)
      ]),
    ]),
  ]);
  mountEl.append(section);
}
