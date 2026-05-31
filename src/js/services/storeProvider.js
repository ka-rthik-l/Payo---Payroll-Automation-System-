import { settingsService } from './settingsService.js';
import { checkApiHealth } from './apiClient.js';

/**
 * Legacy db facade — routes settings reads/writes to the REST API.
 * Business data no longer uses localStorage.
 */
export const db = {
  async init() {
    const health = await checkApiHealth();
    if (health.status !== 'ok') {
      throw new Error('API database is not connected.');
    }
    return true;
  },

  async get(table) {
    if (table === 'settings') {
      return settingsService.getSettings();
    }
    throw new Error(`Table "${table}" is not available via the legacy db facade. Use service modules instead.`);
  },

  async find(table, id) {
    throw new Error(`db.find("${table}", "${id}") is deprecated. Use service modules instead.`);
  },

  async create() {
    throw new Error('db.create is deprecated. Use service modules instead.');
  },

  async update(table, _id, updates) {
    if (table === 'settings') {
      const keys = Object.keys(updates);
      const companyKeys = ['companyName', 'address', 'taxId'];
      if (keys.some((k) => companyKeys.includes(k))) {
        return settingsService.updateCompany(updates);
      }
      if (keys.some((k) => calendarKeys.includes(k))) {
        return settingsService.updateCalendar(updates);
      }
      return settingsService.updateCompany(updates);
    }
    throw new Error(`db.update("${table}") is deprecated. Use service modules instead.`);
  },

  async delete() {
    throw new Error('db.delete is deprecated. Use service modules instead.');
  },

  async clear() {
    throw new Error('db.clear is deprecated.');
  }
};
