/* Payslips Registry Page for Payo */
import { payrollService } from '../services/payrollService.js';
import { pdfService } from '../services/pdfService.js';
import { drawer } from '../components/drawer.js';
import { toast } from '../components/toast.js';
import { state as appState } from '../state.js';

export const payslipsPage = {
  _allPayslips: null,

  state: {
    search: '',
    period: ''
  },

  _filterPayslips(payslips) {
    const { search, period } = this.state;
    let [month = '', year = ''] = period ? period.split('|') : [];

    return payslips.filter((p) => {
      if (month && p.month !== month) return false;
      if (year && String(p.year) !== year) return false;
      if (search) {
        const query = search.toLowerCase();
        return (
          p.employeeName.toLowerCase().includes(query) ||
          p.employeeId.toLowerCase().includes(query)
        );
      }
      return true;
    });
  },

  async render() {
    if (!this._allPayslips) {
      return `
        <div>
          <div class="page-header">
            <nav class="breadcrumbs" id="breadcrumb-list"></nav>
            <div class="page-header-title-row">
              <div>
                <h1 class="page-header-title">Payslips Registry</h1>
                <p class="page-header-subtitle">View generated salary receipts and export printable documents</p>
              </div>
            </div>
          </div>
          <div class="table-container">
            <div class="table-controls">
              <div class="skeleton" style="width: 320px; height: 38px;"></div>
              <div class="skeleton" style="width: 180px; height: 38px;"></div>
            </div>
            <div style="padding: 20px;">
              <div class="skeleton skeleton-table-row"></div>
              <div class="skeleton skeleton-table-row"></div>
              <div class="skeleton skeleton-table-row"></div>
              <div class="skeleton skeleton-table-row"></div>
            </div>
          </div>
        </div>
      `;
    }

    const allPayslips = this._allPayslips;
    const payslips = this._filterPayslips(allPayslips);

    const periods = [...new Set(allPayslips.map((p) => `${p.month}|${p.year}`))]
      .sort((a, b) => {
        const [monthA, yearA] = a.split('|');
        const [monthB, yearB] = b.split('|');
        return Number(yearB) - Number(yearA) || monthA.localeCompare(monthB);
      });

    let tableBodyHtml = '';
    if (payslips.length === 0) {
      tableBodyHtml = `
        <tr>
          <td colspan="7" style="padding:0;">
            <div class="empty-state" style="border:none;">
              <div class="empty-state-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div class="empty-state-title">No payslips found</div>
              <div class="empty-state-description">Perform a payroll run or check your search query.</div>
            </div>
          </td>
        </tr>
      `;
    } else {
      tableBodyHtml = payslips.map(ps => `
        <tr class="payslip-row" data-id="${ps.id}" style="cursor:pointer;">
          <td style="font-weight:700; color:var(--neutral-900);">${ps.employeeName}</td>
          <td style="font-family:monospace; font-size:12px;">${ps.employeeId}</td>
          <td>${ps.month} ${ps.year}</td>
          <td>${pdfService.formatCurrency(ps.baseSalary + ps.hra + ps.allowances)}</td>
          <td style="color:var(--danger-600); font-weight:600;">-${pdfService.formatCurrency(ps.deductions)}</td>
          <td style="font-weight:800; color:var(--primary-700);">${pdfService.formatCurrency(ps.netSalary)}</td>
          <td style="text-align:right;" class="action-cell">
            <button class="btn btn-sm btn-secondary view-payslip-btn" data-id="${ps.id}">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px; height:14px; stroke-width:2.5;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              Preview
            </button>
          </td>
        </tr>
      `).join('');
    }

    return `
      <div>
        <div class="page-header">
          <nav class="breadcrumbs" id="breadcrumb-list"></nav>
          <div class="page-header-title-row">
            <div>
              <h1 class="page-header-title">Payslips Registry</h1>
              <p class="page-header-subtitle">View generated salary receipts and export printable documents</p>
            </div>
          </div>
        </div>

        <div class="table-container">
          <div class="table-controls">
            <div class="table-search-wrapper">
              <span class="table-search-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input type="text" class="form-control table-search-input" id="ps-search" placeholder="Search by name or ID..." value="${this.state.search}">
            </div>
            
            <div class="table-filters">
              <select class="form-control" id="ps-period-filter" style="width:180px; height:38px;">
                <option value="">All Periods</option>
                ${periods.map((period) => {
                  const [month, year] = period.split('|');
                  return `<option value="${period}" ${this.state.period === period ? 'selected' : ''}>${month} ${year}</option>`;
                }).join('')}
              </select>
            </div>
          </div>

          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Employee ID</th>
                  <th>Period</th>
                  <th>Gross Salary</th>
                  <th>Deductions</th>
                  <th>Net Pay</th>
                  <th style="width:120px; text-align:right;">Actions</th>
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
      this._allPayslips = await payrollService.getAllPayslips();
      const mainView = document.getElementById('main-view');
      if (mainView && appState.currentView === 'payslips') {
        mainView.innerHTML = await this.render();
        if (window.app && typeof window.app.updateBreadcrumbs === 'function') {
          window.app.updateBreadcrumbs('payslips');
        }
        this.afterRender();
      }
    } catch (err) {
      console.error(err);
    }
  },

  afterRender() {
    if (!this._allPayslips) {
      this._loadData();
      return;
    }

    const searchInput = document.getElementById('ps-search');
    if (searchInput) {
      let searchTimeout;
      searchInput.oninput = (e) => {
        clearTimeout(searchTimeout);
        const value = e.target.value;
        searchTimeout = setTimeout(() => {
          this.state.search = value;
          this.refresh();
        }, 300);
      };
    }

    const periodSelect = document.getElementById('ps-period-filter');
    if (periodSelect) {
      periodSelect.onchange = (e) => {
        this.state.period = e.target.value;
        this.refresh();
      };
    }

    document.querySelectorAll('.view-payslip-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        this._openPayslipDrawer(btn.getAttribute('data-id'));
      };
    });

    document.querySelectorAll('.payslip-row').forEach(row => {
      row.onclick = () => {
        this._openPayslipDrawer(row.getAttribute('data-id'));
      };
    });
  },

  async _openPayslipDrawer(payslipId) {
    try {
      const ps = await pdfService.getPayslipById(payslipId);
      const pdfData = await pdfService.compilePayslipData(payslipId);

      const companyName    = pdfData?.company?.name    || '—';
      const companyAddress = pdfData?.company?.address  || '';
      const companyTaxId   = pdfData?.company?.taxId    ? `Tax ID: ${pdfData.company.taxId}` : '';
      const empDepartment  = pdfData?.employee?.department || '—';
      const empRole        = pdfData?.employee?.role       || '—';
      const netPayInWords  = pdfData?.financials?.netPayInWords || '';
      const gross          = (ps.baseSalary || 0) + (ps.hra || 0) + (ps.allowances || 0);

      const bodyHtml = `
        <div class="payslip-drawer-doc">
          <div class="payslip-wrapper">

            <!-- ── Gradient Accent Bar ──────────────────────────────── -->
            <div class="payslip-accent-bar"></div>

            <div class="payslip-body-content">

              <!-- ── Corporate Header ──────────────────────────────── -->
              <div class="payslip-corporate-header">
                <div style="display:flex; align-items:flex-start; gap:var(--spacing-4);">
                  <div class="payslip-monogram">${companyName.charAt(0).toUpperCase()}</div>
                  <div class="payslip-company-info">
                    <span class="payslip-company-name">${companyName}</span>
                    ${companyAddress ? `<span style="font-size:11px; color:var(--neutral-400);">${companyAddress}</span>` : ''}
                    ${companyTaxId  ? `<span style="font-size:11px; color:var(--neutral-400);">${companyTaxId}</span>`  : ''}
                  </div>
                </div>
                <div class="payslip-title-block">
                  <span class="payslip-title-text">Salary Slip</span>
                  <span class="payslip-period-badge">${ps.month} ${ps.year}</span>
                </div>
              </div>

              <!-- ── Employee Details Grid ─────────────────────────── -->
              <div class="payslip-details-grid" style="margin-top:var(--spacing-5); margin-bottom:var(--spacing-5);">
                <div class="payslip-detail-col">
                  <span class="payslip-detail-label">Employee Name</span>
                  <span class="payslip-detail-val">${ps.employeeName}</span>
                </div>
                <div class="payslip-detail-col">
                  <span class="payslip-detail-label">Employee ID</span>
                  <span class="payslip-detail-val" style="font-family:monospace; font-size:11px;">${ps.employeeId}</span>
                </div>
                <div class="payslip-detail-col">
                  <span class="payslip-detail-label">Department</span>
                  <span class="payslip-detail-val">${empDepartment}</span>
                </div>
                <div class="payslip-detail-col">
                  <span class="payslip-detail-label">Designation</span>
                  <span class="payslip-detail-val">${empRole}</span>
                </div>
              </div>

              <!-- ── Earnings & Deductions Split ───────────────────── -->
              <div class="payslip-financial-split" style="margin-bottom:var(--spacing-5);">

                <div class="payslip-table-wrapper">
                  <div class="payslip-section-header">
                    <div class="payslip-section-dot earnings-dot"></div>
                    <div class="payslip-table-title">Earnings</div>
                  </div>
                  <table class="payslip-fin-table">
                    <tr>
                      <td>Basic Salary</td>
                      <td class="amount">${pdfService.formatCurrency(ps.baseSalary || 0)}</td>
                    </tr>
                    <tr>
                      <td>House Rent Allowance (HRA)</td>
                      <td class="amount">${pdfService.formatCurrency(ps.hra || 0)}</td>
                    </tr>
                    <tr>
                      <td>Other Allowances</td>
                      <td class="amount">${pdfService.formatCurrency(ps.allowances || 0)}</td>
                    </tr>
                    <tr class="total-row">
                      <td>Gross Pay</td>
                      <td class="amount">${pdfService.formatCurrency(gross)}</td>
                    </tr>
                  </table>
                </div>

                <div class="payslip-table-wrapper">
                  <div class="payslip-section-header">
                    <div class="payslip-section-dot deductions-dot"></div>
                    <div class="payslip-table-title">Deductions</div>
                  </div>
                  <table class="payslip-fin-table">
                    <tr>
                      <td>Statutory Deductions</td>
                      <td class="amount" style="color:var(--danger-600);">-${pdfService.formatCurrency(ps.deductions || 0)}</td>
                    </tr>
                    <tr class="total-row">
                      <td>Total Deductions</td>
                      <td class="amount" style="color:var(--danger-700);">-${pdfService.formatCurrency(ps.deductions || 0)}</td>
                    </tr>
                  </table>
                </div>

              </div>

              <!-- ── Net Pay Highlight Banner ───────────────────────── -->
              <div class="payslip-net-highlight-banner" style="margin-bottom:var(--spacing-5);">
                <div>
                  <span class="payslip-net-label">Net Take-Home Pay</span>
                  ${netPayInWords ? `<div class="payslip-net-word">${netPayInWords}</div>` : ''}
                </div>
                <div class="payslip-net-val">${pdfService.formatCurrency(ps.netSalary)}</div>
              </div>

              <!-- ── Signature & Stamp ──────────────────────────────── -->
              <div class="payslip-signature-area">
                <div class="payslip-sig-box">
                  <div class="payslip-sig-line">Employer Signature</div>
                </div>
                <div class="payslip-footer-stamp">
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px; color:var(--neutral-300); margin:0 auto var(--spacing-1);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.952 11.952 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <span>Computer Generated</span>
                  <span style="color:var(--neutral-400);">No wet signature required</span>
                </div>
                <div class="payslip-sig-box">
                  <div class="payslip-sig-line">Employee Signature</div>
                </div>
              </div>

            </div><!-- /payslip-body-content -->
          </div><!-- /payslip-wrapper -->
        </div><!-- /payslip-drawer-doc -->
      `;

      const footerHtml = `
        <button class="btn btn-secondary" onclick="document.dispatchEvent(new CustomEvent('close-drawer'))">Close</button>
        <button class="btn btn-primary" id="download-payslip-btn">Download PDF</button>
      `;

      drawer.open({
        title: 'Payslip Preview',
        bodyHtml,
        footerHtml,
        onOpen: (overlay) => {
          document.addEventListener('close-drawer', () => drawer.close(), { once: true });
          overlay.querySelector('#download-payslip-btn').onclick = async () => {
            try {
              await pdfService.generatePayslipPDF(payslipId);
              toast.success('PDF Downloaded', 'Payslip saved to your downloads folder.');
            } catch (err) {
              toast.error('Download Failed', err.message);
            }
          };
        }
      });
    } catch (err) {
      toast.error('Preview Failed', err.message);
    }
  },

  async refresh() {
    const mainView = document.getElementById('main-view');
    if (mainView && appState.currentView === 'payslips') {
      mainView.innerHTML = await this.render();
      if (window.app && typeof window.app.updateBreadcrumbs === 'function') {
        window.app.updateBreadcrumbs('payslips');
      }
      this.afterRender();
    }
  }
};
