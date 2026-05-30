/* Reusable Slide-out Drawer Panel Component for Payo */

export const drawer = {
  /**
   * Opens the drawer with dynamic content and actions.
   * @param {Object} options 
   * @param {string} options.title - Header Title Text.
   * @param {string} options.bodyHtml - Body HTML layout string.
   * @param {string} [options.footerHtml] - Optional footer action buttons layout string.
   * @param {Function} [options.onOpen] - Callback fired immediately after opening and mounting.
   * @param {Function} [options.onClose] - Callback fired when drawer closes.
   */
  open({ title, bodyHtml, footerHtml = '', onOpen = null, onClose = null }) {
    const overlay = document.getElementById('drawer-overlay');
    if (!overlay) {
      console.error('Drawer layout container missing in index.html');
      return;
    }

    // Populate drawer elements
    overlay.querySelector('.drawer-title').textContent = title;
    overlay.querySelector('.drawer-body').innerHTML = bodyHtml;

    const footer = overlay.querySelector('.drawer-footer');
    if (footerHtml) {
      footer.innerHTML = footerHtml;
      footer.style.display = 'flex';
    } else {
      footer.style.display = 'none';
    }

    // Show drawer
    overlay.classList.add('open');

    // Bind close triggers
    const closeBtn = overlay.querySelector('.drawer-close');
    const handleClose = () => this.close();
    closeBtn.onclick = handleClose;

    // Close on click outside (backdrop)
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        this.close();
      }
    };

    // Close on ESC key press
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    
    // Store handlers for teardown
    overlay._teardown = () => {
      document.removeEventListener('keydown', handleKeyDown);
      overlay.onclick = null;
      closeBtn.onclick = null;
      if (onClose) onClose();
    };

    // Fire mount trigger for custom inputs hookups
    if (onOpen) {
      onOpen(overlay);
    }
  },

  /**
   * Closes the active drawer.
   */
  close() {
    const overlay = document.getElementById('drawer-overlay');
    if (!overlay || !overlay.classList.contains('open')) return;

    overlay.classList.remove('open');
    
    if (overlay._teardown) {
      overlay._teardown();
      overlay._teardown = null;
    }
  }
};
