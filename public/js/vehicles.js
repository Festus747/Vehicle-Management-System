/* =============================================
   Vehicle Management Module
   ============================================= */

const VehicleManager = {
    editingVehicleId: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Add vehicle button
        document.getElementById('btn-add-vehicle').addEventListener('click', () => {
            this.editingVehicleId = null;
            this.openVehicleModal();
        });

        // Vehicle form submission
        document.getElementById('vehicle-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveVehicle();
        });

        // Search
        document.getElementById('vehicle-search').addEventListener('input', (e) => {
            this.renderVehiclesTable(e.target.value);
        });

        // Modal close handlers
        document.querySelectorAll('#modal-vehicle .modal-close, #modal-vehicle .modal-cancel, #modal-vehicle .modal-overlay').forEach(el => {
            el.addEventListener('click', () => this.closeVehicleModal());
        });

        document.querySelectorAll('#modal-vehicle-details .modal-close, #modal-vehicle-details .modal-overlay').forEach(el => {
            el.addEventListener('click', () => {
                document.getElementById('modal-vehicle-details').classList.add('hidden');
            });
        });
    },

    async openVehicleModal(vehicleId = null) {
        const modal = document.getElementById('modal-vehicle');
        const title = document.getElementById('modal-vehicle-title');
        const form = document.getElementById('vehicle-form');
        form.reset();

        // Populate driver dropdown with approved drivers from server
        await this.populateDriverDropdown();

        if (vehicleId) {
            const vehicle = DataStore.getVehicle(vehicleId);
            if (!vehicle) return;
            this.editingVehicleId = vehicleId;
            title.textContent = 'Edit Vehicle';
            document.getElementById('v-id').value = vehicle.id;
            document.getElementById('v-id').disabled = true;
            document.getElementById('v-reg').value = vehicle.registration;
            document.getElementById('v-type').value = vehicle.type;
            document.getElementById('v-driver').value = vehicle.driver || '';
            document.getElementById('v-mileage').value = vehicle.mileage || 0;
            document.getElementById('v-status').value = vehicle.status;

            // Expiration date fields
            var regDate = document.getElementById('v-reg-date');
            var regExpiry = document.getElementById('v-reg-expiry');
            var insDate = document.getElementById('v-ins-date');
            var insExpiry = document.getElementById('v-ins-expiry');
            if (regDate) regDate.value = vehicle.registrationDate || '';
            if (regExpiry) regExpiry.value = vehicle.registrationExpiry || '';
            if (insDate) insDate.value = vehicle.insuranceDate || '';
            if (insExpiry) insExpiry.value = vehicle.insuranceExpiry || '';
        } else {
            this.editingVehicleId = null;
            title.textContent = 'Register Vehicle';
            document.getElementById('v-id').disabled = false;
        }

        modal.classList.remove('hidden');
    },

    async populateDriverDropdown() {
        const select = document.getElementById('v-driver');
        select.innerHTML = '<option value="">-- Select Driver --</option>';
        try {
            const users = await ApiClient.getUsers();
            const drivers = (users || []).filter(u => u.approved !== false);
            drivers.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.name;
                opt.textContent = u.name + ' (' + u.role + ')';
                select.appendChild(opt);
            });
        } catch (err) {
            console.warn('[VehicleManager] Could not load drivers:', err.message);
            // Fallback: allow free text if users API fails
        }
    },

    closeVehicleModal() {
        document.getElementById('modal-vehicle').classList.add('hidden');
        this.editingVehicleId = null;
        document.getElementById('v-id').disabled = false;
    },

    saveVehicle() {
        const vehicleData = {
            id: document.getElementById('v-id').value.trim().toUpperCase(),
            registration: document.getElementById('v-reg').value.trim().toUpperCase(),
            type: document.getElementById('v-type').value,
            driver: document.getElementById('v-driver').value.trim(),
            mileage: parseInt(document.getElementById('v-mileage').value) || 0,
            status: document.getElementById('v-status').value
        };

        // Add expiration date fields
        var regDate = document.getElementById('v-reg-date');
        var regExpiry = document.getElementById('v-reg-expiry');
        var insDate = document.getElementById('v-ins-date');
        var insExpiry = document.getElementById('v-ins-expiry');
        if (regDate) vehicleData.registrationDate = regDate.value || null;
        if (regExpiry) vehicleData.registrationExpiry = regExpiry.value || null;
        if (insDate) vehicleData.insuranceDate = insDate.value || null;
        if (insExpiry) vehicleData.insuranceExpiry = insExpiry.value || null;

        if (!vehicleData.id || !vehicleData.registration || !vehicleData.type) {
            UI.showToast('error', 'Validation Error', 'Please fill in all required fields');
            return;
        }

        let result;
        if (this.editingVehicleId) {
            result = DataStore.updateVehicle(this.editingVehicleId, vehicleData);
            if (result.success) {
                UI.showToast('success', 'Vehicle Updated', `Vehicle ${vehicleData.id} has been updated`);
                DataStore.addActivity('vehicle', `Vehicle ${vehicleData.id} updated`, 'fa-edit');
            }
        } else {
            result = DataStore.addVehicle(vehicleData);
            if (result.success) {
                UI.showToast('success', 'Vehicle Registered', `Vehicle ${vehicleData.id} has been registered`);
            }
        }

        if (result.success) {
            this.closeVehicleModal();
            this.renderVehiclesTable();
            Dashboard.refresh();
            UI.updateSidebar();
            UI.updateStatusBar();
        } else {
            UI.showToast('error', 'Error', result.message);
        }
    },

    renderVehiclesTable(searchTerm = '') {
        const tbody = document.getElementById('vehicles-table-body');
        let vehicles = DataStore.getVehicles();

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            vehicles = vehicles.filter(v =>
                v.id.toLowerCase().includes(term) ||
                v.registration.toLowerCase().includes(term) ||
                v.type.toLowerCase().includes(term) ||
                (v.driver && v.driver.toLowerCase().includes(term))
            );
        }

        if (vehicles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:40px; color:var(--text-muted);">
                        ${searchTerm ? 'No vehicles match your search' : 'No vehicles registered yet. Click "Register Vehicle" to add one.'}
                    </td>
                </tr>`;
            return;
        }

        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;

        tbody.innerHTML = vehicles.map(v => {
            const status = DataStore.getVehicleStatus(v);
            const remaining = maxMileage - (v.mileage || 0);
            const pct = Math.min(((v.mileage || 0) / maxMileage) * 100, 100);
            const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
            const typeIcon = this.getTypeIcon(v.type);

            return `
                <tr>
                    <td><strong>${v.id}</strong></td>
                    <td>${v.registration}</td>
                    <td><span class="vehicle-type-icon"><i class="fas ${typeIcon}"></i> ${v.type}</span></td>
                    <td>${v.driver || '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
                    <td>
                        <div class="mileage-bar-inline">
                            <span>${(v.mileage || 0).toLocaleString()}</span>
                            <div class="mileage-bar-bg" style="width:80px">
                                <div class="mileage-bar-fill" style="width:${pct}%; background:var(--status-${status})"></div>
                            </div>
                        </div>
                    </td>
                    <td>${remaining > 0 ? remaining.toLocaleString() + ' mi' : '<span style="color:var(--status-exceeded)">EXCEEDED</span>'}</td>
                    <td><span class="status-badge status-${status}"><i class="fas ${status === 'normal' ? 'fa-check-circle' : status === 'warning' ? 'fa-exclamation-triangle' : 'fa-times-circle'}"></i> ${statusLabel}</span></td>
                    <td class="admin-only">
                        <div class="action-btn-group">
                            <button class="btn-icon" title="View Details" onclick="VehicleManager.showDetails('${v.id}')"><i class="fas fa-eye"></i></button>
                            <button class="btn-icon" title="Edit" onclick="VehicleManager.openVehicleModal('${v.id}')"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon" title="Log Mileage" onclick="MileageManager.openMileageModal('${v.id}')"><i class="fas fa-road"></i></button>
                            <button class="btn-icon" title="Delete" onclick="VehicleManager.deleteVehicle('${v.id}')"><i class="fas fa-trash" style="color:var(--accent-red)"></i></button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        // Hide admin actions for drivers
        if (Auth.isDriver()) {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    },

    showDetails(vehicleId) {
        const vehicle = DataStore.getVehicle(vehicleId);
        if (!vehicle) return;

        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;
        const remaining = maxMileage - (vehicle.mileage || 0);
        const status = DataStore.getVehicleStatus(vehicle);
        const pct = Math.min(((vehicle.mileage || 0) / maxMileage) * 100, 100);
        const logs = DataStore.getMileageLogs(vehicleId);

        const content = document.getElementById('vehicle-details-content');
        content.innerHTML = `
            <div class="vehicle-detail-grid">
                <div class="detail-section">
                    <h4><i class="fas fa-info-circle"></i> Vehicle Information</h4>
                    <div class="detail-row"><span class="detail-label">Vehicle ID</span><span class="detail-value">${vehicle.id}</span></div>
                    <div class="detail-row"><span class="detail-label">Registration</span><span class="detail-value">${vehicle.registration}</span></div>
                    <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${vehicle.type}</span></div>
                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge status-${vehicle.status === 'active' ? 'normal' : 'exceeded'}">${vehicle.status}</span></span></div>
                    <div class="detail-row"><span class="detail-label">Registered</span><span class="detail-value">${vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'N/A'}</span></div>
                </div>
                <div class="detail-section">
                    <h4><i class="fas fa-tachometer-alt"></i> Mileage Information</h4>
                    <div class="detail-row"><span class="detail-label">Current Mileage</span><span class="detail-value">${(vehicle.mileage || 0).toLocaleString()} miles</span></div>
                    <div class="detail-row"><span class="detail-label">Maximum Limit</span><span class="detail-value">${maxMileage.toLocaleString()} miles</span></div>
                    <div class="detail-row"><span class="detail-label">Remaining</span><span class="detail-value" style="color:var(--status-${status})">${remaining > 0 ? remaining.toLocaleString() + ' miles' : 'EXCEEDED by ' + Math.abs(remaining) + ' miles'}</span></div>
                    <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value"><span class="status-badge status-${status}">${status.toUpperCase()}</span></span></div>
                    <div class="detail-row"><span class="detail-label">Assigned Driver</span><span class="detail-value">${vehicle.driver || 'Unassigned'}</span></div>
                </div>
            </div>
            <div class="mileage-gauge">
                <div class="gauge-bar">
                    <div class="gauge-fill ${status}" style="width:${pct}%">
                        <span class="gauge-center-label">${pct.toFixed(1)}%</span>
                    </div>
                </div>
                <div class="gauge-labels">
                    <span>0 miles</span>
                    <span>${maxMileage.toLocaleString()} miles</span>
                </div>
            </div>
            <div class="vehicle-history-section">
                <h4><i class="fas fa-history"></i> Mileage History</h4>
                ${logs.length > 0 ? `
                    <div class="table-container" style="max-height:300px; overflow-y:auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Previous</th>
                                    <th>New</th>
                                    <th>Added</th>
                                    <th>Logged By</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${logs.map(l => `
                                    <tr>
                                        <td>${new Date(l.timestamp).toLocaleString()}</td>
                                        <td>${l.previousMileage.toLocaleString()}</td>
                                        <td>${l.newMileage.toLocaleString()}</td>
                                        <td>+${l.milesAdded.toLocaleString()}</td>
                                        <td>${l.loggedBy}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : '<p style="color:var(--text-muted); padding:20px; text-align:center;">No mileage history</p>'}
            </div>
        `;

        document.getElementById('modal-vehicle-details').classList.remove('hidden');
    },

    deleteVehicle(vehicleId) {
        if (!confirm(`Are you sure you want to deactivate vehicle ${vehicleId}?`)) return;
        DataStore.deleteVehicle(vehicleId);
        UI.showToast('success', 'Vehicle Removed', `Vehicle ${vehicleId} has been deactivated`);
        this.renderVehiclesTable();
        Dashboard.refresh();
        UI.updateSidebar();
        UI.updateStatusBar();
    },

    getTypeIcon(type) {
        const icons = {
            'Sedan': 'fa-car',
            'SUV': 'fa-car-side',
            'Truck': 'fa-truck',
            'Van': 'fa-shuttle-van',
            'Bus': 'fa-bus',
            'Motorcycle': 'fa-motorcycle'
        };
        return icons[type] || 'fa-car';
    }
};
