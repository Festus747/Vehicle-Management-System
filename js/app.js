/* =============================================
   Main Application Entry Point
   ============================================= */

const App = {
    init() {
        // Initialize data store
        DataStore.init();

        // Initialize modules
        UI.init();
        VehicleManager.init();
        MileageManager.init();
        AlertsManager.init();

        // Check for existing session
        if (Auth.init()) {
            UI.showApp();
            this.refreshAll();
        } else {
            UI.showLogin();
        }

        // Bind login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    },

    handleLogin() {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const role = document.getElementById('login-role').value;

        if (!username || !password) {
            UI.showToast('error', 'Login Error', 'Please enter username and password');
            return;
        }

        const result = Auth.login(username, password, role);

        if (result.success) {
            UI.showApp();
            this.refreshAll();
            UI.showToast('success', 'Welcome', `Logged in as ${result.user.name}`);
        } else {
            UI.showToast('error', 'Login Failed', result.message);
        }
    },

    refreshAll() {
        Dashboard.refresh();
        VehicleManager.renderVehiclesTable();
        MileageManager.populateVehicleFilter();
        MileageManager.renderMileageTable();
        AlertsManager.render();
        UI.updateSidebar();
        UI.updateStatusBar();
        UI.updateAlertBadge();

        if (Auth.isDriver()) {
            DriverView.render();
        }
    }
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
