/* =============================================
   Main Application Entry Point
   ============================================= */

const App = {
    init() {
        // Initialize API client
        ApiClient.init();

        // Initialize data store
        DataStore.init();

        // Initialize modules
        UI.init();
        VehicleManager.init();
        MileageManager.init();
        AlertsManager.init();
        DataImporter.init();

        // Register service worker for PWA
        this.registerServiceWorker();

        // Apply saved theme
        this.applyTheme();

        // Check for existing session
        if (Auth.init()) {
            UI.showApp();
            this.refreshAll();
            // Sync with server in background
            this.syncWithServer();
        } else {
            UI.showLogin();
        }

        // Bind login form (now async)
        document.getElementById('login-form').addEventListener('submit', function(e) {
            e.preventDefault();
            App.handleLogin();
        });
    },

    async handleLogin() {
        var username = document.getElementById('login-username').value.trim();
        var password = document.getElementById('login-password').value;
        var role = document.getElementById('login-role').value;

        if (!username || !password) {
            UI.showToast('error', 'Login Error', 'Please enter username and password');
            return;
        }

        // Show loading state
        var btn = document.querySelector('.login-btn');
        var originalText = btn.textContent;
        btn.textContent = 'Signing in...';
        btn.disabled = true;

        try {
            var result = await Auth.login(username, password, role);
            if (result.success) {
                UI.showApp();
                this.refreshAll();
                UI.showToast('success', 'Welcome', 'Logged in as ' + result.user.name);
                // Sync data from server
                this.syncWithServer();
            } else {
                UI.showToast('error', 'Login Failed', result.message);
            }
        } catch (err) {
            UI.showToast('error', 'Login Error', err.message || 'Failed to connect');
        }

        btn.textContent = originalText;
        btn.disabled = false;
    },

    async syncWithServer() {
        try {
            var synced = await DataStore.syncFromServer();
            if (synced) {
                this.refreshAll();
            }
        } catch (err) {
            console.warn('[App] Server sync failed:', err.message);
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
    },

    applyTheme() {
        var settings = DataStore.getSettings();
        var theme = settings.theme || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        // Update login screen gradient
        var loginScreen = document.getElementById('login-screen');
        if (loginScreen) {
            loginScreen.style.background = 'var(--login-gradient)';
            loginScreen.style.backgroundSize = '400% 400%';
            loginScreen.style.animation = 'gradientShift 15s ease infinite';
        }
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(function(registration) {
                    console.log('[PWA] Service Worker registered with scope:', registration.scope);

                    // Listen for updates
                    registration.addEventListener('updatefound', function() {
                        var newWorker = registration.installing;
                        newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'activated') {
                                UI.showToast('info', 'App Updated', 'New version available. Refresh to update.');
                            }
                        });
                    });
                })
                .catch(function(err) {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });

            // Listen for sync messages from service worker
            navigator.serviceWorker.addEventListener('message', function(event) {
                if (event.data && event.data.type === 'SYNC_COMPLETE') {
                    App.syncWithServer();
                }
            });
        }

        // PWA install prompt
        var deferredPrompt;
        window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            deferredPrompt = e;
            // Show install button notification
            UI.showToast('info', 'Install App', 'This app can be installed on your device for offline use.');
        });
    }
};

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
