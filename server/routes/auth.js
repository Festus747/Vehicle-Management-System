const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { queryOne, queryAll, execute } = require('../db/database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const user = queryOne('SELECT * FROM users WHERE username = ?', [username]);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name, role: user.role },
            config.jwtSecret,
            { expiresIn: config.tokenExpiry }
        );

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'login', user.name + ' logged in', 'fa-sign-in-alt']
        );

        res.json({
            token,
            user: { id: user.id, username: user.username, name: user.name, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/register
router.post('/register', authenticate, requireAdmin, async (req, res) => {
    try {
        const { username, password, name, role } = req.body;
        if (!username || !password || !name || !role) {
            return res.status(400).json({ error: 'All fields required' });
        }

        const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        execute(
            'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            [username, hash, name, role]
        );

        const user = queryOne('SELECT id, username, name, role FROM users WHERE username = ?', [username]);
        res.status(201).json(user);
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    const user = queryOne('SELECT id, username, name, role FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// GET /api/auth/users
router.get('/users', authenticate, requireAdmin, (req, res) => {
    const users = queryAll('SELECT id, username, name, role, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
});

module.exports = router;
