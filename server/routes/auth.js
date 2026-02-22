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
            return res.status(401).json({ error: 'Invalid username or password. Please check your credentials and try again.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid username or password. Please check your credentials and try again.' });
        }

        if (!user.approved) {
            return res.status(403).json({ error: 'Your account is pending approval. Please contact an administrator.' });
        }

        const permissions = queryAll('SELECT permission, granted FROM user_permissions WHERE user_id = ?', [user.id]);
        const permList = permissions.filter(p => p.granted).map(p => p.permission);

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
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                staffId: user.staff_id || '',
                permissions: user.role === 'admin' ? ['all'] : permList
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// POST /api/auth/register - Self-registration (no auth required)
router.post('/register', async (req, res) => {
    try {
        const { username, password, name, staffId, phone } = req.body;
        if (!username || !password || !name) {
            return res.status(400).json({ error: 'Username, password, and name are required' });
        }

        const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        execute(
            'INSERT INTO users (username, password, name, role, staff_id, phone, approved) VALUES (?, ?, ?, ?, ?, ?, 0)',
            [username, hash, name, 'driver', staffId || '', phone || '']
        );

        const admins = queryAll("SELECT id FROM users WHERE role = 'admin'");
        for (const admin of admins) {
            execute(
                'INSERT INTO alerts (id, vehicle_id, type, title, message, target_user_id) VALUES (?, ?, ?, ?, ?, ?)',
                ['alert_reg_' + Date.now() + '_' + admin.id, '', 'info', 'New Registration Request', name + ' (' + username + ') has requested an account. Please review and approve.', admin.id]
            );
        }

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'registration', name + ' registered (pending approval)', 'fa-user-plus']
        );

        res.status(201).json({ success: true, message: 'Registration submitted. An administrator will review and approve your account.' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/create-user - Admin creates user (approved immediately)
router.post('/create-user', authenticate, requireAdmin, async (req, res) => {
    try {
        const { username, password, name, role, staffId, phone } = req.body;
        if (!username || !password || !name || !role || !staffId) {
            return res.status(400).json({ error: 'Username, password, name, staff ID, and role are required' });
        }

        const existing = queryOne('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }

        const hash = await bcrypt.hash(password, 10);
        execute(
            'INSERT INTO users (username, password, name, role, staff_id, phone, approved) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [username, hash, name, role, staffId, phone || '']
        );

        const user = queryOne('SELECT id, username, name, role, staff_id, phone, approved, created_at FROM users WHERE username = ?', [username]);

        if (role === 'driver') {
            const defaultPerms = ['dashboard', 'my-vehicle', 'mileage', 'alerts', 'maintenance'];
            for (const perm of defaultPerms) {
                execute('INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, 1)', [user.id, perm]);
            }
        }

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'user_created', 'User ' + name + ' created by ' + req.user.name, 'fa-user-plus']
        );

        res.status(201).json({
            id: user.id, username: user.username, name: user.name, role: user.role,
            staffId: user.staff_id, phone: user.phone, approved: !!user.approved, createdAt: user.created_at
        });
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/auth/approve/:id
router.put('/approve/:id', authenticate, requireAdmin, (req, res) => {
    try {
        const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        execute('UPDATE users SET approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

        const defaultPerms = ['dashboard', 'my-vehicle', 'mileage', 'alerts', 'maintenance'];
        for (const perm of defaultPerms) {
            const existing = queryOne('SELECT id FROM user_permissions WHERE user_id = ? AND permission = ?', [req.params.id, perm]);
            if (!existing) {
                execute('INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, 1)', [req.params.id, perm]);
            }
        }

        execute(
            'INSERT INTO activity_log (id, type, message, icon) VALUES (?, ?, ?, ?)',
            ['act_' + Date.now(), 'user_approved', user.name + ' approved by ' + req.user.name, 'fa-user-check']
        );

        res.json({ success: true, message: 'User approved successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

// PUT /api/auth/reject/:id
router.put('/reject/:id', authenticate, requireAdmin, (req, res) => {
    try {
        const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject user' });
    }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }
        const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        const hash = await bcrypt.hash(newPassword, 10);
        execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, req.user.id]);
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', authenticate, requireAdmin, (req, res) => {
    try {
        const user = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });

        execute('DELETE FROM user_permissions WHERE user_id = ?', [req.params.id]);
        execute('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
    const user = queryOne('SELECT id, username, name, role, staff_id, phone FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const permissions = queryAll('SELECT permission, granted FROM user_permissions WHERE user_id = ?', [user.id]);
    const permList = permissions.filter(p => p.granted).map(p => p.permission);

    res.json({
        id: user.id, username: user.username, name: user.name, role: user.role,
        staffId: user.staff_id, phone: user.phone,
        permissions: user.role === 'admin' ? ['all'] : permList
    });
});

// GET /api/auth/users
router.get('/users', authenticate, requireAdmin, (req, res) => {
    const users = queryAll('SELECT id, username, name, role, staff_id, phone, approved, created_at FROM users ORDER BY created_at DESC');
    const result = users.map(u => {
        const permissions = queryAll('SELECT permission, granted FROM user_permissions WHERE user_id = ?', [u.id]);
        return {
            id: u.id, username: u.username, name: u.name, role: u.role,
            staffId: u.staff_id || '', phone: u.phone || '', approved: !!u.approved,
            permissions: permissions.filter(p => p.granted).map(p => p.permission),
            createdAt: u.created_at
        };
    });
    res.json(result);
});

// PUT /api/auth/permissions/:userId
router.put('/permissions/:userId', authenticate, requireAdmin, (req, res) => {
    try {
        const { permissions } = req.body;
        if (!Array.isArray(permissions)) return res.status(400).json({ error: 'Permissions must be an array' });

        const user = queryOne('SELECT id, name FROM users WHERE id = ?', [req.params.userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        execute('DELETE FROM user_permissions WHERE user_id = ?', [req.params.userId]);
        for (const perm of permissions) {
            execute('INSERT INTO user_permissions (user_id, permission, granted) VALUES (?, ?, 1)', [req.params.userId, perm]);
        }

        res.json({ success: true, permissions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update permissions' });
    }
});

module.exports = router;
