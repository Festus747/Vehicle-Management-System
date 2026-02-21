const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config');

let db = null;
const dbPath = path.resolve(config.dbPath);

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run('PRAGMA foreign_keys = ON');

    const schema = `
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'driver')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            registration TEXT NOT NULL,
            type TEXT NOT NULL,
            driver TEXT DEFAULT '',
            mileage REAL DEFAULT 0,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
            fuel_type TEXT DEFAULT 'Diesel',
            year INTEGER,
            department TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            warning_alert_sent INTEGER DEFAULT 0,
            critical_alert_sent INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS mileage_logs (
            id TEXT PRIMARY KEY,
            vehicle_id TEXT NOT NULL,
            previous_mileage REAL NOT NULL,
            new_mileage REAL NOT NULL,
            miles_added REAL NOT NULL,
            logged_by TEXT NOT NULL,
            notes TEXT DEFAULT '',
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            vehicle_id TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('warning', 'critical', 'info')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            read INTEGER DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS activity_log (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            icon TEXT DEFAULT 'fa-info-circle',
            vehicle_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
    `;
    db.exec(schema);
    saveDatabase();
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

setInterval(saveDatabase, 30000);
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(0); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(0); });

function queryAll(sql, params) {
    if (!db) throw new Error('Database not initialized');
    try {
        const stmt = db.prepare(sql);
        if (params) stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    } catch (err) {
        console.error('Query error:', sql, err.message);
        return [];
    }
}

function queryOne(sql, params) {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
}

function execute(sql, params) {
    if (!db) throw new Error('Database not initialized');
    try {
        db.run(sql, params);
        saveDatabase();
        return true;
    } catch (err) {
        console.error('Execute error:', sql, err.message);
        throw err;
    }
}

function getAlertsByVehicleIds(vehicleIds) {
    if (!vehicleIds || vehicleIds.length === 0) return [];
    const placeholders = vehicleIds.map(() => '?').join(',');
    return queryAll(
        'SELECT * FROM alerts WHERE vehicle_id IN (' + placeholders + ') ORDER BY timestamp DESC',
        vehicleIds
    );
}

module.exports = { initDatabase, saveDatabase, queryAll, queryOne, execute, getAlertsByVehicleIds, getDb: () => db };
