/* Email Center Page View for Payo */
import { emailService } from '../services/emailService.js';
import { toast } from '../components/toast.js';
import { state as appState } from '../state.js';

export const emailsPage = {
  _logs: null,
  _metrics: null,

  state: {
    statusFilter: ''
  },

  async render() {
    if (!this._logs || !this._metrics) {
      return `
        <div>
          <div class="page-header">
            <nav class="breadcrumbs" id="breadcrumb-list"></nav>
            <div class="page-header-title-row">
              <div>
                <h1 class="page-header-title">Email Center</h1>
                <p class="page-header-subtitle">Track and manage payslip email dispatches</p>
              </div>
            </div>
          </div>
          <div class="email-delivery-summary" style="margin-bottom: var(--spacing-8); display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-4);">
            <div class="skeleton" style="height: 100px; border-radius: var(--radius-lg);"></div>
            <div class="skeleton" style="height: 100px; border-radius: var(--radius-lg);"></div>
            <div class="skeleton" style="height: 100px; border-radius: var(--radius-lg);"></div>
          </div>
          <div class="table-container">
            <div class="table-controls" style="justify-content: flex-start; gap:var(--spacing-6);">
              <div class="skeleton" style="width: 250px; height: 32px;"></div>
            </div>
            <div style="padding: 20px;">
              <div class="skeleton skeleton-table-row"></div>
              <div class="skeleton skeleton-table-row"></div>
              <div class="skeleton skeleton-table-row"></div>
            </div>
          </div>
        </div>
      `;
    }

    const logs = this._logs;
    const metrics = this._metrics;

    const sentCount = metrics.delivered;
    const pendingCount = metrics.pending;
    const failedCount = metrics.failed;

    let tableBodyHtml = '';
    if (logs.length === 0) {
      tableBodyHtml = `
        <tr>
          <td colspan="7" style="padding:0;">
            <div class="empty-state" style="border:none;">
              <div class="empty-state-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012-2.22 0l8 5.333A2 2 0 0121 10.07V19a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
              </div>
              <div class="empty-state-title">No email logs found</div>
              <div class="empty-state-description">Perform a payroll run to start sending employee payslips.</div>
            </div>
          </td>
        </tr>
      `;
    } else {
      tableBodyHtml = logs.map(log => {
        let badgeClass = 'badge-neutral';
        if (log.status === 'delivered') badgeClass = 'badge-success';
        else if (log.status === 'failed') badgeClass = 'badge-danger';
        else if (log.status === 'sending') badgeClass = 'badge-info';

        const showRetry = log.status === 'failed';

        return `
          <tr>
            <td style="font-weight:700; color:var(--neutral-900);">${log.employeeName}</td>
            <td>${log.recipient}</td>
            <td style="font-size:var(--text-xs); color:var(--neutral-500);">${log.subject}</td>
            <td style="font-size:12px; font-family:monospace;">${log.timestamp}</td>
            <td><span class="badge ${badgeClass}">${log.status}</span></td>
            <td style="font-family:monospace; text-align:center;">${log.attempts}</td>
            <td style="text-align:right;" class="action-cell">
              ${showRetry ? `
                <button class="btn btn-sm btn-secondary retry-single-btn" data-id="${log.id}">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:12px; height:12px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" /></svg>
                  Retry
                </button>
              ` : '-'}
            </td>
          </tr>
        `;
      }).join('');
    }

    return `
      <div>
        <div class="page-header">
          <nav class="breadcrumbs" id="breadcrumb-list"></nav>
          <div class="page-header-title-row">
            <div>
              <h1 class="page-header-title">Email Center</h1>
              <p class="page-header-subtitle">Track and manage payslip email dispatches</p>
            </div>
            ${failedCount > 0 ? `
              <button class="btn btn-primary" id="retry-all-failed-btn">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" /></svg>
                Retry All Failed Emails
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Metric Summaries -->
        <div class="email-delivery-summary" style="margin-bottom: var(--spacing-8);">
          <div class="email-stat-card" style="border-left: 3px solid var(--status-success-text);">
            <div>
              <div style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Sent & Delivered</div>
              <div class="email-stat-value">${sentCount}</div>
            </div>
            <div style="color:var(--status-success-text);">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div class="email-stat-card" style="border-left: 3px solid var(--primary-500);">
            <div>
              <div style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Pending / Transmitting</div>
              <div class="email-stat-value">${pendingCount}</div>
            </div>
            <div style="color:var(--primary-500);">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div class="email-stat-card" style="border-left: 3px solid var(--status-danger-text);">
            <div>
              <div style="font-size:10px; font-weight:600; color:var(--text-muted); text-transform:uppercase;">Failed Deliveries</div>
              <div class="email-stat-value">${failedCount}</div>
            </div>
            <div style="color:var(--status-danger-text);">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
          </div>
        </div>

        <!-- Filter tabs & Table -->
        <div class="table-container">
          <div class="table-controls" style="justify-content: flex-start; gap:var(--spacing-6);">
            <span style="font-size:var(--text-xs); font-weight:700; color:var(--neutral-500); text-transform:uppercase;">Filter Status:</span>
            <div style="display:flex; gap:var(--spacing-1);">
              <button class="btn btn-sm ${this.state.statusFilter === '' ? 'btn-primary' : 'btn-ghost'}" id="filter-all-btn">All Logs</button>
              <button class="btn btn-sm ${this.state.statusFilter === 'delivered' ? 'btn-primary' : 'btn-ghost'}" id="filter-sent-btn">Delivered</button>
              <button class="btn btn-sm ${this.state.statusFilter === 'failed' ? 'btn-primary' : 'btn-ghost'}" id="filter-fail-btn">Failed</button>
            </div>
          </div>

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Recipient Address</th>
                  <th>Subject Line</th>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th style="text-align:center;">Attempts</th>
                  <th style="width:100px; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${tableBodyHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  async _loadData() {
    try {
      const [logs, metrics] = await Promise.all([
        emailService.getEmailLogs(this.state.statusFilter),
        emailService.getEmailMetrics()
      ]);
      this._logs = logs;
      this._metrics = metrics;
      const mainView = document.getElementById('main-view');
      if (mainView && appState.currentView === 'emails') {
        mainView.innerHTML = await this.render();
        if (window.app && typeof window.app.updateBreadcrumbs === 'function') {
          window.app.updateBreadcrumbs('emails');
        }
        this.afterRender();
      }
    } catch (err) {
      console.error(err);
    }
  },

  afterRender() {
    if (!this._logs || !this._metrics) {
      this._loadData();
      return;
    }

    // 1. Tab filters bindings
    const bindFilter = (elementId, value) => {
      const el = document.getElementById(elementId);
      if (el) {
        el.onclick = () => {
          this.state.statusFilter = value;
          this.refresh();
        };
      }
    };
    bindFilter('filter-all-btn', '');
    bindFilter('filter-sent-btn', 'delivered');
    bindFilter('filter-fail-btn', 'failed');

    // 2. Retry single email
    const retryBtns = document.querySelectorAll('.retry-single-btn');
    retryBtns.forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        btn.setAttribute('disabled', 'true');
        btn.innerHTML = `<span class="spinner" style="width:12px; height:12px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:4px;"></span>Retrying...`;
        
        try {
          // Trigger email retry
          await emailService.retryEmailById(id);
          toast.success('Email Delivered', `Successfully delivered the payslip to the recipient.`);
          this.refresh();
        } catch (err) {
          toast.error('Email Delivery Failed', err.message);
          this.refresh();
        }
      };
    });

    // 3. Retry all failed
    const retryAllBtn = document.getElementById('retry-all-failed-btn');
    if (retryAllBtn) {
      retryAllBtn.onclick = async () => {
        retryAllBtn.setAttribute('disabled', 'true');
        retryAllBtn.innerHTML = `<span class="spinner" style="width:14px; height:14px; border-width:2px; display:inline-block; vertical-align:middle; margin-right:6px;"></span>Retrying Queue...`;
        
        try {
          const res = await emailService.retryFailedEmails();
          toast.success('Email Batch Retried', `Successfully dispatched ${res.retriedSuccess} pending notifications.`);
          this.refresh();
        } catch (err) {
          toast.error('Email Batch Failed', err.message);
          this.refresh();
        }
      };
    }
  },

  async refresh() {
    this._logs = null;
    await this._loadData();
  }
};
