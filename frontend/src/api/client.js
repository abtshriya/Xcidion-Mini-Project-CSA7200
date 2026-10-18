const API_BASE = '/api/v1';

class ApiClient {
  constructor() {
    this.token = sessionStorage.getItem('xcidion_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      sessionStorage.setItem('xcidion_token', token);
    } else {
      sessionStorage.removeItem('xcidion_token');
    }
  }

  getToken() {
    return this.token || sessionStorage.getItem('xcidion_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = { ...options.headers };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, { ...options, headers });
      
      if (response.status === 401) {
        this.setToken(null);
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        throw new Error('Session expired or unauthorized');
      }

      if (!response.ok) {
        let errMessage = `Error ${response.status}: ${response.statusText}`;
        try {
          const errData = await response.json();
          errMessage = errData.detail || errData.message || errMessage;
        } catch (_) {}
        throw new Error(errMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Request failed for ${url}:`, error);
      throw error;
    }
  }

  // Auth
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);
    const data = await this.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    this.setToken(data.access_token);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async changePassword(old_password, new_password) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password, new_password })
    });
  }

  // Dashboard
  async getDashboardSummary() {
    return this.request('/dashboard/summary');
  }

  async getDashboardTraffic() {
    return this.request('/dashboard/traffic');
  }

  async getDashboardThreats() {
    return this.request('/dashboard/threats');
  }

  async getDashboardRecentEvents(limit = 10) {
    return this.request(`/dashboard/recent-events?limit=${limit}`);
  }

  async getDashboardHealth() {
    return this.request('/dashboard/system-health');
  }

  // Network Events
  async getEvents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/events?${query}`);
  }

  async getEvent(id) {
    return this.request(`/events/${id}`);
  }

  async getEventStats() {
    return this.request('/events/statistics');
  }

  async importEvent(eventData, sourceType = 'generic') {
    return this.request(`/events/import?source_type=${sourceType}`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  async importPcap(file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request('/events/import-pcap', {
      method: 'POST',
      body: formData
    });
  }

  async generateDemoScenario(scenario = 'complete_campaign') {
    return this.request(`/events/demo-generate?scenario=${scenario}`, {
      method: 'POST'
    });
  }

  // Alerts
  async getAlerts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/alerts?${query}`);
  }

  async getAlert(id) {
    return this.request(`/alerts/${id}`);
  }

  async updateAlert(id, payload) {
    return this.request(`/alerts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async getAlertRelatedEvents(id) {
    return this.request(`/alerts/${id}/related-events`);
  }

  // Incidents
  async getIncidents(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/incidents?${query}`);
  }

  async getIncident(id) {
    return this.request(`/incidents/${id}`);
  }

  async updateIncident(id, payload) {
    return this.request(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async addIncidentNote(id, note) {
    return this.request(`/incidents/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  async getIncidentTimeline(id) {
    return this.request(`/incidents/${id}/timeline`);
  }

  async getIncidentAttackDNA(id) {
    return this.request(`/incidents/${id}/attack-dna`);
  }

  // Threat Trajectory
  async getTrajectories() {
    return this.request('/trajectory');
  }

  async getIncidentTrajectory(id) {
    return this.request(`/trajectory/${id}`);
  }

  async submitTrajectoryFeedback(id, feedback, notes = '') {
    return this.request(`/trajectory/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback, notes })
    });
  }

  // Sensors
  async getSensors() {
    return this.request('/sensors');
  }

  async registerSensor(payload) {
    return this.request('/sensors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getSensorHealth(id) {
    return this.request(`/sensors/${id}/health`);
  }

  // Detection Rules
  async getRules() {
    return this.request('/rules');
  }

  async updateRule(id, payload) {
    return this.request(`/rules/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }

  async testRule(id, eventPayload) {
    return this.request(`/rules/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ event_payload: eventPayload })
    });
  }

  // Datasets & Models
  async getDatasets() {
    return this.request('/datasets');
  }

  async getModels() {
    return this.request('/models');
  }

  async trainModel(payload = {}) {
    return this.request('/models/train', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async activateModel(id) {
    return this.request(`/models/${id}/activate`, {
      method: 'POST'
    });
  }

  // Analytics
  async getAnalyticsOverview() {
    return this.request('/analytics/overview');
  }

  // Audit Logs
  async getAuditLogs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/audit-logs?${query}`);
  }

  // Admin
  async getUsers() {
    return this.request('/admin/users');
  }

  async createUser(payload) {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateUser(id, payload) {
    return this.request(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
}

export const api = new ApiClient();
