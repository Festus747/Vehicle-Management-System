/* =============================================
   Reports Module
   ============================================= */

const Reports = {
    download(reportType, format) {
        // For driver-usage, show filter dialog instead of downloading directly
        if (reportType === 'driver-usage') {
            this.showDriverUsageDialog(format);
            return;
        }

        this._generateReport(reportType, format);
    },

    _generateReport(reportType, format, options) {
        options = options || {};

        // Maintenance report may need async data fetch first
        if (reportType === 'maintenance') {
            this._generateMaintenanceReport(format, options);
            return;
        }

        var result = this._getReportData(reportType, options);
        if (!result) return;

        if (format === 'csv') {
            this.downloadCSV(result.data, result.headers, result.filename);
        } else if (format === 'pdf') {
            this.downloadPDF(result.data, result.headers, result.filename, reportType, options);
        }
    },

    async _generateMaintenanceReport(format, options) {
        // Ensure maintenance logs are loaded
        if (!MaintenanceManager.logs || MaintenanceManager.logs.length === 0) {
            try {
                await MaintenanceManager.render();
            } catch (e) { /* best effort */ }
        }
        var data = this.getMaintenanceData();
        var headers = ['Date', 'Vehicle ID', 'Artisan/Technician', 'Company', 'Contact', 'Repair Work', 'Cost (GHS)', 'Submitted By', 'Mileage Reset'];
        var filename = 'maintenance_history';

        if (format === 'csv') {
            this.downloadCSV(data, headers, filename);
        } else if (format === 'pdf') {
            this.downloadPDF(data, headers, filename, 'maintenance', options);
        }
    },

    _getReportData(reportType, options) {
        var data, filename, headers;

        switch (reportType) {
            case 'mileage-history':
                data = this.getMileageHistoryData();
                headers = ['Date', 'Vehicle ID', 'Registration', 'Previous Mileage', 'New Mileage', 'Miles Added', 'Logged By', 'Notes'];
                filename = 'mileage_history';
                break;
            case 'alert-logs':
                data = this.getAlertLogsData();
                headers = ['Date', 'Vehicle ID', 'Type', 'Title', 'Message', 'Status'];
                filename = 'alert_logs';
                break;
            case 'driver-usage':
                data = this.getDriverUsageData(options.driverFilter);
                headers = ['Driver', 'Vehicle ID', 'Registration', 'Vehicle Type', 'Total Mileage', 'Cycle Mileage', 'Limit', 'Cycle Remaining', 'Cycle #', 'Status'];
                filename = options.driverFilter ? 'driver_usage_' + options.driverFilter.replace(/\s+/g, '_') : 'driver_usage_all';
                break;
            case 'fleet-summary':
                data = this.getFleetSummaryData();
                headers = ['Vehicle ID', 'Registration', 'Type', 'Driver', 'Total Mileage', 'Cycle Mileage', 'Cycle Remaining', 'Cycle #', 'Status', 'Active'];
                filename = 'fleet_summary';
                break;
            default:
                UI.showToast('error', 'Error', 'Unknown report type');
                return null;
        }

        return { data: data, headers: headers, filename: filename };
    },

    // ── Driver usage filter dialog ──
    showDriverUsageDialog(format) {
        const vehicles = DataStore.getVehicles().filter(v => v.driver);
        const drivers = [];
        const seen = {};
        vehicles.forEach(function(v) {
            if (v.driver && !seen[v.driver]) {
                seen[v.driver] = true;
                drivers.push(v.driver);
            }
        });
        drivers.sort();

        if (drivers.length === 0) {
            UI.showToast('warning', 'No Data', 'No drivers with assigned vehicles found');
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'driver-report-dialog';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:10000;';

        var optionsHtml = '<option value="">All Drivers</option>';
        drivers.forEach(function(d) {
            optionsHtml += '<option value="' + d + '">' + d + '</option>';
        });

        overlay.innerHTML =
            '<div style="background:var(--bg-card,#1e1e2e);border:1px solid var(--border-color,#333);border-radius:12px;padding:24px;max-width:420px;width:90%;color:var(--text-primary,#e0e0e0);">' +
                '<h3 style="margin:0 0 16px;color:var(--text-bright,#fff);"><i class="fas fa-users" style="color:var(--accent-blue,#007acc);margin-right:8px;"></i>Driver Usage Report</h3>' +
                '<p style="font-size:13px;color:var(--text-muted,#888);margin-bottom:16px;">Select a driver to generate their report, or choose "All Drivers" for a complete report.</p>' +
                '<div class="form-group" style="margin-bottom:20px;">' +
                    '<label for="driver-report-select" style="font-size:13px;margin-bottom:6px;display:block;">Select Driver</label>' +
                    '<select id="driver-report-select" style="width:100%;padding:10px;border-radius:6px;background:var(--bg-input,#2a2a3e);color:var(--text-primary,#e0e0e0);border:1px solid var(--border-color,#444);font-size:14px;">' +
                        optionsHtml +
                    '</select>' +
                '</div>' +
                '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                    '<button id="driver-report-cancel" class="btn btn-secondary" style="padding:8px 16px;font-size:13px;">Cancel</button>' +
                    '<button id="driver-report-generate" class="btn btn-primary" style="padding:8px 16px;font-size:13px;"><i class="fas fa-download" style="margin-right:6px;"></i>Generate</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        var self = this;
        var closeFn = function() { if (overlay.parentNode) overlay.remove(); };

        document.getElementById('driver-report-cancel').addEventListener('click', closeFn);
        overlay.addEventListener('click', function(e) { if (e.target === overlay) closeFn(); });

        document.getElementById('driver-report-generate').addEventListener('click', function() {
            var selected = document.getElementById('driver-report-select').value;
            closeFn();
            self._generateReport('driver-usage', format, { driverFilter: selected || null });
        });
    },

    // ── Data getters ──

    getMileageHistoryData() {
        return DataStore.getMileageLogs().map(function(l) {
            var vehicle = DataStore.getVehicle(l.vehicleId);
            return [
                new Date(l.timestamp).toLocaleString(),
                l.vehicleId,
                vehicle ? vehicle.registration : 'N/A',
                l.previousMileage,
                l.newMileage,
                l.milesAdded,
                l.loggedBy,
                l.notes || ''
            ];
        });
    },

    getAlertLogsData() {
        return DataStore.getAlerts().map(function(a) {
            return [
                new Date(a.timestamp).toLocaleString(),
                a.vehicleId,
                a.type.toUpperCase(),
                a.title,
                a.message,
                a.read ? 'Read' : 'Unread'
            ];
        });
    },

    getDriverUsageData(driverFilter) {
        var settings = DataStore.getSettings();
        var maxMileage = settings.maxMileage || MAX_MILEAGE;

        var vehicles = DataStore.getVehicles().filter(function(v) { return v.driver; });
        if (driverFilter) {
            vehicles = vehicles.filter(function(v) { return v.driver === driverFilter; });
        }

        return vehicles.map(function(v) {
            var cycle = DataStore.getVehicleCycleInfo(v);
            var status = DataStore.getVehicleStatus(v);
            return [
                v.driver,
                v.id,
                v.registration,
                v.type,
                (v.mileage || 0).toLocaleString(),
                cycle.cycleMileage.toLocaleString(),
                cycle.maxMileage.toLocaleString(),
                cycle.remaining > 0 ? cycle.remaining.toLocaleString() : '0',
                cycle.cycleNumber,
                status.toUpperCase()
            ];
        });
    },

    getMaintenanceData() {
        var logs = (typeof MaintenanceManager !== 'undefined' && MaintenanceManager.logs) ? MaintenanceManager.logs : [];
        return logs.map(function(log) {
            return [
                log.maintenanceDate ? new Date(log.maintenanceDate).toLocaleDateString() : 'N/A',
                log.vehicleId || '',
                log.artisanName || '',
                log.companyName || '',
                log.contactNumber || '',
                log.repairWork || '',
                log.cost ? parseFloat(log.cost).toFixed(2) : '0.00',
                log.submittedBy || '',
                log.resetMileage ? 'Yes' : 'No'
            ];
        });
    },

    getFleetSummaryData() {
        return DataStore.getVehicles().map(function(v) {
            var cycle = DataStore.getVehicleCycleInfo(v);
            var status = DataStore.getVehicleStatus(v);
            return [
                v.id,
                v.registration,
                v.type,
                v.driver || 'Unassigned',
                (v.mileage || 0).toLocaleString(),
                cycle.cycleMileage.toLocaleString(),
                cycle.remaining > 0 ? cycle.remaining.toLocaleString() : '0',
                cycle.cycleNumber,
                status.toUpperCase(),
                v.status === 'active' ? 'Yes' : 'No'
            ];
        });
    },

    // ── CSV Download ──

    downloadCSV(data, headers, filename) {
        if (data.length === 0) {
            UI.showToast('warning', 'No Data', 'No data available for this report');
            return;
        }

        var csvContent = [
            headers.join(','),
            ...data.map(function(row) {
                return row.map(function(cell) {
                    var str = String(cell);
                    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                        return '"' + str.replace(/"/g, '""') + '"';
                    }
                    return str;
                }).join(',');
            })
        ].join('\n');

        var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv';
        link.click();
        URL.revokeObjectURL(link.href);

        UI.showToast('success', 'Report Downloaded', filename + '.csv has been downloaded');
        DataStore.addActivity('report', 'Downloaded ' + filename + ' report (CSV)', 'fa-file-csv');
    },

    // ── PDF Download with Company Logo ──

    downloadPDF(data, headers, filename, reportType, options) {
        if (data.length === 0) {
            UI.showToast('warning', 'No Data', 'No data available for this report');
            return;
        }

        var title = reportType.replace(/-/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
        var now = new Date().toLocaleString();
        var logoUrl = window.location.origin + '/ghana-gas-logo.png';

        // Sub-title for filtered reports
        var subtitle = '';
        if (options && options.driverFilter) {
            subtitle = '<p style="font-size:14px;color:#555;margin:4px 0 0;">Driver: <strong>' + options.driverFilter + '</strong></p>';
        }

        // Build table rows
        var theadHtml = '<tr>' + headers.map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr>';
        var tbodyHtml = data.map(function(row) {
            return '<tr>' + row.map(function(cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>';
        }).join('');

        var summaryBox = this._buildSummaryBox(reportType, data, options);

        var htmlContent = '<!DOCTYPE html><html><head><title>' + title + ' - Vehicle Mileage Tracker</title>' +
'<style>' +
'body{font-family:Arial,sans-serif;padding:30px;color:#333;}' +
'.report-header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #007acc;padding-bottom:14px;margin-bottom:10px;}' +
'.report-header img{width:70px;height:70px;object-fit:contain;}' +
'.report-header-text h1{margin:0;font-size:20px;color:#007acc;}' +
'.report-header-text p{margin:2px 0 0;color:#666;font-size:12px;}' +
'.meta{color:#666;font-size:11px;margin-bottom:16px;}' +
'table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px;}' +
'th{background:#007acc;color:white;padding:7px 8px;text-align:left;font-size:11px;}' +
'td{padding:5px 8px;border-bottom:1px solid #ddd;}' +
'tr:nth-child(even){background:#f5f5f5;}' +
'.footer{margin-top:24px;font-size:10px;color:#999;text-align:center;border-top:1px solid #ddd;padding-top:8px;}' +
'.summary-box{background:#f0f8ff;border:1px solid #007acc;border-radius:6px;padding:12px 16px;margin-bottom:16px;font-size:12px;}' +
'.summary-box strong{color:#007acc;}' +
'@media print{body{padding:10px;}.no-print{display:none;}}' +
'</style></head><body>' +
'<div class="report-header">' +
'<img src="' + logoUrl + '" alt="Ghana Gas Logo">' +
'<div class="report-header-text">' +
'<h1>' + title + '</h1>' +
'<p>Ghana Gas Company Limited — Fleet Management</p>' +
subtitle +
'</div></div>' +
'<div class="meta">Generated: ' + now + ' | Total Records: ' + data.length + '</div>' +
summaryBox +
'<table><thead>' + theadHtml + '</thead><tbody>' + tbodyHtml + '</tbody></table>' +
'<div class="footer">Ghana Gas Company Limited — Vehicle Mileage Tracking System | Report: ' + title + ' | Records: ' + data.length + '</div>' +
'<div class="no-print" style="text-align:center;margin-top:20px;">' +
'<button onclick="window.print()" style="padding:10px 24px;background:#007acc;color:white;border:none;border-radius:6px;cursor:pointer;font-size:14px;">Print / Save as PDF</button>' +
'</div></body></html>';

        var printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = function() {
            setTimeout(function() { printWindow.print(); }, 500);
        };

        UI.showToast('success', 'Report Generated', title + ' report opened for printing/saving as PDF');
        DataStore.addActivity('report', 'Generated ' + filename + ' report (PDF)', 'fa-file-pdf');
    },

    _buildSummaryBox(reportType, data, options) {
        if (reportType === 'driver-usage' && data.length > 0) {
            var driverName = (options && options.driverFilter) ? options.driverFilter : 'All Drivers';
            return '<div class="summary-box"><strong>Report For:</strong> ' + driverName +
                ' | <strong>Vehicles:</strong> ' + data.length + '</div>';
        }
        if (reportType === 'fleet-summary') {
            var active = data.filter(function(r) { return r[9] === 'Yes'; }).length;
            return '<div class="summary-box"><strong>Total Vehicles:</strong> ' + data.length +
                ' | <strong>Active:</strong> ' + active +
                ' | <strong>Inactive:</strong> ' + (data.length - active) + '</div>';
        }
        if (reportType === 'maintenance') {
            var totalCost = data.reduce(function(sum, r) { return sum + (parseFloat(r[6]) || 0); }, 0);
            return '<div class="summary-box"><strong>Total Records:</strong> ' + data.length +
                ' | <strong>Total Cost:</strong> GHS ' + totalCost.toFixed(2) + '</div>';
        }
        return '';
    }
};
