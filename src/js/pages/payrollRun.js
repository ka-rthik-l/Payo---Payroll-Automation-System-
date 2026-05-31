/* Payroll Run Center (Mission Control) View for Payo */
import { state } from '../state.js';
import { payrollService } from '../services/payrollService.js';
import { settingsService } from '../services/settingsService.js';
import { emailService } from '../services/emailService.js';
import { pdfService } from '../services/pdfService.js';
import { toast } from '../components/toast.js';

export const payrollRunPage = {
  _loadingRun: null,

  async render() {
    await this._ensureRunLoaded();
    if (state.activeRunStep >= 4 && state.currentRunData.calculatedPayroll.length === 0 && state.currentRunData.runId) {
      try {
        const calc = await payrollService.calculateRun(state.currentRunData.runId);
        state.patchRunData({ calculatedPayroll: calc.payroll });
      } catch {
        // Run may already be finalized; payslip hydration handles completed runs.
      }
    }
    await this._hydrateCalculatedPayrollIfNeeded();

    if (state.activeRunStep === 3 && state.currentRunData.validationReport.length === 0 && state.currentRunData.runId) {
      try {
        const { report } = await payrollService.validateRun(state.currentRunData.runId);
        state.patchRunData({ validationReport: report });
      } catch {
        // Validation will run when the user advances from step 2.
      }
    }

    const currentStep = state.activeRunStep;
    const runData = state.currentRunData;
    const periodLabel = runData.runMeta
      ? `${runData.runMeta.month} ${runData.runMeta.year}`
      : 'Active Period';

    // Renders the specific Wizard body
    let stepContentHtml = '';
    let footerButtonsHtml = '';

    switch (currentStep) {
      case 1:
        stepContentHtml = this._renderStep1(runData);
        footerButtonsHtml = this._renderFooter1(runData);
        break;
      case 2:
        stepContentHtml = this._renderStep2(runData);
        footerButtonsHtml = this._renderFooter2(runData);
        break;
      case 3:
        stepContentHtml = this._renderStep3(runData);
        footerButtonsHtml = this._renderFooter3(runData);
        break;
      case 4:
        stepContentHtml = this._renderStep4(runData);
        footerButtonsHtml = this._renderFooter4(runData);
        break;
      case 5:
        stepContentHtml = this._renderStep5(runData);
        footerButtonsHtml = ``; // Autoprogressing step, no manual actions
        break;
      case 6:
        stepContentHtml = this._renderStep6(runData);
        footerButtonsHtml = this._renderFooter6(runData);
        break;
      case 7:
        stepContentHtml = this._renderStep7(runData);
        footerButtonsHtml = ``; // Final screen handles routing through primary actions
        break;
    }

    const stepsData = [
      { num: 1, title: 'Employees CSV' },
      { num: 2, title: 'Salaries CSV' },
      { num: 3, title: 'Validate' },
      { num: 4, title: 'Preview' },
      { num: 5, title: 'Generate' },
      { num: 6, title: 'Send Emails' },
      { num: 7, title: 'Done' }
    ];

    const workflowStepsHtml = stepsData.map((s, idx) => {
      let stepClass = 'future';
      let iconContent = s.num;
      let stateName = 'Upcoming';

      if (s.num === currentStep) {
        stepClass = 'active';
        stateName = 'In Progress';
      } else if (s.num < currentStep) {
        stepClass = 'completed';
        iconContent = '✓';
        stateName = 'Completed';
      }

      const connectorHtml = idx < stepsData.length - 1
        ? `<div class="workflow-step-connector ${s.num < currentStep ? 'completed' : 'future'}" role="separator" aria-hidden="true"></div>`
        : '';

      return `<div class="workflow-step-group"><div class="workflow-step ${stepClass}"><div class="workflow-step-circle">${iconContent}</div><div class="workflow-step-copy"><span class="workflow-step-title">${s.title}</span><span class="workflow-step-state workflow-step-status">${stateName}</span></div></div>${connectorHtml}</div>`;
    }).join('');

    return `
      <div>
        <div class="page-header">
          <nav class="breadcrumbs" id="breadcrumb-list"></nav>
          <div class="page-header-title-row">
            <div>
              <h1 class="page-header-title">Payroll Run Center</h1>
              <p class="page-header-subtitle">Execute ${periodLabel} batch salary processing</p>
            </div>
            <button class="btn btn-danger btn-sm" id="delete-run-btn" type="button">Delete Run</button>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:var(--spacing-6); width:100%;">
          <!-- Main Wizard Canvas -->
          <div class="card wizard-card" style="width:100%;">
            <!-- Stage Workspace -->
            <div class="wizard-body" style="padding:var(--spacing-4) 0;">
              ${stepContentHtml}
            </div>

            <!-- Navigation Controls -->
            <div class="wizard-footer">
              ${footerButtonsHtml}
            </div>
          </div>

          <!-- Bottom Workflow Progress steps panel -->
          <div class="card" style="width:100%;">
            <div class="workflow-panel-header">
              <div>
                <h3>Payroll Cycle Steps</h3>
                <p class="workflow-panel-description">Track the current run from file upload through validation, preview, generation, and delivery.</p>
              </div>
            </div>
            <div class="workflow-steps-row">
              ${workflowStepsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     STAGE 1: Upload Employee Data
     ========================================================================== */
  _renderStep1(data) {
    const filename = data.employeeFile ? data.employeeFile.name : '';
    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:var(--spacing-4); width:100%;">
        <h2 style="font-size: var(--text-base); font-weight: 700; color:var(--neutral-800);">Upload Employee Directory CSV</h2>
        <p style="font-size: var(--text-xs); color:var(--neutral-500); max-width:400px; text-align:center;">
          Provide the active workforce registry file. We require ID, full name, email address, department, and designation columns.
        </p>

        <div class="upload-dropzone" id="employees-dropzone">
          <input type="file" id="employees-file-input" accept=".csv,.xlsx,.xls" style="display:none;">
          <div class="upload-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          ${filename ? `
            <div class="upload-filename">${filename}</div>
            <div style="font-size:11px; color:var(--success-600); font-weight:600;">✓ File loaded successfully</div>
          ` : `
            <div style="font-size: var(--text-sm); font-weight: 600; color:var(--neutral-700);">Drag and drop your employee CSV file here</div>
            <div style="font-size: var(--text-xs); color:var(--neutral-400);">or click to browse local files</div>
          `}
        </div>

        <button class="upload-template-btn" id="dl-employee-template">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download standard employee CSV template
        </button>
      </div>
    `;
  },
  _renderFooter1(data) {
    return `
      <button class="btn btn-secondary" id="step1-prev-btn">Back</button>
      <button class="btn btn-primary" id="step1-next-btn" ${!data.employeeFile ? 'disabled' : ''}>Continue</button>
    `;
  },

  /* ==========================================================================
     STAGE 2: Upload Salary Data
     ========================================================================== */
  _renderStep2(data) {
    const filename = data.salaryFile ? data.salaryFile.name : '';
    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:var(--spacing-4); width:100%;">
        <h2 style="font-size: var(--text-base); font-weight: 700; color:var(--neutral-800);">Upload Salary Configuration CSV</h2>
        <p style="font-size: var(--text-xs); color:var(--neutral-500); max-width:400px; text-align:center;">
          Provide the salary numbers file. We require employee_id, base_salary, hra, allowances, and deductions columns.
        </p>

        <div class="upload-dropzone" id="salaries-dropzone">
          <input type="file" id="salaries-file-input" accept=".csv,.xlsx,.xls" style="display:none;">
          <div class="upload-icon">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          ${filename ? `
            <div class="upload-filename">${filename}</div>
            <div style="font-size:11px; color:var(--success-600); font-weight:600;">✓ File loaded successfully</div>
          ` : `
            <div style="font-size: var(--text-sm); font-weight: 600; color:var(--neutral-700);">Drag and drop your salary CSV file here</div>
            <div style="font-size: var(--text-xs); color:var(--neutral-400);">or click to browse local files</div>
          `}
        </div>

        <button class="upload-template-btn" id="dl-salary-template">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:14px; height:14px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download standard salary CSV template
        </button>
      </div>
    `;
  },
  _renderFooter2(data) {
    return `
      <button class="btn btn-secondary" id="step2-prev-btn">Back</button>
      <button class="btn btn-primary" id="step2-next-btn" ${!data.salaryFile ? 'disabled' : ''}>Run Verification Engine</button>
    `;
  },

  /* ==========================================================================
     STAGE 3: Validate Records
     ========================================================================== */
  _renderStep3(data) {
    const reports = data.validationReport || [];

    if (reports.length === 0) {
      return `
        <div style="width:100%; max-width:600px; text-align:center;">
          <h3 style="font-weight:700; color:var(--neutral-900);">Awaiting Validation</h3>
          <p style="font-size:var(--text-xs); color:var(--neutral-500); margin-top:var(--spacing-2);">
            Complete salary upload and run verification from the previous step.
          </p>
        </div>
      `;
    }

    const errors = reports.filter(r => r.type === 'error');
    const warnings = reports.filter(r => r.type === 'warning');

    let statusHeaderHtml = '';
    if (errors.length > 0) {
      statusHeaderHtml = `
        <div style="text-align:center; margin-bottom:var(--spacing-4);">
          <div style="width:48px; height:48px; border-radius:50%; background-color:var(--danger-50); color:var(--danger-500); display:flex; align-items:center; justify-content:center; margin:0 auto var(--spacing-3);">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h3 style="font-weight:700; color:var(--neutral-900);">Verification Failed</h3>
          <p style="font-size:var(--text-xs); color:var(--neutral-500); margin-top:2px;">Correct columns in uploaded records before continuing.</p>
        </div>
      `;
    } else if (errors.length === 0) {
      statusHeaderHtml = `
        <div style="text-align:center; margin-bottom:var(--spacing-4);">
          <div style="width:48px; height:48px; border-radius:50%; background-color:var(--success-50); color:var(--success-500); display:flex; align-items:center; justify-content:center; margin:0 auto var(--spacing-3);">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:28px; height:28px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 style="font-weight:700; color:var(--neutral-900);">Verification Successful</h3>
          <p style="font-size:var(--text-xs); color:var(--neutral-500); margin-top:2px;">Records matched database references successfully.</p>
        </div>
      `;
    }

    const itemsHtml = reports.map(r => `
      <div class="validation-item ${r.type}">
        <div class="validation-item-icon ${r.type}">
          ${r.type === 'error' 
            ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` 
            : r.type === 'warning'
            ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`
            : `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:20px; height:20px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
          }
        </div>
        <div class="validation-item-details">
          <div class="validation-item-title">${r.title}</div>
          <div class="validation-item-desc">${r.desc}</div>
        </div>
      </div>
    `).join('');

    return `
      <div style="width:100%; max-width:600px;">
        ${statusHeaderHtml}
        
        <div class="validation-list">
          ${itemsHtml}
        </div>
      </div>
    `;
  },
  _renderFooter3(data) {
    const reports = data.validationReport || [];
    const hasErrors = reports.some(r => r.type === 'error');
    const isReady = reports.length > 0 && !hasErrors;
    return `
      <button class="btn btn-secondary" id="step3-prev-btn">Reset Uploads</button>
      <button class="btn btn-primary" id="step3-next-btn" ${!isReady ? 'disabled' : ''}>Calculate & Preview Calculations</button>
    `;
  },

  /* ==========================================================================
     STAGE 4: Preview Payroll Calculations
     ========================================================================== */
  _renderStep4(data) {
    const payroll = data.calculatedPayroll;
    
    // Totals calculations
    const totalGross = payroll.reduce((sum, item) => sum + item.grossSalary, 0);
    const totalDeductions = payroll.reduce((sum, item) => sum + item.deductions, 0);
    const totalNet = payroll.reduce((sum, item) => sum + item.netSalary, 0);

    const rowsHtml = payroll.map(item => `
      <tr>
        <td style="font-weight:700; color:var(--neutral-900);">${item.employeeName}</td>
        <td style="font-family:monospace; font-size:12px;">${item.employeeId}</td>
        <td>${pdfService.formatCurrency(item.baseSalary)}</td>
        <td>${pdfService.formatCurrency(item.hra)}</td>
        <td>${pdfService.formatCurrency(item.allowances)}</td>
        <td style="color:var(--danger-600); font-weight:600;">-${pdfService.formatCurrency(item.deductions)}</td>
        <td style="font-weight:800; color:var(--primary-700);">${pdfService.formatCurrency(item.netSalary)}</td>
      </tr>
    `).join('');

    return `
      <div class="payroll-preview-layout">
        <div style="text-align:center;">
          <h2 style="font-size: var(--text-base); font-weight: 700; color:var(--neutral-800);">Approve Calculated Salary Roster</h2>
          <p style="font-size: var(--text-xs); color:var(--neutral-500); margin-top:2px;">Confirm calculated values before generating slips and locking period logs.</p>
        </div>

        <!-- Totals banner grid -->
        <div class="preview-grid-totals">
          <div class="preview-total-card">
            <div class="preview-total-label">Total Gross Pay</div>
            <div class="preview-total-value">${pdfService.formatCurrency(totalGross)}</div>
          </div>
          <div class="preview-total-card" style="border-left: 3px solid var(--danger-500);">
            <div class="preview-total-label">Total Deductions</div>
            <div class="preview-total-value" style="color: var(--danger-600);">${pdfService.formatCurrency(totalDeductions)}</div>
          </div>
          <div class="preview-total-card" style="border-left: 3px solid var(--primary-500); background-color: var(--primary-50);">
            <div class="preview-total-label">Total Net Pay</div>
            <div class="preview-total-value" style="color: var(--primary-700);">${pdfService.formatCurrency(totalNet)}</div>
          </div>
        </div>

        <!-- Roster details table -->
        <div class="table-container table-scroll" style="max-height:220px; overflow-y:auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>ID</th>
                <th>Base</th>
                <th>HRA</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Net Pay</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
  _renderFooter4(data) {
    return `
      <button class="btn btn-secondary" id="step4-prev-btn">Back</button>
      <button class="btn btn-primary" id="step4-next-btn">Approve & Generate Payslips</button>
    `;
  },

  /* ==========================================================================
     STAGE 5: Generate Payslips
     ========================================================================== */
  _renderStep5(data) {
    return `
      <div style="display:flex; flex-direction:column; align-items:center; gap:var(--spacing-6); text-align:center;">
        <div class="spinner" style="width:48px; height:48px; border-width:4px;"></div>
        <div>
          <h2 style="font-size: var(--text-base); font-weight: 700; color:var(--neutral-800);">Compiling Salary slips</h2>
          <p style="font-size: var(--text-xs); color:var(--neutral-500); margin-top: var(--spacing-2); max-width: 320px;" id="compile-progress-text">
            Writing payslip files and binding financial records to the database...
          </p>
        </div>
        
        <!-- Mock loading bar indicator -->
        <div style="width:240px; height:6px; background-color:var(--neutral-100); border-radius:3px; overflow:hidden; border:1px solid var(--neutral-200);">
          <div id="compile-loading-bar" style="width:0%; height:100%; background-color:var(--primary-600); transition: width 200ms ease;"></div>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     STAGE 6: Send Outbound Emails
     ========================================================================== */
  _renderStep6(data) {
    return `
      <div style="display:flex; flex-direction:column; gap:var(--spacing-4); width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h2 style="font-size: var(--text-base); font-weight: 700; color:var(--neutral-800);">Outbound Email Dispatch</h2>
            <p style="font-size: var(--text-xs); color:var(--neutral-500); margin-top:2px;">Sending pay receipts to employee records</p>
          </div>
          
          <div style="display:flex; gap:var(--spacing-4);" id="email-live-indicators">
            <span style="font-size:var(--text-xs); font-weight:600; color:var(--neutral-500);">Sent: <strong id="mails-sent-count" style="color:var(--success-600);">0</strong></span>
            <span style="font-size:var(--text-xs); font-weight:600; color:var(--neutral-500);">Failed: <strong id="mails-failed-count" style="color:var(--danger-500);">0</strong></span>
          </div>
        </div>

        <!-- Terminal screen console -->
        <div class="email-log-console" id="email-log-console">
          <div class="email-log-line system" id="email-init-log-line">[EMAIL DISPATCH STARTED] Initializing SendGrid dispatch...</div>
        </div>
      </div>
    `;
  },
  _renderFooter6(data) {
    return `
      <span style="font-size:var(--text-xs); color:var(--neutral-400); align-self:center;" id="email-step-status-msg">Email dispatch in progress...</span>
      <button class="btn btn-primary" id="step6-next-btn" disabled>Generate Run Summary</button>
    `;
  },

  /* ==========================================================================
     STAGE 7: Run Done / Completion Summary
     ========================================================================== */
  _renderStep7(data) {
    const totalNet = data.calculatedPayroll.reduce((sum, item) => sum + item.netSalary, 0);
    const successCount = data.calculatedPayroll.length - (data.emailsFailed || 0);
    const periodLabel = data.runMeta
      ? `${data.runMeta.month} ${data.runMeta.year}`
      : 'Payroll Run';

    return `
      <div style="display:flex; flex-direction:column; align-items:center; text-align:center; gap:var(--spacing-6); width:100%; max-width:480px;">
        <div style="width:56px; height:56px; border-radius:50%; background-color:var(--success-50); color:var(--success-500); display:flex; align-items:center; justify-content:center;">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:32px; height:32px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.952 11.952 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
        </div>

        <div>
          <h2 style="font-size: var(--text-lg); font-weight: 800; color:var(--neutral-900);">${periodLabel} Run Finalized</h2>
          <p style="font-size: var(--text-xs); color:var(--neutral-500); margin-top:2px; max-width:360px;">
            The payroll cycle has been processed, locked, and payslips generated. Communication email logs are saved.
          </p>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:var(--spacing-4); width:100%; background-color:var(--neutral-50); border:1px solid var(--neutral-200); padding:var(--spacing-4); border-radius:var(--radius-lg); text-align:left;">
          <div>
            <div style="font-size:10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Batch Roster Paid</div>
            <div style="font-weight:700; color:var(--neutral-800); font-size:var(--text-sm); margin-top:2px;">${data.calculatedPayroll.length} Employees</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Total Disbursements</div>
            <div style="font-weight:700; color:var(--primary-700); font-size:var(--text-sm); margin-top:2px;">${pdfService.formatCurrency(totalNet)}</div>
          </div>
          <div style="grid-column: span 2; border-top: 1px solid var(--neutral-200); padding-top:var(--spacing-3); margin-top:var(--spacing-1);">
            <div style="font-size:10px; font-weight:600; color:var(--neutral-400); text-transform:uppercase;">Email Delivery Status</div>
            <div style="font-weight:700; color:var(--neutral-800); font-size:var(--text-sm); margin-top:2px; display:flex; gap:var(--spacing-3);">
              <span style="color:var(--success-600);">✓ ${successCount} Delivered</span>
              ${data.emailsFailed > 0 ? `<span style="color:var(--danger-500);">⚠ ${data.emailsFailed} Failed</span>` : ''}
            </div>
          </div>
        </div>

        <div style="display:flex; gap:var(--spacing-3); width:100%;">
          <button class="btn btn-secondary" style="flex:1;" id="done-view-payslips-btn">View Registry</button>
          <button class="btn btn-primary" style="flex:1;" id="done-view-emails-btn">Manage Email Queue</button>
        </div>
      </div>
    `;
  },

  /* ==========================================================================
     INTERACTIONS & BINDINGS (afterRender)
     ========================================================================== */
  afterRender() {
    const deleteBtn = document.getElementById('delete-run-btn');
    if (deleteBtn) {
      deleteBtn.onclick = () => this._handleDeleteRun();
    }

    const currentStep = state.activeRunStep;

    switch (currentStep) {
      case 1:
        this._bindStep1();
        break;
      case 2:
        this._bindStep2();
        break;
      case 3:
        this._bindStep3();
        break;
      case 4:
        this._bindStep4();
        break;
      case 5:
        this._bindStep5();
        break;
      case 6:
        this._bindStep6();
        break;
      case 7:
        this._bindStep7();
        break;
    }
  },

  async _handleDeleteRun() {
    const runId = state.currentRunData.runId;
    if (!runId) {
      toast.error('Delete Failed', 'No active payroll run is available for deletion.');
      return;
    }

    const confirmed = confirm(
      'Delete this payroll run?\n\nThis will permanently remove:\n- Payslips\n- Email Logs\n- Validation Data\n- Upload Records\n\nEmployees and Settings will NOT be affected.'
    );
    if (!confirmed) return;

    try {
      await payrollService.deleteRun(runId);
      sessionStorage.removeItem('payo_run_id');
      state.patchRunData({
        runId: null,
        runMeta: null,
        employeeFile: null,
        salaryFile: null,
        parsedEmployees: [],
        parsedSalaries: [],
        validationReport: [],
        calculatedPayroll: [],
        generatedPayslips: [],
        emailQueue: [],
        emailsFailed: 0
      });
      state.setRunStep(1);
      toast.success('Payroll Run Deleted', `Payroll run ${runId} was removed. A new run will be initialized for the active period.`);
      await this.refresh();
    } catch (err) {
      toast.error('Delete Failed', err.message);
    }
  },

  _bindStep1() {
    const dropzone = document.getElementById('employees-dropzone');
    const input = document.getElementById('employees-file-input');
    const nextBtn = document.getElementById('step1-next-btn');
    const dlBtn = document.getElementById('dl-employee-template');

    // Template download
    dlBtn.onclick = () => {
      const csvContent = payrollService.getEmployeeCSVTemplate();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'employees_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info('Template Downloaded', 'employees_template.csv is saved to your downloads folder.');
    };

    // Click trigger browse
    dropzone.onclick = () => input.click();

    // Drag-over styling
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    };
    dropzone.ondragleave = () => dropzone.classList.remove('dragover');
    
    // Drop file
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this._handleEmployeeFile(files[0]);
      }
    };

    // Browse select
    input.onchange = (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        this._handleEmployeeFile(files[0]);
      }
    };

    if (nextBtn) {
      nextBtn.onclick = () => {
        state.setRunStep(2);
      };
    }

    const prevBtn = document.getElementById('step1-prev-btn');
    if (prevBtn) {
      prevBtn.onclick = () => state.setView('dashboard');
    }
  },

  async _handleEmployeeFile(file) {
    try {
      await this._ensureRunLoaded();
      const runId = state.currentRunData.runId;
      const data = await payrollService.uploadEmployees(runId, file);
      this._applyRunData(data);
      toast.success('Employees Loaded', `Uploaded and parsed ${data.rowCount || data.staging?.employees?.length || 0} employees.`);
      this.refresh();
    } catch (err) {
      toast.error('Upload Failed', err.message);
    }
  },

  _bindStep2() {
    const dropzone = document.getElementById('salaries-dropzone');
    const input = document.getElementById('salaries-file-input');
    const prevBtn = document.getElementById('step2-prev-btn');
    const nextBtn = document.getElementById('step2-next-btn');
    const dlBtn = document.getElementById('dl-salary-template');

    // Template download
    dlBtn.onclick = () => {
      const csvContent = payrollService.getSalaryCSVTemplate();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'salaries_template.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.info('Template Downloaded', 'salaries_template.csv is saved to your downloads folder.');
    };

    dropzone.onclick = () => input.click();

    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    };
    dropzone.ondragleave = () => dropzone.classList.remove('dragover');
    
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this._handleSalaryFile(files[0]);
      }
    };

    input.onchange = (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        this._handleSalaryFile(files[0]);
      }
    };

    prevBtn.onclick = () => state.setRunStep(1);
    
    nextBtn.onclick = async () => {
      try {
        const { report } = await payrollService.validateRun(state.currentRunData.runId);
        state.patchRunData({ validationReport: report });
        state.setRunStep(3);
      } catch (err) {
        toast.error('Validation Failed', err.message);
      }
    };
  },

  async _handleSalaryFile(file) {
    try {
      await this._ensureRunLoaded();
      const runId = state.currentRunData.runId;
      const data = await payrollService.uploadSalaries(runId, file);
      this._applyRunData(data);
      toast.success('Salaries Loaded', `Uploaded and parsed ${data.rowCount || data.staging?.salaries?.length || 0} wage records.`);
      this.refresh();
    } catch (err) {
      toast.error('Upload Failed', err.message);
    }
  },

  _bindStep3() {
    const prevBtn = document.getElementById('step3-prev-btn');
    const nextBtn = document.getElementById('step3-next-btn');

    prevBtn.onclick = async () => {
      try {
        const data = await payrollService.resetStaging(state.currentRunData.runId);
        this._applyRunData(data);
        state.patchRunData({
          validationReport: [],
          calculatedPayroll: [],
          employeeFile: null,
          salaryFile: null
        });
        state.setRunStep(1);
        toast.info('Uploads Reset', 'Staging data cleared. Re-upload employee and salary files.');
      } catch (err) {
        toast.error('Reset Failed', err.message);
      }
    };

    nextBtn.onclick = async () => {
      try {
        const data = await payrollService.calculateRun(state.currentRunData.runId);
        state.patchRunData({ calculatedPayroll: data.payroll });
        state.setRunStep(4);
      } catch (err) {
        toast.error('Calculation Failed', err.message);
      }
    };
  },

  _bindStep4() {
    const prevBtn = document.getElementById('step4-prev-btn');
    const nextBtn = document.getElementById('step4-next-btn');

    prevBtn.onclick = () => state.setRunStep(3);
    
    nextBtn.onclick = () => {
      state.setRunStep(5);
    };
  },

  _bindStep5() {
    this._runCompileEngine();
  },

  async _runCompileEngine() {
    const bar = document.getElementById('compile-loading-bar');
    const text = document.getElementById('compile-progress-text');
    const runData = state.currentRunData;

    // Simulate progress updates
    const updates = [
      { p: 20, t: 'Loading employee directory configurations...' },
      { p: 50, t: 'Computing Net Take-Home formulas (Base + HRA + Allowances - Deductions)...' },
      { p: 80, t: 'Finalizing ledger transactions and creating payslip entries...' },
      { p: 100, t: 'Commit complete. Roster locked.' }
    ];

    for (const update of updates) {
      await new Promise(resolve => setTimeout(resolve, 400));
      if (bar) bar.style.width = `${update.p}%`;
      if (text) text.textContent = update.t;
    }

    // Save Run & Payslips to DB
    try {
      const result = await payrollService.finalizeRun(state.currentRunData.runId);
      state.patchRunData({
        runMeta: result.run,
        runId: result.run.id
      });
      toast.success('Ledger Saved', `Generated ${result.payslipsCreated} payslips and queued ${result.emailsQueued} emails.`);
      state.setRunStep(6);
    } catch (err) {
      toast.error('Generation Failed', err.message);
      if (err.code === 'RUN_ALREADY_FINALIZED') {
        state.setRunStep(6);
        return;
      }
      state.setRunStep(4);
    }
  },

  _bindStep6() {
    // Patch the initial log line with the live dispatch state
    settingsService.getSettings().then(() => {
      const initLine = document.getElementById('email-init-log-line');
      if (initLine) {
        initLine.textContent = '[EMAIL DISPATCH STARTED] Initializing SendGrid dispatch...';
      }
    }).catch(() => {
      // Settings fetch failed — leave the generic placeholder as-is
    });
    // Automatically trigger email dispatches
    this._runEmailDispatches();
  },

  async _runEmailDispatches() {
    const consoleBox = document.getElementById('email-log-console');
    const sentCount = document.getElementById('mails-sent-count');
    const failedCount = document.getElementById('mails-failed-count');
    const nextBtn = document.getElementById('step6-next-btn');
    const statusMsg = document.getElementById('email-step-status-msg');

    const logLine = (text, type = 'system') => {
      if (!consoleBox) return;
      const line = document.createElement('div');
      line.className = `email-log-line ${type}`;
      line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
      consoleBox.appendChild(line);
      consoleBox.scrollTop = consoleBox.scrollHeight;
    };

    const finishStep = (sent, failed, message) => {
      state.patchRunData({ emailsFailed: failed });
      logLine(`Email delivery pipeline complete. Sent: ${sent}, Failed: ${failed}`, 'system');
      if (statusMsg) statusMsg.textContent = message;
      if (nextBtn) {
        nextBtn.removeAttribute('disabled');
        nextBtn.onclick = () => state.setRunStep(7);
      }
    };

    if (state.currentRunData.runMeta?.status === 'emails_sent') {
      const sent = state.currentRunData.runMeta.emailsSent || 0;
      const failed = state.currentRunData.runMeta.emailsFailed || 0;
      if (sentCount) sentCount.textContent = sent;
      if (failedCount) failedCount.textContent = failed;
      finishStep(sent, failed, 'All pay receipt emails successfully dispatched.');
      return;
    }

    const runId = state.currentRunData.runId;

    let currentSent = 0;
    let currentFailed = 0;

    try {
      const result = await emailService.processEmailQueue(runId, (log, message, status) => {
        if (status === 'success') {
          currentSent++;
          if (sentCount) sentCount.textContent = currentSent;
          logLine(message, 'success');
        } else if (status === 'error') {
          currentFailed++;
          if (failedCount) failedCount.textContent = currentFailed;
          logLine(message, 'error');
        } else {
          logLine(message, 'system');
        }
      });

      currentSent = result.sentCount;
      currentFailed = result.failedCount;
      if (sentCount) sentCount.textContent = currentSent;
      if (failedCount) failedCount.textContent = currentFailed;
    } catch (err) {
      logLine(`[ERROR] ${err.message}`, 'error');
      toast.error('Email Dispatch Failed', err.message);
    }

    state.patchRunData({ emailsFailed: currentFailed });

    finishStep(
      currentSent,
      currentFailed,
      currentFailed > 0
        ? `Email delivery complete. Warnings: ${currentFailed} deliveries blocked.`
        : 'All pay receipt emails successfully dispatched.'
    );
  },

  _bindStep7() {
    const doneSlipsBtn = document.getElementById('done-view-payslips-btn');
    const doneEmailsBtn = document.getElementById('done-view-emails-btn');

    doneSlipsBtn.onclick = () => {
      state.setView('payslips');
    };

    doneEmailsBtn.onclick = () => {
      state.setView('emails');
    };
  },

  async _hydrateCalculatedPayrollIfNeeded() {
    const { runId, calculatedPayroll, runMeta } = state.currentRunData;
    if (!runId || calculatedPayroll.length > 0) return;
    if (!runMeta || !['completed', 'emails_sent'].includes(runMeta.status)) return;

    const payslips = await payrollService.getAllPayslips();
    const runPayslips = payslips.filter((p) => p.runId === runId);
    if (runPayslips.length === 0) return;

    state.patchRunData({
      calculatedPayroll: runPayslips.map((p) => ({
      employeeId: p.employeeId,
      employeeName: p.employeeName,
      email: '',
      department: '',
      role: '',
      baseSalary: p.baseSalary,
      hra: p.hra,
      allowances: p.allowances,
      deductions: p.deductions,
      grossSalary: p.grossSalary,
      netSalary: p.netSalary
    }))
  });
},

  async _ensureRunLoaded() {
    if (this._loadingRun) {
      return this._loadingRun;
    }

    if (state.currentRunData.runId) {
      // Guard against stale in-memory state after an active-period change.
      // Settings clears sessionStorage when the period changes; if the stored
      // ID no longer matches what's in memory the in-memory data is stale and
      // must be discarded so we fetch the new period's run below.
      const storedRunId = sessionStorage.getItem('payo_run_id');
      if (storedRunId === state.currentRunData.runId) {
        // In-memory state matches storage — nothing to do.
        return;
      }
      // Mismatch (or storage was cleared): reset all stale run state.
      state.patchRunData({
        runId: null,
        runMeta: null,
        employeeFile: null,
        salaryFile: null,
        validationReport: [],
        calculatedPayroll: [],
        emailsFailed: 0
      });
      state.setRunStep(1);
    }

    this._loadingRun = (async () => {
      try {
        const storedRunId = sessionStorage.getItem('payo_run_id');
        let data;

        if (storedRunId) {
          try {
            data = await payrollService.getRunById(storedRunId);
          } catch {
            sessionStorage.removeItem('payo_run_id');
            data = await this._loadCurrentOrFinalizedRun();
          }
        } else {
          data = await this._loadCurrentOrFinalizedRun();
        }

        this._applyRunData(data);

        if (data.wizardProgress?.suggestedStep > 1 && state.activeRunStep === 1) {
          state.setRunStep(data.wizardProgress.suggestedStep);
        }
      } catch (err) {
        if (err.code === 'RUN_ALREADY_FINALIZED') {
          sessionStorage.removeItem('payo_run_id');
          toast.info('Period Complete', err.message);
          state.setView('dashboard');
          return;
        }
        toast.error('Run Load Failed', err.message);
      } finally {
        this._loadingRun = null;
      }
    })();

    return this._loadingRun;
  },

  async _loadCurrentOrFinalizedRun() {
    try {
      return await payrollService.getOrCreateCurrentRun();
    } catch (err) {
      if (err.code !== 'RUN_ALREADY_FINALIZED') {
        throw err;
      }

      const settings = await settingsService.getSettings();
      const runs = await payrollService.getPayrollRuns();
      const finalized = runs.find(
        (run) =>
          run.month === settings.activePeriodMonth &&
          run.year === settings.activePeriodYear &&
          ['completed', 'emails_sent'].includes(run.status)
      );

      if (!finalized) {
        throw err;
      }

      return payrollService.getRunById(finalized.id);
    }
  },

  _applyRunData(data) {
    const hydrated = payrollService.hydrateRunState(data);
    state.patchRunData(hydrated);
    if (data.run) {
      state.patchRunData({
        runMeta: data.run,
        runId: data.run.id
      });
      sessionStorage.setItem('payo_run_id', data.run.id);
    }
  },

  async refresh() {
    const mainView = document.getElementById('main-view');
    if (mainView) {
      mainView.innerHTML = await this.render();
      if (window.app && typeof window.app.updateBreadcrumbs === 'function') {
        window.app.updateBreadcrumbs('payroll');
      }
      this.afterRender();
    }
  }
};
