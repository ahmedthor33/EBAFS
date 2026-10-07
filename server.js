require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db/database');
const { checkSupabaseHealth, projectId } = require('./db/supabase');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const upload = require('./middleware/upload');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable reverse proxy support for custom domain (Hostinger / Nginx / Cloudflare SSL)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend assets (primary public/ directory, with fallback to dist/)
app.use(express.static(path.join(__dirname, 'public')));
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
}
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Image Upload Endpoint (Multer)
app.post('/api/upload', authenticateToken, requireAdmin, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files uploaded' });
    }

    const uploadedUrls = req.files.map(f => `/uploads/${f.filename}`);
    res.json({
      message: 'Upload successful',
      urls: uploadedUrls,
      url: uploadedUrls[0] // convenient shortcut if single upload
    });
  } catch (err) {
    console.error('Upload handler error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Mount Public Storefront Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/cms', require('./routes/cms'));
app.use('/api/supabase', require('./routes/supabase-status'));
app.use('/api/store', require('./routes/public-settings'));

// Mount Protected Admin Routes
app.use('/api/admin/products', authenticateToken, requireAdmin, require('./routes/admin/products'));
app.use('/api/admin/orders', authenticateToken, requireAdmin, require('./routes/admin/orders'));
app.use('/api/admin/inventory', authenticateToken, requireAdmin, require('./routes/admin/inventory'));
app.use('/api/admin/categories', authenticateToken, requireAdmin, require('./routes/admin/categories'));
app.use('/api/admin/coupons', authenticateToken, requireAdmin, require('./routes/admin/coupons'));
app.use('/api/admin/customers', authenticateToken, requireAdmin, require('./routes/admin/customers'));
app.use('/api/admin/cms', authenticateToken, requireAdmin, require('./routes/admin/cms'));
app.use('/api/admin/settings', authenticateToken, requireAdmin, require('./routes/admin/settings'));
app.use('/api/admin/reports', authenticateToken, requireAdmin, require('./routes/admin/reports'));
app.use('/api/admin/users', authenticateToken, requireAdmin, require('./routes/admin/users'));

// Admin Single-Page App entry point
app.use('/admin', (req, res, next) => {
  if (req.method === 'GET') {
    const adminPath = [
      path.join(__dirname, 'public', 'admin.html'),
      path.join(__dirname, 'admin.html'),
      path.join(__dirname, 'dist', 'admin.html')
    ].find(p => fs.existsSync(p));
    return res.sendFile(adminPath);
  }
  next();
});

// Customer Storefront Single-Page App entry point
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  if (req.method === 'GET') {
    const indexPath = [
      path.join(__dirname, 'public', 'index.html'),
      path.join(__dirname, 'index.html'),
      path.join(__dirname, 'dist', 'index.html')
    ].find(p => fs.existsSync(p));
    return res.sendFile(indexPath);
  }
  next();
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred on the server'
  });
});

// Start listening
app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`✨ EBA Fashion Studio Full-Stack Server Running`);
  console.log(`🌐 Storefront: http://localhost:${PORT}`);
  console.log(`👑 Admin Portal: http://localhost:${PORT}/admin`);
  
  const sbStatus = await checkSupabaseHealth();
  if (sbStatus.connected) {
    console.log(`⚡ Supabase Backend Connected: ${sbStatus.projectId} (${sbStatus.version})`);
  } else {
    console.log(`⚠️ Supabase Notice: ${sbStatus.error}`);
  }
  console.log(`=======================================================`);
});
