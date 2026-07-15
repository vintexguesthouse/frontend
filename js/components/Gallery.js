// components/Gallery.js
import { el } from "../utils.js";

const GALLERY_IMAGES = [
  // Exterior
  { src: "/assets/exterior.jpeg", alt: "The guest house exterior courtyard" },

  // Rooms
  { src: "/frontend/assets/family-room-2.jpg", alt: "Family room interior with bunk beds and double bed" },
  { src: "/frontend/assets/DOUBLE-ROOM-2.jpg", alt: "Interior of the Double room" },
  { src: "/frontend/assets/SINGLE-ROOM-1.jpg", alt: "Interior of the Single room" },
  { src: "/frontend/assets/TWIN-ROOM-3.jpg", alt: "Interior of the Twin room with mosquito nets" },
  { src: "/frontend/assets/QUEEN-WADROP-1.jpg", alt: "Interior of the Queen room featuring the wardrobe" },
  { src: "/frontend/assets/SINGLE-WADROP.jpg", alt: "Interior of the Single room featuring the wardrobe" },

  // Dining / Restaurant
  { src: "/frontend/assets/RESTURANT-6.jpg", alt: "Restaurant seating area with checkered tables" },
  { src: "/frontend/assets/RESTURANT-3.jpg", alt: "Dish drying rack in the kitchen area" }
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
  ]);
  mountEl.append(hero);
}

export function renderGallery(mountEl) {
  const grid = el(
    "div",
    { class: "gallery__grid" },
    GALLERY_IMAGES.map((img, i) =>
      el("figure", { class: `gallery__item gallery__item--${(i % 3) + 1}` }, [
        el("img", { src: img.src, alt: img.alt, loading: "lazy", width: "640", height: "480" })
      ])
    )
  );
  const section = el("section", { class: "section", id: "gallery" }, [
    el("div", { class: "section__header" }, [
      el("span", { class: "section__eyebrow" }, "Around the house"),
      el("h2", { class: "section__title" }, "A look at Vintex")
    ]),
    grid
  ]);
  mountEl.append(section);
}

export function renderAbout(mountEl) {
  const section = el("section", { class: "section section--alt", id: "about" }, [
    el("div", { class: "about" }, [
      el("div", { class: "about__text" }, [
        el("span", { class: "section__eyebrow" }, "About Us"),
        el("h2", { class: "section__title" }, "Comfortable stays, one room at a time"),
        el(
          "p",
          {},
          "Vintex Guest House has grown into a trusted home away from home. We pride ourselves on personal service, clean rooms, and ensuring every guest feels welcomed."
        ),
        el(
          "p",
          {},
          "We offer five distinct room types to suit your needs. Check out our gallery or give us a call—we're always happy to help."
        )
      ]),
      el("dl", { class: "about__facts" }, [
        el("div", { class: "about__fact" }, [el("dt", {}, "Opened"), el("dd", {}, "2016")]),
        el("div", { class: "about__fact" }, [el("dt", {}, "Room types"), el("dd", {}, "5")]),
        el("div", { class: "about__fact" }, [
          el("dt", {}, "Our Rooms"),
          el("dd", {}, "Single, Double, Twin, Queen, & Family")
        ]),
        el("div", { class: "about__fact" }, [el("dt", {}, "Check-in/out"), el("dd", {}, "Flexible")])
      ])
    ])
  ]);
  mountEl.append(section);
}
