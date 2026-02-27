/* =============================================
   UI Controller Module
   ============================================= */

const UI = {
    currentPanel: 'dashboard',
    openTabs: ['dashboard'],

    init() {
        this.bindEvents();
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    },

    bindEvents() {
        // Activity bar navigation
        document.querySelectorAll('.activity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = btn.dataset.panel;
                if (panel) this.navigateTo(panel);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            App.stopAutoSync();
            Auth.logout();
            this.showLogin();
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => this.toggleMobileSidebar());
        }

        const mobileOverlay = document.getElementById('mobile-overlay');
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', () => this.closeMobileSidebar());
        }

        // Settings
        var resetBtn = document.getElementById('btn-reset-data');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                    DataStore.resetAll();
                    App.refreshAll();
                    this.showToast('success', 'Data Reset', 'All data has been reset');
                }
            });
        }

        var loadSampleBtn = document.getElementById('btn-load-sample');
        if (loadSampleBtn) loadSampleBtn.addEventListener('click', () => {
            DataStore.loadSampleData();
            App.refreshAll();
            this.showToast('success', 'Sample Data Loaded', 'Sample vehicles and mileage data have been loaded');
        });

        document.getElementById('setting-warning-threshold').addEventListener('change', (e) => {
            const settings = DataStore.getSettings();
            settings.warningThreshold = parseInt(e.target.value);
            DataStore.saveSettings(settings);
        });

        document.getElementById('setting-max-mileage').addEventListener('change', (e) => {
            const settings = DataStore.getSettings();
            settings.maxMileage = parseInt(e.target.value);
            DataStore.saveSettings(settings);
            App.refreshAll();
        });

        document.getElementById('setting-email-alerts').addEventListener('change', (e) => {
            const settings = DataStore.getSettings();
            settings.emailAlerts = e.target.checked;
            DataStore.saveSettings(settings);
        });

        document.getElementById('setting-push-alerts').addEventListener('change', (e) => {
            const settings = DataStore.getSettings();
            settings.pushAlerts = e.target.checked;
            DataStore.saveSettings(settings);
        });

        // Driver visibility setting
        const driverMileageSetting = document.getElementById('setting-driver-see-mileage');
        if (driverMileageSetting) {
            driverMileageSetting.addEventListener('change', (e) => {
                const settings = DataStore.getSettings();
                settings.driverSeeMileage = e.target.checked;
                DataStore.saveSettings(settings);
            });
        }

        // Theme picker delegation
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.theme-card');
            if (card && card.dataset.theme) {
                this.setTheme(card.dataset.theme);
            }
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const settings = DataStore.getSettings();
        settings.theme = theme;
        DataStore.saveSettings(settings);
        // Update active state
        document.querySelectorAll('.theme-card').forEach(c => {
            c.classList.toggle('active', c.dataset.theme === theme);
        });
        // Update login gradient
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.background = 'var(--login-gradient)';
            loginScreen.style.backgroundSize = '400% 400%';
            loginScreen.style.animation = 'gradientShift 15s ease infinite';
        }
        // Re-render charts with new colors
        if (typeof Dashboard !== 'undefined') Dashboard.refresh();
    },

    renderThemePicker() {
        const container = document.getElementById('theme-picker');
        if (!container) return;
        const currentTheme = DataStore.getSettings().theme || 'dark';
        const themes = [
            { id: 'dark', name: 'Dark', sub: 'VS Code Default', bar: '#333333', bg: '#1e1e1e', c1: '#007acc', c2: '#4ec9b0', c3: '#cca700' },
            { id: 'light', name: 'Light', sub: 'Clean & Bright', bar: '#e8e8e8', bg: '#ffffff', c1: '#007acc', c2: '#16825d', c3: '#bf8803' },
            { id: 'high-contrast', name: 'High Contrast', sub: 'Accessibility', bar: '#111111', bg: '#000000', c1: '#6fc3ff', c2: '#73e068', c3: '#ffd700' },
            { id: 'midnight', name: 'Midnight Blue', sub: 'GitHub Dark', bar: '#161b22', bg: '#0d1117', c1: '#58a6ff', c2: '#3fb950', c3: '#d29922' },
            { id: 'monokai', name: 'Monokai', sub: 'Classic Editor', bar: '#2e2f28', bg: '#272822', c1: '#66d9ef', c2: '#a6e22e', c3: '#f92672' },
            { id: 'nord', name: 'Nord', sub: 'Arctic Cool', bar: '#3b4252', bg: '#2e3440', c1: '#81a1c1', c2: '#a3be8c', c3: '#ebcb8b' },
            { id: 'sunset', name: 'Sunset', sub: 'Warm Tones', bar: '#241920', bg: '#1a1216', c1: '#e8a87c', c2: '#6ab04c', c3: '#e74c3c' }
        ];

        container.innerHTML = themes.map(t =>
            '<div class="theme-card ' + (t.id === currentTheme ? 'active' : '') + '" data-theme="' + t.id + '">' +
            '<div class="theme-preview">' +
            '<div class="theme-preview-bar" style="background:' + t.bar + '"></div>' +
            '<div class="theme-preview-content" style="background:' + t.bg + '">' +
            '<div class="theme-preview-line" style="background:' + t.c1 + '; width:80%"></div>' +
            '<div class="theme-preview-line" style="background:' + t.c2 + '; width:60%"></div>' +
            '<div class="theme-preview-line" style="background:' + t.c3 + '; width:40%"></div>' +
            '</div></div>' +
            '<div class="theme-card-label">' + t.name + '</div>' +
            '<div class="theme-card-sub">' + t.sub + '</div>' +
            '</div>'
        ).join('');
    },

    navigateTo(panel) {
        // Access control - check permissions for drivers
        if (Auth.isDriver()) {
            const adminOnlyPanels = ['vehicles', 'reports', 'upload', 'users', 'data-mgmt'];
            if (adminOnlyPanels.includes(panel)) {
                this.showToast('warning', 'Access Denied', 'This section is only available to administrators');
                return;
            }

            // Check permission-based pages
            const permPanels = ['maintenance', 'expiration', 'mileage', 'alerts'];
            if (permPanels.includes(panel) && !Auth.hasPermission(panel)) {
                this.showToast('warning', 'Access Denied', 'You do not have permission to access this section');
                return;
            }

            // Check if mileage page is allowed for drivers
            if (panel === 'mileage') {
                const settings = DataStore.getSettings();
                if (!settings.driverSeeMileage) {
                    this.showToast('warning', 'Access Denied', 'Mileage log page is not available. Use My Vehicle to log mileage.');
                    return;
                }
            }
        }

        this.currentPanel = panel;

        // Update activity bar
        document.querySelectorAll('.activity-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panel);
        });

        // Update sidebar
        this.updateSidebar();
        document.getElementById('sidebar-title').textContent = panel.toUpperCase().replace('-', ' ');

        // Update panels
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const panelEl = document.getElementById('panel-' + panel);
        if (panelEl) panelEl.classList.add('active');

        // Manage tabs - single tab behavior
        this.openTabs = [panel];
        this.renderTabs();

        // Close mobile sidebar after navigation
        this.closeMobileSidebar();

        // Refresh panel content
        switch (panel) {
            case 'dashboard':
                Dashboard.refresh();
                break;
            case 'vehicles':
                VehicleManager.renderVehiclesTable();
                break;
            case 'mileage':
                MileageManager.populateVehicleFilter();
                MileageManager.renderMileageTable();
                break;
            case 'alerts':
                AlertsManager.render();
                break;
            case 'my-vehicle':
                DriverView.render();
                break;
            case 'maintenance':
                if (typeof MaintenanceManager !== 'undefined') MaintenanceManager.render();
                break;
            case 'expiration':
                if (typeof ExpirationManager !== 'undefined') ExpirationManager.render();
                break;
            case 'users':
                if (typeof UserManager !== 'undefined') UserManager.render();
                break;
            case 'data-mgmt':
                if (typeof DataMgmt !== 'undefined') DataMgmt.render();
                break;
            case 'settings':
                if (typeof App !== 'undefined' && App.populateProfile) App.populateProfile();
                break;
        }
    },

    renderTabs() {
        const container = document.getElementById('tabs-container');
        const panelLabels = {
            'dashboard': { icon: 'fa-tachometer-alt', label: 'Dashboard' },
            'vehicles': { icon: 'fa-car', label: 'Vehicles' },
            'mileage': { icon: 'fa-road', label: 'Mileage' },
            'alerts': { icon: 'fa-bell', label: 'Alerts' },
            'reports': { icon: 'fa-chart-bar', label: 'Reports' },
            'my-vehicle': { icon: 'fa-id-card', label: 'My Vehicle' },
            'upload': { icon: 'fa-file-upload', label: 'Import' },
            'maintenance': { icon: 'fa-wrench', label: 'Maintenance' },
            'expiration': { icon: 'fa-calendar-times', label: 'Expiration' },
            'users': { icon: 'fa-users-cog', label: 'Users' },
            'data-mgmt': { icon: 'fa-database', label: 'Data Management' },
            'settings': { icon: 'fa-cog', label: 'Settings' }
        };

        container.innerHTML = this.openTabs.map(tab => {
            const info = panelLabels[tab] || { icon: 'fa-file', label: tab };
            return '<div class="tab ' + (tab === this.currentPanel ? 'active' : '') + '" data-tab="' + tab + '" onclick="UI.navigateTo(\'' + tab + '\')">' +
                '<i class="fas ' + info.icon + '"></i> ' + info.label +
                '<span class="tab-close" onclick="event.stopPropagation(); UI.closeTab(\'' + tab + '\')">&times;</span>' +
                '</div>';
        }).join('');
    },

    closeTab(tab) {
        if (this.openTabs.length <= 1) return;
        this.openTabs = this.openTabs.filter(t => t !== tab);
        if (this.currentPanel === tab) {
            this.navigateTo(this.openTabs[this.openTabs.length - 1]);
        } else {
            this.renderTabs();
        }
    },

    toggleMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        sidebar.classList.toggle('mobile-open');
        if (sidebar.classList.contains('mobile-open')) {
            overlay.classList.remove('hidden');
            overlay.classList.add('active');
        } else {
            overlay.classList.add('hidden');
            overlay.classList.remove('active');
        }
    },

    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobile-overlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('active');
        }
    },

    updateSidebar() {
        const container = document.getElementById('sidebar-content');
        const vehicles = DataStore.getVehicles();
        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;

        switch (this.currentPanel) {
            case 'dashboard':
                const stats = DataStore.getStats();
                let dashboardSidebar = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Fleet Status</div>' +
                    '<div class="sidebar-item"><i class="fas fa-car" style="color:var(--accent-blue)"></i> All Vehicles <span class="item-badge badge-normal">' + stats.total + '</span></div>' +
                    '<div class="sidebar-item"><i class="fas fa-check-circle" style="color:var(--status-normal)"></i> Normal <span class="item-badge badge-normal">' + stats.normal + '</span></div>' +
                    '<div class="sidebar-item"><i class="fas fa-exclamation-triangle" style="color:var(--status-warning)"></i> Warning <span class="item-badge badge-warning">' + stats.warning + '</span></div>' +
                    '<div class="sidebar-item"><i class="fas fa-times-circle" style="color:var(--status-exceeded)"></i> Exceeded <span class="item-badge badge-exceeded">' + stats.exceeded + '</span></div>' +
                    '</div>';

                if (Auth.isAdmin()) {
                    dashboardSidebar += '<div class="sidebar-section">' +
                        '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Quick Actions</div>' +
                        '<div class="sidebar-item" onclick="UI.navigateTo(\'vehicles\')"><i class="fas fa-plus"></i> Add Vehicle</div>' +
                        '<div class="sidebar-item" onclick="UI.navigateTo(\'mileage\')"><i class="fas fa-road"></i> Log Mileage</div>' +
                        '<div class="sidebar-item" onclick="UI.navigateTo(\'reports\')"><i class="fas fa-download"></i> Reports</div>' +
                        '</div>';
                }
                container.innerHTML = dashboardSidebar;
                break;

            case 'vehicles':
            case 'mileage':
                let vehiclesList = vehicles;
                if (Auth.isDriver()) {
                    const user = Auth.getCurrentUser();
                    vehiclesList = vehicles.filter(v => v.driver === user.name);
                }
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Vehicles</div>' +
                    vehiclesList.map(v => {
                        const status = DataStore.getVehicleStatus(v);
                        return '<div class="sidebar-item" onclick="VehicleManager.showDetails(\'' + v.id + '\')">' +
                            '<i class="fas ' + VehicleManager.getTypeIcon(v.type) + '" style="color:var(--status-' + status + ')"></i> ' +
                            v.id + ' <span class="item-badge badge-' + status + '">' + (v.mileage || 0) + '</span></div>';
                    }).join('') +
                    '</div>';
                break;

            case 'alerts':
                const alerts = Auth.isDriver() ? AlertsManager.getDriverAlerts() : DataStore.getAlerts();
                const unread = alerts.filter(a => !a.read).length;
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Alert Summary</div>' +
                    '<div class="sidebar-item"><i class="fas fa-bell" style="color:var(--accent-blue)"></i> Total Alerts <span class="item-badge badge-normal">' + alerts.length + '</span></div>' +
                    '<div class="sidebar-item"><i class="fas fa-envelope" style="color:var(--status-warning)"></i> Unread <span class="item-badge badge-warning">' + unread + '</span></div>' +
                    '<div class="sidebar-item"><i class="fas fa-exclamation-triangle" style="color:var(--status-warning)"></i> Warnings <span class="item-badge badge-warning">' + alerts.filter(a => a.type === 'warning').length + '</span></div>' +
                    '<div class="sidebar-item"><i class="fas fa-times-circle" style="color:var(--status-exceeded)"></i> Critical <span class="item-badge badge-exceeded">' + alerts.filter(a => a.type === 'critical').length + '</span></div>' +
                    '</div>';
                break;

            case 'reports':
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Available Reports</div>' +
                    '<div class="sidebar-item"><i class="fas fa-history"></i> Mileage History</div>' +
                    '<div class="sidebar-item"><i class="fas fa-bell"></i> Alert Logs</div>' +
                    '<div class="sidebar-item"><i class="fas fa-users"></i> Driver Usage</div>' +
                    '<div class="sidebar-item"><i class="fas fa-car"></i> Fleet Summary</div>' +
                    '</div>';
                break;

            case 'upload':
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Import Options</div>' +
                    '<div class="sidebar-item"><i class="fas fa-car"></i> Vehicle Data</div>' +
                    '<div class="sidebar-item"><i class="fas fa-road"></i> Mileage Logs</div>' +
                    '<div class="sidebar-item"><i class="fas fa-download"></i> Templates</div>' +
                    '</div>';
                break;

            case 'maintenance':
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Maintenance</div>' +
                    '<div class="sidebar-item"><i class="fas fa-wrench"></i> All Records</div>' +
                    '<div class="sidebar-item"><i class="fas fa-plus"></i> Log Maintenance</div>' +
                    '</div>';
                break;

            case 'expiration':
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Expiration Tracking</div>' +
                    '<div class="sidebar-item"><i class="fas fa-id-card"></i> Registration</div>' +
                    '<div class="sidebar-item"><i class="fas fa-shield-alt"></i> Insurance</div>' +
                    '</div>';
                break;

            case 'users':
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> User Management</div>' +
                    '<div class="sidebar-item"><i class="fas fa-users"></i> All Users</div>' +
                    '<div class="sidebar-item"><i class="fas fa-user-plus"></i> Create User</div>' +
                    '<div class="sidebar-item"><i class="fas fa-user-clock"></i> Pending Approval</div>' +
                    '</div>';
                break;

            case 'data-mgmt':
                container.innerHTML = '<div class="sidebar-section">' +
                    '<div class="sidebar-section-header"><i class="fas fa-chevron-down"></i> Data Management</div>' +
                    '<div class="sidebar-item"><i class="fas fa-download"></i> Export Backup</div>' +
                    '<div class="sidebar-item"><i class="fas fa-trash"></i> Delete Data</div>' +
                    '</div>';
                break;

            default:
                container.innerHTML = '';
        }
    },

    updateStatusBar() {
        const user = Auth.getCurrentUser();
        const stats = DataStore.getStats();
        const unread = Auth.isDriver() ? AlertsManager.getDriverAlerts().filter(a => !a.read).length : DataStore.getUnreadAlertCount();

        document.getElementById('status-role').innerHTML = '<i class="fas fa-user"></i> ' + (user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest');
        document.getElementById('status-vehicles').innerHTML = '<i class="fas fa-car"></i> ' + stats.total + ' Vehicles';
        document.getElementById('status-alerts').innerHTML = '<i class="fas fa-bell"></i> ' + unread + ' Alerts';
    },

    updateAlertBadge() {
        let count;
        if (Auth.isDriver()) {
            count = AlertsManager.getDriverAlerts().filter(a => !a.read).length;
        } else {
            count = DataStore.getUnreadAlertCount();
        }
        const badge = document.getElementById('alert-badge');
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
        this.updateStatusBar();
    },

    updateClock() {
        const now = new Date();
        const el = document.getElementById('status-time');
        if (el) {
            el.innerHTML = '<i class="fas fa-clock"></i> ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
    },

    showLogin() {
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('app-container').classList.add('hidden');
    },

    showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');

        const user = Auth.getCurrentUser();
        document.getElementById('user-name-display').textContent = user.name;

        // Update role badge
        const roleBadge = document.getElementById('user-role-badge');
        if (roleBadge) {
            roleBadge.textContent = user.role.toUpperCase();
            roleBadge.style.background = Auth.isAdmin() ? 'var(--accent-blue)' : 'var(--accent-green)';
        }

        // Handle role-based visibility
        if (Auth.isDriver()) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = 'none');
            document.querySelectorAll('.driver-only').forEach(el => el.style.display = '');

            // Permission-based nav for drivers
            document.querySelectorAll('.perm-nav').forEach(el => {
                const perm = el.getAttribute('data-perm');
                el.style.display = Auth.hasPermission(perm) ? '' : 'none';
            });

            // Check mileage page visibility
            const settings = DataStore.getSettings();
            const mileageBtn = document.querySelector('[data-panel="mileage"]');
            if (mileageBtn && !settings.driverSeeMileage) {
                mileageBtn.style.display = 'none';
            }

            // Show driver dashboard vehicle section
            const driverDash = document.getElementById('driver-dashboard-vehicle');
            if (driverDash) driverDash.style.display = '';
        } else {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
            document.querySelectorAll('.admin-only-nav').forEach(el => el.style.display = '');
            document.querySelectorAll('.perm-nav').forEach(el => el.style.display = '');
            document.querySelectorAll('.driver-only').forEach(el => el.style.display = 'none');
        }

        // Load settings into form
        const settings = DataStore.getSettings();
        document.getElementById('setting-email-alerts').checked = settings.emailAlerts;
        document.getElementById('setting-push-alerts').checked = settings.pushAlerts;
        document.getElementById('setting-warning-threshold').value = settings.warningThreshold;
        document.getElementById('setting-max-mileage').value = settings.maxMileage;

        const driverMileageSetting = document.getElementById('setting-driver-see-mileage');
        if (driverMileageSetting) {
            driverMileageSetting.checked = settings.driverSeeMileage !== false;
        }

        // Render theme picker
        this.renderThemePicker();

        // Populate profile fields
        if (typeof App !== 'undefined' && App.populateProfile) App.populateProfile();

        // Navigate to appropriate default panel
        if (Auth.isDriver()) {
            this.navigateTo('dashboard');
        }
    },

    showToast(type, title, message, duration = 5000) {
        const container = document.getElementById('toast-container');
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };

        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.innerHTML = '<div class="toast-icon"><i class="fas ' + icons[type] + '"></i></div>' +
            '<div class="toast-body"><div class="toast-title">' + title + '</div><div class="toast-message">' + message + '</div></div>' +
            '<button class="toast-close" onclick="this.parentElement.remove()">&times;</button>';

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s ease';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
};

