import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Archive,
  X,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { brandService } from '../../services/brandService';
import { categoryService } from '../../services/categoryService';
import { adminService } from '../../services/adminService';
import { Product, Brand, Category } from '../../types';
import { formatPKR } from '../../lib/supabase';
import './AdminProducts.css';

export const AdminProducts: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [filterBrand, setFilterBrand] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [actionMsg, setActionMsg] = useState('');

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const [prodsRes, brandList, catList] = await Promise.all([
        productService.getProducts({ limit: 100 }),
        brandService.getBrands(false),
        categoryService.getAllCategoriesAdmin(),
      ]);
      setProducts(prodsRes.products);
      setBrands(brandList);
      setCategories(catList);
    } catch (err) {
      console.error('Error loading products list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();

    const handleUpdate = () => {
      loadCatalog();
    };
    window.addEventListener('eba_products_updated', handleUpdate);
    return () => window.removeEventListener('eba_products_updated', handleUpdate);
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesGender = filterGender === 'ALL' || p.gender === filterGender;
    const matchesBrand = filterBrand === 'ALL' || p.brand?.id === filterBrand;
    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;

    return matchesSearch && matchesGender && matchesBrand && matchesStatus;
  });

  const isAllSelected = filteredProducts.length > 0 && selectedIds.length === filteredProducts.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${name}"? This action cannot be undone.`)) return;

    try {
      await productService.deleteProduct(id);
      await adminService.logActivity('Deleted Product', 'Product', id, { name });
      setActionMsg(`Product "${name}" deleted successfully.`);
      setProducts(prev => prev.filter(p => p.id !== id));
      setSelectedIds(prev => prev.filter(item => item !== id));
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.length} selected product(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const count = selectedIds.length;
      await productService.deleteMultipleProducts(selectedIds);
      await adminService.logActivity('Bulk Deleted Products', 'Product', undefined, { count, ids: selectedIds });
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id)));
      setSelectedIds([]);
      setActionMsg(`Successfully deleted ${count} product(s).`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Bulk delete failed: ${err.message}`);
    }
  };

  const handleBulkStatus = async (status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED') => {
    if (selectedIds.length === 0) return;

    try {
      const count = selectedIds.length;
      await productService.updateMultipleProductsStatus(selectedIds, status);
      await adminService.logActivity('Bulk Updated Products Status', 'Product', undefined, { count, status, ids: selectedIds });
      setProducts(prev => prev.map(p => selectedIds.includes(p.id) ? { ...p, status } : p));
      setSelectedIds([]);
      setActionMsg(`Updated status to "${status}" for ${count} product(s).`);
      setTimeout(() => setActionMsg(''), 4000);
    } catch (err: any) {
      alert(`Bulk status update failed: ${err.message}`);
    }
  };

  return (
    <div className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-heading">Products Management</h1>
          <p className="admin-page-sub">
            Maintain your luxury Pakistani designer catalog, inventory, and variants.
          </p>
        </div>

        <Link to="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Add New Product</span>
        </Link>
      </div>

      {actionMsg && (
        <div className="admin-action-alert success">
          <CheckCircle2 size={16} />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Toolbar / Filters */}
      <div className="admin-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by title, SKU, brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <div className="filter-selects">
          <select
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
            className="admin-select"
          >
            <option value="ALL">All Genders</option>
            <option value="MEN">Men</option>
            <option value="WOMEN">Women</option>
          </select>

          <select
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
            className="admin-select"
          >
            <option value="ALL">All Brands</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="admin-select"
          >
            <option value="ALL">All Statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="admin-bulk-actions-bar">
          <div className="bulk-selection-info">
            <span className="bulk-count-badge">{selectedIds.length}</span>
            <span>of {filteredProducts.length} selected</span>
          </div>

          <div className="bulk-action-buttons">
            <button
              onClick={handleBulkDelete}
              className="btn btn-sm btn-danger"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Delete selected products"
            >
              <Trash2 size={14} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={() => handleBulkStatus('PUBLISHED')}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Publish selected products"
            >
              <Eye size={14} />
              <span>Set Published</span>
            </button>

            <button
              onClick={() => handleBulkStatus('DRAFT')}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Set selected to Draft"
            >
              <EyeOff size={14} />
              <span>Set Draft</span>
            </button>

            <button
              onClick={() => handleBulkStatus('ARCHIVED')}
              className="btn btn-sm btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Archive selected products"
            >
              <Archive size={14} />
              <span>Archive</span>
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="btn btn-sm btn-ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#fff' }}
              title="Clear selection"
            >
              <X size={14} />
              <span>Deselect All</span>
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="admin-card-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  title={isAllSelected ? "Deselect All" : "Select All"}
                />
              </th>
              <th>Image</th>
              <th>Ensemble Name</th>
              <th>Brand</th>
              <th>Gender</th>
              <th>Price (PKR)</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  Loading catalog...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>
                  No products found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredProducts.map((prod) => {
                const isSelected = selectedIds.includes(prod.id);
                const primaryObj = prod.images?.find(i => i.is_primary);
                const firstObj = prod.images?.[0];
                const imgUrl = (primaryObj as any)?.url || (typeof primaryObj === 'string' ? primaryObj : null) ||
                               (firstObj as any)?.url || (typeof firstObj === 'string' ? firstObj : null) ||
                               (prod as any).image_url || (prod as any).primary_image ||
                               '/assets/logo/eba-logo.png';
                const isLowStock = prod.stock_quantity <= prod.low_stock_threshold;

                return (
                  <tr key={prod.id} className={isSelected ? 'selected-row' : ''}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(prod.id)}
                      />
                    </td>
                    <td>
                      <img
                        src={imgUrl}
                        alt={prod.name}
                        className="table-thumb"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (!target.src.includes('eba-logo.png')) {
                            target.src = '/assets/logo/eba-logo.png';
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="table-name-wrap">
                        <strong className="table-title">{prod.name}</strong>
                        {prod.sku && <small className="table-sku">SKU: {prod.sku}</small>}
                      </div>
                    </td>
                    <td>
                      <span className="table-brand">{prod.brand?.name || 'Unassigned'}</span>
                    </td>
                    <td>
                      <span className="badge badge-gender">{prod.gender}</span>
                    </td>
                    <td>
                      <div className="table-price">
                        <span>{formatPKR(prod.sale_price ?? prod.price)}</span>
                        {prod.sale_price && (
                          <small className="orig">{formatPKR(prod.price)}</small>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-stock-cell">
                        <span className={`stock-count ${isLowStock ? 'low' : ''}`}>
                          {prod.stock_quantity}
                        </span>
                        {isLowStock && (
                          <span className="low-stock-warning" title="Low stock alert">
                            <AlertTriangle size={13} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${prod.status === 'PUBLISHED' ? 'badge-success' : prod.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}`}>
                        {prod.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-action-btns">
                        <Link
                          to={`/product/${prod.slug}`}
                          target="_blank"
                          className="table-btn-icon"
                          title="View on Storefront"
                        >
                          <ExternalLink size={15} />
                        </Link>
                        <Link
                          to={`/admin/products/${prod.id}/edit`}
                          className="table-btn-icon edit"
                          title="Edit Product"
                        >
                          <Edit size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(prod.id, prod.name)}
                          className="table-btn-icon delete"
                          title="Delete Product"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
