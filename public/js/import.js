/* =============================================
   Data Import Module - CSV/Excel Upload
   ============================================= */

const DataImporter = {
    vehicleFile: null,
    mileageFile: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // Vehicle file input
        const vInput = document.getElementById('vehicle-file-input');
        const vDropzone = document.getElementById('vehicle-dropzone');
        const vBtn = document.getElementById('btn-import-vehicles');

        if (vInput) {
            vInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.vehicleFile = e.target.files[0];
                    document.getElementById('vehicle-file-name').textContent = '📄 ' + this.vehicleFile.name;
                    document.getElementById('vehicle-file-name').classList.remove('hidden');
                    vBtn.disabled = false;
                }
            });
        }

        if (vDropzone) {
            vDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                vDropzone.classList.add('dragover');
            });
            vDropzone.addEventListener('dragleave', () => {
                vDropzone.classList.remove('dragover');
            });
            vDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                vDropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.vehicleFile = e.dataTransfer.files[0];
                    vInput.files = e.dataTransfer.files;
                    document.getElementById('vehicle-file-name').textContent = '📄 ' + this.vehicleFile.name;
                    document.getElementById('vehicle-file-name').classList.remove('hidden');
                    vBtn.disabled = false;
                }
            });
        }

        if (vBtn) {
            vBtn.addEventListener('click', () => this.importVehicles());
        }

        // Mileage file input
        const mInput = document.getElementById('mileage-file-input');
        const mDropzone = document.getElementById('mileage-dropzone');
        const mBtn = document.getElementById('btn-import-mileage');

        if (mInput) {
            mInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.mileageFile = e.target.files[0];
                    document.getElementById('mileage-file-name').textContent = '📄 ' + this.mileageFile.name;
                    document.getElementById('mileage-file-name').classList.remove('hidden');
                    mBtn.disabled = false;
                }
            });
        }

        if (mDropzone) {
            mDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                mDropzone.classList.add('dragover');
            });
            mDropzone.addEventListener('dragleave', () => {
                mDropzone.classList.remove('dragover');
            });
            mDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                mDropzone.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.mileageFile = e.dataTransfer.files[0];
                    mInput.files = e.dataTransfer.files;
                    document.getElementById('mileage-file-name').textContent = '📄 ' + this.mileageFile.name;
                    document.getElementById('mileage-file-name').classList.remove('hidden');
                    mBtn.disabled = false;
                }
            });
        }

        if (mBtn) {
            mBtn.addEventListener('click', () => this.importMileage());
        }
    },

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            const ext = file.name.split('.').pop().toLowerCase();

            if (ext === 'csv') {
                reader.onload = (e) => {
                    const text = e.target.result;
                    const rows = this.parseCSV(text);
                    resolve(rows);
                };
                reader.onerror = reject;
                reader.readAsText(file);
            } else if (ext === 'xlsx' || ext === 'xls') {
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                        resolve(rows);
                    } catch (err) {
                        reject(new Error('Failed to parse Excel file: ' + err.message));
                    }
                };
                reader.onerror = reject;
                reader.readAsArrayBuffer(file);
            } else {
                reject(new Error('Unsupported file format. Please use .csv, .xlsx, or .xls'));
            }
        });
    },

    parseCSV(text) {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        return lines.map(line => {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (ch === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += ch;
                }
            }
            result.push(current.trim());
            return result;
        });
    },

    async importVehicles() {
        if (!this.vehicleFile) {
            UI.showToast('error', 'Error', 'Please select a file first');
            return;
        }

        // Try server-side import first
        if (navigator.onLine && ApiClient.getToken()) {
            try {
                UI.showToast('info', 'Importing...', 'Processing vehicle data via server...');
                const result = await ApiClient.importFile('vehicles', this.vehicleFile);
                if (result && result.success) {
                    UI.showToast('success', 'Import Complete',
                        'Imported ' + result.imported + ' vehicles, updated ' + result.updated +
                        (result.errors.length > 0 ? '. ' + result.errors.length + ' errors.' : ''));
                    this.showImportResult(result);
                    // Sync local data with server
                    await DataStore.syncFromServer();
                    App.refreshAll();
                    this.vehicleFile = null;
                    document.getElementById('vehicle-file-name').classList.add('hidden');
                    document.getElementById('btn-import-vehicles').disabled = true;
                    return;
                } else if (result && result.error) {
                    UI.showToast('error', 'Import Error', result.error);
                    return;
                }
            } catch (err) {
                console.warn('[Import] Server import failed, falling back to client-side:', err.message);
            }
        }

        // Fallback: client-side import
        try {
            const rows = await this.readFile(this.vehicleFile);
            if (rows.length < 2) {
                UI.showToast('error', 'Error', 'File is empty or has no data rows');
                return;
            }

            // First row is headers
            const headers = rows[0].map(h => String(h).toLowerCase().trim());
            const dataRows = rows.slice(1).filter(r => r.some(cell => cell !== '' && cell != null));

            // Map columns
            const colMap = this.mapVehicleColumns(headers);

            let imported = 0;
            let skipped = 0;
            const errors = [];

            for (const row of dataRows) {
                try {
                    const vehicle = {
                        id: String(row[colMap.id] || '').trim().toUpperCase(),
                        registration: String(row[colMap.registration] || '').trim().toUpperCase(),
                        type: String(row[colMap.type] || 'Sedan').trim(),
                        driver: String(row[colMap.driver] || '').trim(),
                        mileage: parseInt(row[colMap.mileage]) || 0,
                        status: String(row[colMap.status] || 'active').trim().toLowerCase(),
                        warningAlertSent: false,
                        criticalAlertSent: false
                    };

                    if (!vehicle.id || !vehicle.registration) {
                        skipped++;
                        continue;
                    }

                    // Validate type
                    const validTypes = ['Sedan', 'SUV', 'Truck', 'Van', 'Bus', 'Motorcycle'];
                    if (!validTypes.includes(vehicle.type)) {
                        vehicle.type = 'Sedan';
                    }

                    if (!['active', 'inactive'].includes(vehicle.status)) {
                        vehicle.status = 'active';
                    }

                    const result = DataStore.addVehicle(vehicle);
                    if (result.success) {
                        imported++;
                    } else {
                        // Try updating if already exists
                        const updateResult = DataStore.updateVehicle(vehicle.id, vehicle);
                        if (updateResult.success) {
                            imported++;
                        } else {
                            skipped++;
                            errors.push(`${vehicle.id}: ${result.message}`);
                        }
                    }
                } catch (e) {
                    skipped++;
                }
            }

            this.showImportResult('Vehicles', imported, skipped, errors);
            this.vehicleFile = null;
            document.getElementById('vehicle-file-input').value = '';
            document.getElementById('vehicle-file-name').classList.add('hidden');
            document.getElementById('btn-import-vehicles').disabled = true;
            App.refreshAll();

        } catch (err) {
            UI.showToast('error', 'Import Error', err.message);
        }
    },

    async importMileage() {
        if (!this.mileageFile) {
            UI.showToast('error', 'Error', 'Please select a file first');
            return;
        }

        // Try server-side import first
        if (navigator.onLine && ApiClient.getToken()) {
            try {
                UI.showToast('info', 'Importing...', 'Processing mileage data via server...');
                const result = await ApiClient.importFile('mileage', this.mileageFile);
                if (result && result.success) {
                    UI.showToast('success', 'Import Complete',
                        'Imported ' + result.imported + ' mileage records' +
                        (result.errors.length > 0 ? '. ' + result.errors.length + ' errors.' : ''));
                    this.showImportResult(result);
                    await DataStore.syncFromServer();
                    App.refreshAll();
                    this.mileageFile = null;
                    document.getElementById('mileage-file-name').classList.add('hidden');
                    document.getElementById('btn-import-mileage').disabled = true;
                    return;
                } else if (result && result.error) {
                    UI.showToast('error', 'Import Error', result.error);
                    return;
                }
            } catch (err) {
                console.warn('[Import] Server import failed, falling back to client-side:', err.message);
            }
        }

        // Fallback: client-side import
        try {
            const rows = await this.readFile(this.mileageFile);
            if (rows.length < 2) {
                UI.showToast('error', 'Error', 'File is empty or has no data rows');
                return;
            }

            const headers = rows[0].map(h => String(h).toLowerCase().trim());
            const dataRows = rows.slice(1).filter(r => r.some(cell => cell !== '' && cell != null));

            const colMap = this.mapMileageColumns(headers);

            let imported = 0;
            let skipped = 0;
            const errors = [];

            // Sort by date to ensure chronological import
            dataRows.sort((a, b) => {
                const dateA = new Date(a[colMap.date] || 0);
                const dateB = new Date(b[colMap.date] || 0);
                return dateA - dateB;
            });

            for (const row of dataRows) {
                try {
                    const vehicleId = String(row[colMap.vehicleId] || '').trim().toUpperCase();
                    const prevMileage = parseInt(row[colMap.previousMileage]) || 0;
                    const newMileage = parseInt(row[colMap.newMileage]) || 0;
                    const loggedBy = String(row[colMap.loggedBy] || 'Import').trim();
                    const notes = String(row[colMap.notes] || 'Historical data import').trim();
                    const dateStr = row[colMap.date];

                    if (!vehicleId || newMileage <= 0) {
                        skipped++;
                        continue;
                    }

                    // Check vehicle exists
                    const vehicle = DataStore.getVehicle(vehicleId);
                    if (!vehicle) {
                        skipped++;
                        errors.push(`Vehicle ${vehicleId} not found`);
                        continue;
                    }

                    // Direct log insertion (bypass validation for historical data)
                    const log = {
                        id: 'ML-IMP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                        vehicleId,
                        previousMileage: prevMileage,
                        newMileage: newMileage,
                        milesAdded: newMileage - prevMileage,
                        timestamp: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
                        loggedBy,
                        notes
                    };

                    const allLogs = DataStore.get(DataStore.KEYS.MILEAGE_LOGS) || [];
                    allLogs.push(log);
                    DataStore.set(DataStore.KEYS.MILEAGE_LOGS, allLogs);

                    // Update vehicle mileage if this entry is higher
                    if (newMileage > (vehicle.mileage || 0)) {
                        DataStore.updateVehicle(vehicleId, { mileage: newMileage });
                    }

                    imported++;
                } catch (e) {
                    skipped++;
                }
            }

            this.showImportResult('Mileage Logs', imported, skipped, errors);
            this.mileageFile = null;
            document.getElementById('mileage-file-input').value = '';
            document.getElementById('mileage-file-name').classList.add('hidden');
            document.getElementById('btn-import-mileage').disabled = true;
            App.refreshAll();

        } catch (err) {
            UI.showToast('error', 'Import Error', err.message);
        }
    },

    mapVehicleColumns(headers) {
        const findCol = (keywords) => {
            for (const kw of keywords) {
                const idx = headers.findIndex(h => h.includes(kw));
                if (idx !== -1) return idx;
            }
            return -1;
        };

        return {
            id: Math.max(0, findCol(['vehicle id', 'vehicleid', 'id', 'vehicle_id', 'v_id'])),
            registration: Math.max(1, findCol(['registration', 'reg', 'plate', 'license', 'reg number', 'registration number'])),
            type: Math.max(2, findCol(['type', 'vehicle type', 'category'])),
            driver: Math.max(3, findCol(['driver', 'assigned driver', 'driver name'])),
            mileage: Math.max(4, findCol(['mileage', 'current mileage', 'odometer', 'miles'])),
            status: Math.max(5, findCol(['status', 'active', 'state']))
        };
    },

    mapMileageColumns(headers) {
        const findCol = (keywords) => {
            for (const kw of keywords) {
                const idx = headers.findIndex(h => h.includes(kw));
                if (idx !== -1) return idx;
            }
            return -1;
        };

        return {
            vehicleId: Math.max(0, findCol(['vehicle id', 'vehicleid', 'vehicle_id', 'v_id', 'id'])),
            date: Math.max(1, findCol(['date', 'timestamp', 'datetime', 'time', 'log date'])),
            previousMileage: Math.max(2, findCol(['previous', 'prev', 'previous mileage', 'from', 'old mileage'])),
            newMileage: Math.max(3, findCol(['new', 'new mileage', 'to', 'current', 'new reading'])),
            loggedBy: Math.max(4, findCol(['logged by', 'loggedby', 'user', 'recorded by', 'name'])),
            notes: Math.max(5, findCol(['notes', 'note', 'comment', 'remarks']))
        };
    },

    showImportResult(type, imported, skipped, errors) {
        const preview = document.getElementById('import-preview');
        const content = document.getElementById('import-preview-content');

        content.innerHTML = `
            <div style="padding:12px;">
                <div style="display:flex; gap:20px; margin-bottom:12px;">
                    <div style="text-align:center;">
                        <div style="font-size:28px; font-weight:700; color:var(--accent-green);">${imported}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">Imported</div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:28px; font-weight:700; color:var(--status-warning);">${skipped}</div>
                        <div style="font-size:12px; color:var(--text-secondary);">Skipped</div>
                    </div>
                </div>
                ${errors.length > 0 ? `
                    <div style="margin-top:8px; padding:8px; background:var(--bg-tertiary); border-radius:4px; max-height:150px; overflow-y:auto;">
                        <div style="font-size:12px; color:var(--text-muted); margin-bottom:4px;">Issues:</div>
                        ${errors.slice(0, 10).map(e => `<div style="font-size:11px; color:var(--status-warning);">${e}</div>`).join('')}
                        ${errors.length > 10 ? `<div style="font-size:11px; color:var(--text-muted);">...and ${errors.length - 10} more</div>` : ''}
                    </div>` : ''}
            </div>`;

        preview.classList.remove('hidden');

        if (imported > 0) {
            UI.showToast('success', 'Import Complete', `${imported} ${type} imported successfully${skipped > 0 ? `, ${skipped} skipped` : ''}`);
            DataStore.addActivity('import', `Imported ${imported} ${type} from file`, 'fa-file-upload');
        } else {
            UI.showToast('warning', 'Import', `No ${type} were imported. ${skipped} rows skipped.`);
        }
    },

    downloadTemplate(type) {
        let csvContent, filename;

        if (type === 'vehicles') {
            csvContent = 'Vehicle ID,Registration,Type,Driver,Mileage,Status\nVH-001,ABC 1234,Sedan,John Doe,1500,active\nVH-002,DEF 5678,SUV,Jane Smith,3200,active\nVH-003,GHI 9012,Truck,,0,inactive';
            filename = 'vehicle_import_template.csv';
        } else {
            csvContent = 'Vehicle ID,Date,Previous Mileage,New Mileage,Logged By,Notes\nVH-001,2024-01-15,0,500,John Doe,Initial reading\nVH-001,2024-02-01,500,1200,John Doe,Monthly update\nVH-002,2024-01-20,0,800,Jane Smith,First entry';
            filename = 'mileage_import_template.csv';
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);

        UI.showToast('info', 'Template Downloaded', `${filename} has been downloaded`);
    }
};
