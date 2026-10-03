// EBA Fashion Studio API Client
(function (window) {
  // Session ID for anonymous carts
  let sessionId = localStorage.getItem('ebafs_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('ebafs_session_id', sessionId);
  }

  // Auth tokens
  function getCustomerToken() {
    return localStorage.getItem('ebafs_customer_token');
  }

  function getCustomerUser() {
    try {
      const u = localStorage.getItem('ebafs_customer_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function getAdminToken() {
    return localStorage.getItem('ebafs_admin_token');
  }

  function getAdminUser() {
    try {
      const u = localStorage.getItem('ebafs_admin_user');
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  // Toast notification system
  function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
      <span class="material-symbols-outlined text-[18px]">
        ${type === 'error' ? 'error' : (type === 'info' ? 'info' : 'check_circle')}
      </span>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Generic Request Helper
  async function request(endpoint, options = {}, isAdmin = false) {
    const headers = {
      'Content-Type': 'application/json',
      'x-session-id': sessionId,
      ...(options.headers || {})
    };

    const token = isAdmin ? getAdminToken() : getCustomerToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  }

  // Form Data Upload Request (Multer)
  async function uploadFiles(formData, isAdmin = true) {
    const token = isAdmin ? getAdminToken() : getCustomerToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Upload failed');
    }
    return data;
  }

  const API = {
    sessionId,
    showToast,
    uploadFiles,

    // Storefront Auth
    auth: {
      getToken: getCustomerToken,
      getUser: getCustomerUser,
      async login(email, password) {
        const res = await request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('ebafs_customer_token', res.token);
        localStorage.setItem('ebafs_customer_user', JSON.stringify(res.user));

        // If owner or administrative role, sync admin session as well
        if (res.user && (
          (res.user.email || '').toLowerCase().trim() === 'ahmedthor33@gmail.com' ||
          res.user.role === 'superadmin' ||
          res.user.role === 'admin'
        )) {
          localStorage.setItem('ebafs_admin_token', res.token);
          localStorage.setItem('ebafs_admin_user', JSON.stringify(res.user));
        }
        return res;
      },
      async register(name, email, phone, password) {
        const res = await request('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, phone, password })
        });
        localStorage.setItem('ebafs_customer_token', res.token);
        localStorage.setItem('ebafs_customer_user', JSON.stringify(res.user));
        return res;
      },
      async me() {
        return request('/api/auth/me');
      },
      async updateProfile(name, phone) {
        return request('/api/auth/profile', {
          method: 'PUT',
          body: JSON.stringify({ name, phone })
        });
      },
      async addAddress(addressData) {
        return request('/api/auth/addresses', {
          method: 'POST',
          body: JSON.stringify(addressData)
        });
      },
      logout() {
        localStorage.removeItem('ebafs_customer_token');
        localStorage.removeItem('ebafs_customer_user');
        localStorage.removeItem('ebafs_admin_token');
        localStorage.removeItem('ebafs_admin_user');
      }
    },

    // Public Products
    products: {
      async list(params = {}) {
        const query = new URLSearchParams(params).toString();
        return request(`/api/products?${query}`);
      },
      async get(slugOrId) {
        return request(`/api/products/${slugOrId}`);
      },
      async getFacets() {
        return request('/api/products/facets');
      }
    },

    // Public Categories & Brands
    categories: {
      async list() {
        return request('/api/categories');
      },
      async brands() {
        return request('/api/categories/brands');
      }
    },

    // Shopping Bag
    cart: {
      async get() {
        return request('/api/cart');
      },
      async add(productId, quantity = 1, addTailoring = 0, tailoringSize = null) {
        return request('/api/cart/add', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId, quantity, add_tailoring: addTailoring, tailoring_size: tailoringSize })
        });
      },
      async update(itemId, quantity, addTailoring = null) {
        return request(`/api/cart/update/${itemId}`, {
          method: 'PUT',
          body: JSON.stringify({ quantity, add_tailoring: addTailoring })
        });
      },
      async remove(itemId) {
        return request(`/api/cart/remove/${itemId}`, {
          method: 'DELETE'
        });
      },
      async validateCoupon(code, subtotal) {
        return request('/api/cart/validate-coupon', {
          method: 'POST',
          body: JSON.stringify({ code, subtotal })
        });
      }
    },

    // Wishlist
    wishlist: {
      async get() {
        return request('/api/wishlist');
      },
      async toggle(productId) {
        return request('/api/wishlist/toggle', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId })
        });
      },
      async moveToCart(productId) {
        return request('/api/wishlist/move-to-cart', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId })
        });
      }
    },

    // Orders & Checkout
    orders: {
      async checkout(orderData) {
        return request('/api/orders/checkout', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });
      },
      async lookup(orderNumber) {
        return request(`/api/orders/lookup/${orderNumber}`);
      },
      async myOrders() {
        return request('/api/orders/my-orders');
      }
    },

    // CMS & Storefront Content
    cms: {
      async get() {
        return request('/api/cms');
      }
    },

    // Admin Portal APIs
    admin: {
      getToken: getAdminToken,
      getUser: getAdminUser,
      async login(email, password) {
        const res = await request('/api/auth/admin-login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        localStorage.setItem('ebafs_admin_token', res.token);
        localStorage.setItem('ebafs_admin_user', JSON.stringify(res.user));
        return res;
      },
      logout() {
        localStorage.removeItem('ebafs_admin_token');
        localStorage.removeItem('ebafs_admin_user');
      },

      // Products
      async getProducts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return request(`/api/admin/products?${query}`, {}, true);
      },
      async getProduct(id) {
        return request(`/api/admin/products/${id}`, {}, true);
      },
      async createProduct(data) {
        return request('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(data)
        }, true);
      },
      async updateProduct(id, data) {
        return request(`/api/admin/products/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },
      async duplicateProduct(id) {
        return request(`/api/admin/products/${id}/duplicate`, { method: 'POST' }, true);
      },
      async toggleProduct(id, field, value) {
        return request(`/api/admin/products/${id}/toggle`, {
          method: 'PATCH',
          body: JSON.stringify({ field, value })
        }, true);
      },
      async deleteProduct(id) {
        return request(`/api/admin/products/${id}`, { method: 'DELETE' }, true);
      },

      // Orders
      async getOrders(params = {}) {
        const query = new URLSearchParams(params).toString();
        return request(`/api/admin/orders?${query}`, {}, true);
      },
      async getOrder(id) {
        return request(`/api/admin/orders/${id}`, {}, true);
      },
      async updateOrderStatus(id, orderStatus, paymentStatus) {
        return request(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ order_status: orderStatus, payment_status: paymentStatus })
        }, true);
      },
      async updateTracking(id, trackingNumber, courierName) {
        return request(`/api/admin/orders/${id}/tracking`, {
          method: 'PATCH',
          body: JSON.stringify({ tracking_number: trackingNumber, courier_name: courierName })
        }, true);
      },

      // Inventory
      async getInventory(params = {}) {
        const query = new URLSearchParams(params).toString();
        return request(`/api/admin/inventory?${query}`, {}, true);
      },
      async adjustStock(productId, changeAmount, reason) {
        return request('/api/admin/inventory/adjust', {
          method: 'POST',
          body: JSON.stringify({ product_id: productId, change_amount: changeAmount, reason })
        }, true);
      },
      async getInventoryLogs(productId) {
        return request(`/api/admin/inventory/logs/${productId}`, {}, true);
      },

      // Categories & Brands
      async getCategories() {
        return request('/api/admin/categories', {}, true);
      },
      async createCategory(data) {
        return request('/api/admin/categories', {
          method: 'POST',
          body: JSON.stringify(data)
        }, true);
      },
      async updateCategory(id, data) {
        return request(`/api/admin/categories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },
      async deleteCategory(id) {
        return request(`/api/admin/categories/${id}`, { method: 'DELETE' }, true);
      },
      async getBrands() {
        return request('/api/admin/categories/brands/all', {}, true);
      },
      async createBrand(data) {
        return request('/api/admin/categories/brands', {
          method: 'POST',
          body: JSON.stringify(data)
        }, true);
      },
      async updateBrand(id, data) {
        return request(`/api/admin/categories/brands/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },
      async deleteBrand(id) {
        return request(`/api/admin/categories/brands/${id}`, { method: 'DELETE' }, true);
      },

      // Coupons
      async getCoupons() {
        return request('/api/admin/coupons', {}, true);
      },
      async createCoupon(data) {
        return request('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify(data)
        }, true);
      },
      async updateCoupon(id, data) {
        return request(`/api/admin/coupons/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },
      async deleteCoupon(id) {
        return request(`/api/admin/coupons/${id}`, { method: 'DELETE' }, true);
      },

      // Customers
      async getCustomers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return request(`/api/admin/customers?${query}`, {}, true);
      },
      async getCustomer(id) {
        return request(`/api/admin/customers/${id}`, {}, true);
      },
      async toggleCustomerStatus(id, status) {
        return request(`/api/admin/customers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status })
        }, true);
      },

      // CMS
      async getCMS() {
        return request('/api/admin/cms', {}, true);
      },
      async updateCMS(key, data) {
        return request(`/api/admin/cms/${key}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },

      // Store Settings
      async getSettings() {
        return request('/api/admin/settings', {}, true);
      },
      async updateSettings(key, data) {
        return request(`/api/admin/settings/${key}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },

      // Reports
      async getReports(range = '30d') {
        return request(`/api/admin/reports?range=${range}`, {}, true);
      },

      // Staff & Permissions
      async getUsers() {
        return request('/api/admin/users', {}, true);
      },
      async createUser(data) {
        return request('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(data)
        }, true);
      },
      async updateUser(id, data) {
        return request(`/api/admin/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data)
        }, true);
      },
      async deleteUser(id) {
        return request(`/api/admin/users/${id}`, { method: 'DELETE' }, true);
      },
      async getRolesPermissions() {
        return request('/api/admin/users/roles/permissions', {}, true);
      },
      async updateRolePermissions(role, permissions) {
        return request(`/api/admin/users/roles/${role}/permissions`, {
          method: 'PUT',
          body: JSON.stringify({ permissions })
        }, true);
      },

      // File & Image Uploads
      async uploadImages(files) {
        const formData = new FormData();
        const fileList = files instanceof FileList || Array.isArray(files) ? files : [files];
        for (let i = 0; i < fileList.length; i++) {
          formData.append('images', fileList[i]);
        }
        const token = getAdminToken();
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
          body: formData
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Image upload failed');
        }
        return res.json();
      },

      // Shipping Zones
      async getShippingZones() {
        const res = await this.getSettings();
        return res.settings?.shipping_zones || [];
      },
      async saveShippingZones(zones) {
        return this.updateSetting('shipping_zones', zones);
      },

      // Payment Gateways
      async getPaymentGateways() {
        const res = await this.getSettings();
        return res.settings?.payments || {};
      },
      async savePaymentGateways(payments) {
        return this.updateSetting('payments', payments);
      }
    },

    store: {
      async getPaymentMethods() {
        return request('/api/store/payment-methods');
      },
      async getShippingZones() {
        return request('/api/store/shipping-zones');
      }
    },

    supabase: {
      async getStatus() {
        return request('/api/supabase/status');
      }
    }
  };

  window.EBA_API = API;
})(window);
