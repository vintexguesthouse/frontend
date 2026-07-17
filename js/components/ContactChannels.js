// components/ContactChannels.js
import { el } from "../utils.js";
import { GUESTHOUSE } from "../services/reservationMessage.js";

const ADDRESS = "Osupuko road, Kimana, Kajiado";
const MAP_EMBED_SRC = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4986.47791823022!2d37.53628347589852!3d-2.806977539181048!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x183a11b6454660bf%3A0xa2ceed17ed57d97a!2sVintex%20Guest%20House%2C%20Kimana!5e1!3m2!1sen!2ske!4v1784297924793!5m2!1sen!2ske";
export function renderContactChannels(mountEl) {
  const whatsappHref = `https://wa.me/${GUESTHOUSE.whatsappNumber}?text=${encodeURIComponent(
    "Hi Vintex, I'd like to ask about a booking."
  )}`;
  const mailtoHref = `mailto:${GUESTHOUSE.email}?subject=${encodeURIComponent("Question about a stay")}`;

  const section = el("section", { class: "section" }, [
    el("div", { class: "section__header" }, [
      el("span", { class: "section__eyebrow" }, "Get in touch"),
      el("h2", { class: "section__title" }, "Reach us directly")
    ]),
    el("div", { class: "contact-grid" }, [
      el("div", { class: "contact-card" }, [
        el("h3", {}, "WhatsApp"),
        el("p", {}, `Fastest way to reach us — usually within the hour. ${GUESTHOUSE.phoneDisplay}`),
        el(
          "a",
          { class: "button button--primary", href: whatsappHref, target: "_blank", rel: "noopener" },
          "Message us"
        )
      ]),
      el("div", { class: "contact-card" }, [
        el("h3", {}, "Email"),
        el("p", {}, `For longer questions or group bookings. ${GUESTHOUSE.email}`),
        el("a", { class: "button button--ghost", href: mailtoHref }, "Send an email")
      ]),
      el("div", { class: "contact-card" }, [
        el("h3", {}, "Call"),
        el("p", {}, `Reception is staffed 7:00 AM – 9:00 PM daily.`),
        el("a", { class: "button button--ghost", href: `tel:${GUESTHOUSE.whatsappNumber}` }, GUESTHOUSE.phoneDisplay)
      ])
    ])
  ]);

  mountEl.append(section);
}

export function renderTimesAndMap(mountEl) {
  const section = el("section", { class: "section section--alt" }, [
    el("div", { class: "contact-times" }, [
      el("div", { class: "contact-times__panel" }, [
        el("span", { class: "section__eyebrow" }, "Good to know"),
        el("h2", { class: "section__title" }, "Check-in, check-out & address"),
        el("dl", { class: "about__facts" }, [
          el("div", { class: "about__fact" }, [el("dt", {}, "Check-in"), el("dd", {}, "From 2:00 PM")]),
          el("div", { class: "about__fact" }, [el("dt", {}, "Check-out"), el("dd", {}, "By 11:00 AM")]),
          el("div", { class: "about__fact" }, [el("dt", {}, "Reception hours"), el("dd", {}, "7:00 AM – 9:00 PM")])
        ]),
        el("p", { class: "contact-times__address" }, ADDRESS)
      ]),
      el("div", { class: "contact-times__map" }, [
        el("iframe", {
          src: MAP_EMBED_SRC,
          title: "Map showing Vintex Guest House in Kimana, Kajiado",
          loading: "lazy",
          referrerpolicy: "no-referrer-when-downgrade"
        })
      ])
    ])
  ]);

  mountEl.append(section);
}
