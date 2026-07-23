// components/CategoryCard.js
import { el, ksh } from "../utils.js";
import { convertFromKES, formatCurrency } from "../services/currency.js";

/**
 * @param {object} category
 * @param {(category: object) => void} onAddToCart
 * @param {string} [displayCurrency] - code from currency.js's SUPPORTED_CURRENCIES
 */
export function CategoryCard(category, onAddToCart, displayCurrency = "USD") {
  const soldOut = category.totalUnits <= 0;

  const priceAmountEl = el("span", { class: "category-card__price-amount" }, ksh(category.pricePerNight));

  if (displayCurrency !== "KES") {
    convertFromKES(category.pricePerNight, displayCurrency).then((converted) => {
      if (converted == null) return; // rates fetch failed — silently keep showing KSh only
      priceAmountEl.textContent = formatCurrency(converted, displayCurrency);
    });
  }

  const card = el("article", { class: "category-card" }, [
    el("div", { class: "category-card__media" }, [
      el("img", {
        src: category.imageUrl,
        alt: `${category.name} at Vintex Guest House`,
        loading: "lazy",
        width: "480",
        height: "320"
      })
    ]),
    el("div", { class: "category-card__body" }, [
      el("div", { class: "category-card__heading" }, [
        el("h3", { class: "category-card__name" }, category.name),
        el("p", { class: "category-card__price" }, [
          el("span", { class: "category-card__price-from" }, "From "),
          priceAmountEl,
          el("span", { class: "category-card__price-unit" }, " / night")
        ])
      ]),
      el("p", { class: "category-card__description" }, category.description),
      el("p", { class: "category-card__meta" }, `Sleeps up to ${category.maxGuests}`),
      el(
        "button",
        {
          class: "button button--primary category-card__cta",
          type: "button",
          disabled: soldOut,
          onClick: () => onAddToCart(category)
        },
        soldOut ? "Fully booked" : "Add to cart"
      )
    ])
  ]);

  return card;
}
