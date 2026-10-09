const express = require('express');
const router = express.Router();
const db = require('../db/database');

// List & Filter Products
router.get('/', (req, res) => {
  try {
    const {
      q,
      category,
      subcategory,
      brand,
      fabric,
      season,
      color,
      min_price,
      max_price,
      is_featured,
      is_sale,
      in_stock,
      sort,
      limit = 24,
      offset = 0
    } = req.query;

    let query = `
      SELECT 
        p.*,
        c.name as category_name,
        c.slug as category_slug,
        sub.name as subcategory_name,
        sub.slug as subcategory_slug,
        b.name as brand_name,
        (
          SELECT image_url FROM product_images 
          WHERE product_id = p.id AND is_primary = 1 
          LIMIT 1
        ) as primary_image,
        (
          SELECT image_url FROM product_images 
          WHERE product_id = p.id AND (is_primary = 0 OR is_primary IS NULL)
          ORDER BY sort_order ASC, id ASC LIMIT 1
        ) as hover_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN categories sub ON p.subcategory_id = sub.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.status = 'published'
    `;

    const params = [];

    // Search query
    if (q && q.trim()) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ? OR p.fabric LIKE ?)`;
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    // Category filter (support category slug or id, or 'men' / 'women')
    if (category) {
      if (isNaN(category)) {
        query += ` AND (c.slug = ? OR sub.slug = ?)`;
        params.push(category, category);
      } else {
        query += ` AND (p.category_id = ? OR p.subcategory_id = ?)`;
        params.push(Number(category), Number(category));
      }
    }

    // Subcategory filter
    if (subcategory) {
      if (isNaN(subcategory)) {
        query += ` AND sub.slug = ?`;
        params.push(subcategory);
      } else {
        query += ` AND p.subcategory_id = ?`;
        params.push(Number(subcategory));
      }
    }

    // Brand
    if (brand) {
      if (isNaN(brand)) {
        query += ` AND b.slug = ?`;
        params.push(brand);
      } else {
        query += ` AND p.brand_id = ?`;
        params.push(Number(brand));
      }
    }

    // Fabric
    if (fabric) {
      query += ` AND p.fabric LIKE ?`;
      params.push(`%${fabric}%`);
    }

    // Season
    if (season) {
      query += ` AND p.season LIKE ?`;
      params.push(`%${season}%`);
    }

    // Color
    if (color) {
      query += ` AND p.color LIKE ?`;
      params.push(`%${color}%`);
    }

    // Price Bounds
    if (min_price) {
      query += ` AND COALESCE(p.sale_price, p.price) >= ?`;
      params.push(Number(min_price));
    }
    if (max_price) {
      query += ` AND COALESCE(p.sale_price, p.price) <= ?`;
      params.push(Number(max_price));
    }

    // Featured / Sale
    if (is_featured === '1' || is_featured === 'true') {
      query += ` AND p.is_featured = 1`;
    }
    if (is_sale === '1' || is_sale === 'true') {
      query += ` AND p.is_sale = 1`;
    }

    // In Stock
    if (in_stock === '1' || in_stock === 'true') {
      query += ` AND p.stock_quantity > 0`;
    }

    // Sorting
    switch (sort) {
      case 'price_low_high':
      case 'price_asc':
        query += ` ORDER BY COALESCE(p.sale_price, p.price) ASC`;
        break;
      case 'price_high_low':
      case 'price_desc':
        query += ` ORDER BY COALESCE(p.sale_price, p.price) DESC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'bestselling':
        query += ` ORDER BY p.is_featured DESC, p.stock_quantity ASC`;
        break;
      default:
        query += ` ORDER BY p.is_featured DESC, p.id DESC`;
    }

    query += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const products = db.prepare(query).all(...params);

    // Provide fallback image if primary_image is null
    const enriched = products.map(p => {
      const primary = p.primary_image || p.hover_image || '/assets/gul_e_noor_details.png';
      const hover = (p.hover_image && p.hover_image !== primary) ? p.hover_image : null;
      return {
        ...p,
        primary_image: primary,
        hover_image: hover,
        effective_price: p.sale_price || p.price
      };
    });

    res.json({
      products: enriched,
      count: enriched.length
    });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Dynamic Facets for Filtering Sidebar
router.get('/facets', (req, res) => {
  try {
    const fabrics = db.prepare(`
      SELECT DISTINCT fabric FROM products 
      WHERE status = 'published' AND fabric IS NOT NULL
    `).all().map(r => r.fabric);

    const suitTypes = db.prepare(`
      SELECT DISTINCT product_type FROM products 
      WHERE status = 'published' AND product_type IS NOT NULL
    `).all().map(r => r.product_type);

    const priceRange = db.prepare(`
      SELECT MIN(COALESCE(sale_price, price)) as min_price, MAX(COALESCE(sale_price, price)) as max_price
      FROM products WHERE status = 'published'
    `).get();

    const categories = db.prepare(`
      SELECT id, name, slug, parent_id FROM categories WHERE is_active = 1 ORDER BY sort_order ASC
    `).all();

    res.json({
      fabrics,
      suitTypes,
      priceRange: {
        min: priceRange.min_price || 0,
        max: priceRange.max_price || 50000
      },
      categories
    });
  } catch (err) {
    console.error('Facets error:', err);
    res.status(500).json({ error: 'Failed to load facets' });
  }
});

// Single Product Details
router.get('/:slugOrId', (req, res) => {
  try {
    const { slugOrId } = req.params;
    let product;

    if (isNaN(slugOrId)) {
      const cleanSlug = String(slugOrId).replace(/^-+|-+$/g, '');
      product = db.prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug, 
               sub.name as subcategory_name, sub.slug as subcategory_slug,
               b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sub ON p.subcategory_id = sub.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE (p.slug = ? OR p.slug = ? OR p.sku = ?) AND p.status = 'published'
      `).get(slugOrId, cleanSlug, slugOrId);
    } else {
      product = db.prepare(`
        SELECT p.*, c.name as category_name, c.slug as category_slug, 
               sub.name as subcategory_name, sub.slug as subcategory_slug,
               b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN categories sub ON p.subcategory_id = sub.id
        LEFT JOIN brands b ON p.brand_id = b.id
        WHERE p.id = ? AND p.status = 'published'
      `).get(Number(slugOrId));
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch images
    const images = db.prepare(`
      SELECT id, image_url, image_type, sort_order, is_primary 
      FROM product_images 
      WHERE product_id = ? 
      ORDER BY is_primary DESC, sort_order ASC
    `).all(product.id);

    // Fetch related products
    const related = db.prepare(`
      SELECT p.*, 
        (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
      FROM products p
      WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
      ORDER BY p.is_featured DESC
      LIMIT 4
    `).all(product.category_id, product.id);

    res.json({
      product: {
        ...product,
        images: images.length > 0 ? images : [{ image_url: '/assets/gul_e_noor_details.png', is_primary: 1 }],
        effective_price: product.sale_price || product.price
      },
      related
    });
  } catch (err) {
    console.error('Single product error:', err);
    res.status(500).json({ error: 'Failed to retrieve product details' });
  }
});

module.exports = router;
