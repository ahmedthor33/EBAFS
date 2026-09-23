import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Layers,
  UploadCloud,
  Loader2,
  X,
  Link as LinkIcon,
  ImageIcon,
} from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import { adminService } from '../../services/adminService';
import { storageService } from '../../services/storageService';
import { Category, Subcategory } from '../../types';
import './AdminBrands.css';

export const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catGender, setCatGender] = useState<'MEN' | 'WOMEN' | 'UNISEX'>('WOMEN');
  const [catDesc, setCatDesc] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [catUploadMode, setCatUploadMode] = useState<'drop' | 'url'>('drop');
  const [isUploadingCatImage, setIsUploadingCatImage] = useState(false);
  const [catDragOver, setCatDragOver] = useState(false);
  const catFileInputRef = useRef<HTMLInputElement | null>(null);

  const [actionMsg, setActionMsg] = useState('');

  // Subcategory Form State
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedParentCatId, setSelectedParentCatId] = useState('');
  const [subName, setSubName] = useState('');
  const [subSlug, setSubSlug] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    try {
      const list = await categoryService.getAllCategoriesAdmin();
      setCategories(list);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCatImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingCatImage(true);
    try {
      const res = await storageService.uploadProductImage(files[0], 'categories');
      if (res.url) {
        setCatImageUrl(res.url);
        setActionMsg('Category image attached.');
        setTimeout(() => setActionMsg(''), 4000);
      } else if (res.error) {
        setActionMsg(`Notice: ${res.error}`);
        setTimeout(() => setActionMsg(''), 5000);
      }
    } catch (err: any) {
      console.warn('Category image upload notice:', err);
      setActionMsg(`Notice: ${err?.message || 'Failed to upload category image.'}`);
      setTimeout(() => setActionMsg(''), 5000);
    } finally {
      setIsUploadingCatImage(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Category> = {
        name: catName.trim(),
        slug: catSlug.trim() || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        gender: catGender,
        description: catDesc.trim() || undefined,
        image_url: catImageUrl.trim() || undefined,
        display_order: editingCat?.display_order || categories.length + 1,
        is_active: true,
      };

      if (editingCat) {
        await categoryService.updateCategory(editingCat.id, payload);
        await adminService.logActivity('Updated Category', 'Category', editingCat.id, { name: catName });
        setActionMsg(`Category "${catName}" updated.`);
      } else {
        const created = await categoryService.createCategory(payload);
        await adminService.logActivity('Created Category', 'Category', created.id, { name: catName });
        setActionMsg(`Category "${catName}" added.`);
      }

      setIsCatModalOpen(false);
      await loadCategories();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Error saving category: ${err.message}`);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete category "${name}" and all associated subcategories?`)) return;
    try {
      await categoryService.deleteCategory(id);
      await adminService.logActivity('Deleted Category', 'Category', id, { name });
      setCategories(prev => prev.filter(c => c.id !== id));
      setActionMsg(`Category "${name}" deleted.`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleSaveSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Partial<Subcategory> = {
        category_id: selectedParentCatId,
        name: subName.trim(),
        slug: subSlug.trim() || subName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        display_order: 1,
        is_active: true,
      };

      await categoryService.createSubcategory(payload);
      await adminService.logActivity('Created Subcategory', 'Subcategory', selectedParentCatId, { name: subName });
      setActionMsg(`Subcategory "${subName}" created.`);
      setIsSubModalOpen(false);
      setSubName('');
      setSubSlug('');
      await loadCategories();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Subcategory save error: ${err.message}`);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Categories & Taxonomies</h1>
          <p className="admin-page-sub">
            Organize Men’s and Women’s unstitched collections, imagery, and suit cuts.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingCat(null);
            setCatName('');
            setCatSlug('');
            setCatGender('WOMEN');
            setCatDesc('');
            setCatImageUrl('');
            setCatUploadMode('drop');
            setIsCatModalOpen(true);
          }}
          className="btn btn-primary btn-sm"
        >
          <Plus size={16} />
          <span>Add Primary Category</span>
        </button>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Categories Cards Grid */}
      <div className="admin-categories-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {loading ? (
          <p>Loading taxonomies...</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="admin-form-section" style={{ margin: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      style={{
                        width: '54px',
                        height: '54px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid rgba(197, 160, 89, 0.3)',
                        flexShrink: 0,
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/products/women/maria-b-1.jpg';
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '6px',
                        background: 'var(--color-ivory)',
                        border: '1px dashed var(--color-gold)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--color-gold-dark)',
                      }}
                      title="No image uploaded"
                    >
                      <ImageIcon size={22} />
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <strong style={{ fontSize: '16px' }}>{cat.name}</strong>
                      <span className="badge badge-gold">{cat.gender}</span>
                      <code style={{ fontSize: '11px', color: '#888' }}>/{cat.slug}</code>
                    </div>
                    {cat.description && (
                      <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>{cat.description}</p>
                    )}
                  </div>
                </div>

                <div className="table-action-btns">
                  <button
                    onClick={() => {
                      setSelectedParentCatId(cat.id);
                      setSubName('');
                      setSubSlug('');
                      setIsSubModalOpen(true);
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    + Add Subcategory
                  </button>
                  <button
                    onClick={() => {
                      setEditingCat(cat);
                      setCatName(cat.name);
                      setCatSlug(cat.slug);
                      setCatGender(cat.gender);
                      setCatDesc(cat.description || '');
                      setCatImageUrl(cat.image_url || '');
                      setCatUploadMode('drop');
                      setIsCatModalOpen(true);
                    }}
                    className="table-btn-icon edit"
                    title="Edit Category"
                  >
                    <Edit size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className="table-btn-icon delete"
                    title="Delete Category"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Subcategories */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px', background: 'var(--color-ivory)', borderRadius: '4px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', fontWeight: 600, alignSelf: 'center' }}>
                  Subcategories:
                </span>
                {cat.subcategories && cat.subcategories.length > 0 ? (
                  cat.subcategories.map((sub) => (
                    <span
                      key={sub.id}
                      style={{
                        padding: '4px 10px',
                        background: '#FFFFFF',
                        border: '1px solid var(--border-light)',
                        borderRadius: '3px',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {sub.name}
                      <small style={{ color: '#999' }}>({sub.slug})</small>
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                    No subcategories defined yet.
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Modal with Drag & Drop Image Uploader */}
      {isCatModalOpen && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '520px' }}>
            <div className="assistant-header">
              <h3>{editingCat ? 'Edit Category' : 'Create Primary Category'}</h3>
              <button className="assistant-close" onClick={() => setIsCatModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveCategory} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Category Name *</label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => {
                    setCatName(e.target.value);
                    if (!editingCat) setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  required
                  className="form-input"
                  placeholder="e.g. Women's Luxury Lawn"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category Slug *</label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  required
                  className="form-input"
                  placeholder="e.g. womens-luxury-lawn"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Gender Segment *</label>
                <select
                  value={catGender}
                  onChange={(e) => setCatGender(e.target.value as any)}
                  className="form-select"
                >
                  <option value="WOMEN">Women</option>
                  <option value="MEN">Men</option>
                  <option value="UNISEX">Unisex</option>
                </select>
              </div>

              {/* Drag & Drop Category Image Uploader */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 600 }}>Category Feature Image</label>
                  <div className="brand-upload-tabs">
                    <button
                      type="button"
                      className={`brand-upload-tab ${catUploadMode === 'drop' ? 'active' : ''}`}
                      onClick={() => setCatUploadMode('drop')}
                    >
                      <UploadCloud size={12} style={{ display: 'inline', marginRight: '4px' }} /> Drag & Drop
                    </button>
                    <button
                      type="button"
                      className={`brand-upload-tab ${catUploadMode === 'url' ? 'active' : ''}`}
                      onClick={() => setCatUploadMode('url')}
                    >
                      <LinkIcon size={12} style={{ display: 'inline', marginRight: '4px' }} /> URL Link
                    </button>
                  </div>
                </div>

                {catUploadMode === 'drop' ? (
                  <div>
                    {catImageUrl ? (
                      <div className="brand-image-preview-card">
                        <img
                          src={catImageUrl}
                          alt="Category Preview"
                          className="brand-image-preview-thumb"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/products/women/maria-b-1.jpg';
                          }}
                        />
                        <div className="brand-image-preview-meta">
                          <div className="brand-image-preview-title">Category Image Uploaded</div>
                          <div className="brand-image-preview-sub">{catImageUrl}</div>
                        </div>
                        <button
                          type="button"
                          className="brand-image-remove-btn"
                          onClick={() => setCatImageUrl('')}
                          title="Remove image"
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`brand-dropzone ${catDragOver ? 'drag-over' : ''} ${isUploadingCatImage ? 'uploading' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setCatDragOver(true);
                        }}
                        onDragLeave={() => setCatDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setCatDragOver(false);
                          handleCatImageUpload(e.dataTransfer.files);
                        }}
                        onClick={() => catFileInputRef.current?.click()}
                      >
                        <input
                          ref={catFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          style={{ display: 'none' }}
                          onChange={(e) => handleCatImageUpload(e.target.files)}
                        />

                        {isUploadingCatImage ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                            <h4>Uploading Category Image...</h4>
                          </div>
                        ) : (
                          <>
                            <UploadCloud size={28} className="brand-dropzone-icon" />
                            <h4>Drag & Drop Category Image here</h4>
                            <p>or click to browse from device (JPEG, PNG, WebP up to 5MB)</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="/assets/products/women/maria-b-1.jpg or https://..."
                    value={catImageUrl}
                    onChange={(e) => setCatImageUrl(e.target.value)}
                    className="form-input"
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="form-textarea"
                  placeholder="Describe this category's fabrics and styling..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsCatModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subcategory Modal */}
      {isSubModalOpen && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '440px' }}>
            <div className="assistant-header">
              <h3>Add Subcategory</h3>
              <button className="assistant-close" onClick={() => setIsSubModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSubcategory} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Subcategory Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Pure Wool Shawls / Chiffon Formals"
                  value={subName}
                  onChange={(e) => {
                    setSubName(e.target.value);
                    setSubSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subcategory Slug *</label>
                <input
                  type="text"
                  value={subSlug}
                  onChange={(e) => setSubSlug(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsSubModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Create Subcategory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
