/* =============================================
   Data Management & Backup Module (Admin only)
   ============================================= */

const DataMgmt = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        var btnJson = document.getElementById('btn-backup-json');
        if (btnJson) {
            btnJson.addEventListener('click', () => this.downloadJsonBackup());
        }

        var btnDb = document.getElementById('btn-backup-db');
        if (btnDb) {
            btnDb.addEventListener('click', () => this.downloadDbBackup());
        }
    },

    render() {
        // Panel is already static HTML; nothing dynamic to render
    },

    async downloadJsonBackup() {
        try {
            UI.showToast('info', 'Downloading', 'Preparing JSON backup...');
            await ApiClient.exportBackup();
            UI.showToast('success', 'Backup Downloaded', 'JSON backup has been downloaded. You can upload it to Google Drive for safekeeping.');
        } catch (err) {
            UI.showToast('error', 'Backup Error', err.message || 'Failed to download backup');
        }
    },

    async downloadDbBackup() {
        try {
            UI.showToast('info', 'Downloading', 'Preparing database backup...');
            await ApiClient.exportDatabase();
            UI.showToast('success', 'Database Downloaded', 'SQLite database file has been downloaded.');
        } catch (err) {
            UI.showToast('error', 'Backup Error', err.message || 'Failed to download database');
        }
    },

    async deleteData(type) {
        var labels = {
            'mileage-logs': 'Mileage Logs',
            'maintenance-logs': 'Maintenance Logs',
            'alerts': 'Alerts',
            'activity': 'Activity Log',
            'vehicles': 'All Vehicles',
            'all': 'ALL Data'
        };

        var label = labels[type] || type;

        if (!confirm('Are you sure you want to delete all ' + label + '? This cannot be undone!')) return;

        if (type === 'all' || type === 'vehicles') {
            if (!confirm('FINAL WARNING: This will permanently remove ' + label + '. Continue?')) return;
        }

        try {
            var result = await ApiClient.deleteData(type);
            if (result && result.success) {
                UI.showToast('success', 'Data Deleted', label + ' have been deleted');
                // Sync and refresh everything
                await App.syncWithServer();
                App.refreshAll();
            } else {
                UI.showToast('error', 'Error', result ? result.error : 'Failed to delete data');
            }
        } catch (err) {
            UI.showToast('error', 'Error', err.message || 'Failed to delete data');
        }
    }
};
