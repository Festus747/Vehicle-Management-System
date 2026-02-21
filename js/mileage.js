/* =============================================
   Mileage Tracking Module
   ============================================= */

const MileageManager = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Add mileage button
        document.getElementById('btn-add-mileage').addEventListener('click', () => {
            this.openMileageModal();
        });

        // Mileage form submission
        document.getElementById('mileage-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveMileage();
        });

        // Vehicle selection change in modal
        document.getElementById('m-vehicle').addEventListener('change', (e) => {
            this.onVehicleSelected(e.target.value);
        });

        // Filter button
        document.getElementById('btn-filter-mileage').addEventListener('click', () => {
            this.renderMileageTable();
        });

        // Modal close handlers
        document.querySelectorAll('#modal-mileage .modal-close, #modal-mileage .modal-cancel, #modal-mileage .modal-overlay').forEach(el => {
            el.addEventListener('click', () => this.closeMileageModal());
        });
    },

    openMileageModal(vehicleId = null) {
        const modal = document.getElementById('modal-mileage');
        const select = document.getElementById('m-vehicle');
        const form = document.getElementById('mileage-form');
        form.reset();

        // Populate vehicle dropdown
        const vehicles = DataStore.getVehicles().filter(v => v.status === 'active');

        // If driver, only show assigned vehicles
        let filteredVehicles = vehicles;
        if (Auth.isDriver()) {
            const user = Auth.getCurrentUser();
            filteredVehicles = vehicles.filter(v => v.driver === user.name);
        }

        select.innerHTML = '<option value="">Select vehicle</option>' +
            filteredVehicles.map(v => `<option value="${v.id}" ${v.id === vehicleId ? 'selected' : ''}>${v.id} - ${v.registration}</option>`).join('');

        if (vehicleId) {
            this.onVehicleSelected(vehicleId);
        } else {
            document.getElementById('m-current-value').textContent = '--';
            document.getElementById('m-remaining').textContent = '-- remaining';
        }

        modal.classList.remove('hidden');
    },

    closeMileageModal() {
        document.getElementById('modal-mileage').classList.add('hidden');
    },

    onVehicleSelected(vehicleId) {
        if (!vehicleId) {
            document.getElementById('m-current-value').textContent = '--';
            document.getElementById('m-remaining').textContent = '-- remaining';
            return;
        }

        const vehicle = DataStore.getVehicle(vehicleId);
        if (!vehicle) return;

        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;
        const remaining = maxMileage - (vehicle.mileage || 0);

        document.getElementById('m-current-value').textContent = (vehicle.mileage || 0).toLocaleString();
        document.getElementById('m-remaining').textContent = remaining > 0 ? `${remaining.toLocaleString()} remaining` : 'LIMIT EXCEEDED';
        document.getElementById('m-remaining').style.color = remaining <= 0 ? 'var(--status-exceeded)' : remaining <= 200 ? 'var(--status-warning)' : 'var(--status-normal)';

        // Set min value for new mileage
        document.getElementById('m-new-mileage').min = (vehicle.mileage || 0) + 1;
        document.getElementById('m-new-mileage').placeholder = `Must be > ${vehicle.mileage || 0}`;
    },

    saveMileage() {
        const vehicleId = document.getElementById('m-vehicle').value;
        const newMileage = parseInt(document.getElementById('m-new-mileage').value);
        const notes = document.getElementById('m-notes').value.trim();

        if (!vehicleId) {
            UI.showToast('error', 'Validation Error', 'Please select a vehicle');
            return;
        }

        if (isNaN(newMileage) || newMileage <= 0) {
            UI.showToast('error', 'Validation Error', 'Please enter a valid mileage reading');
            return;
        }

        const user = Auth.getCurrentUser();
        const result = DataStore.addMileageLog(vehicleId, newMileage, user.name, notes);

        if (result.success) {
            UI.showToast('success', 'Mileage Logged', `Mileage for ${vehicleId} updated to ${newMileage.toLocaleString()} miles`);
            this.closeMileageModal();
            this.renderMileageTable();
            this.populateVehicleFilter();
            VehicleManager.renderVehiclesTable();
            Dashboard.refresh();
            AlertsManager.render();
            UI.updateSidebar();
            UI.updateStatusBar();
            UI.updateAlertBadge();

            // Show warning toast if threshold reached
            const vehicle = DataStore.getVehicle(vehicleId);
            const settings = DataStore.getSettings();
            const maxMileage = settings.maxMileage || MAX_MILEAGE;
            const remaining = maxMileage - newMileage;

            if (remaining <= 0) {
                UI.showToast('error', 'Mileage Limit Exceeded!',
                    `Vehicle ${vehicleId} has exceeded the ${maxMileage.toLocaleString()}-mile limit by ${Math.abs(remaining)} miles!`);
            } else if (remaining <= (settings.warningThreshold || WARNING_THRESHOLD)) {
                UI.showToast('warning', 'Mileage Warning',
                    `Vehicle ${vehicleId} has only ${remaining} miles remaining!`);
            }

            // Update driver vehicle view if applicable
            if (Auth.isDriver()) {
                DriverView.render();
            }
        } else {
            UI.showToast('error', 'Error', result.message);
        }
    },

    populateVehicleFilter() {
        const select = document.getElementById('mileage-vehicle-filter');
        let vehicles = DataStore.getVehicles();
        const currentVal = select.value;

        // Filter for driver's vehicles only
        if (Auth.isDriver()) {
            const user = Auth.getCurrentUser();
            vehicles = vehicles.filter(v => v.driver === user.name);
        }

        select.innerHTML = '<option value="">All Vehicles</option>' +
            vehicles.map(v => `<option value="${v.id}">${v.id} - ${v.registration}</option>`).join('');

        select.value = currentVal;
    },

    renderMileageTable() {
        const tbody = document.getElementById('mileage-table-body');
        const vehicleFilter = document.getElementById('mileage-vehicle-filter').value;
        const dateFrom = document.getElementById('mileage-date-from').value;
        const dateTo = document.getElementById('mileage-date-to').value;

        let logs = DataStore.getMileageLogs(vehicleFilter || null);

        // Filter for driver's vehicles only
        if (Auth.isDriver()) {
            const user = Auth.getCurrentUser();
            const driverVehicleIds = DataStore.getVehicles()
                .filter(v => v.driver === user.name)
                .map(v => v.id);
            logs = logs.filter(l => driverVehicleIds.includes(l.vehicleId));
        }

        // Apply date filters
        if (dateFrom) {
            const from = new Date(dateFrom);
            logs = logs.filter(l => new Date(l.timestamp) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59);
            logs = logs.filter(l => new Date(l.timestamp) <= to);
        }

        if (logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:40px; color:var(--text-muted);">
                        No mileage entries found. Click "Log Mileage" to add one.
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const vehicle = DataStore.getVehicle(l.vehicleId);
            return `
                <tr>
                    <td>${new Date(l.timestamp).toLocaleString()}</td>
                    <td><strong>${l.vehicleId}</strong></td>
                    <td>${vehicle ? vehicle.registration : 'N/A'}</td>
                    <td>${l.previousMileage.toLocaleString()} mi</td>
                    <td>${l.newMileage.toLocaleString()} mi</td>
                    <td style="color:var(--accent-green)">+${l.milesAdded.toLocaleString()} mi</td>
                    <td>${l.loggedBy}</td>
                </tr>`;
        }).join('');
    }
};
