import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  UploadCloud,
  X,
  Star,
  ArrowLeft,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  Image as ImageIcon,
  MoveLeft,
  MoveRight,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { brandService } from '../../services/brandService';
import { categoryService } from '../../services/categoryService';
import { storageService } from '../../services/storageService';
import { adminService } from '../../services/adminService';
import { Brand, Category, Subcategory, Product, ProductImage, ProductVariant } from '../../types';
import './AdminProducts.css';

export const AdminProductForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  // Reference metadata
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [brandId, setBrandId] = useState('');
  const [gender, setGender] = useState<'MEN' | 'WOMEN' | 'UNISEX'>('WOMEN');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [salePrice, setSalePrice] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [fabric, setFabric] = useState('Luxury Lawn & Silk');
  const [color, setColor] = useState('');
  const [season, setSeason] = useState('Summer / Festive');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');
  const [isFeatured, setIsFeatured] = useState(true);
  const [isNew, setIsNew] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isOnSale, setIsOnSale] = useState(false);

  // Images state
  const [images, setImages] = useState<Array<{
    id?: string;
    url: string;
    alt_text?: string;
    is_primary: boolean;
    display_order: number;
    file?: File;
  }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Metadata
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [brandList, catList] = await Promise.all([
          brandService.getBrands(false),
          categoryService.getAllCategoriesAdmin(),
        ]);
        setBrands(brandList);
        setCategories(catList);
        if (brandList.length > 0 && !brandId) setBrandId(brandList[0].id);
        if (catList.length > 0 && !categoryId) setCategoryId(catList[0].id);
      } catch (err) {
        console.error('Error loading meta:', err);
      }
    };
    loadMeta();
  }, []);

  // Update subcategories when category changes
  useEffect(() => {
    if (categoryId) {
      const selected = categories.find(c => c.id === categoryId);
      if (selected?.subcategories) {
        setSubcategories(selected.subcategories);
        if (selected.subcategories.length > 0 && !subcategoryId) {
          setSubcategoryId(selected.subcategories[0].id);
        }
      } else {
        setSubcategories([]);
      }
    }
  }, [categoryId, categories]);

  // Load existing product if editing
  useEffect(() => {
    if (isEditing && id) {
      const loadProduct = async () => {
        try {
          const { products } = await productService.getProducts({ limit: 500 });
          const found = products.find(p => p.id === id);
          if (found) {
            setName(found.name);
            setSlug(found.slug);
            setSku(found.sku || '');
            if (found.brand_id) setBrandId(found.brand_id);
            setGender(found.gender);
            if (found.category_id) setCategoryId(found.category_id);
            if (found.subcategory_id) setSubcategoryId(found.subcategory_id);
            setPrice(found.price);
            setSalePrice(found.sale_price ? String(found.sale_price) : '');
            setCostPrice(found.cost_price ? String(found.cost_price) : '');
            setStockQuantity(found.stock_quantity);
            setLowStockThreshold(found.low_stock_threshold);
            setFabric(found.fabric || '');
            setColor(found.color || '');
            setSeason(found.season || '');
            setShortDescription(found.short_description || '');
            setDescription(found.description || '');
            setStatus(found.status);
            setIsFeatured(found.is_featured);
            setIsNew(found.is_new);
            setIsBestseller(found.is_bestseller);
            setIsOnSale(found.is_on_sale);

            if (found.images && found.images.length > 0) {
              setImages(found.images.map(img => ({
                id: img.id,
                url: img.url,
                alt_text: img.alt_text,
                is_primary: img.is_primary,
                display_order: img.display_order,
              })));
            }
          }
        } catch (err) {
          console.error('Error fetching product for edit:', err);
        }
      };
      loadProduct();
    }
  }, [isEditing, id]);

  // Auto-generate slug from name if not manually modified
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  };

  // Image Upload Handlers (Supabase Storage)
  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setErrorMsg('');

    const newImagesList = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await storageService.uploadProductImage(file, 'products');

      if (result.error) {
        setErrorMsg(result.error);
      } else if (result.url) {
        newImagesList.push({
          url: result.url,
          alt_text: name || file.name,
          is_primary: newImagesList.length === 0,
          display_order: newImagesList.length + 1,
        });
      }
    }

    setImages(newImagesList);
    setIsUploading(false);
  };

  const handleSetPrimary = (index: number) => {
    const updated = images.map((img, idx) => ({
      ...img,
      is_primary: idx === index,
    }));
    setImages(updated);
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index);
    if (updated.length > 0 && !updated.some(i => i.is_primary)) {
      updated[0].is_primary = true;
    }
    setImages(updated);
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setImages(reordered.map((img, i) => ({ ...img, display_order: i + 1 })));
  };

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name.trim()) {
      setErrorMsg('Product name is required.');
      return;
    }
    if (price <= 0) {
      setErrorMsg('Product price must be greater than zero.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<Product> = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku: sku.trim() || undefined,
        brand_id: brandId || undefined,
        category_id: categoryId || undefined,
        subcategory_id: subcategoryId || undefined,
        gender,
        price: Number(price),
        sale_price: salePrice ? Number(salePrice) : null,
        cost_price: costPrice ? Number(costPrice) : null,
        stock_quantity: Number(stockQuantity),
        low_stock_threshold: Number(lowStockThreshold),
        fabric: fabric.trim() || undefined,
        color: color.trim() || undefined,
        season: season.trim() || undefined,
        short_description: shortDescription.trim() || undefined,
        description: description.trim() || undefined,
        status,
        is_featured: isFeatured,
        is_new: isNew,
        is_bestseller: isBestseller,
        is_on_sale: isOnSale || Boolean(salePrice && Number(salePrice) < Number(price)),
      };

      if (isEditing && id) {
        await productService.updateProduct(id, payload, images);
        await adminService.logActivity('Updated Product', 'Product', id, { name });
        setSuccessMsg('Product updated successfully!');
      } else {
        const created = await productService.createProduct(payload, images);
        await adminService.logActivity('Created Product', 'Product', created.id, { name });
        setSuccessMsg('Product published to catalog successfully!');
      }

      setTimeout(() => navigate('/admin/products'), 1200);
    } catch (err: any) {
      console.error('Save product error:', err);
      setErrorMsg(err.message || 'Failed to save product in database.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-product-form-page">
      <div className="form-page-top">
        <Link to="/admin/products" className="back-link">
          <ArrowLeft size={16} /> Back to Products
        </Link>
        <h1 className="admin-page-heading">
          {isEditing ? `Edit: ${name}` : 'Add New Designer Ensemble'}
        </h1>
      </div>

      {errorMsg && (
        <div className="admin-action-alert error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="admin-action-alert success">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-product-grid-form">
        {/* Left Column: Core Product Info & Images */}
        <div className="form-main-column">
          {/* Section: General Info */}
          <div className="admin-form-section">
            <h3 className="section-title">Product Information</h3>
            <div className="form-group">
              <label className="form-label">Ensemble Name *</label>
              <input
                type="text"
                placeholder="e.g. Noor-e-Kashmir Embroidered Luxury Lawn 3-Piece"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="form-input"
              />
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">URL Slug (SEO) *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">SKU / Item Code</label>
                <input
                  type="text"
                  placeholder="e.g. HR-L26-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Short Tagline / Preview Description</label>
              <input
                type="text"
                placeholder="Brief single-line summary displayed on cards"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Full Editorial Description & Craft Details</label>
              <textarea
                rows={5}
                placeholder="Describe fabric details, embroidery motifs, dupatta, and cut specs..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-textarea"
              />
            </div>
          </div>

          {/* Section: Professional Drag-and-Drop Image Uploader */}
          <div className="admin-form-section">
            <div className="section-header-row">
              <h3 className="section-title">Product Photography & Gallery</h3>
              <span className="section-hint">Supabase Storage (`product-images`)</span>
            </div>

            {/* Drop Zone */}
            <div
              className={`image-dropzone ${dragOver ? 'drag-over' : ''} ${isUploading ? 'uploading' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFilesSelected(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                style={{ display: 'none' }}
                onChange={(e) => handleFilesSelected(e.target.files)}
              />

              <UploadCloud size={40} className="dropzone-icon" />
              <h4>{isUploading ? 'Uploading to Supabase Storage...' : 'Drag & Drop Product Photography'}</h4>
              <p>or click to browse from computer (JPEG, PNG, WebP up to 5MB)</p>
            </div>

            {/* Uploaded Gallery Thumbnails */}
            {images.length > 0 && (
              <div className="uploaded-gallery-grid">
                {images.map((img, idx) => (
                  <div key={idx} className={`uploaded-img-card ${img.is_primary ? 'is-primary' : ''}`}>
                    <img src={img.url} alt={`Preview ${idx + 1}`} />

                    <div className="img-card-actions">
                      <button
                        type="button"
                        className={`star-btn ${img.is_primary ? 'active' : ''}`}
                        onClick={() => handleSetPrimary(idx)}
                        title={img.is_primary ? 'Primary Cover Image' : 'Set as Cover Image'}
                      >
                        <Star size={14} fill={img.is_primary ? 'currentColor' : 'none'} />
                        {img.is_primary ? 'Cover' : 'Set Cover'}
                      </button>

                      <div className="reorder-btns">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          disabled={idx === 0}
                          title="Move left"
                        >
                          <MoveLeft size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          disabled={idx === images.length - 1}
                          title="Move right"
                        >
                          <MoveRight size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="del-img-btn"
                        onClick={() => handleRemoveImage(idx)}
                        title="Delete Image"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Fabric & Specifications */}
          <div className="admin-form-section">
            <h3 className="section-title">Fabric Specifications</h3>
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Fabric Type</label>
                <input
                  type="text"
                  placeholder="e.g. Pure Swiss Lawn & Silk"
                  value={fabric}
                  onChange={(e) => setFabric(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color Hue</label>
                <input
                  type="text"
                  placeholder="e.g. Jet Black / Gold"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Season / Occasion</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Lawn / Wedding"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Taxonomy, Pricing & Publishing */}
        <aside className="form-side-column">
          {/* Action Box */}
          <div className="admin-form-section action-box">
            <h3 className="section-title">Publishing Status</h3>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="form-select"
              >
                <option value="PUBLISHED">Published (Visible on Store)</option>
                <option value="DRAFT">Draft (Hidden)</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="form-checkbox-group">
              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                <span>Featured on Homepage</span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={isNew}
                  onChange={(e) => setIsNew(e.target.checked)}
                />
                <span>New Arrival Badge</span>
              </label>

              <label className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                />
                <span>Best Seller Collection</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={isSaving}>
              <span>{isSaving ? 'Saving to Database...' : isEditing ? 'Save Changes' : 'Publish Product'}</span>
            </button>
          </div>

          {/* Pricing Box */}
          <div className="admin-form-section">
            <h3 className="section-title">Pricing (PKR)</h3>
            <div className="form-group">
              <label className="form-label">Retail Price (PKR) *</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
                className="form-input font-bold"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sale / Promotional Price (Optional)</label>
              <input
                type="number"
                min="0"
                placeholder="Leave blank if not on sale"
                value={salePrice}
                onChange={(e) => {
                  setSalePrice(e.target.value);
                  setIsOnSale(Boolean(e.target.value && Number(e.target.value) < price));
                }}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cost / Wholesale Price (Admin Only)</label>
              <input
                type="number"
                min="0"
                placeholder="Internal accounting reference"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Taxonomy & Inventory */}
          <div className="admin-form-section">
            <h3 className="section-title">Brand & Taxonomy</h3>

            <div className="form-group">
              <label className="form-label">Designer Brand *</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="form-select"
                required
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Gender Segment *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="form-select"
                required
              >
                <option value="WOMEN">Women's Collection</option>
                <option value="MEN">Men's Collection</option>
                <option value="UNISEX">Unisex</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="form-select"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {subcategories.length > 0 && (
              <div className="form-group">
                <label className="form-label">Subcategory</label>
                <select
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  className="form-select"
                >
                  {subcategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(Number(e.target.value))}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Low Stock Alert</label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  required
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};
