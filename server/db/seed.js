const bcrypt = require('bcryptjs');
const { queryOne, queryAll, execute } = require('./database');

async function seed() {
    console.log('Seeding database...');

    const defaultUsers = [
        { username: 'admin', password: 'admin123', name: 'System Admin', role: 'admin', staff_id: 'ADM-001' },
        { username: 'driver1', password: 'driver123', name: 'Kwame Asante', role: 'driver', staff_id: 'DRV-001' },
        { username: 'driver2', password: 'driver123', name: 'Ama Mensah', role: 'driver', staff_id: 'DRV-002' }
    ];

    for (const user of defaultUsers) {
        const existing = queryOne('SELECT id FROM users WHERE username = ?', [user.username]);
        if (!existing) {
            const hash = await bcrypt.hash(user.password, 10);
            execute(
                'INSERT INTO users (username, password, name, role, staff_id, approved) VALUES (?, ?, ?, ?, ?, 1)',
                [user.username, hash, user.name, user.role, user.staff_id || '']
            );
            console.log('  Created user:', user.username, '(' + user.role + ')');
        }
    }

    // Set default permissions for all drivers
    const drivers = queryAll("SELECT id FROM users WHERE role = 'driver'");
    const defaultDriverPermissions = ['dashboard', 'my-vehicle', 'mileage', 'alerts', 'maintenance'];
    for (const driver of drivers) {
        for (const perm of defaultDriverPermissions) {
            const existing = queryOne('SELECT id FROM user_permissions WHERE user_id = ? AND permission = ?', [driver.id, perm]);
            if (!existing) {
                execute('INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, 1)', [driver.id, perm]);
            }
        }
    }

    const defaultSettings = {
        maxMileage: '5000',
        warningThreshold: '200',
        enableNotifications: 'true',
        autoBackup: 'true',
        theme: 'dark',
        dateFormat: 'DD/MM/YYYY',
        companyName: 'Ghana Gas Company Ltd',
        currency: 'GHS',
        driverSeeMileage: 'true'
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
        const existing = queryOne('SELECT key FROM settings WHERE key = ?', [key]);
        if (!existing) {
            execute('INSERT INTO settings (key, value) VALUES (?, ?)', [key, value]);
        }
    }

    console.log('Seeding complete.');
}

module.exports = seed;
