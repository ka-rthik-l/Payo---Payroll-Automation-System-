/* Dashboard Page View for Payo */
import { dashboardService } from '../services/dashboardService.js';
import { pdfService } from '../services/pdfService.js';
import { state } from '../state.js';

export const dashboardPage = {
  _data: null,

  async render() {
    if (!this._data) {
      return `
        <div>
          <div class="page-header">
            <nav class="breadcrumbs" id="breadcrumb-list"></nav>
            <div class="page-header-title-row">
              <div>
                <h1 class="page-header-title">Dashboard</h1>
                <p class="page-header-subtitle">Overview of payroll operations and metrics</p>
              </div>
            </div>
          </div>
          <div class="card skeleton" style="height: 140px; margin-bottom: var(--spacing-8);"></div>
          <div class="dashboard-metrics-grid" style="margin-bottom: var(--spacing-8);">
            <div class="card skeleton skeleton-card"></div>
            <div class="card skeleton skeleton-card"></div>
            <div class="card skeleton skeleton-card"></div>
          </div>
          <div class="dashboard-activity-grid">
            <div class="card skeleton skeleton-card" style="height: 250px;"></div>
            <div class="card skeleton skeleton-card" style="height: 250px;"></div>
          </div>
        </div>
      `;
    }

    const metrics = this._data;
    const {
      activeEmployeesCount,
      totalPayrollPaid,
      emailSuccessRate,
      totalEmailCount,
      runsCount,
      lastRun,
      activePeriod,
      isActivePeriodComplete,
      currency
    } = metrics;

    const periodLabel = `${activePeriod.month} ${activePeriod.year}`;

    return `
      <div>
        <div class="page-header">
          <nav class="breadcrumbs" id="breadcrumb-list"></nav>
          <div class="page-header-title-row">
            <div>
              <h1 class="page-header-title">Dashboard</h1>
              <p class="page-header-subtitle">Overview of payroll operations and metrics</p>
            </div>
          </div>
        </div>

        ${!isActivePeriodComplete ? `
          <div class="card cta-card-highlight" style="margin-bottom: var(--spacing-8);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-6); flex-wrap: wrap;">
              <div>
                <span class="badge badge-warning" style="margin-bottom: var(--spacing-2);">Run Pending</span>
                <h2 style="font-size: var(--text-lg); font-weight: 700; color: var(--neutral-900); letter-spacing:-0.01em;">Process ${periodLabel} Payroll</h2>
                <p style="font-size: var(--text-sm); color: var(--neutral-600); margin-top: var(--spacing-2); max-width: 600px;">
                  The payroll cycle for ${periodLabel} is ready to process. Load employee directories, assign salary configurations, validate equations, compile payslips, and dispatch emails.
                </p>
              </div>
              <button class="btn btn-primary" id="dashboard-start-run-btn">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                Launch Run Center
              </button>
            </div>
          </div>
        ` : `
          <div class="card" style="margin-bottom: var(--spacing-8); border-left: 4px solid var(--status-success-border); background-color: var(--status-success-bg);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-6); flex-wrap: wrap;">
              <div>
                <h2 style="font-size: var(--text-lg); font-weight: 700; color: var(--status-success-text);">${periodLabel} Payroll Completed</h2>
                <p style="font-size: var(--text-sm); color: var(--status-success-text); opacity: 0.85; margin-top: var(--spacing-1);">
                  Payroll runs for the current active period have been executed, validated, and dispatched.
                </p>
              </div>
              <button class="btn btn-secondary" id="dashboard-view-payslips-btn">
                View Payslips Registry
              </button>
            </div>
          </div>
        `}

        <div class="dashboard-metrics-grid" style="margin-bottom: var(--spacing-8);">
          <div class="card metric-card">
            <div class="card-header">
              <span class="card-subtitle" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Total Processed</span>
              <div style="color: var(--primary-500);">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:22px; height:22px; stroke-width:2;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            </div>
            <div class="metric-value">${pdfService.formatCurrency(totalPayrollPaid, currency)}</div>
            <div class="metric-footer">
              <span class="metric-trend up">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7 7 7M12 3v18" /></svg>
                100%
              </span>
              <span>across ${runsCount} batches</span>
            </div>
          </div>

          <div class="card metric-card">
            <div class="card-header">
              <span class="card-subtitle" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Active Directory</span>
              <div style="color: var(--info-500);">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:22px; height:22px; stroke-width:2;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
            </div>
            <div class="metric-value">${activeEmployeesCount}</div>
            <div class="metric-footer">
              <span class="metric-trend up">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 10l7-7 7 7M12 3v18" /></svg>
                +25%
              </span>
              <span>vs previous quarter</span>
            </div>
          </div>

          <div class="card metric-card">
            <div class="card-header">
              <span class="card-subtitle" style="font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Email Dispatch</span>
              <div style="color: var(--success-500);">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:22px; height:22px; stroke-width:2;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10l9 6 9-6" /></svg>
              </div>
            </div>
            <div class="metric-value">${emailSuccessRate}%</div>
            <div class="metric-footer">
              <span>Success rate on ${totalEmailCount} dispatches</span>
            </div>
          </div>
        </div>

        <div class="dashboard-activity-grid">
          <div class="card">
            <div class="card-header" style="border-bottom: 1px solid var(--neutral-100); padding-bottom: var(--spacing-4);">
              <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--neutral-900);">Recent Payroll Runs</h3>
            </div>
            
            ${lastRun ? `
              <div style="display:flex; flex-direction:column; gap: var(--spacing-6); padding-top: var(--spacing-2);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <div>
                    <span style="font-weight: 700; font-size: var(--text-sm); color: var(--neutral-800);">${lastRun.month} ${lastRun.year}</span>
                    <span style="font-size: var(--text-xs); color: var(--neutral-400); margin-left: var(--spacing-2);">ID: ${lastRun.id}</span>
                  </div>
                  <span class="badge badge-success">Completed</span>
                </div>
                
                <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-4); background-color: var(--neutral-50); padding: var(--spacing-4); border-radius: var(--radius-md); border: 1px solid var(--neutral-200);">
                  <div>
                    <div style="font-size: 10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Gross Salary</div>
                    <div style="font-weight:700; color:var(--neutral-800); font-size:var(--text-sm); margin-top:2px;">${pdfService.formatCurrency(lastRun.totalGross, currency)}</div>
                  </div>
                  <div>
                    <div style="font-size: 10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Deductions</div>
                    <div style="font-weight:700; color:var(--neutral-800); font-size:var(--text-sm); margin-top:2px;">${pdfService.formatCurrency(lastRun.totalDeductions, currency)}</div>
                  </div>
                  <div>
                    <div style="font-size: 10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Net Salary</div>
                    <div style="font-weight:700; color:var(--primary-700); font-size:var(--text-sm); margin-top:2px;">${pdfService.formatCurrency(lastRun.totalNet, currency)}</div>
                  </div>
                </div>
                
                <div style="display:flex; justify-content:space-between; font-size:var(--text-xs); color:var(--neutral-500);">
                  <span>Processed: ${lastRun.dateProcessed || '—'}</span>
                  <span>Employees Paid: ${lastRun.employeesCount}</span>
                </div>
              </div>
            ` : `
              <div style="padding: var(--spacing-8) 0; text-align:center; color: var(--neutral-400); font-size:var(--text-sm);">
                No historical payroll runs found in the system.
              </div>
            `}
          </div>

          <div class="card">
            <div class="card-header" style="border-bottom: 1px solid var(--neutral-100); padding-bottom: var(--spacing-4);">
              <h3 style="font-size: var(--text-base); font-weight: 700; color: var(--neutral-900);">Operation Logs</h3>
            </div>
            
            <div class="timeline" style="padding-top: var(--spacing-4);">
              ${lastRun ? `
                <div class="timeline-item">
                  <div class="timeline-dot completed"></div>
                  <div class="timeline-content">
                    <div class="timeline-title">Run Completed: ${lastRun.month} ${lastRun.year}</div>
                    <div class="timeline-desc">${lastRun.employeesCount} employee receipts generated & queued.</div>
                  </div>
                </div>
              ` : ''}
              
              <div class="timeline-item">
                <div class="timeline-dot completed"></div>
                <div class="timeline-content">
                  <div class="timeline-title">API Connected</div>
                  <div class="timeline-desc">Payo frontend is connected to the payroll API.</div>
                </div>
              </div>
              
              <div class="timeline-item">
                <div class="timeline-dot active"></div>
                <div class="timeline-content">
                  <div class="timeline-title">System Live</div>
                  <div class="timeline-desc">Payo Platform active and waiting.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async _loadData() {
    this._data = await dashboardService.getMetrics();
    const mainView = document.getElementById('main-view');
    if (mainView && state.currentView === 'dashboard') {
      mainView.innerHTML = await this.render();
      if (window.app && typeof window.app.updateBreadcrumbs === 'function') {
        window.app.updateBreadcrumbs('dashboard');
      }
      this.afterRender();
    }
  },

  afterRender() {
    if (!this._data) {
      this._loadData();
      return;
    }

    const startRunBtn = document.getElementById('dashboard-start-run-btn');
    if (startRunBtn) {
      startRunBtn.onclick = () => {
        state.setView('payroll');
      };
    }

    const viewPayslipsBtn = document.getElementById('dashboard-view-payslips-btn');
    if (viewPayslipsBtn) {
      viewPayslipsBtn.onclick = () => {
        state.setView('payslips');
      };
    }
  }
};
