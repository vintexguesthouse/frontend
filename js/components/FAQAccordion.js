// components/FAQAccordion.js
import { el } from '../utils.js';

const FAQS = [
  {
    q: 'Do you need a deposit to hold a room?',
    a: "No deposit through the website. Your request is marked pending until we confirm by phone or WhatsApp — usually within the hour during reception hours.",
  },
  {
    q: 'Can I book more than one room at once?',
    a: 'Yes — use the quantity stepper on the room card to request multiple rooms of the same type. For a mix of different room types, send us a WhatsApp message and we\u2019ll put it together manually.',
  },
  {
    q: 'Is breakfast included?',
    a: 'Yes, breakfast is included with every room and served on the terrace from 6:30 to 10:00 AM.',
  },
  {
    q: 'Is parking available?',
    a: 'Yes, free on-site parking for all guests, including overnight security.',
  },
  {
    q: 'What is your cancellation policy?',
    a: 'Free cancellation up to 48 hours before check-in. Message us on WhatsApp with your reference number and we\u2019ll confirm the change.',
  },
];

export function renderFAQ(mountEl) {
  const items = FAQS.map((faq, i) => {
    const panelId = `faq-panel-${i}`;
    const buttonId = `faq-button-${i}`;

    const panel = el('div', {
      class: 'faq__panel',
      id: panelId,
      role: 'region',
      'aria-labelledby': buttonId,
      hidden: true,
    }, [el('p', {}, faq.a)]);

    const button = el(
      'button',
      {
        type: 'button',
        class: 'faq__question',
        id: buttonId,
        'aria-expanded': 'false',
        'aria-controls': panelId,
        onClick: (e) => {
          const expanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
          e.currentTarget.setAttribute('aria-expanded', String(!expanded));
          panel.hidden = expanded;
          e.currentTarget.closest('.faq__item').classList.toggle('is-open', !expanded);
        },
      },
      [el('span', {}, faq.q), el('span', { class: 'faq__icon', 'aria-hidden': 'true' }, '+')]
    );

    return el('div', { class: 'faq__item' }, [button, panel]);
  });

  const section = el('section', { class: 'section', id: 'faq' }, [
    el('div', { class: 'section__header' }, [
      el('span', { class: 'section__eyebrow' }, 'Before you write in'),
      el('h2', { class: 'section__title' }, 'Frequently asked questions'),
    ]),
    el('div', { class: 'faq' }, items),
  ]);

  mountEl.append(section);
}
