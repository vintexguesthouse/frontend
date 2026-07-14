// main-contact.js
import { renderNav } from './components/Nav.js';
import { renderContactChannels, renderTimesAndMap } from './components/ContactChannels.js';
import { renderFAQ } from './components/FAQAccordion.js';

const navMount = document.getElementById('nav-root');
const channelsMount = document.getElementById('contact-channels-root');
const timesMount = document.getElementById('contact-times-root');
const faqMount = document.getElementById('faq-root');

renderNav(navMount, 'contact');
renderContactChannels(channelsMount);
renderTimesAndMap(timesMount);
renderFAQ(faqMount);
