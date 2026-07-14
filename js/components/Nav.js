// components/Nav.js
import { el } from '../utils.js';

/**
 * Renders the shared header nav into `mountEl`.
 * @param {HTMLElement} mountEl
 * @param {'home'|'rooms'|'contact'} active
 */
export function renderNav(mountEl, active) {
  const links = [
<<<<<<< HEAD
    { href: 'index.html', label: 'Oakview', key: 'home', brand: true },
=======
    { href: 'index.html', label: 'Vintex', key: 'home', brand: true },
>>>>>>> d761f55 (Initial commit with gallery images)
    { href: 'index.html', label: 'Gallery & About', key: 'home' },
    { href: 'rooms.html', label: 'Rooms', key: 'rooms' },
    { href: 'contact.html', label: 'Contact', key: 'contact' },
  ];

  const brand = links[0];
  const navLinks = links.slice(1);

  const toggle = el(
    'button',
    {
      class: 'nav__toggle',
      type: 'button',
      'aria-expanded': 'false',
      'aria-controls': 'primary-nav',
      'aria-label': 'Open menu',
      onClick: (e) => {
        const list = mountEl.querySelector('#primary-nav');
        const isOpen = list.classList.toggle('is-open');
        e.currentTarget.setAttribute('aria-expanded', String(isOpen));
      },
    },
    [el('span', { class: 'nav__toggle-bar' }), el('span', { class: 'nav__toggle-bar' }), el('span', { class: 'nav__toggle-bar' })]
  );

  const list = el(
    'ul',
    { class: 'nav__list', id: 'primary-nav' },
    navLinks.map((link) =>
      el('li', {}, [
        el(
          'a',
          {
            href: link.href,
            class: link.key === active ? 'nav__link is-active' : 'nav__link',
            'aria-current': link.key === active ? 'page' : null,
          },
          link.label
        ),
      ])
    )
  );

  const header = el('header', { class: 'nav' }, [
    el('div', { class: 'nav__inner' }, [
      el('a', { href: brand.href, class: 'nav__brand' }, brand.label),
      toggle,
      list,
    ]),
  ]);

  mountEl.append(header);
}
