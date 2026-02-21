/* =============================================
   API Client - Backend Communication Layer
   ============================================= */

const ApiClient = {
    baseUrl: '',
    token: null,
    online: navigator.onLine,

    init() {
        this.token = localStorage.getItem('vmt_token');

        window.addEventListener('online', () => {
            this.online = true;
            this.syncPendingRequests();
        });
        window.addEventListener('offline', () => {
            this.online = false;
        });
    },

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('vmt_token', token);
        } else {
            localStorage.removeItem('vmt_token');
        }
    },

    getToken() {
        return this.token || localStorage.getItem('vmt_token');
    },

    async request(endpoint, options = {}) {
        const url = this.baseUrl + endpoint;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.setToken(null);
                // Token expired - force re-login
                if (typeof UI !== 'undefined') {
                    UI.showLogin();
                    UI.showToast('warning', 'Session Expired', 'Please log in again');
                }
                throw new Error('Authentication expired');
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Request failed with status ${response.status}`);
            }

            return data;
        } catch (err) {
            if (!this.online || err.message === 'Failed to fetch') {
                console.warn('[API] Offline - using local cache');
                return null;
            }
            throw err;
        }
    },

    // Auth
    async login(username, password, role) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password, role })
        });
    },

    async register(username, password, name, role) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, name, role })
        });
    },

    async getMe() {
        return this.request('/api/auth/me');
    },

    // Vehicles
    async getVehicles() {
        return this.request('/api/vehicles');
    },

    async getVehicle(id) {
        return this.request(`/api/vehicles/${id}`);
    },

    async createVehicle(vehicle) {
        return this.request('/api/vehicles', {
            method: 'POST',
            body: JSON.stringify(vehicle)
        });
    },

    async updateVehicle(id, updates) {
        return this.request(`/api/vehicles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async deleteVehicle(id) {
        return this.request(`/api/vehicles/${id}`, {
            method: 'DELETE'
        });
    },

    // Mileage
    async getMileageLogs(vehicleId, from, to) {
        let params = new URLSearchParams();
        if (vehicleId) params.set('vehicleId', vehicleId);
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const query = params.toString();
        return this.request(`/api/mileage${query ? '?' + query : ''}`);
    },

    async addMileageLog(vehicleId, newMileage, notes) {
        return this.request('/api/mileage', {
            method: 'POST',
            body: JSON.stringify({ vehicleId, newMileage, notes })
        });
    },

    // Alerts
    async getAlerts() {
        return this.request('/api/alerts');
    },

    async markAlertRead(id) {
        return this.request(`/api/alerts/${id}/read`, { method: 'PUT' });
    },

    async markAllAlertsRead() {
        return this.request('/api/alerts/read-all', { method: 'PUT' });
    },

    // Settings
    async getSettings() {
        return this.request('/api/settings');
    },

    async saveSettings(settings) {
        return this.request('/api/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    },

    // Activity
    async getActivity() {
        return this.request('/api/activity');
    },

    // Reports
    async getReportSummary() {
        return this.request('/api/reports/summary');
    },

    async exportReport(type, format) {
        const token = this.getToken();
        const response = await fetch(`/api/reports/export/${type}?format=${format}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (format === 'csv') {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${type}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            return { success: true };
        }
        return response.json();
    },

    // Import (uses FormData, not JSON)
    async importFile(type, file) {
        const formData = new FormData();
        formData.append('file', file);

        const token = this.getToken();
        const response = await fetch(`/api/import/${type}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        return response.json();
    },

    // Offline queue
    syncPendingRequests() {
        const pending = JSON.parse(localStorage.getItem('vmt_pending_requests') || '[]');
        if (pending.length === 0) return;

        pending.forEach(async (req, index) => {
            try {
                await this.request(req.endpoint, req.options);
                pending.splice(index, 1);
                localStorage.setItem('vmt_pending_requests', JSON.stringify(pending));
            } catch (err) {
                console.warn('[API] Sync failed for:', req.endpoint, err);
            }
        });
    },

    queueOfflineRequest(endpoint, options) {
        const pending = JSON.parse(localStorage.getItem('vmt_pending_requests') || '[]');
        pending.push({ endpoint, options, timestamp: Date.now() });
        localStorage.setItem('vmt_pending_requests', JSON.stringify(pending));
    }
};
