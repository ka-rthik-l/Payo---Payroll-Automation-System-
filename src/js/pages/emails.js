/* Email Center Page View for Payo */
import { emailService } from '../services/emailService.js';
import { toast } from '../components/toast.js';

export const emailsPage = {
  state: {
    statusFilter: ''
  },

  async render() {
    const [logs, metrics] = await Promise.all([
      emailService.getEmailLogs(this.state.statusFilter),
      emailService.getEmailMetrics()
    ]);

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
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: var(--spacing-6); flex-wrap:wrap; gap:var(--spacing-4);">
          <div>
            <h1 style="font-size: var(--text-2xl); font-weight: 800; color: var(--neutral-900); letter-spacing:-0.03em;">Email Center</h1>
            <p style="font-size: var(--text-sm); color: var(--neutral-500); margin-top:2px;">Track and manage payslip email dispatches</p>
          </div>
          ${failedCount > 0 ? `
            <button class="btn btn-primary" id="retry-all-failed-btn">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H18" /></svg>
              Retry All Failed Emails
            </button>
          ` : ''}
        </div>

        <!-- Metric Summaries -->
        <div class="email-delivery-summary" style="margin-bottom: var(--spacing-8);">
          <div class="email-stat-card" style="border-left: 3px solid var(--success-500);">
            <div>
              <div style="font-size:10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Sent & Delivered</div>
              <div style="font-size:var(--text-xl); font-weight:800; color:var(--neutral-800); margin-top:4px;">${sentCount}</div>
            </div>
            <div style="color:var(--success-500);">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div class="email-stat-card" style="border-left: 3px solid var(--primary-500);">
            <div>
              <div style="font-size:10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Pending / Transmitting</div>
              <div style="font-size:var(--text-xl); font-weight:800; color:var(--neutral-800); margin-top:4px;">${pendingCount}</div>
            </div>
            <div style="color:var(--primary-500);">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
          <div class="email-stat-card" style="border-left: 3px solid var(--danger-500);">
            <div>
              <div style="font-size:10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Failed Deliveries</div>
              <div style="font-size:var(--text-xl); font-weight:800; color:var(--neutral-800); margin-top:4px;">${failedCount}</div>
            </div>
            <div style="color:var(--danger-500);">
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
    `;
  },

  afterRender() {
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
          toast.success('Email Delivered', `Successfully completed SMTP handshake. Slip dispatched to recipient.`);
          this.refresh();
        } catch (err) {
          toast.error('SMTP Connection Failed', err.message);
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
          toast.success('SMTP Batch Retried', `Successfully dispatched ${res.retriedSuccess} pending notifications.`);
          this.refresh();
        } catch (err) {
          toast.error('SMTP Batch Failed', err.message);
          this.refresh();
        }
      };
    }
  },

  async refresh() {
    const mainView = document.getElementById('main-view');
    if (mainView) {
      mainView.innerHTML = await this.render();
      this.afterRender();
    }
  }
};
