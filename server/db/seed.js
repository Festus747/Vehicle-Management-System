const bcrypt = require('bcryptjs');
const { queryOne, execute } = require('./database');

async function seed() {
    console.log('Seeding database...');

    const defaultUsers = [
        { username: 'admin', password: 'admin123', name: 'System Admin', role: 'admin' },
        { username: 'driver1', password: 'driver123', name: 'Kwame Asante', role: 'driver' },
        { username: 'driver2', password: 'driver123', name: 'Ama Mensah', role: 'driver' }
    ];

    for (const user of defaultUsers) {
        const existing = queryOne('SELECT id FROM users WHERE username = ?', [user.username]);
        if (!existing) {
            const hash = await bcrypt.hash(user.password, 10);
            execute(
                'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
                [user.username, hash, user.name, user.role]
            );
            console.log('  Created user:', user.username, '(' + user.role + ')');
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
        currency: 'GHS'
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
