// modal.js -- Reusable modal dialog system.
// Creates a centered overlay with a scrollable content area.
// Usage: openModal("Title", buildFn) where buildFn(contentEl) populates the modal body.

let overlay = null;

function ensureOverlay() {
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  // Clicking outside the dialog does not dismiss — user must use buttons or Escape.
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * Open a modal dialog.
 * @param {string} title - Modal title
 * @param {function(HTMLElement): void} buildFn - Called with the content container to populate
 * @returns {{ close: function }} handle to close the modal programmatically
 */
export function openModal(title, buildFn) {
  const ov = ensureOverlay();
  ov.innerHTML = "";

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";

  // Header
  const header = document.createElement("div");
  header.className = "modal-header";

  const titleEl = document.createElement("div");
  titleEl.className = "modal-title";
  titleEl.textContent = title;

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-close";
  closeBtn.textContent = "\u00D7"; // ×
  closeBtn.addEventListener("click", closeModal);

  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  dialog.appendChild(header);

  // Content
  const content = document.createElement("div");
  content.className = "modal-content";
  buildFn(content);
  dialog.appendChild(content);

  ov.appendChild(dialog);
  ov.classList.add("visible");

  // Allow Escape key to close the modal
  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  };
  document.addEventListener("keydown", onKeyDown);
  ov._onKeyDown = onKeyDown;

  return { close: closeModal };
}

export function closeModal() {
  if (overlay) {
    if (overlay._onKeyDown) {
      document.removeEventListener("keydown", overlay._onKeyDown);
      overlay._onKeyDown = null;
    }
    overlay.classList.remove("visible");
  }
}
