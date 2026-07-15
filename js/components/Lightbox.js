// components/Lightbox.js
import { el } from "../utils.js";

/**
 * Creates a full-screen, keyboard-navigable lightbox overlay for a set of images.
 * Call `open(index)` to show the overlay starting at a given image index.
 *
 * @param {HTMLElement} mountEl - element the lightbox overlay is appended to
 * @param {{ src: string, alt: string }[]} images - the full list of gallery images
 * @returns {{ open: (index: number) => void, close: () => void }}
 */
export function createLightbox(mountEl, images) {
  let isOpen = false;
  let currentIndex = 0;
  let overlayEl = null;
  let imageEl = null;
  let captionEl = null;
  let counterEl = null;
  let closeTimer = null;

  function handleKeydown(event) {
    switch (event.key) {
      case "Escape":
        close();
        break;
      case "ArrowLeft":
        showImage(currentIndex - 1);
        break;
      case "ArrowRight":
        showImage(currentIndex + 1);
        break;
      default:
        break;
    }
  }

  function showImage(index) {
    currentIndex = (index + images.length) % images.length;
    const image = images[currentIndex];
    imageEl.src = image.src;
    imageEl.alt = image.alt;
    captionEl.textContent = image.alt;
    counterEl.textContent = `${currentIndex + 1} / ${images.length}`;
  }

  function buildOverlay() {
    imageEl = el("img", { class: "lightbox__image", alt: "", loading: "eager" });
    captionEl = el("p", { class: "lightbox__caption" }, "");
    counterEl = el("span", { class: "lightbox__counter" }, "");

    const prevButton = el(
      "button",
      {
        class: "lightbox__nav lightbox__nav--prev",
        type: "button",
        "aria-label": "Previous image",
        onClick: (event) => {
          event.stopPropagation();
          showImage(currentIndex - 1);
        }
      },
      "‹"
    );

    const nextButton = el(
      "button",
      {
        class: "lightbox__nav lightbox__nav--next",
        type: "button",
        "aria-label": "Next image",
        onClick: (event) => {
          event.stopPropagation();
          showImage(currentIndex + 1);
        }
      },
      "›"
    );

    const closeButton = el(
      "button",
      {
        class: "lightbox__close",
        type: "button",
        "aria-label": "Close gallery",
        onClick: (event) => {
          event.stopPropagation();
          close();
        }
      },
      "×"
    );

    const dialog = el(
      "div",
      {
        class: "lightbox",
        onClick: (event) => event.stopPropagation()
      },
      [
        el("div", { class: "lightbox__figure" }, [imageEl]),
        el("div", { class: "lightbox__footer" }, [captionEl, counterEl])
      ]
    );

    return el(
      "div",
      {
        class: "lightbox-overlay",
        role: "dialog",
        "aria-modal": "true",
        "aria-label": "Image gallery",
        onClick: () => close()
      },
      [closeButton, prevButton, dialog, nextButton]
    );
  }

  function open(index) {
    if (isOpen) {
      showImage(index);
      return;
    }

    // Cancel any pending removal from a previous close() call.
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    isOpen = true;
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", handleKeydown);

    overlayEl = buildOverlay();
    mountEl.append(overlayEl);
    showImage(index);

    // Defer to the next frame so the transition actually fires.
    requestAnimationFrame(() => {
      overlayEl?.classList.add("lightbox-overlay--visible");
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;

    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", handleKeydown);

    const node = overlayEl;
    overlayEl = null;
    node.classList.remove("lightbox-overlay--visible");

    closeTimer = window.setTimeout(() => {
      node.remove();
      closeTimer = null;
    }, 200);
  }

  return { open, close };
}
