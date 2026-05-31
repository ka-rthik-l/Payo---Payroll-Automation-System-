/* Main Application Bootstrap & Routing Coordinator for Payo */
import { db } from './services/storeProvider.js';
import { settingsService } from './services/settingsService.js';
import { state } from './state.js';
import { toast } from './components/toast.js';

// Page imports
import { dashboardPage } from './pages/dashboard.js';
import { employeesPage } from './pages/employees.js';
import { payrollRunPage } from './pages/payrollRun.js';
import { payslipsPage } from './pages/payslips.js';
import { emailsPage } from './pages/emails.js';
import { settingsPage } from './pages/settings.js';

class App {
  constructor() {
    this.pages = {
      dashboard: dashboardPage,
      employees: employeesPage,
      payroll: payrollRunPage,
      payslips: payslipsPage,
      emails: emailsPage,
      settings: settingsPage
    };
    this.mainView = null;
  }

  initTheme() {
    const storedTheme = window.localStorage.getItem('payo-theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    const theme = storedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
  }

  setThemeButtonState() {
    const theme = document.documentElement.dataset.theme || 'light';
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
      toggle.innerHTML = theme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3v2M12 19v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 7a5 5 0 100 10 5 5 0 000-10z"/></svg>';
    }

    const status = document.getElementById('theme-menu-status');
    if (status) {
      status.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    }
  }

  bindHeaderActions() {
    const themeToggle = document.getElementById('theme-toggle');
    const profileToggle = document.getElementById('profile-menu-trigger');
    const profileMenu = document.getElementById('profile-menu');

    if (themeToggle) {
      themeToggle.onclick = () => this.toggleTheme();
    }

    if (profileToggle && profileMenu) {
      profileToggle.onclick = (event) => {
        event.stopPropagation();
        const isOpen = profileMenu.classList.toggle('open');
        profileToggle.setAttribute('aria-expanded', String(isOpen));
      };
    }

    document.addEventListener('click', (event) => {
      if (!profileMenu || !profileToggle) return;
      if (!profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
        profileMenu.classList.remove('open');
        profileToggle.setAttribute('aria-expanded', 'false');
      }
    });

    this.setThemeButtonState();
  }

  toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme || 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('payo-theme', nextTheme);
    this.setThemeButtonState();
  }

  async start() {
    // 1. Initialize DB and Seed Data
    try {
      await db.init();
    } catch (err) {
      console.error('Failed to connect to Payo API:', err);
      toast.error('API Connection Error', err.message || 'Could not reach the Payo backend.');
    }

    // 2. Query DOM anchors
    this.mainView = document.getElementById('main-view');
    this.initTheme();
    this.bindHeaderActions();
    
    // Set active period in header pill
    const settings = await settingsService.getSettings();
    const periodPill = document.getElementById('header-active-period');
    if (periodPill && settings) {
      periodPill.textContent = `${settings.activePeriodMonth} ${settings.activePeriodYear}`;
    }

    // 3. Setup Navigation Sidebar Links
    const links = document.querySelectorAll('[data-route]');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route');
        state.setView(route);
        
    // Collapse mobile menu if open
        const sidebar = document.getElementById('sidebar');
        const backdrop = document.getElementById('sidebar-backdrop');
        if (sidebar) sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('open');
      });
    });

    // 4. Bind Mobile Toggle Buttons
    const menuBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const toggleSidebar = (open) => {
      if (sidebar) sidebar.classList.toggle('open', open);
      if (backdrop) backdrop.classList.toggle('open', open);
    };
    if (menuBtn && sidebar) {
      menuBtn.onclick = () => toggleSidebar(!sidebar.classList.contains('open'));
    }
    if (backdrop) {
      backdrop.onclick = () => toggleSidebar(false);
    }

    // 5. Subscribe to Route Changes (view only — run step updates stay local to payroll page)
    state.subscribeView((currentState) => {
      this.route(currentState.currentView);
    });

    state.subscribeRunStep(() => {
      if (state.currentView === 'payroll') {
        this.updateBreadcrumbs('payroll');
        payrollRunPage.refresh();
      }
    });

    // 6. Bootstrap Initial Route
    this.route(state.currentView);
  }

  async route(view) {
    const page = this.pages[view];
    if (!page) {
      console.error(`Route "${view}" does not exist.`);
      return;
    }

    // Update Sidebar CSS selection classes
    const links = document.querySelectorAll('[data-route]');
    links.forEach(link => {
      const route = link.getAttribute('data-route');
      if (route === view) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Render Page contents
    if (this.mainView) {
      try {
        // Render view & bind interactive listeners
        this.mainView.innerHTML = await page.render();
        
        // Update Breadcrumb Navigation UI
        this.updateBreadcrumbs(view);

        if (page.afterRender) {
          page.afterRender();
        }
      } catch (err) {
        console.error(`Error rendering page "${view}":`, err);
        this.mainView.innerHTML = `
          <div class="card" style="border-left: 4px solid var(--danger-500); background-color: var(--danger-50); padding: var(--spacing-6);">
            <h2 style="font-weight:700; color: var(--danger-700);">Render Exception</h2>
            <p style="font-size: var(--text-sm); color: var(--danger-600); margin-top: var(--spacing-2);">${err.message}</p>
          </div>
        `;
      }
    }
  }

  updateBreadcrumbs(view) {
    const list = document.getElementById('breadcrumb-list');
    if (!list) return;

    const viewsLabels = {
      dashboard: 'Dashboard',
      employees: 'Employee Directory',
      payroll: 'Payroll Run Center',
      payslips: 'Payslips Registry',
      emails: 'Email Center',
      settings: 'Settings'
    };

    const label = viewsLabels[view] || 'App';
    
    let html = `
      <a href="#" class="breadcrumb-item" data-breadcrumb-root>Payo</a>
      <span class="breadcrumb-separator">/</span>
    `;

    if (view === 'payroll') {
      const step = state.activeRunStep;
      const stepsLabels = [
        'Employee Upload',
        'Salary Upload',
        'Verify Schema',
        'Ledger Preview',
        'Compile Slips',
        'Email Dispatch',
        'Complete'
      ];
      html += `
        <a href="#" class="breadcrumb-item" id="breadcrumb-parent-link">${label}</a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Step ${step}: ${stepsLabels[step - 1]}</span>
      `;
    } else {
      html += `<span class="breadcrumb-item active">${label}</span>`;
    }

    list.innerHTML = html;

    // Click behavior on root or parents
    const root = list.querySelector('[data-breadcrumb-root]');
    if (root) {
      root.onclick = (e) => {
        e.preventDefault();
        state.setView('dashboard');
      };
    }

    const parent = document.getElementById('breadcrumb-parent-link');
    if (parent) {
      parent.onclick = (e) => {
        e.preventDefault();
        state.resetRun();
        state.setView(view);
      };
    }
  }
}

// Instantiate and start after window loading completes
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app;
  app.start();
});
