/* Settings Panel View for Payo */
import { settingsService } from '../services/settingsService.js';
import { toast } from '../components/toast.js';

export const settingsPage = {
  state: {
    activeTab: 'profile' // 'profile', 'rules'
  },

  async render() {
    // 1. Fetch current settings from database
    const settings = await settingsService.getSettings();

    return `
      <div>
        <div style="margin-bottom: var(--spacing-6);">
          <h1 style="font-size: var(--text-2xl); font-weight: 800; color: var(--neutral-900); letter-spacing:-0.03em;">Settings</h1>
          <p style="font-size: var(--text-sm); color: var(--neutral-500); margin-top:2px;">Configure company details and payroll cycle rules</p>
        </div>

        <div class="card" style="padding: var(--spacing-8);">
          <div class="settings-tab-container">
            <!-- Left Tabs List -->
            <div class="settings-tabs-list">
              <button class="settings-tab-btn ${this.state.activeTab === 'profile' ? 'active' : ''}" id="tab-profile-btn">Company Profile</button>
              <button class="settings-tab-btn ${this.state.activeTab === 'rules' ? 'active' : ''}" id="tab-rules-btn">Payroll Calendar</button>
            </div>

            <!-- Right Forms Panel -->
            <div style="flex:1; border-left: 1px solid var(--neutral-200); padding-left: var(--spacing-8);">
              <!-- Tab 1: Profile -->
              <div class="settings-tab-panel ${this.state.activeTab === 'profile' ? 'active' : ''}">
                <h3 style="font-size:var(--text-base); font-weight:700; color:var(--neutral-900); margin-bottom:var(--spacing-4);">Company Profile</h3>
                
                <form id="settings-profile-form" style="display:flex; flex-direction:column; gap:var(--spacing-4); max-width:480px;">
                  <div class="form-group">
                    <label class="form-label">Company Legal Name</label>
                    <input type="text" class="form-control" name="companyName" value="${settings.companyName || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Headquarters Address</label>
                    <input type="text" class="form-control" name="address" value="${settings.address || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Tax ID / Incorporation Reference</label>
                    <input type="text" class="form-control" name="taxId" value="${settings.taxId || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">SMTP Sender Address</label>
                    <input type="email" class="form-control" name="emailSender" value="${settings.emailSender || ''}" required>
                  </div>
                  <button class="btn btn-primary" type="submit" style="align-self:flex-start; margin-top:var(--spacing-2);">Save Profile Configuration</button>
                </form>
              </div>

              <!-- Tab 2: Rules -->
              <div class="settings-tab-panel ${this.state.activeTab === 'rules' ? 'active' : ''}">
                <h3 style="font-size:var(--text-base); font-weight:700; color:var(--neutral-900); margin-bottom:var(--spacing-4);">Payroll Calendar Configurations</h3>
                
                <form id="settings-rules-form" style="display:flex; flex-direction:column; gap:var(--spacing-4); max-width:480px;">
                  <div class="form-group">
                    <label class="form-label">Default Local Currency</label>
                    <select class="form-control" name="currency">
                      <option value="USD" ${settings.currency === 'USD' ? 'selected' : ''}>USD ($) - US Dollars</option>
                      <option value="INR" ${settings.currency === 'INR' ? 'selected' : ''}>INR (₹) - Indian Rupee</option>
                    </select>
                  </div>
                  
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Active Month</label>
                      <select class="form-control" name="activePeriodMonth">
                        ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                          .map(m => `<option value="${m}" ${settings.activePeriodMonth === m ? 'selected' : ''}>${m}</option>`).join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Active Year</label>
                      <select class="form-control" name="activePeriodYear">
                        <option value="2025" ${settings.activePeriodYear === '2025' ? 'selected' : ''}>2025</option>
                        <option value="2026" ${settings.activePeriodYear === '2026' ? 'selected' : ''}>2026</option>
                      </select>
                    </div>
                  </div>
                  <button class="btn btn-primary" type="submit" style="align-self:flex-start; margin-top:var(--spacing-2);">Save Calendar Rules</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  afterRender() {
    // 1. Tab switches
    const tabProfile = document.getElementById('tab-profile-btn');
    const tabRules = document.getElementById('tab-rules-btn');

    if (tabProfile) {
      tabProfile.onclick = () => {
        this.state.activeTab = 'profile';
        this.refresh();
      };
    }
    if (tabRules) {
      tabRules.onclick = () => {
        this.state.activeTab = 'rules';
        this.refresh();
      };
    }

    // 2. Submit Forms
    const profileForm = document.getElementById('settings-profile-form');
    if (profileForm) {
      profileForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(profileForm);
        const data = Object.fromEntries(formData.entries());
        
        try {
          await settingsService.updateCompany(data);
          toast.success('Profile Saved', 'Successfully saved company details in database.');
          this.refresh();
        } catch (err) {
          toast.error('Save Failed', err.message);
        }
      };
    }

    const rulesForm = document.getElementById('settings-rules-form');
    if (rulesForm) {
      rulesForm.onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(rulesForm);
        const data = Object.fromEntries(formData.entries());
        
        try {
          await settingsService.updateCalendar(data);
          sessionStorage.removeItem('payo_run_id');
          toast.success('Calendar Rules Saved', 'Updated payroll periods. Refreshing variables...');
          
          // Re-render header to update the period pill dynamically
          const activePeriodLabel = document.getElementById('header-active-period');
          if (activePeriodLabel) {
            activePeriodLabel.textContent = `${data.activePeriodMonth} ${data.activePeriodYear}`;
          }

          this.refresh();
        } catch (err) {
          toast.error('Save Failed', err.message);
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
