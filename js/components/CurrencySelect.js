// components/CurrencySelect.js
import { el } from '../utils.js';
import { SUPPORTED_CURRENCIES, getPreferredCurrency, setPreferredCurrency } from '../services/currency.js';

/** onChange(code) fires when the guest picks a different currency; the
 * caller re-renders whatever prices are on screen. */
export function CurrencySelect(onChange) {
  const select = el(
    'select',
    {
      class: 'currency-select',
      'aria-label': 'Display currency',
      onChange: (e) => {
        setPreferredCurrency(e.target.value);
        onChange(e.target.value);
      }
    },
    SUPPORTED_CURRENCIES.map((c) => el('option', { value: c.code }, `${c.code} — ${c.label}`))
  );
  select.value = getPreferredCurrency();
  return select;
}