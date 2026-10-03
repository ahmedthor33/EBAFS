const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../../db/database');
const { requirePermission } = require('../../middleware/auth');

// List admin users
router.get('/', requirePermission('users.manage'), (req, res) => {
  try {
    const users = db.prepare(`
      SELECT id, name, email, phone, role, status, created_at
      FROM users
      WHERE role IN ('superadmin', 'admin', 'staff')
      ORDER BY id ASC
    `).all();

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

// Create admin user
router.post('/', requirePermission('users.manage'), (req, res) => {
  try {
    const { name, email, phone, password, role = 'staff' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (!['superadmin', 'admin', 'staff'].includes(role)) {
      return res.status(400).json({ error: 'Invalid administrative role' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).run(name.trim(), cleanEmail, phone ? phone.trim() : null, hash, role);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Administrative user created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update admin user
router.put('/:id', requirePermission('users.manage'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, status, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Protect primary super admin
    if (user.email === 'ahmedthor33@gmail.com' && req.user.id !== user.id) {
      return res.status(403).json({ error: 'Cannot modify primary system superadmin' });
    }

    let passwordHash = user.password_hash;
    if (password && password.trim()) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    db.prepare(`
      UPDATE users SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        status = COALESCE(?, status),
        password_hash = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name ? name.trim() : null, phone ? phone.trim() : null, role || null, status || null, passwordHash, id);

    res.json({ message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete admin user
router.delete('/:id', requirePermission('users.manage'), (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own active administrator account' });
    }

    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(id);
    if (user && user.email === 'ahmedthor33@gmail.com') {
      return res.status(403).json({ error: 'Cannot delete primary root superadmin' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'Administrator removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// List Roles & Permissions
router.get('/roles/permissions', requirePermission('roles.manage'), (req, res) => {
  try {
    const allPermissions = [
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'orders.view', 'orders.edit',
      'customers.view', 'customers.edit',
      'inventory.view', 'inventory.edit',
      'categories.manage', 'brands.manage', 'coupons.manage',
      'homepage.manage', 'reports.view', 'settings.manage',
      'users.manage', 'roles.manage'
    ];

    const rolePerms = db.prepare('SELECT role, permission FROM roles_permissions').all();

    const grouped = {
      superadmin: allPermissions,
      admin: rolePerms.filter(r => r.role === 'admin').map(r => r.permission),
      staff: rolePerms.filter(r => r.role === 'staff').map(r => r.permission)
    };

    res.json({ allPermissions, rolePermissions: grouped });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles and permissions' });
  }
});

// Update Role Permissions
router.put('/roles/:role/permissions', requirePermission('roles.manage'), (req, res) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body;

    if (role === 'superadmin') {
      return res.status(400).json({ error: 'Super Admin permissions are fixed and cannot be restricted' });
    }

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ error: 'Permissions must be an array' });
    }

    db.prepare('DELETE FROM roles_permissions WHERE role = ?').run(role);
    const insertStmt = db.prepare('INSERT INTO roles_permissions (role, permission) VALUES (?, ?)');
    permissions.forEach(perm => {
      insertStmt.run(role, perm);
    });

    res.json({ message: `Permissions updated for role ${role}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role permissions' });
  }
});

module.exports = router;
