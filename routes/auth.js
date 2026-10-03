const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { supabase } = require('../db/supabase');

// Customer Sign Up
router.post('/register', (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check existing
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email address already exists' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, password_hash, role, status)
      VALUES (?, ?, ?, ?, 'customer', 'active')
    `);
    const result = stmt.run(name.trim(), cleanEmail, phone ? phone.trim() : null, hash);
    const userId = Number(result.lastInsertRowid);

    // Create customer profile
    db.prepare(`
      INSERT INTO customer_profiles (user_id, notes, total_spent, orders_count)
      VALUES (?, 'Registered through storefront', 0, 0)
    `).run(userId);

    const user = {
      id: userId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : null,
      role: 'customer'
    };

    const token = generateToken(user);
    res.status(201).json({ user, token, message: 'Welcome to the EBA Atelier Salon' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// Customer Sign In
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    let validPass = user ? bcrypt.compareSync(password, user.password_hash) : false;

    // Supabase Auth verification fallback
    if (!validPass) {
      try {
        const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (!sbErr && sbAuth && sbAuth.user) {
          validPass = true;
          const newHash = bcrypt.hashSync(password, 10);
          if (user) {
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
          } else {
            const role = cleanEmail === 'ahmedthor33@gmail.com' ? 'superadmin' : 'customer';
            const insRes = db.prepare('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)').run(
              cleanEmail.split('@')[0], cleanEmail, newHash, role, 'active'
            );
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(insRes.lastInsertRowid);
          }
        }
      } catch (e) {
        // Fallback suppressed
      }
    }

    if (!user || !validPass) {
      return res.status(401).json({ error: 'Invalid email or password credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact concierge.' });
    }

    if (cleanEmail === 'ahmedthor33@gmail.com' && user.role !== 'superadmin') {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run('superadmin', user.id);
      user.role = 'superadmin';
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    };

    const token = generateToken(userData);
    res.json({ user: userData, token, message: 'Welcome back to EBA Fashion Studio' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Sign in failed. Please try again.' });
  }
});

// Separate Admin Portal Login
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Admin credentials required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

    let validPass = user ? bcrypt.compareSync(password, user.password_hash) : false;

    // Supabase Auth verification fallback
    if (!validPass) {
      try {
        const { data: sbAuth, error: sbErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (!sbErr && sbAuth && sbAuth.user) {
          validPass = true;
          const newHash = bcrypt.hashSync(password, 10);
          if (user) {
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
          } else {
            const role = cleanEmail === 'ahmedthor33@gmail.com' ? 'superadmin' : 'staff';
            const insRes = db.prepare('INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)').run(
              cleanEmail.split('@')[0], cleanEmail, newHash, role, 'active'
            );
            user = db.prepare('SELECT * FROM users WHERE id = ?').get(insRes.lastInsertRowid);
          }
        }
      } catch (e) {
        // Fallback suppressed
      }
    }

    if (!user || !validPass) {
      return res.status(401).json({ error: 'Invalid administrative credentials' });
    }

    // If ahmedthor33@gmail.com, guarantee superadmin role
    if (cleanEmail === 'ahmedthor33@gmail.com' && user.role !== 'superadmin') {
      db.prepare("UPDATE users SET role = 'superadmin' WHERE id = ?").run(user.id);
      user.role = 'superadmin';
    }

    if (!['superadmin', 'admin', 'staff'].includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have administrative access' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Administrative account suspended' });
    }

    // Fetch permissions
    let permissions = [];
    if (user.role === 'superadmin') {
      permissions = ['*'];
    } else {
      const perms = db.prepare('SELECT permission FROM roles_permissions WHERE role = ?').all(user.role);
      permissions = perms.map(p => p.permission);
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions
    };

    const token = generateToken(userData);
    res.json({ user: userData, token, message: 'Admin authentication verified' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Administrative authentication failed' });
  }
});

// Current User Profile & Addresses
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, phone, role, status, created_at FROM users WHERE id = ?').get(req.user.id);
    const profile = db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(req.user.id);
    const addresses = db.prepare('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC').all(req.user.id);
    const ordersCount = db.prepare('SELECT count(*) as count FROM orders WHERE user_id = ?').get(req.user.id);

    let permissions = [];
    if (user.role === 'superadmin') {
      permissions = ['*'];
    } else {
      const perms = db.prepare('SELECT permission FROM roles_permissions WHERE role = ?').all(user.role);
      permissions = perms.map(p => p.permission);
    }

    res.json({
      user: {
        ...user,
        permissions,
        total_spent: profile ? profile.total_spent : 0,
        orders_count: ordersCount ? ordersCount.count : 0
      },
      addresses
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

// Update Customer Profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone } = req.body;
    db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(name ? name.trim() : null, phone ? phone.trim() : null, req.user.id);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Manage Addresses
router.post('/addresses', authenticateToken, (req, res) => {
  try {
    const { full_name, phone, street_address, area, city, province, postal_code, is_default } = req.body;
    if (!full_name || !phone || !street_address || !city || !province) {
      return res.status(400).json({ error: 'Complete address details are required' });
    }

    if (is_default) {
      db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(req.user.id);
    }

    const result = db.prepare(`
      INSERT INTO addresses (user_id, full_name, phone, street_address, area, city, province, postal_code, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, full_name, phone, street_address, area || '', city, province, postal_code || '', is_default ? 1 : 0);

    res.status(201).json({ id: result.lastInsertRowid, message: 'Address saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save address' });
  }
});

module.exports = router;
