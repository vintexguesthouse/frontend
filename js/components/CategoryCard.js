// components/CategoryCard.js
import { el, ksh } from "../utils.js";

/**
 * @param {object} category
 * @param {(category: object) => void} onAddToCart
 */
export function CategoryCard(category, onAddToCart) {
  const soldOut = category.totalUnits <= 0;

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
          el("span", { class: "category-card__price-amount" }, ksh(category.pricePerNight)),
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
