// components/Gallery.js
import { el } from "../utils.js";
import { createLightbox } from "./Lightbox.js";

const GALLERY_IMAGES = [
  // Exterior
  { src: "/frontend/assets/exterior.webp", alt: "The guest house exterior courtyard" },
  { src: "/frontend/assets/EXTERIOR-5.webp", alt: "The guest house name banner" },

  // Rooms
  { src: "/frontend/assets/family-room-2.webp", alt: "Family room interior with bunk beds and double bed" },
  { src: "/frontend/assets/DOUBLE-ROOM-2.webp", alt: "Interior of the Double room" },
  { src: "/frontend/assets/SINGLE-ROOM-1.webp", alt: "Interior of the Single room" },
  { src: "/frontend/assets/TWIN-ROOM-3.webp", alt: "Interior of the Twin room with mosquito nets" },
  { src: "/frontend/assets/QUEEN-WADROP-1.webp", alt: "Interior of the Queen room featuring the wardrobe" },
  { src: "/frontend/assets/SINGLE-WADROP.webp", alt: "Interior of the Single room featuring the wardrobe" },

  // Dining / Restaurant
  { src: "/frontend/assets/RESTURANT-6.webp", alt: "Restaurant seating area with checkered tables" },
  { src: "/frontend/assets/RESTURANT-3.webp", alt: "Dish drying rack in the kitchen area" }
];

const DEFAULT_HERO_CONTENT = {
  eyebrow: "Kajiado · Kimana",
  // Can be a plain string, or an array of strings/nodes (e.g. to insert <br> line breaks).
  title: ["A welcoming guest house,", null, "located in the heart of Kimana."],
  lede:
    "Five room types, home-cooked meals, and a peaceful courtyard. Vintex Guest House has provided comfortable, affordable stays for travellers and families since 2016.",
  actions: [
    { href: "rooms.html", label: "See rooms & rates", variant: "primary" },
    { href: "contact.html", label: "Ask a question", variant: "ghost" }
  ]
};

/**
 * @param {HTMLElement} mountEl
 * @param {string} heroImageUrl
 * @param {object} [content] - per-page copy overrides
 * @param {string} [content.eyebrow]
 * @param {string|Array} [content.title] - string, or array of strings with `null` standing in for a <br>
 * @param {string} [content.lede]
 * @param {{href: string, label: string, variant?: 'primary'|'ghost'}[]} [content.actions]
 */
export function renderHero(mountEl, heroImageUrl, content = {}) {
  const { eyebrow, title, lede, actions } = { ...DEFAULT_HERO_CONTENT, ...content };

  const titleParts = Array.isArray(title) ? title : [title];
  const titleChildren = titleParts.map((part) => (part === null ? el("br") : part));

  const hero = el(
    "section",
    {
      class: "hero",
      style: `background-image: linear-gradient(rgba(250, 248, 243, 0.8), rgba(250, 248, 243, 0.8)), url('${heroImageUrl}'); background-size: cover; background-position: center;`
    },
    [
      el("div", { class: "hero__inner" }, [
        el("p", { class: "hero__eyebrow" }, eyebrow),
        el("h1", { class: "hero__title" }, titleChildren),
        el("p", { class: "hero__lede" }, lede),
        el(
          "div",
          { class: "hero__actions" },
          actions.map((action) =>
            el(
              "a",
              { href: action.href, class: `button button--${action.variant || "primary"}` },
              action.label
            )
          )
        )
      ])
    ]
  );
  mountEl.append(hero);
}

export function renderGallery(mountEl) {
  // The lightbox overlay is fixed/full-screen, so it lives at the end of
  // <body> rather than inside the gallery section itself.
  const lightboxMount = el("div", { class: "lightbox-root" });
  document.body.append(lightboxMount);
  const lightbox = createLightbox(lightboxMount, GALLERY_IMAGES);

  const grid = el(
    "div",
    { class: "gallery__grid" },
    GALLERY_IMAGES.map((img, i) =>
      el(
        "figure",
        {
          class: "gallery__item",
          role: "button",
          tabIndex: "0",
          "aria-label": `View larger image: ${img.alt}`,
          onClick: () => lightbox.open(i),
          onKeydown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              lightbox.open(i);
            }
          }
        },
        [el("img", { src: img.src, alt: img.alt, loading: "lazy", width: "640", height: "480" })]
      )
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
