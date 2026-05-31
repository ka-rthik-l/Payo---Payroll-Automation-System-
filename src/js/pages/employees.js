/* Employees Directory Page for Payo */
import { employeeService } from '../services/employeeService.js';
import { pdfService } from '../services/pdfService.js';
import { settingsService } from '../services/settingsService.js';
import { drawer } from '../components/drawer.js';
import { toast } from '../components/toast.js';

export const employeesPage = {
  // Store local search and filter states
  state: {
    search: '',
    department: ''
  },

  async render() {
    // 1. Fetch filtered employees and department list
    const employees = await employeeService.getEmployees(this.state.search, this.state.department);
    const departments = await employeeService.getDepartments();

    // Generate table content or empty state
    let tableBodyHtml = '';
    if (employees.length === 0) {
      tableBodyHtml = `
        <tr>
          <td colspan="5" style="padding:0;">
            <div class="empty-state" style="border:none;">
              <div class="empty-state-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <div class="empty-state-title">No employees found</div>
              <div class="empty-state-description">Try adjusting your filters or add a new employee profile to the database directory.</div>
            </div>
          </td>
        </tr>
      `;
    } else {
      tableBodyHtml = employees.map(emp => `
        <tr class="employee-row" data-id="${emp.id}" style="cursor:pointer;">
          <td style="font-weight: 700; color: var(--neutral-900);">${emp.name}</td>
          <td style="font-family: monospace; font-size: 12px;">${emp.id}</td>
          <td>${emp.email}</td>
          <td><span class="badge badge-neutral">${emp.department}</span></td>
          <td>${emp.role}</td>
          <td style="text-align:right;" class="action-cell">
            <button class="btn btn-sm btn-ghost delete-emp-btn" data-id="${emp.id}" title="Remove Employee">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:16px; height:16px; color:var(--danger-500);"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
              <h1 class="page-header-title">Employee Directory</h1>
              <p class="page-header-subtitle">Manage active employee files and contact directories</p>
            </div>
            <button class="btn btn-primary" id="add-employee-btn">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" style="width:18px; height:18px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
              Add Employee
            </button>
          </div>
        </div>

        <div class="table-container">
          <!-- Filter and Search Controls -->
          <div class="table-controls">
            <div class="table-search-wrapper">
              <span class="table-search-icon">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input type="text" class="form-control table-search-input" id="emp-search" placeholder="Search by name, email, or ID..." value="${this.state.search}">
            </div>
            
            <div class="table-filters">
              <select class="form-control" id="emp-dept-filter" style="width:180px; height:38px;">
                <option value="">All Departments</option>
                ${departments.map(dept => `<option value="${dept}" ${this.state.department === dept ? 'selected' : ''}>${dept}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Employees Table -->
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th style="width:80px; text-align:right;">Actions</th>
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

  afterRender() {
    // 1. Search filter event
    const searchInput = document.getElementById('emp-search');
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

    // 2. Department filter event
    const deptSelect = document.getElementById('emp-dept-filter');
    if (deptSelect) {
      deptSelect.onchange = (e) => {
        this.state.department = e.target.value;
        this.refresh();
      };
    }

    // 3. Open Add Employee Form Drawer
    const addBtn = document.getElementById('add-employee-btn');
    if (addBtn) {
      addBtn.onclick = () => this._openAddEmployeeDrawer();
    }

    // 4. Row selection drawer details
    const rows = document.querySelectorAll('.employee-row');
    rows.forEach(row => {
      row.onclick = (e) => {
        // Prevent trigger if action button was clicked
        if (e.target.closest('.action-cell')) return;
        
        const empId = row.dataset.id;
        this._openEmployeeDetailDrawer(empId);
      };
    });

    // 5. Delete employee buttons
    const deleteBtns = document.querySelectorAll('.delete-emp-btn');
    deleteBtns.forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation(); // prevent row click
        const id = btn.dataset.id;
        if (confirm(`Are you sure you want to delete employee record "${id}"?`)) {
          try {
            await employeeService.deleteEmployee(id);
            toast.success('Employee Deleted', `Successfully removed record "${id}" from the database.`);
            this.refresh();
          } catch (err) {
            toast.error('Deletion Failed', err.message);
          }
        }
      };
    });
  },

  async refresh() {
    const mainView = document.getElementById('main-view');
    if (mainView) {
      mainView.innerHTML = await this.render();
      if (window.app && typeof window.app.updateBreadcrumbs === 'function') {
        window.app.updateBreadcrumbs('employees');
      }
      this.afterRender();
    }
  },

  _openAddEmployeeDrawer() {
    const bodyHtml = `
      <form id="add-employee-form" style="display:flex; flex-direction:column; gap:var(--spacing-4);">
        <div class="form-group">
          <label class="form-label">Employee ID (Optional)</label>
          <input type="text" class="form-control" name="id" placeholder="e.g. EMP006 (leave empty to auto-generate)">
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input type="text" class="form-control" name="name" required placeholder="Jane Cooper">
        </div>
        <div class="form-group">
          <label class="form-label">Email Address</label>
          <input type="email" class="form-control" name="email" required placeholder="jane.cooper@company.com">
        </div>
        <div class="form-group">
          <label class="form-label">Department</label>
          <input type="text" class="form-control" name="department" required placeholder="e.g. Engineering, Sales, HR">
        </div>
        <div class="form-group">
          <label class="form-label">Job Designation / Role</label>
          <input type="text" class="form-control" name="role" required placeholder="e.g. Staff Engineer">
        </div>
      </form>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.dispatchEvent(new CustomEvent('close-drawer'))">Cancel</button>
      <button class="btn btn-primary" form="add-employee-form" type="submit">Create Profile</button>
    `;

    drawer.open({
      title: 'Add Employee Profile',
      bodyHtml,
      footerHtml,
      onOpen: (overlay) => {
        // Handle cancel btn click
        document.addEventListener('close-drawer', () => drawer.close(), { once: true });
        
        // Handle form submit
        const form = overlay.querySelector('#add-employee-form');
        form.onsubmit = async (e) => {
          e.preventDefault();
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          
          try {
            const added = await employeeService.addEmployee(data);
            toast.success('Profile Created', `Employee ${added.name} (${added.id}) successfully added to directory.`);
            drawer.close();
            this.refresh();
          } catch (err) {
            toast.error('Creation Failed', err.message);
          }
        };
      }
    });
  },

  async _openEmployeeDetailDrawer(empId) {
    const emp = await employeeService.getEmployeeById(empId);
    if (!emp) return;

    const settings = await settingsService.getSettings();
    const currency = settings?.currency || 'USD';
    const fmt = (value) => pdfService.formatCurrency(value, currency);

    const lastPayslip = emp.lastPayslip || null;

    const bodyHtml = `
      <div style="display:flex; flex-direction:column; gap:var(--spacing-6);">
        <!-- Avatar card -->
        <div style="display:flex; align-items:center; gap:var(--spacing-4); background-color:var(--surface-sunken); padding:var(--spacing-4); border-radius:var(--radius-lg); border:1px solid var(--surface-sunken-border);">
          <div style="width:48px; height:48px; border-radius:var(--radius-full); background-color:var(--interactive-soft); color:var(--primary-500); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:var(--text-base);">
            ${emp.name.split(' ').map(n=>n[0]).join('')}
          </div>
          <div>
            <h3 style="font-weight:700; color:var(--text-primary); font-size:var(--text-base);">${emp.name}</h3>
            <p style="color:var(--text-muted); font-size:var(--text-xs); font-family:monospace; margin-top:2px;">ID: ${emp.id}</p>
          </div>
        </div>

        <!-- Meta fields -->
        <div style="display:flex; flex-direction:column; gap:var(--spacing-3);">
          <h4 style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--surface-sunken-border); padding-bottom:var(--spacing-1);">Employment details</h4>
          <div style="display:grid; grid-template-columns:1fr 1.5fr; gap:var(--spacing-2); font-size:var(--text-sm);">
            <span style="color:var(--text-secondary);">Email:</span>
            <span style="font-weight:600; color:var(--text-primary);">${emp.email}</span>
            <span style="color:var(--text-secondary);">Department:</span>
            <span style="font-weight:600; color:var(--text-primary);">${emp.department}</span>
            <span style="color:var(--text-secondary);">Designation:</span>
            <span style="font-weight:600; color:var(--text-primary);">${emp.role}</span>
          </div>
        </div>

        <!-- Salary summary if run center has generated payslips -->
        <div style="display:flex; flex-direction:column; gap:var(--spacing-3);">
          <h4 style="font-size:10px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--surface-sunken-border); padding-bottom:var(--spacing-1);">Salary Configuration</h4>
          ${lastPayslip ? `
            <div style="background-color:var(--period-bg); border:1px solid var(--period-border); padding:var(--spacing-4); border-radius:var(--radius-md);">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:var(--text-xs); color:var(--period-text); margin-bottom:var(--spacing-2);">
                <span>Current Month Rate (${lastPayslip.month} ${lastPayslip.year})</span>
                <span style="font-weight:700;">Calculated</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:var(--text-sm); font-weight:600; margin-bottom: var(--spacing-1);">
                <span style="color:var(--text-secondary);">Basic Salary:</span>
                <span style="color:var(--text-primary);">${fmt(lastPayslip.baseSalary)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:var(--text-sm); font-weight:600; margin-bottom: var(--spacing-1);">
                <span style="color:var(--text-secondary);">HRA:</span>
                <span style="color:var(--text-primary);">${fmt(lastPayslip.hra)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:var(--text-sm); font-weight:600; margin-bottom: var(--spacing-1);">
                <span style="color:var(--text-secondary);">Allowances:</span>
                <span style="color:var(--text-primary);">${fmt(lastPayslip.allowances)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:var(--text-sm); font-weight:600; margin-bottom: var(--spacing-2); border-bottom:1px solid var(--period-border); padding-bottom:var(--spacing-2);">
                <span style="color:var(--text-secondary);">Deductions:</span>
                <span style="color:var(--status-danger-text);">${fmt(lastPayslip.deductions)}</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:var(--text-xs); font-weight:700; color:var(--period-text);">NET MONTHLY PAY:</span>
                <span style="font-size:var(--text-lg); font-weight:800; color:var(--primary-500);">${fmt(lastPayslip.netSalary)}</span>
              </div>
            </div>
          ` : `
            <p style="font-size:var(--text-sm); color:var(--text-muted); font-style:italic;">No salary calculations processed for this employee yet.</p>
          `}
        </div>
      </div>
    `;

    const footerHtml = `
      <button class="btn btn-secondary" onclick="document.dispatchEvent(new CustomEvent('close-drawer'))">Close Panel</button>
    `;

    drawer.open({
      title: 'Employee File',
      bodyHtml,
      footerHtml,
      onOpen: () => {
        document.addEventListener('close-drawer', () => drawer.close(), { once: true });
      }
    });
  }
};
