/* =============================================
   Expiration Tracking Module
   ============================================= */

const ExpirationManager = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Expiration edit form
        var form = document.getElementById('expiration-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveExpiration();
            });
        }

        // Modal close handlers
        document.querySelectorAll('#modal-expiration-edit .modal-close, #modal-expiration-edit .modal-cancel, #modal-expiration-edit .modal-overlay').forEach(el => {
            el.addEventListener('click', () => document.getElementById('modal-expiration-edit').classList.add('hidden'));
        });
    },

    getExpiryStatus(expiryDateStr) {
        if (!expiryDateStr) return { status: 'unknown', label: 'Not Set', cssClass: 'text-muted' };

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var expiry = new Date(expiryDateStr);
        expiry.setHours(0, 0, 0, 0);

        var diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { status: 'expired', label: 'Expired (' + Math.abs(diffDays) + ' days ago)', cssClass: 'status-exceeded' };
        } else if (diffDays <= 90) {
            return { status: 'expiring', label: 'Expiring in ' + diffDays + ' days', cssClass: 'status-warning' };
        } else {
            return { status: 'valid', label: 'Valid (' + diffDays + ' days)', cssClass: 'status-normal' };
        }
    },

    render() {
        var tbody = document.getElementById('expiration-table-body');
        var summaryDiv = document.getElementById('expiration-summary');
        if (!tbody) return;

        var vehicles = DataStore.getVehicles();

        // Build summary
        var expired = 0, expiringSoon = 0, valid = 0, notSet = 0;
        vehicles.forEach(v => {
            var regStatus = this.getExpiryStatus(v.registrationExpiry);
            var insStatus = this.getExpiryStatus(v.insuranceExpiry);

            if (regStatus.status === 'expired' || insStatus.status === 'expired') expired++;
            else if (regStatus.status === 'expiring' || insStatus.status === 'expiring') expiringSoon++;
            else if (regStatus.status === 'valid' || insStatus.status === 'valid') valid++;
            else notSet++;
        });

        if (summaryDiv) {
            summaryDiv.innerHTML = '<div class="stats-row" style="margin-bottom:20px;">' +
                '<div class="stat-card"><div class="stat-icon exceeded"><i class="fas fa-times-circle"></i></div><div class="stat-info"><span class="stat-value">' + expired + '</span><span class="stat-label">Expired</span></div></div>' +
                '<div class="stat-card"><div class="stat-icon warning"><i class="fas fa-exclamation-triangle"></i></div><div class="stat-info"><span class="stat-value">' + expiringSoon + '</span><span class="stat-label">Expiring Soon (90 days)</span></div></div>' +
                '<div class="stat-card"><div class="stat-icon normal"><i class="fas fa-check-circle"></i></div><div class="stat-info"><span class="stat-value">' + valid + '</span><span class="stat-label">Valid</span></div></div>' +
                '<div class="stat-card"><div class="stat-icon total"><i class="fas fa-question-circle"></i></div><div class="stat-info"><span class="stat-value">' + notSet + '</span><span class="stat-label">Not Set</span></div></div>' +
                '</div>';
        }

        if (vehicles.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted);">No vehicles registered</td></tr>';
            return;
        }

        tbody.innerHTML = vehicles.map(v => {
            var regStatus = this.getExpiryStatus(v.registrationExpiry);
            var insStatus = this.getExpiryStatus(v.insuranceExpiry);

            return '<tr>' +
                '<td><strong>' + v.id + '</strong></td>' +
                '<td>' + v.registration + '</td>' +
                '<td>' + (v.registrationDate ? new Date(v.registrationDate).toLocaleDateString() : '<span style="color:var(--text-muted)">-</span>') + '</td>' +
                '<td>' + (v.registrationExpiry ? new Date(v.registrationExpiry).toLocaleDateString() : '<span style="color:var(--text-muted)">-</span>') + '</td>' +
                '<td><span class="status-badge ' + regStatus.cssClass + '">' + regStatus.label + '</span></td>' +
                '<td>' + (v.insuranceDate ? new Date(v.insuranceDate).toLocaleDateString() : '<span style="color:var(--text-muted)">-</span>') + '</td>' +
                '<td>' + (v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : '<span style="color:var(--text-muted)">-</span>') + '</td>' +
                '<td><span class="status-badge ' + insStatus.cssClass + '">' + insStatus.label + '</span></td>' +
                '<td class="admin-only"><button class="btn-icon" title="Edit Dates" onclick="ExpirationManager.openEditModal(\'' + v.id + '\')"><i class="fas fa-edit"></i></button></td>' +
                '</tr>';
        }).join('');

        // Hide admin columns for drivers
        if (Auth.isDriver()) {
            document.querySelectorAll('#panel-expiration .admin-only').forEach(el => el.style.display = 'none');
        }
    },

    openEditModal(vehicleId) {
        var vehicle = DataStore.getVehicle(vehicleId);
        if (!vehicle) return;

        var modal = document.getElementById('modal-expiration-edit');
        document.getElementById('modal-expiration-title').textContent = 'Edit Dates - ' + vehicleId;
        document.getElementById('exp-vehicle-id').value = vehicleId;

        document.getElementById('exp-reg-date').value = vehicle.registrationDate || '';
        document.getElementById('exp-reg-expiry').value = vehicle.registrationExpiry || '';
        document.getElementById('exp-ins-date').value = vehicle.insuranceDate || '';
        document.getElementById('exp-ins-expiry').value = vehicle.insuranceExpiry || '';

        modal.classList.remove('hidden');
    },

    async saveExpiration() {
        var vehicleId = document.getElementById('exp-vehicle-id').value;
        var registrationDate = document.getElementById('exp-reg-date').value;
        var registrationExpiry = document.getElementById('exp-reg-expiry').value;
        var insuranceDate = document.getElementById('exp-ins-date').value;
        var insuranceExpiry = document.getElementById('exp-ins-expiry').value;

        try {
            var result = await ApiClient.updateVehicle(vehicleId, {
                registrationDate, registrationExpiry, insuranceDate, insuranceExpiry
            });

            if (result && result.success) {
                UI.showToast('success', 'Dates Updated', 'Expiration dates have been saved for ' + vehicleId);
                document.getElementById('modal-expiration-edit').classList.add('hidden');

                // Sync and refresh
                await App.syncWithServer();
                this.render();
            } else {
                UI.showToast('error', 'Error', result ? result.error : 'Failed to update dates');
            }
        } catch (err) {
            UI.showToast('error', 'Error', err.message || 'Failed to update dates');
        }
    }
};
