/* =============================================
   Reports Module
   ============================================= */

const Reports = {
    download(reportType, format) {
        let data, filename, headers;

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
                data = this.getDriverUsageData();
                headers = ['Driver', 'Vehicle ID', 'Registration', 'Vehicle Type', 'Current Mileage', 'Limit', 'Remaining', 'Status'];
                filename = 'driver_usage';
                break;
            case 'fleet-summary':
                data = this.getFleetSummaryData();
                headers = ['Vehicle ID', 'Registration', 'Type', 'Driver', 'Mileage', 'Remaining', 'Status', 'Active'];
                filename = 'fleet_summary';
                break;
            default:
                UI.showToast('error', 'Error', 'Unknown report type');
                return;
        }

        if (format === 'csv') {
            this.downloadCSV(data, headers, filename);
        } else if (format === 'pdf') {
            this.downloadPDF(data, headers, filename, reportType);
        }
    },

    getMileageHistoryData() {
        return DataStore.getMileageLogs().map(l => {
            const vehicle = DataStore.getVehicle(l.vehicleId);
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
        return DataStore.getAlerts().map(a => [
            new Date(a.timestamp).toLocaleString(),
            a.vehicleId,
            a.type.toUpperCase(),
            a.title,
            a.message,
            a.read ? 'Read' : 'Unread'
        ]);
    },

    getDriverUsageData() {
        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;

        return DataStore.getVehicles()
            .filter(v => v.driver)
            .map(v => {
                const remaining = maxMileage - (v.mileage || 0);
                const status = DataStore.getVehicleStatus(v);
                return [
                    v.driver,
                    v.id,
                    v.registration,
                    v.type,
                    v.mileage || 0,
                    maxMileage,
                    remaining > 0 ? remaining : 0,
                    status.toUpperCase()
                ];
            });
    },

    getFleetSummaryData() {
        const settings = DataStore.getSettings();
        const maxMileage = settings.maxMileage || MAX_MILEAGE;

        return DataStore.getVehicles().map(v => {
            const remaining = maxMileage - (v.mileage || 0);
            const status = DataStore.getVehicleStatus(v);
            return [
                v.id,
                v.registration,
                v.type,
                v.driver || 'Unassigned',
                v.mileage || 0,
                remaining > 0 ? remaining : 0,
                status.toUpperCase(),
                v.status === 'active' ? 'Yes' : 'No'
            ];
        });
    },

    downloadCSV(data, headers, filename) {
        if (data.length === 0) {
            UI.showToast('warning', 'No Data', 'No data available for this report');
            return;
        }

        const csvContent = [
            headers.join(','),
            ...data.map(row => row.map(cell => {
                const str = String(cell);
                // Escape commas and quotes
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                    return '"' + str.replace(/"/g, '""') + '"';
                }
                return str;
            }).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        UI.showToast('success', 'Report Downloaded', `${filename}.csv has been downloaded`);
        DataStore.addActivity('report', `Downloaded ${filename} report (CSV)`, 'fa-file-csv');
    },

    downloadPDF(data, headers, filename, reportType) {
        if (data.length === 0) {
            UI.showToast('warning', 'No Data', 'No data available for this report');
            return;
        }

        // Generate a printable HTML page as PDF
        const title = reportType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const now = new Date().toLocaleString();

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${title} - Vehicle Mileage Tracker</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
        h1 { color: #007acc; border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
        th { background: #007acc; color: white; padding: 8px 10px; text-align: left; }
        td { padding: 6px 10px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f5f5f5; }
        .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
        @media print { body { padding: 10px; } }
    </style>
</head>
<body>
    <h1>📊 ${title}</h1>
    <div class="meta">Generated: ${now} | Vehicle Mileage Tracking System</div>
    <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${data.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
    <div class="footer">Vehicle Mileage Tracker - Fleet Management System | Total Records: ${data.length}</div>
</body>
</html>`;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.onload = function () {
            printWindow.print();
        };

        UI.showToast('success', 'Report Generated', `${title} report opened for printing/saving as PDF`);
        DataStore.addActivity('report', `Generated ${filename} report (PDF)`, 'fa-file-pdf');
    }
};
