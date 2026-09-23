import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UploadCloud,
  X,
  Loader2,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { brandService } from '../../services/brandService';
import { storageService } from '../../services/storageService';
import { adminService } from '../../services/adminService';
import { Brand } from '../../types';
import './AdminBrands.css';

export const AdminBrands: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [actionMsg, setActionMsg] = useState('');

  // Drag and Drop & Upload States
  const [bannerDragOver, setBannerDragOver] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [bannerUploadMode, setBannerUploadMode] = useState<'drop' | 'url'>('drop');
  const [logoUploadMode, setLogoUploadMode] = useState<'drop' | 'url'>('drop');
  const [uploadError, setUploadError] = useState('');

  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const loadBrands = async () => {
    setLoading(true);
    try {
      const list = await brandService.getBrands(false);
      setBrands(list);
    } catch (err) {
      console.error('Error loading brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const openNewBrandModal = () => {
    setEditingBrand(null);
    setName('');
    setSlug('');
    setDescription('');
    setBannerUrl('');
    setLogoUrl('');
    setIsFeatured(true);
    setIsActive(true);
    setDisplayOrder(brands.length + 1);
    setUploadError('');
    setIsModalOpen(true);
  };

  const openEditModal = (b: Brand) => {
    setEditingBrand(b);
    setName(b.name);
    setSlug(b.slug);
    setDescription(b.description || '');
    setBannerUrl(b.banner_url || '');
    setLogoUrl(b.logo_url || '');
    setIsFeatured(b.is_featured);
    setIsActive(b.is_active);
    setDisplayOrder(b.display_order);
    setUploadError('');
    setIsModalOpen(true);
  };

  // Upload handler for Banner
  const handleBannerUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploadingBanner(true);
    setUploadError('');

    try {
      const res = await storageService.uploadProductImage(file, 'brands');
      if (res.error) {
        setUploadError(`Banner: ${res.error}`);
      } else if (res.url) {
        setBannerUrl(res.url);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload brand banner.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  // Upload handler for Logo
  const handleLogoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setIsUploadingLogo(true);
    setUploadError('');

    try {
      const res = await storageService.uploadProductImage(file, 'brands');
      if (res.error) {
        setUploadError(`Logo: ${res.error}`);
      } else if (res.url) {
        setLogoUrl(res.url);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload brand logo.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const brandPayload: Partial<Brand> = {
        name: name.trim(),
        slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: description.trim() || undefined,
        banner_url: bannerUrl.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        is_featured: isFeatured,
        is_active: isActive,
        display_order: Number(displayOrder),
      };

      if (editingBrand) {
        await brandService.updateBrand(editingBrand.id, brandPayload);
        await adminService.logActivity('Updated Brand', 'Brand', editingBrand.id, { name });
        setActionMsg(`Brand "${name}" updated.`);
      } else {
        const created = await brandService.createBrand(brandPayload);
        await adminService.logActivity('Created Brand', 'Brand', created.id, { name });
        setActionMsg(`Brand "${name}" added.`);
      }

      setIsModalOpen(false);
      await loadBrands();
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Error saving brand: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, brandName: string) => {
    if (!window.confirm(`Are you sure you want to deactivate/delete "${brandName}"?`)) return;
    try {
      await brandService.deleteBrand(id);
      await adminService.logActivity('Deleted Brand', 'Brand', id, { name: brandName });
      setBrands(prev => prev.filter(b => b.id !== id));
      setActionMsg(`Brand "${brandName}" removed.`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Delete error: ${err.message}`);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Pakistani Designer Brands</h1>
          <p className="admin-page-sub">
            Dynamically add, edit, or configure luxury fashion houses on the platform.
          </p>
        </div>

        <button onClick={openNewBrandModal} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add New Brand</span>
        </button>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Brands Table */}
      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Banner / Logo</th>
              <th>Brand Name</th>
              <th>Slug</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                  Loading brands...
                </td>
              </tr>
            ) : brands.map((b) => (
              <tr key={b.id}>
                <td>{b.display_order}</td>
                <td>
                  <img
                    src={b.banner_url || b.logo_url || '/assets/logo/eba-logo.png'}
                    alt={b.name}
                    className="table-thumb"
                  />
                </td>
                <td>
                  <strong className="table-title">{b.name}</strong>
                </td>
                <td className="mono">{b.slug}</td>
                <td>
                  {b.is_featured ? (
                    <span className="badge badge-gold">
                      <Sparkles size={11} /> Featured
                    </span>
                  ) : (
                    <span className="badge">Standard</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${b.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="table-action-btns">
                    <button
                      onClick={() => openEditModal(b)}
                      className="table-btn-icon edit"
                      title="Edit Brand"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id, b.name)}
                      className="table-btn-icon delete"
                      title="Delete Brand"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="assistant-modal-backdrop">
          <div className="assistant-modal" style={{ maxWidth: '560px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="assistant-header">
              <h3>{editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Add New Designer House'}</h3>
              <button className="assistant-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSave} className="assistant-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {uploadError && (
                <div className="admin-action-alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
                  <AlertCircle size={16} />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Brand Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!editingBrand) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                  }}
                  required
                  placeholder="e.g. Maria B, Hussain Rehar, Baroque"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              {/* Brand Banner Image: Drag & Drop */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Brand Hero Banner Image</label>
                  <div className="brand-upload-tabs">
                    <button
                      type="button"
                      className={`brand-upload-tab ${bannerUploadMode === 'drop' ? 'active' : ''}`}
                      onClick={() => setBannerUploadMode('drop')}
                    >
                      <UploadCloud size={12} style={{ display: 'inline', marginRight: '4px' }} /> Drag & Drop
                    </button>
                    <button
                      type="button"
                      className={`brand-upload-tab ${bannerUploadMode === 'url' ? 'active' : ''}`}
                      onClick={() => setBannerUploadMode('url')}
                    >
                      <LinkIcon size={12} style={{ display: 'inline', marginRight: '4px' }} /> URL Link
                    </button>
                  </div>
                </div>

                {bannerUploadMode === 'drop' ? (
                  <div>
                    {bannerUrl ? (
                      <div className="brand-image-preview-card">
                        <img src={bannerUrl} alt="Banner Preview" className="brand-image-preview-thumb" />
                        <div className="brand-image-preview-meta">
                          <div className="brand-image-preview-title">Hero Banner Uploaded</div>
                          <div className="brand-image-preview-sub">{bannerUrl}</div>
                        </div>
                        <button
                          type="button"
                          className="brand-image-remove-btn"
                          onClick={() => setBannerUrl('')}
                          title="Remove image"
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`brand-dropzone ${bannerDragOver ? 'drag-over' : ''} ${isUploadingBanner ? 'uploading' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setBannerDragOver(true);
                        }}
                        onDragLeave={() => setBannerDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setBannerDragOver(false);
                          handleBannerUpload(e.dataTransfer.files);
                        }}
                        onClick={() => bannerFileInputRef.current?.click()}
                      >
                        <input
                          ref={bannerFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          style={{ display: 'none' }}
                          onChange={(e) => handleBannerUpload(e.target.files)}
                        />

                        {isUploadingBanner ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                            <h4>Uploading Banner to Storage...</h4>
                          </div>
                        ) : (
                          <>
                            <UploadCloud size={28} className="brand-dropzone-icon" />
                            <h4>Drag & Drop Brand Banner Image here</h4>
                            <p>or click to browse from computer (JPEG, PNG, WebP up to 5MB)</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="/assets/products/women/maria-b-1.jpg or https://..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="form-input"
                  />
                )}
              </div>

              {/* Brand Logo Image: Drag & Drop */}
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Brand Logo (Square / Transparent)</label>
                  <div className="brand-upload-tabs">
                    <button
                      type="button"
                      className={`brand-upload-tab ${logoUploadMode === 'drop' ? 'active' : ''}`}
                      onClick={() => setLogoUploadMode('drop')}
                    >
                      <UploadCloud size={12} style={{ display: 'inline', marginRight: '4px' }} /> Drag & Drop
                    </button>
                    <button
                      type="button"
                      className={`brand-upload-tab ${logoUploadMode === 'url' ? 'active' : ''}`}
                      onClick={() => setLogoUploadMode('url')}
                    >
                      <LinkIcon size={12} style={{ display: 'inline', marginRight: '4px' }} /> URL Link
                    </button>
                  </div>
                </div>

                {logoUploadMode === 'drop' ? (
                  <div>
                    {logoUrl ? (
                      <div className="brand-image-preview-card">
                        <img src={logoUrl} alt="Logo Preview" className="brand-image-preview-thumb logo" />
                        <div className="brand-image-preview-meta">
                          <div className="brand-image-preview-title">Brand Logo Uploaded</div>
                          <div className="brand-image-preview-sub">{logoUrl}</div>
                        </div>
                        <button
                          type="button"
                          className="brand-image-remove-btn"
                          onClick={() => setLogoUrl('')}
                          title="Remove logo"
                        >
                          <X size={14} /> Remove
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`brand-dropzone ${logoDragOver ? 'drag-over' : ''} ${isUploadingLogo ? 'uploading' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setLogoDragOver(true);
                        }}
                        onDragLeave={() => setLogoDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setLogoDragOver(false);
                          handleLogoUpload(e.dataTransfer.files);
                        }}
                        onClick={() => logoFileInputRef.current?.click()}
                      >
                        <input
                          ref={logoFileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          style={{ display: 'none' }}
                          onChange={(e) => handleLogoUpload(e.target.files)}
                        />

                        {isUploadingLogo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-gold-dark)' }} />
                            <h4>Uploading Logo to Storage...</h4>
                          </div>
                        ) : (
                          <>
                            <ImageIcon size={26} className="brand-dropzone-icon" />
                            <h4>Drag & Drop Brand Logo here</h4>
                            <p>or click to browse from computer (PNG, WebP with transparent background recommended)</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="/assets/logo/brand-logo.png or https://..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="form-input"
                  />
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description / Bio</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-textarea"
                />
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Display Order</label>
                  <input
                    type="number"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div className="form-group" style={{ justifyContent: 'center' }}>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => setIsFeatured(e.target.checked)}
                    />
                    <span>Featured Brand</span>
                  </label>
                  <label className="admin-checkbox-label" style={{ marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Active on Storefront</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
