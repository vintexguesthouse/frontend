// components/ReservationModal.js
import { el, ksh, nightsBetween, todayISO, addDaysISO, trapFocus } from "../utils.js";
import { checkAvailability, submitReservation, getCategories } from "../services/api.js";
import { buildReservationSummary } from "../services/reservationMessage.js";
import { ReceiptChannelPicker } from "./ReceiptChannelPicker.js";

/**
 * Creates a reservation modal bound to `mountEl` (an empty container that
 * lives at the end of <body>). Returns { open(category) }.
 *
 * Two-phase flow:
 *   Phase 1 (selection) — guest builds a cart of {category, quantity} line
 *   items against one shared date range, each with its own live
 *   availability check.
 *   Phase 2 (details) — one shared guest-details form, submitted once for
 *   the whole cart.
 */
export function createReservationModal(mountEl) {
  let state = null; // set fresh each time open() is called
  let releaseFocusTrap = null;
  let lastFocusedEl = null;
  let nextLineItemId = 1;

  // Refs to the uncontrolled detail-phase fields, captured on each render()
  // so submit/back-to-selection can read their live DOM value without the
  // fields needing to write to `state` on every keystroke (see fix #1).
  let detailsFieldRefs = {};

  // Tracks the phase we last autofocused for, so render() only steals focus
  // on an actual phase transition, not on every incidental re-render.
  let lastFocusedPhase = null;

  function initialState(category) {
    const checkIn = todayISO();
    return {
      phase: "selection", // 'selection' | 'details' | 'submitting' | 'error' | 'success'
      checkIn,
      checkOut: addDaysISO(checkIn, 1),
      paymentPreference: "post_arrival", // 'post_arrival' | 'advance'

      lineItems: [
        {
          id: nextLineItemId++,
          category,
          quantity: 1,
          availability: null, // { unitsLeft, totalUnits }
          checkingAvailability: false
        }
      ],

      allCategories: null, // loaded lazily for the "add another room type" picker
      categoriesLoading: false,

      guestName: "",
      guestPhone: "",
      guestEmail: "",
      numGuests: 1,
      notes: "",

      fieldErrors: {},
      submitError: null,
      submitErrorCategoryId: null,
      reservation: null // set on success
    };
  }

  function setState(patch) {
    state = { ...state, ...patch };
    render();
  }

  function updateLineItem(itemId, patch) {
    setState({
      lineItems: state.lineItems.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
    });
  }

  async function loadCategoriesForPicker() {
    setState({ categoriesLoading: true });
    try {
      const categories = await getCategories();
      setState({ allCategories: categories, categoriesLoading: false });
    } catch {
      setState({ allCategories: [], categoriesLoading: false });
    }
  }

  async function refreshAvailabilityForItem(itemId) {
    const item = state.lineItems.find((li) => li.id === itemId);
    if (!item) return;
    const { checkIn, checkOut } = state;
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      updateLineItem(itemId, { availability: null, checkingAvailability: false });
      return;
    }

    updateLineItem(itemId, { checkingAvailability: true });
    try {
      const result = await checkAvailability({ categoryId: item.category.id, checkIn, checkOut });
      // Guard against a stale response if the guest changed dates again mid-request.
      if (state.checkIn === checkIn && state.checkOut === checkOut) {
        updateLineItem(itemId, { availability: result, checkingAvailability: false });
      }
    } catch {
      updateLineItem(itemId, { availability: null, checkingAvailability: false });
    }
  }

  function refreshAllAvailability() {
    for (const item of state.lineItems) {
      refreshAvailabilityForItem(item.id);
    }
  }

  function addLineItem(categoryId) {
    const category = (state.allCategories || []).find((c) => c.id === categoryId);
    if (!category) return;

    const existing = state.lineItems.find((li) => li.category.id === categoryId);
    if (existing) {
      const maxQty = existing.availability ? existing.availability.unitsLeft : existing.category.totalUnits;
      if (existing.quantity < maxQty) {
        updateLineItem(existing.id, { quantity: existing.quantity + 1 });
      } else {
        render(); // no state change, but the select still needs to reset to its placeholder
      }
      return;
    }

    const newItem = { id: nextLineItemId++, category, quantity: 1, availability: null, checkingAvailability: false };
    setState({ lineItems: [...state.lineItems, newItem] });
    refreshAvailabilityForItem(newItem.id);
  }

  function removeLineItem(itemId) {
    setState({ lineItems: state.lineItems.filter((li) => li.id !== itemId) });
  }

  function setLineItemQuantity(itemId, quantity) {
    updateLineItem(itemId, { quantity });
  }

  function computeTotals(lineItems, checkIn, checkOut) {
    const nights = nightsBetween(checkIn, checkOut);
    const roomCount = lineItems.reduce((sum, li) => sum + li.quantity, 0);
    const subtotal = lineItems.reduce((sum, li) => sum + nights * li.quantity * li.category.pricePerNight, 0);
    return { nights, roomCount, subtotal };
  }

  function validateSelection() {
    const errors = {};
    if (state.checkOut <= state.checkIn) {
      errors.dates = "Check-out must be after check-in.";
    }
    if (state.lineItems.length === 0) {
      errors.lineItems = "Add at least one room to continue.";
    }
    for (const item of state.lineItems) {
      if (item.availability && item.quantity > item.availability.unitsLeft) {
        errors.lineItems = `Only ${item.availability.unitsLeft} of ${item.category.name} left for these dates.`;
      }
      if (item.availability && item.availability.unitsLeft <= 0) {
        errors.lineItems = `${item.category.name} is fully booked for these dates.`;
      }
    }
    return errors;
  }

  function validateDetails(details = state) {
    const errors = {};
    const maxGuests = state.lineItems.reduce((sum, li) => sum + li.category.maxGuests * li.quantity, 0);

    if (!details.guestName.trim()) {
      errors.guestName = "Enter the name for this booking.";
    }
    if (!details.guestPhone.trim()) {
      errors.guestPhone = "A phone number is required so we can reach you.";
    } else if (!/^[+\d][\d\s-]{6,}$/.test(details.guestPhone.trim())) {
      errors.guestPhone = "Enter a valid phone number, e.g. 0712 345 678.";
    }
    if (details.guestEmail.trim() && !/^\S+@\S+\.\S+$/.test(details.guestEmail.trim())) {
      errors.guestEmail = "Enter a valid email address, or leave it blank.";
    }
    if (details.numGuests < 1) {
      errors.numGuests = "At least 1 guest is required.";
    } else if (details.numGuests > maxGuests) {
      errors.numGuests = `Up to ${maxGuests} guests for the rooms selected.`;
    }
    return errors;
  }

  /**
   * Reads the live values out of the uncontrolled detail-phase inputs.
   * Called on submit and when navigating back to selection — the two
   * "phase transition" points where the guest's typing needs to be
   * folded into `state` (fix #1), rather than on every keystroke.
   */
  function readDetailsFromDom() {
    return {
      guestName: detailsFieldRefs.guestName?.value ?? "",
      guestPhone: detailsFieldRefs.guestPhone?.value ?? "",
      guestEmail: detailsFieldRefs.guestEmail?.value ?? "",
      notes: detailsFieldRefs.notes?.value ?? "",
      numGuests: Number(detailsFieldRefs.numGuests?.value) || 0
    };
  }

  function handleContinue(e) {
    e.preventDefault();
    const errors = validateSelection();
    if (Object.keys(errors).length > 0) {
      setState({ fieldErrors: errors });
      return;
    }
    setState({ phase: "details", fieldErrors: {} });
  }

  function handleBackToSelection() {
    const currentDetails = readDetailsFromDom();
    setState({
      ...currentDetails,
      phase: "selection",
      fieldErrors: {},
      submitError: null,
      submitErrorCategoryId: null
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const currentDetails = readDetailsFromDom();
    const errors = validateDetails(currentDetails);
    if (Object.keys(errors).length > 0) {
      setState({ ...currentDetails, fieldErrors: errors });
      return;
    }

    setState({
      ...currentDetails,
      phase: "submitting",
      fieldErrors: {},
      submitError: null,
      submitErrorCategoryId: null
    });

    const payload = {
      lineItems: state.lineItems.map((li) => ({
        categoryId: li.category.id,
        categoryName: li.category.name,
        pricePerNight: li.category.pricePerNight,
        quantity: li.quantity
      })),
      checkIn: state.checkIn,
      checkOut: state.checkOut,
      guestName: currentDetails.guestName.trim(),
      guestPhone: currentDetails.guestPhone.trim(),
      guestEmail: currentDetails.guestEmail.trim() || undefined,
      numGuests: currentDetails.numGuests,
      notes: currentDetails.notes.trim() || undefined,
      paymentPreference: state.paymentPreference
    };

    try {
      // Write to Airtable (via Worker) must succeed before any receipt is
      // shown — see architecture doc §4/§5. There is no pre-submit lock,
      // so a failure here is the normal path for a genuine collision, not
      // a special case: we surface it as a plain retry/pick-again state.
      const reservation = await submitReservation(payload);
      setState({ phase: "success", reservation });
    } catch (err) {
      if (err.code === "SLOT_UNAVAILABLE") {
        setState({
          phase: "error",
          submitError: `${err.message} Please review your rooms or adjust your dates.`,
          submitErrorCategoryId: err.categoryId || null
        });
      } else {
        setState({
          phase: "error",
          submitError: "Something went wrong submitting your reservation. Please try again, or contact us directly if it keeps happening.",
          submitErrorCategoryId: null
        });
      }
    }
  }

  function close() {
    mountEl.innerHTML = "";
    document.body.classList.remove("modal-open");
    if (releaseFocusTrap) releaseFocusTrap();
    if (lastFocusedEl) lastFocusedEl.focus();
    document.removeEventListener("keydown", onKeydown);
  }

  /**
   * True once the guest has entered something that would be lost by an
   * unconfirmed close: they've moved past the initial single-room
   * selection, or into the details/submitting/error phase. Nothing is at
   * risk once phase is 'success' (the booking already went through), so
   * that phase is exempt.
   */
  function hasUnsavedProgress() {
    if (!state) return false;
    if (state.phase === "success") return false;
    if (state.phase !== "selection") return true;
    if (state.lineItems.length > 1) return true;
    if (state.lineItems.length === 1 && state.lineItems[0].quantity !== 1) return true;
    return false;
  }

  /**
   * Gate in front of close() for the "accidental" close vectors (overlay
   * click, Escape, the × button) — confirms before discarding entered data
   * rather than closing unconditionally.
   */
  function requestClose() {
    if (hasUnsavedProgress()) {
      const confirmed = window.confirm(
        "You have an unfinished booking request. Close and lose these details?"
      );
      if (!confirmed) return;
    }
    close();
  }

  function onKeydown(e) {
    if (e.key === "Escape") requestClose();
  }

  function render() {
    // Preserve the scroll position across the full teardown/rebuild below —
    // otherwise any incidental state update (an availability response
    // landing, a stepper click, a phase change) snaps a scrolled-down guest
    // back to the top (fix #3).
    const previousScrollEl = mountEl.querySelector(".modal__scroll");
    const previousScrollTop = previousScrollEl ? previousScrollEl.scrollTop : 0;

    mountEl.innerHTML = "";
    detailsFieldRefs = {}; // repopulated by renderDetails() below, if this render is the details phase

    const dialog = el(
      "div",
      {
        class: "modal",
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "modal-title"
      },
      [renderBody()]
    );

    const overlay = el(
      "div",
      {
        class: "modal-overlay",
        onClick: (e) => {
          if (e.target === e.currentTarget) requestClose();
        }
      },
      [dialog]
    );

    mountEl.append(overlay);

    const newScrollEl = dialog.querySelector(".modal__scroll");
    if (newScrollEl) newScrollEl.scrollTop = previousScrollTop;

    if (releaseFocusTrap) releaseFocusTrap();
    releaseFocusTrap = trapFocus(dialog);

    // Only steal focus on an actual phase transition (fix #2) — not on
    // every re-render — and never land it on the close button just because
    // the header happens to come first in the DOM.
    if (state.phase !== lastFocusedPhase) {
      focusFirstMeaningfulField(dialog);
      lastFocusedPhase = state.phase;
    }
  }

  /**
   * Picks the right field to focus for the phase we just entered, per
   * fix #2: Check-in date for selection, Guests for details, and a
   * sensible non-close-button fallback otherwise.
   */
  function focusFirstMeaningfulField(dialog) {
    let target = null;

    if (state.phase === "selection") {
      target = dialog.querySelector('input[type="date"]');
    } else if (state.phase === "details") {
      target = detailsFieldRefs.numGuests || null;
    }

    if (!target) {
      target = Array.from(dialog.querySelectorAll("input, button, select, textarea")).find(
        (node) => !node.classList.contains("modal__close")
      );
    }

    if (target) target.focus();
  }

  function renderBody() {
    if (state.phase === "success") return renderSuccess();
    if (state.phase === "selection") return renderSelection();
    return renderDetails();
  }

  function renderSelection() {
    const { nights, roomCount, subtotal } = computeTotals(state.lineItems, state.checkIn, state.checkOut);

    const lineItemRows = state.lineItems.map((item) => renderLineItemRow(item));

    const addedCategoryIds = new Set(state.lineItems.map((li) => li.category.id));
    const pickerOptions = (state.allCategories || []).map((c) =>
      el("option", { value: c.id }, addedCategoryIds.has(c.id) ? `${c.name} (add another)` : c.name)
    );

    const addRow = el("div", { class: "form-row form-row--add-category" }, [
      el(
        "select",
        {
          class: "form-select",
          disabled: state.categoriesLoading || pickerOptions.length === 0,
          value: "", // always shows the placeholder — the change itself commits the item
          onchange: (e) => {
            const categoryId = e.target.value;
            if (categoryId) addLineItem(categoryId);
          },
          onfocus: () => {
            if (!state.allCategories && !state.categoriesLoading) loadCategoriesForPicker();
          }
        },
        [
          el(
            "option",
            { value: "" },
            state.categoriesLoading ? "Loading room types…" : "Add another room type…"
          ),
          ...pickerOptions
        ]
      )
    ]);

    const dialogBody = el("form", { class: "reservation-form", onSubmit: handleContinue }, [
      el("div", { class: "modal__header" }, [
        el("h2", { id: "modal-title", class: "modal__title" }, "Build your stay"),
        el("button", { type: "button", class: "modal__close", "aria-label": "Close", onClick: requestClose }, "×")
      ]),

      el("div", { class: "modal__scroll" }, [
        el("section", { class: "form-section" }, [
          el("div", { class: "form-row form-row--split" }, [
            el("label", { class: "form-field" }, [
              el("span", { class: "form-field__label" }, "Check-in"),
              el("input", {
                type: "date",
                min: todayISO(),
                value: state.checkIn,
                onchange: (e) => {
                  const checkIn = e.target.value;
                  const checkOut = state.checkOut <= checkIn ? addDaysISO(checkIn, 1) : state.checkOut;
                  setState({ checkIn, checkOut });
                  refreshAllAvailability();
                }
              })
            ]),
            el("label", { class: "form-field" }, [
              el("span", { class: "form-field__label" }, "Check-out"),
              el("input", {
                type: "date",
                min: addDaysISO(state.checkIn, 1),
                value: state.checkOut,
                onchange: (e) => {
                  setState({ checkOut: e.target.value });
                  refreshAllAvailability();
                }
              })
            ])
          ]),
          state.fieldErrors.dates ? el("p", { class: "form-error" }, state.fieldErrors.dates) : null
        ]),

        el("section", { class: "form-section" }, [
          el("span", { class: "form-field__label" }, "Rooms"),
          el("div", { class: "line-item-list" }, lineItemRows),
          addRow,
          state.fieldErrors.lineItems ? el("p", { class: "form-error" }, state.fieldErrors.lineItems) : null
        ]),

        el("section", { class: "form-section form-summary" }, [
          el("div", { class: "form-summary__row" }, [
            el(
              "span",
              {},
              `${nights} night${nights === 1 ? "" : "s"} × ${roomCount} room${roomCount === 1 ? "" : "s"}`
            ),
            el("span", {}, ksh(subtotal))
          ]),
          el("p", { class: "form-summary__note" }, "Estimated total — confirmed at check-in.")
        ])
      ]),

      el("div", { class: "modal__footer" }, [
        el(
          "button",
          {
            type: "submit",
            class: "button button--primary button--full",
            disabled: state.lineItems.length === 0
          },
          "Continue to your details"
        )
      ])
    ]);

    return dialogBody;
  }

  function renderLineItemRow(item) {
    const canRemove = state.lineItems.length > 1;

    const stepper = el("div", { class: "stepper" }, [
      el(
        "button",
        {
          type: "button",
          class: "stepper__btn",
          "aria-label": `Decrease ${item.category.name} quantity`,
          disabled: item.quantity <= 1,
          onClick: () => setLineItemQuantity(item.id, item.quantity - 1)
        },
        "−"
      ),
      el("span", { class: "stepper__value", "aria-live": "polite" }, `${item.quantity}`),
      el(
        "button",
        {
          type: "button",
          class: "stepper__btn",
          "aria-label": `Increase ${item.category.name} quantity`,
          disabled:
            item.quantity >= item.category.totalUnits ||
            (item.availability && item.quantity >= item.availability.unitsLeft),
          onClick: () => setLineItemQuantity(item.id, item.quantity + 1)
        },
        "+"
      )
    ]);

    const availabilityNote = (() => {
      if (item.checkingAvailability) {
        return el("p", { class: "form-hint" }, "Checking availability…");
      }
      if (item.availability) {
        const { unitsLeft } = item.availability;
        if (unitsLeft <= 0) {
          return el("p", { class: "form-hint form-hint--error" }, "Fully booked for these dates.");
        }
        if (unitsLeft <= 2) {
          return el("p", { class: "form-hint form-hint--warn" }, `Only ${unitsLeft} left for these dates.`);
        }
        return el("p", { class: "form-hint" }, `${unitsLeft} available for these dates.`);
      }
      return null;
    })();

    return el("div", { class: "line-item-row" }, [
      el("div", { class: "line-item-row__main" }, [
        el("div", { class: "line-item-row__info" }, [
          el("span", { class: "line-item-row__name" }, item.category.name),
          el("span", { class: "line-item-row__price" }, `${ksh(item.category.pricePerNight)} / night`),
          availabilityNote
        ]),
        stepper,
        canRemove
          ? el(
              "button",
              {
                type: "button",
                class: "line-item-row__remove",
                "aria-label": `Remove ${item.category.name}`,
                onClick: () => removeLineItem(item.id)
              },
              "Remove"
            )
          : null
      ])
    ]);
  }

  function renderDetails() {
    const isBusy = state.phase === "submitting";
    const { nights, roomCount, subtotal } = computeTotals(state.lineItems, state.checkIn, state.checkOut);

    const reviewList = el(
      "ul",
      { class: "line-item-review" },
      state.lineItems.map((item) =>
        el(
          "li",
          {},
          `${item.category.name} × ${item.quantity}${
            item.id === highlightedErrorLineItemId() ? " — this room type just filled up" : ""
          }`
        )
      )
    );

    const form = el("form", { class: "reservation-form", onSubmit: handleSubmit }, [
      el("div", { class: "modal__header" }, [
        el("h2", { id: "modal-title", class: "modal__title" }, "Your details"),
        el("button", { type: "button", class: "modal__close", "aria-label": "Close", onClick: requestClose }, "×")
      ]),

      el("div", { class: "modal__scroll" }, [
        el("section", { class: "form-section form-review" }, [
          el("span", { class: "form-field__label" }, "Your stay"),
          reviewList,
          el(
            "p",
            { class: "form-hint" },
            `${nights} night${nights === 1 ? "" : "s"} · ${roomCount} room${roomCount === 1 ? "" : "s"}`
          ),
          el(
            "button",
            { type: "button", class: "button button--link", disabled: isBusy, onClick: handleBackToSelection },
            "← Edit rooms or dates"
          )
        ]),

        el("section", { class: "form-section" }, [
          el("label", { class: "form-field" }, [
            el("span", { class: "form-field__label" }, "Guests"),
            (() => {
              const input = el("input", {
                type: "number",
                min: "1",
                value: String(state.numGuests),
                disabled: isBusy
              });
              detailsFieldRefs.numGuests = input;
              return input;
            })()
          ]),
          state.fieldErrors.numGuests ? el("p", { class: "form-error" }, state.fieldErrors.numGuests) : null
        ]),

        el("section", { class: "form-section" }, [
          el("label", { class: "form-field" }, [
            el("span", { class: "form-field__label" }, "Full name"),
            (() => {
              const input = el("input", {
                type: "text",
                autocomplete: "name",
                value: state.guestName,
                disabled: isBusy
              });
              detailsFieldRefs.guestName = input;
              return input;
            })()
          ]),
          state.fieldErrors.guestName ? el("p", { class: "form-error" }, state.fieldErrors.guestName) : null,

          el("div", { class: "form-row form-row--split" }, [
            el("label", { class: "form-field" }, [
              el("span", { class: "form-field__label" }, "Phone number"),
              (() => {
                const input = el("input", {
                  type: "tel",
                  autocomplete: "tel",
                  placeholder: "0712 345 678",
                  value: state.guestPhone,
                  disabled: isBusy
                });
                detailsFieldRefs.guestPhone = input;
                return input;
              })(),
              el("span", { class: "form-field__hint" }, "We'll use this to confirm your booking.")
            ]),
            el("label", { class: "form-field" }, [
              el("span", { class: "form-field__label" }, "Email (optional)"),
              (() => {
                const input = el("input", {
                  type: "email",
                  autocomplete: "email",
                  placeholder: "you@example.com",
                  value: state.guestEmail,
                  disabled: isBusy
                });
                detailsFieldRefs.guestEmail = input;
                return input;
              })(),
              el("span", { class: "form-field__hint" }, "Only needed if you want an emailed receipt.")
            ])
          ]),
          state.fieldErrors.guestPhone ? el("p", { class: "form-error" }, state.fieldErrors.guestPhone) : null,
          state.fieldErrors.guestEmail ? el("p", { class: "form-error" }, state.fieldErrors.guestEmail) : null,

          el("label", { class: "form-field" }, [
            el("span", { class: "form-field__label" }, "Notes (optional)"),
            (() => {
              const textarea = el("textarea", {
                rows: "2",
                placeholder: "Late arrival, dietary needs, anything else we should know.",
                value: state.notes,
                disabled: isBusy
              });
              detailsFieldRefs.notes = textarea;
              return textarea;
            })()
          ])
        ]),
        
        el("section", { class: "form-section" }, [
          el("span", { class: "form-field__label" }, "How would you like to pay?"),
          el("div", { class: "payment-choice" }, [
            el("label", { class: "payment-choice__option" }, [
              el("input", {
                type: "radio",
                name: "payment-preference",
                value: "post_arrival",
                checked: state.paymentPreference === "post_arrival",
                disabled: isBusy,
                onChange: () => setState({ paymentPreference: "post_arrival" })
              }),
              " Pay on arrival"
            ]),
            el("label", { class: "payment-choice__option" }, [
              el("input", {
                type: "radio",
                name: "payment-preference",
                value: "advance",
                checked: state.paymentPreference === "advance",
                disabled: isBusy,
                onChange: () => setState({ paymentPreference: "advance" })
              }),
              " Pay in advance"
            ])
          ]),
          state.paymentPreference === "advance"
            ? el(
                "p",
                { class: "form-field__hint" },
                "We'll reach out via WhatsApp or email to arrange advance payment before your stay."
              )
            : null
        ]),
        

        el("section", { class: "form-section form-summary" }, [
          el("div", { class: "form-summary__row" }, [
            el(
              "span",
              {},
              `${nights} night${nights === 1 ? "" : "s"} × ${roomCount} room${roomCount === 1 ? "" : "s"}`
            ),
            el("span", {}, ksh(subtotal))
          ]),
          el("p", { class: "form-summary__note" }, "Estimated total — confirmed at check-in.")
        ]),

        state.submitError ? el("div", { class: "form-alert", role: "alert" }, [el("p", {}, state.submitError)]) : null
      ]),

      el("div", { class: "modal__footer" }, [
        el(
          "button",
          {
            type: "submit",
            class: "button button--primary button--full",
            disabled: isBusy
          },
          isBusy ? "Sending…" : state.phase === "error" ? "Try again" : "Request this booking"
        )
      ])
    ]);

    return form;
  }

  function highlightedErrorLineItemId() {
    if (!state.submitErrorCategoryId) return null;
    const match = state.lineItems.find((li) => li.category.id === state.submitErrorCategoryId);
    return match ? match.id : null;
  }

  function renderSuccess() {
    const reservation = state.reservation;
    const summary = buildReservationSummary(reservation);

    const container = el("div", { class: "modal__scroll modal__scroll--success" }, [
      el("div", { class: "modal__header" }, [
        el("h2", { id: "modal-title", class: "modal__title" }, "Request sent"),
        el("button", { type: "button", class: "modal__close", "aria-label": "Close", onClick: requestClose }, "×")
      ]),
      el("p", { class: "modal__success-lede" }, [
        `Reference `,
        el("strong", {}, reservation.id),
        `. We'll confirm on ${reservation.guestPhone} shortly. Choose how you'd like a copy of this request:`
      ])
    ]);

    const pickerMount = el("div", {});
    container.append(pickerMount);
    ReceiptChannelPicker(pickerMount, reservation, summary);

    return container;
  }

  return {
    open(category) {
      state = initialState(category);
      lastFocusedEl = document.activeElement;
      document.body.classList.add("modal-open");
      document.addEventListener("keydown", onKeydown);
      render();
      refreshAllAvailability();
      loadCategoriesForPicker();
    }
  };
}
