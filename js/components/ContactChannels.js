// components/ContactChannels.js
import { el } from '../utils.js';
import { GUESTHOUSE } from '../services/reservationMessage.js';

const ADDRESS = 'Biwot road, Kimana, Kajiado';
const EMAIL = 'vintexguesthouse@gmail.com';
const MAP_EMBED_SRC =
<<<<<<< HEAD
  'https://maps.google.com/maps?q=Karen%2C%20Nairobi&t=&z=14&ie=UTF8&iwloc=&output=embed';

export function renderContactChannels(mountEl) {
  const whatsappHref = `https://wa.me/${GUESTHOUSE.whatsappNumber}?text=${encodeURIComponent(
    "Hi Oakview, I'd like to ask about a booking."
=======
  'https://maps.google.com/?cid=11731574766368708986&g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAMYASAF&hl=en&gl=KE&source=embed';

export function renderContactChannels(mountEl) {
  const whatsappHref = `https://wa.me/${GUESTHOUSE.whatsappNumber}?text=${encodeURIComponent(
    "Hi Vintex, I'd like to ask about a booking."
>>>>>>> d761f55 (Initial commit with gallery images)
  )}`;
  const mailtoHref = `mailto:${EMAIL}?subject=${encodeURIComponent('Question about a stay')}`;

  const section = el('section', { class: 'section' }, [
    el('div', { class: 'section__header' }, [
      el('span', { class: 'section__eyebrow' }, 'Get in touch'),
      el('h2', { class: 'section__title' }, 'Reach us directly'),
    ]),
    el('div', { class: 'contact-grid' }, [
      el('div', { class: 'contact-card' }, [
        el('h3', {}, 'WhatsApp'),
        el('p', {}, `Fastest way to reach us — usually within the hour. ${GUESTHOUSE.phoneDisplay}`),
        el('a', { class: 'button button--primary', href: whatsappHref, target: '_blank', rel: 'noopener' }, 'Message us'),
      ]),
      el('div', { class: 'contact-card' }, [
        el('h3', {}, 'Email'),
        el('p', {}, `For longer questions or group bookings. ${EMAIL}`),
        el('a', { class: 'button button--ghost', href: mailtoHref }, 'Send an email'),
      ]),
      el('div', { class: 'contact-card' }, [
        el('h3', {}, 'Call'),
        el('p', {}, `Reception is staffed 7:00 AM – 9:00 PM daily.`),
        el('a', { class: 'button button--ghost', href: `tel:${GUESTHOUSE.whatsappNumber}` }, GUESTHOUSE.phoneDisplay),
      ]),
    ]),
  ]);

  mountEl.append(section);
}

export function renderTimesAndMap(mountEl) {
  const section = el('section', { class: 'section section--alt' }, [
    el('div', { class: 'contact-times' }, [
      el('div', { class: 'contact-times__panel' }, [
        el('span', { class: 'section__eyebrow' }, 'Good to know'),
        el('h2', { class: 'section__title' }, 'Check-in, check-out & address'),
        el('dl', { class: 'about__facts' }, [
          el('div', { class: 'about__fact' }, [el('dt', {}, 'Check-in'), el('dd', {}, 'From 2:00 PM')]),
          el('div', { class: 'about__fact' }, [el('dt', {}, 'Check-out'), el('dd', {}, 'By 11:00 AM')]),
          el('div', { class: 'about__fact' }, [el('dt', {}, 'Reception hours'), el('dd', {}, '7:00 AM – 9:00 PM')]),
        ]),
        el('p', { class: 'contact-times__address' }, ADDRESS),
      ]),
      el('div', { class: 'contact-times__map' }, [
        el('iframe', {
          src: MAP_EMBED_SRC,
<<<<<<< HEAD
          title: 'Map showing Oakview Guest House in Karen, Nairobi',
=======
          title: 'Map showing Vintex Guest House in Kimana, Kajiado',
>>>>>>> d761f55 (Initial commit with gallery images)
          loading: 'lazy',
          referrerpolicy: 'no-referrer-when-downgrade',
        }),
      ]),
    ]),
  ]);

  mountEl.append(section);
}
