/* Global Application State Manager for Payo */

export const state = {
  currentView: 'dashboard',
  activeRunStep: 1,
  currentRunData: {
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
  },

  viewSubscribers: new Set(),
  runStepSubscribers: new Set(),

  subscribeView(callback) {
    this.viewSubscribers.add(callback);
    return () => this.viewSubscribers.delete(callback);
  },

  subscribeRunStep(callback) {
    this.runStepSubscribers.add(callback);
    return () => this.runStepSubscribers.delete(callback);
  },

  /** @deprecated Use subscribeView for routing updates */
  subscribe(callback) {
    return this.subscribeView(callback);
  },

  setView(view) {
    this.currentView = view;
    this._notifyView();
  },

  setRunStep(step) {
    this.activeRunStep = step;
    for (const callback of this.runStepSubscribers) {
      try {
        callback(this.activeRunStep, this);
      } catch (err) {
        console.error('Error in run step subscriber:', err);
      }
    }
  },

  updateRunData(key, value) {
    this.currentRunData[key] = value;
  },

  patchRunData(updates) {
    Object.assign(this.currentRunData, updates);
  },

  resetRun() {
    const { runId, runMeta } = this.currentRunData;
    this.activeRunStep = 1;
    this.currentRunData = {
      runId,
      runMeta,
      employeeFile: null,
      salaryFile: null,
      parsedEmployees: [],
      parsedSalaries: [],
      validationReport: [],
      calculatedPayroll: [],
      generatedPayslips: [],
      emailQueue: [],
      emailsFailed: 0
    };
    this._notifyRunStep();
  },

  notify() {
    this._notifyView();
  },

  _notifyView() {
    for (const callback of this.viewSubscribers) {
      try {
        callback(this);
      } catch (err) {
        console.error('Error in view subscriber:', err);
      }
    }
  },

  _notifyRunStep() {
    for (const callback of this.runStepSubscribers) {
      try {
        callback(this.activeRunStep, this);
      } catch (err) {
        console.error('Error in run step subscriber:', err);
      }
    }
  }
};
