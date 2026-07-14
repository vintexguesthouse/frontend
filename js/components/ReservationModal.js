// components/ReservationModal.js
import { el, ksh, nightsBetween, todayISO, addDaysISO, trapFocus } from '../utils.js';
import { checkAvailability, submitReservation } from '../services/api.js';
import { buildReservationSummary } from '../services/reservationMessage.js';
import { ReceiptChannelPicker } from './ReceiptChannelPicker.js';

/**
 * Creates a reservation modal bound to `mountEl` (an empty container that
 * lives at the end of <body>). Returns { open(category) }.
 */
export function createReservationModal(mountEl) {
  let state = null; // set fresh each time open() is called
  let releaseFocusTrap = null;
  let lastFocusedEl = null;

  function initialState(category) {
    const checkIn = todayISO();
    return {
      phase: 'form', // 'form' | 'checking' | 'submitting' | 'error' | 'success'
      category,
      quantity: 1,
      checkIn,
      checkOut: addDaysISO(checkIn, 1),
      guestName: '',
      guestPhone: '',
      guestEmail: '',
      numGuests: 1,
      notes: '',
      availability: null, // { unitsLeft, totalUnits }
      fieldErrors: {},
      submitError: null,
      reservation: null, // set on success
    };
  }

  function setState(patch) {
    state = { ...state, ...patch };
    render();
  }

  async function refreshAvailability() {
    const { category, checkIn, checkOut } = state;
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setState({ availability: null });
      return;
    }
    setState({ phase: state.phase === 'form' ? 'form' : state.phase, availability: null, checkingAvailability: true });
    try {
      const result = await checkAvailability({ categoryId: category.id, checkIn, checkOut });
      // Guard against a stale response if the guest changed dates again mid-request.
      if (state.checkIn === checkIn && state.checkOut === checkOut) {
        setState({ availability: result, checkingAvailability: false });
      }
    } catch {
      setState({ availability: null, checkingAvailability: false });
    }
  }

  function validate() {
    const errors = {};
    if (state.checkOut <= state.checkIn) {
      errors.dates = 'Check-out must be after check-in.';
    }
    if (!state.guestName.trim()) {
      errors.guestName = 'Enter the name for this booking.';
    }
    if (!state.guestPhone.trim()) {
      errors.guestPhone = 'A phone number is required so we can reach you.';
    } else if (!/^[+\d][\d\s-]{6,}$/.test(state.guestPhone.trim())) {
      errors.guestPhone = 'Enter a valid phone number, e.g. 0712 345 678.';
    }
    if (state.guestEmail.trim() && !/^\S+@\S+\.\S+$/.test(state.guestEmail.trim())) {
      errors.guestEmail = 'Enter a valid email address, or leave it blank.';
    }
    if (state.numGuests < 1) {
      errors.numGuests = 'At least 1 guest is required.';
    } else if (state.numGuests > state.category.maxGuests * state.quantity) {
      errors.numGuests = `Up to ${state.category.maxGuests * state.quantity} guests for ${state.quantity} room(s) of this type.`;
    }
    if (state.availability && state.quantity > state.availability.unitsLeft) {
      errors.quantity = `Only ${state.availability.unitsLeft} left for these dates.`;
    }
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setState({ fieldErrors: errors });
      return;
    }

    setState({ phase: 'submitting', fieldErrors: {}, submitError: null });

    const payload = {
      categoryId: state.category.id,
      categoryName: state.category.name,
      pricePerNight: state.category.pricePerNight,
      quantity: state.quantity,
      checkIn: state.checkIn,
      checkOut: state.checkOut,
      guestName: state.guestName.trim(),
      guestPhone: state.guestPhone.trim(),
      guestEmail: state.guestEmail.trim() || undefined,
      numGuests: state.numGuests,
      notes: state.notes.trim() || undefined,
    };

    try {
      // Write to Airtable (via Worker) must succeed before any receipt is
      // shown — see architecture doc §4/§5. There is no pre-submit lock,
      // so a failure here is the normal path for a genuine collision, not
      // a special case: we surface it as a plain retry/pick-again state.
      const reservation = await submitReservation(payload);
      setState({ phase: 'success', reservation });
    } catch (err) {
      if (err.code === 'SLOT_UNAVAILABLE') {
        setState({
          phase: 'error',
          submitError: 'That category just filled up for those dates. Please pick another room or adjust your dates.',
        });
      } else {
        setState({
          phase: 'error',
          submitError: "We couldn't reach the booking system. Please check your connection and try again.",
        });
      }
    }
  }

  function close() {
    mountEl.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (releaseFocusTrap) releaseFocusTrap();
    if (lastFocusedEl) lastFocusedEl.focus();
    document.removeEventListener('keydown', onKeydown);
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  function render() {
    mountEl.innerHTML = '';

    const dialog = el(
      'div',
      {
        class: 'modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'modal-title',
      },
      [renderBody()]
    );

    const overlay = el(
      'div',
      {
        class: 'modal-overlay',
        onClick: (e) => {
          if (e.target === e.currentTarget) close();
        },
      },
      [dialog]
    );

    mountEl.append(overlay);

    if (releaseFocusTrap) releaseFocusTrap();
    releaseFocusTrap = trapFocus(dialog);
    const firstField = dialog.querySelector('input, button');
    if (firstField) firstField.focus();
  }

  function renderBody() {
    if (state.phase === 'success') return renderSuccess();
    return renderForm();
  }

  function renderForm() {
    const { category } = state;
    const nights = nightsBetween(state.checkIn, state.checkOut);
    const subtotal = nights * state.quantity * category.pricePerNight;
    const isBusy = state.phase === 'submitting';

    const quantityStepper = el('div', { class: 'stepper' }, [
      el(
        'button',
        {
          type: 'button',
          class: 'stepper__btn',
          'aria-label': 'Decrease quantity',
          disabled: state.quantity <= 1 || isBusy,
          onClick: () => {
            setState({ quantity: state.quantity - 1 });
            refreshAvailability();
          },
        },
        '−'
      ),
      el('span', { class: 'stepper__value', 'aria-live': 'polite' }, `${state.quantity}`),
      el(
        'button',
        {
          type: 'button',
          class: 'stepper__btn',
          'aria-label': 'Increase quantity',
          disabled:
            state.quantity >= category.totalUnits ||
            (state.availability && state.quantity >= state.availability.unitsLeft) ||
            isBusy,
          onClick: () => {
            setState({ quantity: state.quantity + 1 });
            refreshAvailability();
          },
        },
        '+'
      ),
    ]);

    const availabilityNote = (() => {
      if (state.checkingAvailability) {
        return el('p', { class: 'form-hint' }, 'Checking availability…');
      }
      if (state.availability) {
        const { unitsLeft } = state.availability;
        if (unitsLeft <= 0) {
          return el('p', { class: 'form-hint form-hint--error' }, 'Fully booked for these dates.');
        }
        if (unitsLeft <= 2) {
          return el('p', { class: 'form-hint form-hint--warn' }, `Only ${unitsLeft} left for these dates.`);
        }
        return el('p', { class: 'form-hint' }, `${unitsLeft} available for these dates.`);
      }
      return null;
    })();

    const form = el(
      'form',
      { class: 'reservation-form', onSubmit: handleSubmit },
      [
        el('div', { class: 'modal__header' }, [
          el('h2', { id: 'modal-title', class: 'modal__title' }, category.name),
          el('button', { type: 'button', class: 'modal__close', 'aria-label': 'Close', onClick: close }, '×'),
        ]),

        el('div', { class: 'modal__scroll' }, [
          el('section', { class: 'form-section' }, [
            el('div', { class: 'form-row form-row--split' }, [
              el('label', { class: 'form-field' }, [
                el('span', { class: 'form-field__label' }, 'How many rooms?'),
                quantityStepper,
              ]),
              el('label', { class: 'form-field' }, [
                el('span', { class: 'form-field__label' }, 'Guests'),
                el('input', {
                  type: 'number',
                  min: '1',
                  max: String(category.maxGuests * state.quantity),
                  value: String(state.numGuests),
                  disabled: isBusy,
                  oninput: (e) => setState({ numGuests: Number(e.target.value) }),
                }),
              ]),
            ]),
            state.fieldErrors.numGuests ? el('p', { class: 'form-error' }, state.fieldErrors.numGuests) : null,
            state.fieldErrors.quantity ? el('p', { class: 'form-error' }, state.fieldErrors.quantity) : null,
          ]),

          el('section', { class: 'form-section' }, [
            el('div', { class: 'form-row form-row--split' }, [
              el('label', { class: 'form-field' }, [
                el('span', { class: 'form-field__label' }, 'Check-in'),
                el('input', {
                  type: 'date',
                  min: todayISO(),
                  value: state.checkIn,
                  disabled: isBusy,
                  onchange: (e) => {
                    const checkIn = e.target.value;
                    const checkOut = state.checkOut <= checkIn ? addDaysISO(checkIn, 1) : state.checkOut;
                    setState({ checkIn, checkOut });
                    refreshAvailability();
                  },
                }),
              ]),
              el('label', { class: 'form-field' }, [
                el('span', { class: 'form-field__label' }, 'Check-out'),
                el('input', {
                  type: 'date',
                  min: addDaysISO(state.checkIn, 1),
                  value: state.checkOut,
                  disabled: isBusy,
                  onchange: (e) => {
                    setState({ checkOut: e.target.value });
                    refreshAvailability();
                  },
                }),
              ]),
            ]),
            state.fieldErrors.dates ? el('p', { class: 'form-error' }, state.fieldErrors.dates) : null,
            availabilityNote,
          ]),

          el('section', { class: 'form-section' }, [
            el('label', { class: 'form-field' }, [
              el('span', { class: 'form-field__label' }, 'Full name'),
              el('input', {
                type: 'text',
                autocomplete: 'name',
                value: state.guestName,
                disabled: isBusy,
                oninput: (e) => setState({ guestName: e.target.value }),
              }),
            ]),
            state.fieldErrors.guestName ? el('p', { class: 'form-error' }, state.fieldErrors.guestName) : null,

            el('div', { class: 'form-row form-row--split' }, [
              el('label', { class: 'form-field' }, [
                el('span', { class: 'form-field__label' }, 'Phone number'),
                el('input', {
                  type: 'tel',
                  autocomplete: 'tel',
                  placeholder: '0712 345 678',
                  value: state.guestPhone,
                  disabled: isBusy,
                  oninput: (e) => setState({ guestPhone: e.target.value }),
                }),
                el('span', { class: 'form-field__hint' }, "We'll use this to confirm your booking."),
              ]),
              el('label', { class: 'form-field' }, [
                el('span', { class: 'form-field__label' }, 'Email (optional)'),
                el('input', {
                  type: 'email',
                  autocomplete: 'email',
                  placeholder: 'you@example.com',
                  value: state.guestEmail,
                  disabled: isBusy,
                  oninput: (e) => setState({ guestEmail: e.target.value }),
                }),
                el('span', { class: 'form-field__hint' }, 'Only needed if you want an emailed receipt.'),
              ]),
            ]),
            state.fieldErrors.guestPhone ? el('p', { class: 'form-error' }, state.fieldErrors.guestPhone) : null,
            state.fieldErrors.guestEmail ? el('p', { class: 'form-error' }, state.fieldErrors.guestEmail) : null,

            el('label', { class: 'form-field' }, [
              el('span', { class: 'form-field__label' }, 'Notes (optional)'),
              el('textarea', {
                rows: '2',
                placeholder: 'Late arrival, dietary needs, anything else we should know.',
                value: state.notes,
                disabled: isBusy,
                oninput: (e) => setState({ notes: e.target.value }),
              }),
            ]),
          ]),

          el('section', { class: 'form-section form-summary' }, [
            el('div', { class: 'form-summary__row' }, [
              el('span', {}, `${nights} night${nights === 1 ? '' : 's'} × ${state.quantity} room${state.quantity === 1 ? '' : 's'}`),
              el('span', {}, ksh(subtotal)),
            ]),
            el('p', { class: 'form-summary__note' }, 'Estimated total — confirmed at check-in.'),
          ]),

          state.submitError
            ? el('div', { class: 'form-alert', role: 'alert' }, [
                el('p', {}, state.submitError),
              ])
            : null,
        ]),

        el('div', { class: 'modal__footer' }, [
          el(
            'button',
            {
              type: 'submit',
              class: 'button button--primary button--full',
              disabled: isBusy || (state.availability && state.availability.unitsLeft <= 0),
            },
            isBusy ? 'Sending…' : state.phase === 'error' ? 'Try again' : 'Request this booking'
          ),
        ]),
      ]
    );

    return form;
  }

  function renderSuccess() {
    const summary = buildReservationSummary(state.reservation);

    const container = el('div', { class: 'modal__scroll modal__scroll--success' }, [
      el('div', { class: 'modal__header' }, [
        el('h2', { id: 'modal-title', class: 'modal__title' }, 'Request sent'),
        el('button', { type: 'button', class: 'modal__close', 'aria-label': 'Close', onClick: close }, '×'),
      ]),
      el('p', { class: 'modal__success-lede' }, [
        `Reference `,
        el('strong', {}, state.reservation.id),
        `. We'll confirm on ${state.reservation.guestPhone} shortly. Choose how you'd like a copy of this request:`,
      ]),
    ]);

    const pickerMount = el('div', {});
    container.append(pickerMount);
    ReceiptChannelPicker(pickerMount, state.reservation, summary);

    return container;
  }

  return {
    open(category) {
      state = initialState(category);
      lastFocusedEl = document.activeElement;
      document.body.classList.add('modal-open');
      document.addEventListener('keydown', onKeydown);
      render();
      refreshAvailability();
    },
  };
}
