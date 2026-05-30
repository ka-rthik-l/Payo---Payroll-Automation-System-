/* Toast Notification Component for Payo */

class ToastManager {
  constructor() {
    this.container = null;
    this._initContainer();
  }

  _initContainer() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }

  show({ type = 'success', title = '', message = '', duration = 4000 }) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      error: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
      warning: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`,
      info: `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
    };

    toast.innerHTML = `
      <div class="toast-icon">
        ${icons[type] || icons.success}
      </div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-msg">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close notification">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    `;

    // Close button click listener
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this._remove(toast);
    });

    this.container.appendChild(toast);

    // Auto-remove timer
    const timeoutId = setTimeout(() => {
      this._remove(toast);
    }, duration);

    toast.dataset.timeoutId = timeoutId;
  }

  _remove(toast) {
    if (toast.classList.contains('removing')) return;
    
    // Clear auto-remove timer
    if (toast.dataset.timeoutId) {
      clearTimeout(Number(toast.dataset.timeoutId));
    }

    toast.classList.add('removing');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  }

  success(title, message, duration) {
    this.show({ type: 'success', title, message, duration });
  }

  error(title, message, duration) {
    this.show({ type: 'error', title, message, duration });
  }

  warning(title, message, duration) {
    this.show({ type: 'warning', title, message, duration });
  }

  info(title, message, duration) {
    this.show({ type: 'info', title, message, duration });
  }
}

export const toast = new ToastManager();