/* =============================================
   Driver View Module
   ============================================= */
const DriverView = {
    render() {
        const container = document.getElementById('my-vehicle-content');
        const user = Auth.getCurrentUser();
        if (!user) return;

        const vehicles = DataStore.getVehicles().filter(v => v.driver === user.name);

        if (vehicles.length === 0) {
            container.innerHTML = '<div class="no-vehicle-assigned">' +
                '<i class="fas fa-car-side"></i>' +
                '<p>No vehicle currently assigned to you.</p>' +
                '<p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Contact your fleet admin for vehicle assignment.</p>' +
                '</div>';
            return;
        }

        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;

        container.innerHTML = vehicles.map(v => {
            const remaining = maxMileage - (v.mileage || 0);
            const status = DataStore.getVehicleStatus(v);
            const pct = Math.min(((v.mileage || 0) / maxMileage) * 100, 100);
            const logs = DataStore.getMileageLogs(v.id).slice(0, 5);

            return '<div class="vehicle-card-detail" style="margin-bottom:20px;">' +
                '<div class="vehicle-card-header">' +
                '<h3><i class="fas ' + VehicleManager.getTypeIcon(v.type) + '" style="color:var(--accent-blue); margin-right:8px;"></i>' + v.id + ' - ' + v.registration + '</h3>' +
                '<span class="status-badge status-' + status + '">' + status.toUpperCase() + '</span>' +
                '</div>' +
                '<div class="vehicle-card-body">' +
                '<div class="vehicle-info-grid">' +
                '<div class="vehicle-info-item"><label>Vehicle Type</label><span>' + v.type + '</span></div>' +
                '<div class="vehicle-info-item"><label>Current Mileage</label><span>' + (v.mileage || 0).toLocaleString() + ' miles</span></div>' +
                '<div class="vehicle-info-item"><label>Remaining</label><span style="color:var(--status-' + status + ')">' + (remaining > 0 ? remaining.toLocaleString() + ' miles' : 'EXCEEDED') + '</span></div>' +
                '<div class="vehicle-info-item"><label>Mileage Limit</label><span>' + maxMileage.toLocaleString() + ' miles</span></div>' +
                '</div>' +
                '<div class="mileage-gauge"><div class="gauge-bar"><div class="gauge-fill ' + status + '" style="width:' + pct + '%"><span class="gauge-center-label">' + pct.toFixed(1) + '%</span></div></div><div class="gauge-labels"><span>0 miles</span><span>' + maxMileage.toLocaleString() + ' miles</span></div></div>' +
                '<div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap;">' +
                '<button class="btn btn-primary" onclick="MileageManager.openMileageModal(\'' + v.id + '\')"><i class="fas fa-road"></i> Log Mileage</button>' +
                '<button class="btn btn-secondary" onclick="VehicleManager.showDetails(\'' + v.id + '\')"><i class="fas fa-eye"></i> View Details</button>' +
                '</div>' +
                (logs.length > 0 ? '<div style="margin-top:20px;"><h4 style="color:var(--text-bright); font-size:14px; margin-bottom:10px;"><i class="fas fa-history" style="color:var(--accent-blue)"></i> Recent Entries</h4><div class="table-container"><table class="data-table"><thead><tr><th>Date</th><th>From</th><th>To</th><th>Added</th></tr></thead><tbody>' +
                    logs.map(l => '<tr><td>' + new Date(l.timestamp).toLocaleDateString() + '</td><td>' + l.previousMileage.toLocaleString() + '</td><td>' + l.newMileage.toLocaleString() + '</td><td style="color:var(--accent-green)">+' + l.milesAdded.toLocaleString() + '</td></tr>').join('') +
                    '</tbody></table></div></div>' : '') +
                '</div></div>';
        }).join('');

        // Also update driver dashboard section
        this.renderDriverDashboard(vehicles);
    },

    renderDriverDashboard(vehicles) {
        const container = document.getElementById('driver-dashboard-vehicle-content');
        if (!container) return;

        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;

        if (vehicles.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); padding:20px;">No vehicle assigned to you.</p>';
            return;
        }

        container.innerHTML = vehicles.map(v => {
            const status = DataStore.getVehicleStatus(v);
            const remaining = maxMileage - (v.mileage || 0);
            const pct = Math.min(((v.mileage || 0) / maxMileage) * 100, 100);

            return '<div class="stat-card" style="margin-bottom:12px; cursor:pointer;" onclick="UI.navigateTo(\'my-vehicle\')">' +
                '<div class="stat-icon ' + status + '"><i class="fas ' + VehicleManager.getTypeIcon(v.type) + '"></i></div>' +
                '<div class="stat-info">' +
                '<span class="stat-value" style="font-size:18px;">' + v.id + '</span>' +
                '<span class="stat-label">' + (v.mileage || 0).toLocaleString() + ' / ' + maxMileage.toLocaleString() + ' miles</span>' +
                '<div class="mileage-bar-inline" style="margin-top:4px;"><div class="mileage-bar-bg" style="width:100px;"><div class="mileage-bar-fill" style="width:' + pct + '%; background:var(--status-' + status + ')"></div></div></div>' +
                '</div></div>';
        }).join('');
    }
};
