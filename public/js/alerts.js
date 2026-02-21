/* =============================================
   Alerts & Notifications Module
   ============================================= */

const AlertsManager = {
    currentFilter: 'all',

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Clear all alerts
        document.getElementById('btn-clear-alerts').addEventListener('click', () => {
            DataStore.markAllAlertsRead();
            this.render();
            UI.updateAlertBadge();
            UI.showToast('info', 'Alerts', 'All alerts marked as read');
        });

        // Filter buttons
        document.querySelectorAll('.alert-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
    },

    // Get alerts filtered for the current driver (only their assigned vehicles)
    getDriverAlerts() {
        const user = Auth.getCurrentUser();
        if (!user) return [];
        const allAlerts = DataStore.getAlerts();
        // Get vehicles assigned to this driver
        const driverVehicles = DataStore.getVehicles()
            .filter(v => v.driver === user.name)
            .map(v => v.id);
        return allAlerts.filter(a => driverVehicles.includes(a.vehicleId));
    },

    createAlert(vehicleId, type, title, message) {
        const alert = {
            id: 'ALT-' + Date.now(),
            vehicleId,
            type, // 'warning' or 'critical'
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false
        };

        DataStore.addAlert(alert);
        DataStore.addActivity('alert', title, type === 'critical' ? 'fa-times-circle' : 'fa-exclamation-triangle');

        // Show toast
        UI.showToast(
            type === 'critical' ? 'error' : 'warning',
            type === 'critical' ? 'Critical Alert' : 'Warning Alert',
            title
        );

        // Simulate email notification
        if (DataStore.getSettings().emailAlerts) {
            console.log(`📧 Email notification sent: ${title}`);
            DataStore.addActivity('notification', `Email alert sent: ${title}`, 'fa-envelope');
        }

        UI.updateAlertBadge();
    },

    render() {
        const container = document.getElementById('alerts-list');

        // Drivers only see alerts for their assigned vehicles
        let alerts;
        if (Auth.isDriver()) {
            alerts = this.getDriverAlerts();
        } else {
            alerts = DataStore.getAlerts();
        }

        // Apply filter
        switch (this.currentFilter) {
            case 'warning':
                alerts = alerts.filter(a => a.type === 'warning');
                break;
            case 'critical':
                alerts = alerts.filter(a => a.type === 'critical');
                break;
            case 'unread':
                alerts = alerts.filter(a => !a.read);
                break;
        }

        if (alerts.length === 0) {
            container.innerHTML = '<div class="alert-empty"><i class="fas fa-bell-slash" style="font-size:32px; margin-bottom:12px; display:block;"></i>No alerts found</div>';
            return;
        }

        container.innerHTML = alerts.map(a => {
            const timeAgo = this.timeAgo(new Date(a.timestamp));
            return `
                <div class="alert-item ${a.read ? '' : 'unread'}" onclick="AlertsManager.markRead('${a.id}')">
                    <div class="alert-icon ${a.type}">
                        <i class="fas ${a.type === 'critical' ? 'fa-times-circle' : 'fa-exclamation-triangle'}"></i>
                    </div>
                    <div class="alert-body">
                        <div class="alert-title">${a.title}</div>
                        <div class="alert-message">${a.message}</div>
                        <div class="alert-time"><i class="fas fa-clock"></i> ${timeAgo} &middot; Vehicle: ${a.vehicleId}</div>
                    </div>
                    ${!a.read ? '<span style="width:8px; height:8px; background:var(--accent-blue); border-radius:50%; flex-shrink:0;"></span>' : ''}
                </div>`;
        }).join('');
    },

    markRead(alertId) {
        DataStore.markAlertRead(alertId);
        this.render();
        UI.updateAlertBadge();
    },

    timeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return 'just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
        return date.toLocaleDateString();
    }
};
