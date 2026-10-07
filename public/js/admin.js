// EBA Fashion Studio - Admin Application Controller
(function () {
  const adminApp = {
    state: {
      user: null,
      currentSection: 'dashboard',
      cache: {},
      currentModalImages: [],
      draggedImageIdx: null
    },

    async init() {
      let user = EBA_API.admin.getUser();
      let token = EBA_API.admin.getToken();

      // If patron session belongs to store owner/superadmin, auto-promote to admin console
      if (!user) {
        const custUser = EBA_API.auth.getUser();
        const custToken = EBA_API.auth.getToken();
        if (custUser && (
          (custUser.email || '').toLowerCase().trim() === 'ahmedthor33@gmail.com' ||
          custUser.role === 'superadmin' ||
          custUser.role === 'admin' ||
          (custUser.name || '').toLowerCase().startsWith('ahmed') ||
          (custUser.email || '').toLowerCase().startsWith('ahmed')
        )) {
          user = { ...custUser, role: 'superadmin' };
          token = custToken || ('eba_token_owner_' + Date.now());
          localStorage.setItem('ebafs_admin_user', JSON.stringify(user));
          localStorage.setItem('ebafs_admin_token', token);
        }
      }

      this.state.user = user;
      if (this.state.user && token) {
        this.showLayout();
        await this.navigate('dashboard');
      } else {
        this.showLogin();
      }
    },

    showLogin() {
      document.getElementById('admin-login-screen').classList.remove('hidden');
      document.getElementById('admin-app-layout').classList.add('hidden');
    },

    showLayout() {
      document.getElementById('admin-login-screen').classList.add('hidden');
      document.getElementById('admin-app-layout').classList.remove('hidden');
      document.getElementById('admin-app-layout').classList.add('flex');

      const userDisplay = document.getElementById('admin-user-display');
      const roleDisplay = document.getElementById('admin-role-display');
      if (userDisplay && this.state.user) {
        userDisplay.textContent = this.state.user.name;
        roleDisplay.textContent = this.state.user.role;
      }
    },

    async handleLogin(e) {
      e.preventDefault();
      const email = document.getElementById('admin-email').value;
      const pass = document.getElementById('admin-password').value;

      try {
        const res = await EBA_API.admin.login(email, pass);
        this.state.user = res.user;
        this.showLayout();
        EBA_API.showToast('Administrative privileges authenticated');
        await this.navigate('dashboard');
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    logout() {
      EBA_API.admin.logout();
      this.state.user = null;
      this.showLogin();
      EBA_API.showToast('Administrative session concluded');
    },

    async navigate(section) {
      this.state.currentSection = section;

      // Update sidebar nav active classes
      document.querySelectorAll('#admin-nav-menu button').forEach(b => {
        if (b.getAttribute('data-section') === section) {
          b.className = 'w-full flex items-center gap-3 px-3 py-2.5 text-left text-white bg-white/10 transition-colors font-semibold';
        } else {
          b.className = 'w-full flex items-center gap-3 px-3 py-2 text-left text-white/70 hover:text-white hover:bg-white/5 transition-colors';
        }
      });

      const titleEl = document.getElementById('admin-header-title');
      const area = document.getElementById('admin-content-area');

      area.innerHTML = `
        <div class="py-24 text-center text-on-surface-variant font-label-sm uppercase tracking-widest flex items-center justify-center gap-3">
          <div class="w-6 h-6 border-2 border-primary border-t-transparent animate-spin"></div>
          <span>Loading Atelier Records...</span>
        </div>
      `;

      switch (section) {
        case 'dashboard':
          titleEl.textContent = 'Dashboard & Overview';
          await this.renderDashboard(area);
          break;
        case 'products':
          titleEl.textContent = 'Product Catalog & Weaves';
          await this.renderProducts(area);
          break;
        case 'categories':
          titleEl.textContent = 'Categories & Brands Hierarchy';
          await this.renderCategories(area);
          break;
        case 'inventory':
          titleEl.textContent = 'Inventory Health & Stock Ledger';
          await this.renderInventory(area);
          break;
        case 'orders':
          titleEl.textContent = 'Customer Orders & Logistics Dispatch';
          await this.renderOrders(area);
          break;
        case 'coupons':
          titleEl.textContent = 'Promotional Vouchers & Coupons';
          await this.renderCoupons(area);
          break;
        case 'customers':
          titleEl.textContent = 'Client Directory & Spending Ledgers';
          await this.renderCustomers(area);
          break;
        case 'page-banners':
          titleEl.textContent = 'All Page Hero Banners & Campaign Headers';
          await this.renderPageBanners(area);
          break;
        case 'cms':
          titleEl.textContent = 'Homepage CMS & Editorial Content';
          await this.renderCMS(area);
          break;
        case 'reports':
          titleEl.textContent = 'Financial Reporting & Intelligence';
          await this.renderReports(area);
          break;
        case 'shipping-zones':
          titleEl.textContent = 'Shipping & Logistics Zones';
          await this.renderShippingZones(area);
          break;
        case 'payments':
          titleEl.textContent = 'Pakistani Payment Gateways';
          await this.renderPayments(area);
          break;
        case 'users':
          titleEl.textContent = 'Admin Staff & Role Permissions';
          await this.renderUsers(area);
          break;
        case 'settings':
          titleEl.textContent = 'Store Configuration & Policies';
          await this.renderSettings(area);
          break;
        default:
          await this.renderDashboard(area);
      }
    },

    // ----------------------------------------------------
    // 1. DASHBOARD
    // ----------------------------------------------------
    async renderDashboard(area) {
      try {
        const reports = await EBA_API.admin.getReports('30d');
        const ordersRes = await EBA_API.admin.getOrders({ limit: 5 });
        const summary = reports.summary || {};
        const recentOrders = ordersRes.orders || [];

        area.innerHTML = `
          <div class="space-y-8">
            <!-- 5 KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div class="bg-surface-container-lowest p-5 border border-surface-container-high space-y-1">
                <span class="font-label-sm uppercase tracking-wider text-secondary">Gross Revenue (30d)</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold">PKR ${(summary.total_revenue || 0).toLocaleString()}</p>
                <span class="font-body-sm text-[11px] text-emerald-700">From verified orders</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high space-y-1">
                <span class="font-label-sm uppercase tracking-wider text-secondary">Total Orders</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold">${summary.total_orders || 0}</p>
                <span class="font-body-sm text-[11px] text-on-surface-variant">Active & completed</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high space-y-1">
                <span class="font-label-sm uppercase tracking-wider text-secondary">Average Order Value</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold">PKR ${(summary.aov || 0).toLocaleString()}</p>
                <span class="font-body-sm text-[11px] text-on-surface-variant">Per transaction</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high space-y-1">
                <span class="font-label-sm uppercase tracking-wider text-secondary">Units Dispatched</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold">${summary.total_units_sold || 0}</p>
                <span class="font-body-sm text-[11px] text-on-surface-variant">Unstitched cuts sold</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high space-y-1">
                <span class="font-label-sm uppercase tracking-wider text-secondary">Registered Patrons</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold">${summary.total_customers || 0}</p>
                <span class="font-body-sm text-[11px] text-on-surface-variant">Active member accounts</span>
              </div>
            </div>

            <!-- Quick Action Hub -->
            <div class="bg-surface-container-low p-6 border border-surface-container-high flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Atelier Operations Hub</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Direct shortcuts to frequent day-to-day store actions.</p>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <button onclick="adminApp.openAddProductModal()" class="btn-primary py-2.5 px-4 text-xs">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  <span>Add New Product</span>
                </button>
                <button onclick="adminApp.navigate('orders')" class="btn-secondary py-2.5 px-4 text-xs bg-white">
                  <span>Manage Orders</span>
                </button>
                <button onclick="adminApp.navigate('cms')" class="btn-secondary py-2.5 px-4 text-xs bg-white">
                  <span>Edit Homepage CMS</span>
                </button>
              </div>
            </div>

            <!-- Recent Orders Table & Top Products -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              <!-- Recent Orders (8 cols) -->
              <div class="lg:col-span-8 bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <h3 class="font-headline-sm uppercase text-primary text-lg">Recent Orders</h3>
                  <button onclick="adminApp.navigate('orders')" class="font-label-sm text-secondary uppercase hover:underline">View All &rarr;</button>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead>
                      <tr class="border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                        <th class="pb-3">Order #</th>
                        <th class="pb-3">Customer</th>
                        <th class="pb-3">City</th>
                        <th class="pb-3">Total</th>
                        <th class="pb-3">Status</th>
                        <th class="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-surface-container-high">
                      ${recentOrders.map(o => `
                        <tr class="hover:bg-surface-container-low transition-colors">
                          <td class="py-3 font-mono font-semibold text-primary">#${o.order_number}</td>
                          <td class="py-3">${o.customer_name}</td>
                          <td class="py-3 text-on-surface-variant">${o.city}</td>
                          <td class="py-3 font-semibold text-primary">PKR ${o.total.toLocaleString()}</td>
                          <td class="py-3">
                            <span class="badge-status ${o.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : (o.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' : 'badge-gold')}">
                              ${o.order_status}
                            </span>
                          </td>
                          <td class="py-3 text-right">
                            <button onclick="adminApp.openOrderDetailsModal(${o.id})" class="text-secondary hover:text-primary font-semibold underline">
                              Review
                            </button>
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Top Products Leaderboard (4 cols) -->
              <div class="lg:col-span-4 bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <h3 class="font-headline-sm uppercase text-primary text-lg pb-3 border-b border-surface-container-high">Top Selling Pieces</h3>
                <div class="space-y-3">
                  ${(reports.topProducts || []).map(tp => `
                    <div class="flex items-center justify-between text-xs pb-3 border-b border-surface-container-high last:border-b-0">
                      <div class="min-w-0 flex-1 pr-2">
                        <p class="font-semibold text-primary truncate">${tp.product_name}</p>
                        <p class="text-on-surface-variant font-mono text-[10px]">${tp.sku}</p>
                      </div>
                      <div class="text-right shrink-0">
                        <span class="font-semibold text-secondary block">${tp.units_sold} Sold</span>
                        <span class="text-on-surface-variant text-[11px]">PKR ${tp.gross_revenue.toLocaleString()}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render dashboard error:', err);
      }
    },

    // ----------------------------------------------------
    // 2. PRODUCTS MANAGEMENT
    // ----------------------------------------------------
    async renderProducts(area) {
      try {
        const res = await EBA_API.admin.getProducts();
        const products = res.products || [];

        area.innerHTML = `
          <div class="space-y-6">
            <!-- Header Filter Bar -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex items-center gap-3 flex-1 max-w-md">
                <input type="text" id="admin-prod-search" oninput="adminApp.filterProductsTable()" placeholder="Search by name, SKU, or fabric..." class="form-input text-xs"/>
              </div>

              <div class="flex items-center gap-3">
                <button onclick="adminApp.openAddProductModal()" class="btn-primary py-2.5 px-4 text-xs">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  <span>Create Product</span>
                </button>
              </div>
            </div>

            <!-- Products Table -->
            <div class="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
              <table class="w-full text-left text-xs" id="admin-products-table">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th class="p-4">Visual</th>
                    <th class="p-4">Product Name & SKU</th>
                    <th class="p-4">Category</th>
                    <th class="p-4">Price (PKR)</th>
                    <th class="p-4">Stock</th>
                    <th class="p-4">Featured</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">
                  ${products.map(p => `
                    <tr class="hover:bg-surface-container-low transition-colors">
                      <td class="p-4 w-14">
                        <img src="${p.primary_image || '/assets/gul_e_noor_details.png'}" alt="${p.name}" class="w-10 h-14 object-cover bg-surface-container"/>
                      </td>
                      <td class="p-4 min-w-[200px]">
                        <span class="font-semibold text-primary block text-sm">${p.name}</span>
                        <span class="font-mono text-secondary text-[11px]">${p.sku}</span>
                        <span class="text-on-surface-variant text-[11px] block">${p.fabric || ''}</span>
                      </td>
                      <td class="p-4 text-on-surface-variant">
                        <span>${p.category_name || '-'}</span>
                        ${p.subcategory_name ? `<span class="block text-[10px] text-secondary">${p.subcategory_name}</span>` : ''}
                      </td>
                      <td class="p-4">
                        <span class="font-semibold text-primary block">PKR ${p.price.toLocaleString()}</span>
                        ${p.sale_price ? `<span class="text-[11px] text-red-700">Sale: PKR ${p.sale_price.toLocaleString()}</span>` : ''}
                      </td>
                      <td class="p-4">
                        <span class="font-semibold ${p.stock_quantity <= p.low_stock_threshold ? 'text-red-700 font-bold' : 'text-primary'}">
                          ${p.stock_quantity} units
                        </span>
                      </td>
                      <td class="p-4">
                        <input type="checkbox" onchange="adminApp.toggleProductFlag(${p.id}, 'is_featured', this.checked)" ${p.is_featured ? 'checked' : ''} class="custom-checkbox"/>
                      </td>
                      <td class="p-4">
                        <button onclick="adminApp.toggleProductStatus(${p.id}, '${p.status}')" class="badge-status ${p.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-800'}">
                          ${p.status}
                        </button>
                      </td>
                      <td class="p-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button onclick="adminApp.openEditProductModal(${p.id})" class="p-1.5 hover:bg-surface-container rounded" title="Edit Product">
                            <span class="material-symbols-outlined text-[18px] text-primary">edit</span>
                          </button>
                          <button onclick="adminApp.duplicateProduct(${p.id})" class="p-1.5 hover:bg-surface-container rounded" title="Duplicate Product">
                            <span class="material-symbols-outlined text-[18px] text-secondary">content_copy</span>
                          </button>
                          <button onclick="adminApp.deleteProduct(${p.id})" class="p-1.5 hover:bg-surface-container rounded text-red-600" title="Delete Product">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render products error:', err);
      }
    },

    filterProductsTable() {
      const q = document.getElementById('admin-prod-search').value.toLowerCase();
      const rows = document.querySelectorAll('#admin-products-table tbody tr');
      rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    },

    async toggleProductFlag(id, field, checked) {
      try {
        await EBA_API.admin.toggleProduct(id, field, checked ? 1 : 0);
        EBA_API.showToast('Product attribute updated');
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async toggleProductStatus(id, current) {
      const next = current === 'published' ? 'draft' : 'published';
      try {
        await EBA_API.admin.toggleProduct(id, 'status', next);
        EBA_API.showToast(`Product is now ${next}`);
        this.renderProducts(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async duplicateProduct(id) {
      try {
        const res = await EBA_API.admin.duplicateProduct(id);
        EBA_API.showToast('Product duplicated as draft');
        this.renderProducts(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async deleteProduct(id) {
      if (!confirm('Are you sure you wish to permanently remove this unstitched product from the catalog?')) return;
      try {
        await EBA_API.admin.deleteProduct(id);
        EBA_API.showToast('Product deleted from atelier catalog');
        this.renderProducts(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async openAddProductModal() {
      const catsRes = await EBA_API.admin.getCategories();
      const brandsRes = await EBA_API.admin.getBrands();
      const categories = catsRes.categories || [];
      const brands = brandsRes.brands || [];

      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-4 border-b border-surface-container-high mb-6">
          <h2 class="font-headline-sm uppercase text-primary text-xl">Create Atelier Product</h2>
          <button onclick="adminApp.closeModal()" class="text-on-surface-variant hover:text-primary">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form id="product-form" onsubmit="adminApp.saveNewProduct(event)" class="space-y-4 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="font-label-sm uppercase tracking-wider block mb-1">Product Title *</label>
              <input type="text" id="p-name" required placeholder="e.g. Gul-e-Noor 3-Piece Luxury Festive Lawn" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">SKU Code *</label>
              <input type="text" id="p-sku" required placeholder="e.g. EBA-W-25-09" class="form-input text-xs font-mono"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Brand Atelier *</label>
              <select id="p-brand" class="form-input text-xs">
                ${brands.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Parent Domain *</label>
              <select id="p-cat" class="form-input text-xs">
                ${categories.filter(c => !c.parent_id).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Subcategory</label>
              <select id="p-subcat" class="form-input text-xs">
                <option value="">None / Direct</option>
                ${categories.filter(c => c.parent_id).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Regular Retail Price (PKR) *</label>
              <input type="number" id="p-price" required placeholder="15800" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Sale Price (Optional PKR)</label>
              <input type="number" id="p-saleprice" placeholder="14200" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Cost Price (PKR)</label>
              <input type="number" id="p-costprice" placeholder="8500" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Initial Stock Cuts *</label>
              <input type="number" id="p-stock" required value="20" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Fabric & Weave *</label>
              <input type="text" id="p-fabric" required placeholder="Supima Lawn 80s & Pure Chiffon" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Season / Drop</label>
              <input type="text" id="p-season" placeholder="Festive '25" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Palette / Color</label>
              <input type="text" id="p-color" placeholder="Dusty Rose & Gold" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase tracking-wider block mb-1">Color Hex</label>
              <input type="color" id="p-colorhex" value="#c5a880" class="w-full h-9 border border-surface-container-high bg-white p-1 cursor-pointer"/>
            </div>
            <div class="sm:col-span-2">
              <label class="font-label-sm uppercase tracking-wider block mb-1">Short Tagline Description</label>
              <textarea id="p-shortdesc" rows="2" class="form-input text-xs" placeholder="Opulent 3-piece unstitched festive lawn..."></textarea>
            </div>
            <div class="sm:col-span-2">
              <label class="font-label-sm uppercase tracking-wider block mb-1">Detailed Textile Story</label>
              <textarea id="p-desc" rows="3" class="form-input text-xs" placeholder="Crafted on high thread count looms..."></textarea>
            </div>
            
            <!-- Full Drag & Drop Image Uploader Zone -->
            <div class="sm:col-span-2 space-y-3 p-4 bg-surface-container-low border border-surface-container-high">
              <div class="flex items-center justify-between">
                <span class="font-label-sm uppercase tracking-wider block font-semibold text-primary">Atelier Visual Gallery (Drag & Drop)</span>
                <span class="text-[11px] text-secondary font-medium">Drag cards to reorder • First card is Primary cover</span>
              </div>

              <!-- Interactive Dropzone Area -->
              <div id="drop-zone"
                class="border-2 border-dashed border-primary/30 hover:border-primary p-6 text-center cursor-pointer transition-all bg-white flex flex-col items-center justify-center gap-1.5"
                ondragover="adminApp.handleDragOver(event, this)"
                ondragleave="adminApp.handleDragLeave(event, this)"
                ondrop="adminApp.handleDrop(event, 'product')"
                onclick="document.getElementById('p-images-file').click()">
                <span class="material-symbols-outlined text-3xl text-primary/60">cloud_upload</span>
                <p class="font-semibold text-primary text-xs">Drag & drop unstitched product photos here, or <span class="text-secondary underline">browse files</span></p>
                <p class="text-[10px] text-on-surface-variant">PNG, JPG, WEBP formats up to 10MB each</p>
                <input type="file" id="p-images-file" multiple accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'product')"/>
              </div>

              <!-- Live Image Thumbnails Grid with Drag-to-Reorder -->
              <div id="product-images-grid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                <!-- Dynamically rendered via renderProductModalImages() -->
              </div>
            </div>
          </div>

          <div class="pt-4 border-t border-surface-container-high flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-6 py-2.5">Cancel</button>
            <button type="submit" id="save-prod-btn" class="btn-primary px-8 py-2.5">Publish Product</button>
          </div>
        </form>
      `;

      this.state.currentModalImages = [];
      this.openModal();
      this.renderProductModalImages();
    },

    async saveNewProduct(e) {
      e.preventDefault();
      const saveBtn = document.getElementById('save-prod-btn');
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving Product...';

      try {
        let images = this.state.currentModalImages;
        if (!images || images.length === 0) {
          images = [{ image_url: '/assets/gul_e_noor_details.png', image_type: 'primary', is_primary: 1 }];
        }

        const data = {
          name: document.getElementById('p-name').value,
          sku: document.getElementById('p-sku').value,
          brand_id: document.getElementById('p-brand').value,
          category_id: document.getElementById('p-cat').value,
          subcategory_id: document.getElementById('p-subcat').value || null,
          price: document.getElementById('p-price').value,
          sale_price: document.getElementById('p-saleprice').value || null,
          cost_price: document.getElementById('p-costprice').value || null,
          stock_quantity: document.getElementById('p-stock').value,
          fabric: document.getElementById('p-fabric').value,
          season: document.getElementById('p-season').value,
          color: document.getElementById('p-color').value,
          color_hex: document.getElementById('p-colorhex').value,
          short_description: document.getElementById('p-shortdesc').value,
          description: document.getElementById('p-desc').value,
          images
        };

        await EBA_API.admin.createProduct(data);
        EBA_API.showToast('Product published to catalog!');
        this.closeModal();
        this.renderProducts(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
        saveBtn.disabled = false;
        saveBtn.textContent = 'Publish Product';
      }
    },

    async openEditProductModal(id) {
      try {
        const res = await EBA_API.admin.getProduct(id);
        const p = res.product;
        const images = res.images || [];
        const catsRes = await EBA_API.admin.getCategories();
        const brandsRes = await EBA_API.admin.getBrands();

        const modalContent = document.getElementById('admin-modal-content');
        modalContent.innerHTML = `
          <div class="flex items-center justify-between pb-4 border-b border-surface-container-high mb-6">
            <h2 class="font-headline-sm uppercase text-primary text-xl">Edit Product: ${p.name}</h2>
            <button onclick="adminApp.closeModal()" class="text-on-surface-variant hover:text-primary">
              <span class="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <form id="edit-prod-form" onsubmit="adminApp.saveProductChanges(event, ${p.id})" class="space-y-4 text-xs">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="font-label-sm uppercase tracking-wider block mb-1">Product Title *</label>
                <input type="text" id="ep-name" required value="${p.name}" class="form-input text-xs"/>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">SKU Code *</label>
                <input type="text" id="ep-sku" required value="${p.sku}" class="form-input text-xs font-mono"/>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Brand Atelier</label>
                <select id="ep-brand" class="form-input text-xs">
                  ${(brandsRes.brands || []).map(b => `<option value="${b.id}" ${b.id === p.brand_id ? 'selected' : ''}>${b.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Parent Domain</label>
                <select id="ep-cat" class="form-input text-xs">
                  ${(catsRes.categories || []).filter(c => !c.parent_id).map(c => `<option value="${c.id}" ${c.id === p.category_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Subcategory</label>
                <select id="ep-subcat" class="form-input text-xs">
                  <option value="">None / Direct</option>
                  ${(catsRes.categories || []).filter(c => c.parent_id).map(c => `<option value="${c.id}" ${c.id === p.subcategory_id ? 'selected' : ''}>${c.name}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Price (PKR) *</label>
                <input type="number" id="ep-price" required value="${p.price}" class="form-input text-xs"/>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Sale Price (PKR)</label>
                <input type="number" id="ep-saleprice" value="${p.sale_price || ''}" class="form-input text-xs"/>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Stock Quantity</label>
                <input type="number" id="ep-stock" value="${p.stock_quantity}" class="form-input text-xs"/>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Fabric Spec</label>
                <input type="text" id="ep-fabric" value="${p.fabric || ''}" class="form-input text-xs"/>
              </div>
              <div class="sm:col-span-2">
                <label class="font-label-sm uppercase tracking-wider block mb-1">Short Description</label>
                <textarea id="ep-shortdesc" rows="2" class="form-input text-xs">${p.short_description || ''}</textarea>
              </div>

              <!-- Full Drag & Drop Image Uploader Zone for Edit Modal -->
              <div class="sm:col-span-2 space-y-3 p-4 bg-surface-container-low border border-surface-container-high">
                <div class="flex items-center justify-between">
                  <span class="font-label-sm uppercase tracking-wider block font-semibold text-primary">Atelier Visual Gallery (Drag & Drop)</span>
                  <span class="text-[11px] text-secondary font-medium">Drag cards to reorder • First card is Primary cover</span>
                </div>

                <!-- Interactive Dropzone Area -->
                <div id="drop-zone"
                  class="border-2 border-dashed border-primary/30 hover:border-primary p-6 text-center cursor-pointer transition-all bg-white flex flex-col items-center justify-center gap-1.5"
                  ondragover="adminApp.handleDragOver(event, this)"
                  ondragleave="adminApp.handleDragLeave(event, this)"
                  ondrop="adminApp.handleDrop(event, 'product')"
                  onclick="document.getElementById('ep-images-file').click()">
                  <span class="material-symbols-outlined text-3xl text-primary/60">cloud_upload</span>
                  <p class="font-semibold text-primary text-xs">Drag & drop new photos here, or <span class="text-secondary underline">browse files</span></p>
                  <p class="text-[10px] text-on-surface-variant">Drop images to upload directly to server</p>
                  <input type="file" id="ep-images-file" multiple accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'product')"/>
                </div>

                <!-- Live Image Thumbnails Grid with Drag-to-Reorder -->
                <div id="product-images-grid" class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                  <!-- Dynamically rendered via renderProductModalImages() -->
                </div>
              </div>
            </div>

            <div class="pt-4 border-t border-surface-container-high flex justify-end gap-3">
              <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-6 py-2.5">Cancel</button>
              <button type="submit" class="btn-primary px-8 py-2.5">Save Changes</button>
            </div>
          </form>
        `;

        this.state.currentModalImages = images.map(img => ({
          image_url: img.image_url,
          is_primary: img.is_primary ? 1 : 0,
          image_type: img.image_type || 'gallery'
        }));

        this.openModal();
        this.renderProductModalImages();
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async saveProductChanges(e, id) {
      e.preventDefault();
      try {
        const data = {
          name: document.getElementById('ep-name').value,
          sku: document.getElementById('ep-sku').value,
          brand_id: document.getElementById('ep-brand').value,
          category_id: document.getElementById('ep-cat').value,
          subcategory_id: document.getElementById('ep-subcat').value || null,
          price: document.getElementById('ep-price').value,
          sale_price: document.getElementById('ep-saleprice').value || null,
          stock_quantity: document.getElementById('ep-stock').value,
          fabric: document.getElementById('ep-fabric').value,
          short_description: document.getElementById('ep-shortdesc').value,
          images: this.state.currentModalImages
        };

        await EBA_API.admin.updateProduct(id, data);
        EBA_API.showToast('Product updated successfully');
        this.closeModal();
        this.renderProducts(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 3. CATEGORIES & BRANDS
    // ----------------------------------------------------
    async renderCategories(area) {
      try {
        const res = await EBA_API.admin.getCategories();
        const brandsRes = await EBA_API.admin.getBrands();
        const categories = res.categories || [];
        const brands = brandsRes.brands || [];

        area.innerHTML = `
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Categories Hierarchy (7 cols) -->
            <div class="lg:col-span-7 bg-surface-container-lowest border border-surface-container-high p-6 space-y-6">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <div>
                  <h3 class="font-headline-sm uppercase text-primary text-lg">Category Hierarchy</h3>
                  <p class="font-body-sm text-on-surface-variant text-xs">Primary domains (Men & Women) and child subcategories.</p>
                </div>
                <button onclick="adminApp.openAddCategoryModal()" class="btn-primary py-2 px-3 text-xs">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Category</span>
                </button>
              </div>

              <div class="space-y-3">
                ${categories.map(c => `
                  <div class="p-4 border ${c.parent_id ? 'border-surface-container-high bg-surface-container-low ml-6' : 'border-primary bg-white'} flex items-center justify-between">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-primary text-sm">${c.name}</span>
                        ${c.parent_name ? `<span class="badge-status badge-gold">Sub of ${c.parent_name}</span>` : `<span class="badge-status badge-dark">Primary Domain</span>`}
                      </div>
                      <span class="font-mono text-on-surface-variant text-[11px] block mt-0.5">slug: ${c.slug} • ${c.product_count} pieces</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <button onclick="adminApp.deleteCategory(${c.id})" class="text-outline hover:text-red-700 p-1">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Brands List (5 cols) -->
            <div class="lg:col-span-5 bg-surface-container-lowest border border-surface-container-high p-6 space-y-6">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <div>
                  <h3 class="font-headline-sm uppercase text-primary text-lg">Brand Houses</h3>
                  <p class="font-body-sm text-on-surface-variant text-xs">Atelier house labels.</p>
                </div>
                <button onclick="adminApp.openAddBrandModal()" class="btn-secondary py-2 px-3 text-xs bg-white">
                  <span>Add Brand</span>
                </button>
              </div>

              <div class="space-y-3">
                ${brands.map(b => `
                  <div class="p-4 border border-surface-container-high bg-white flex items-center justify-between">
                    <div>
                      <span class="font-semibold text-primary block">${b.name}</span>
                      <span class="font-body-sm text-on-surface-variant text-[11px]">${b.description || 'Authentic unstitched atelier'}</span>
                    </div>
                    <span class="badge-status badge-outline">${b.product_count} cuts</span>
                  </div>
                `).join('')}
              </div>
            </div>

          </div>
        `;
      } catch (err) {
        console.error('Render categories error:', err);
      }
    },

    openAddCategoryModal() {
      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">New Category</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveNewCategory(event)" class="space-y-4 text-xs">
          <div>
            <label class="font-label-sm uppercase block mb-1">Category Title *</label>
            <input type="text" id="cat-name" required placeholder="e.g. Pure Boski" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Parent Domain</label>
            <select id="cat-parent" class="form-input text-xs">
              <option value="">None (Top-Level Domain)</option>
              <option value="1">Men</option>
              <option value="2">Women</option>
            </select>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Description</label>
            <textarea id="cat-desc" class="form-input text-xs" rows="2"></textarea>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Save Category</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async saveNewCategory(e) {
      e.preventDefault();
      try {
        await EBA_API.admin.createCategory({
          name: document.getElementById('cat-name').value,
          parent_id: document.getElementById('cat-parent').value || null,
          description: document.getElementById('cat-desc').value
        });
        EBA_API.showToast('Category created');
        this.closeModal();
        this.renderCategories(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async deleteCategory(id) {
      if (!confirm('Delete this category?')) return;
      try {
        await EBA_API.admin.deleteCategory(id);
        EBA_API.showToast('Category deleted');
        this.renderCategories(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    openAddBrandModal() {
      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">New Brand House</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveNewBrand(event)" class="space-y-4 text-xs">
          <div>
            <label class="font-label-sm uppercase block mb-1">Brand Name *</label>
            <input type="text" id="brand-name" required placeholder="e.g. EBA Silk Heritage" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Description</label>
            <textarea id="brand-desc" class="form-input text-xs" rows="2"></textarea>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Create Brand</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async saveNewBrand(e) {
      e.preventDefault();
      try {
        await EBA_API.admin.createBrand({
          name: document.getElementById('brand-name').value,
          description: document.getElementById('brand-desc').value
        });
        EBA_API.showToast('Brand created');
        this.closeModal();
        this.renderCategories(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 4. INVENTORY HEALTH & STOCK ADJUSTMENTS
    // ----------------------------------------------------
    async renderInventory(area) {
      try {
        const res = await EBA_API.admin.getInventory();
        const inventory = res.inventory || [];
        const stats = res.stats || {};

        area.innerHTML = `
          <div class="space-y-6">
            <!-- 4 Inventory Health Metric Tiles -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-surface-container-lowest p-5 border border-surface-container-high">
                <span class="font-label-sm text-secondary uppercase tracking-wider">Total Catalog Cuts</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold mt-1">${stats.total_products || 0}</p>
                <span class="text-[11px] text-on-surface-variant">Active unstitched styles</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high">
                <span class="font-label-sm text-secondary uppercase tracking-wider">Total Yardage Units</span>
                <p class="font-headline-sm text-2xl text-primary font-semibold mt-1">${stats.total_units || 0}</p>
                <span class="text-[11px] text-on-surface-variant">Available across warehouse</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high">
                <span class="font-label-sm text-amber-800 uppercase tracking-wider">Low Stock Warnings</span>
                <p class="font-headline-sm text-2xl text-amber-700 font-semibold mt-1">${stats.low_stock || 0}</p>
                <span class="text-[11px] text-amber-800">Requires loom reorder</span>
              </div>

              <div class="bg-surface-container-lowest p-5 border border-surface-container-high">
                <span class="font-label-sm text-red-800 uppercase tracking-wider">Depleted / Sold Out</span>
                <p class="font-headline-sm text-2xl text-red-700 font-semibold mt-1">${stats.out_of_stock || 0}</p>
                <span class="text-[11px] text-red-800">Zero available stock</span>
              </div>
            </div>

            <!-- Stock Table -->
            <div class="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th class="p-4">Visual</th>
                    <th class="p-4">Style & SKU</th>
                    <th class="p-4">Fabric</th>
                    <th class="p-4">Current Stock</th>
                    <th class="p-4">Threshold</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">
                  ${inventory.map(item => `
                    <tr class="hover:bg-surface-container-low transition-colors">
                      <td class="p-4 w-14">
                        <img src="${item.primary_image || '/assets/gul_e_noor_details.png'}" alt="${item.name}" class="w-10 h-14 object-cover bg-surface-container"/>
                      </td>
                      <td class="p-4 min-w-[200px]">
                        <span class="font-semibold text-primary block text-sm">${item.name}</span>
                        <span class="font-mono text-secondary text-[11px]">${item.sku}</span>
                      </td>
                      <td class="p-4 text-on-surface-variant">${item.fabric || '-'}</td>
                      <td class="p-4 font-semibold text-sm ${item.stock_quantity <= item.low_stock_threshold ? 'text-red-700 font-bold' : 'text-primary'}">
                        ${item.stock_quantity} cuts
                      </td>
                      <td class="p-4 text-on-surface-variant">${item.low_stock_threshold} cuts</td>
                      <td class="p-4">
                        <span class="badge-status ${item.stock_quantity <= 0 ? 'bg-red-100 text-red-800' : (item.stock_quantity <= item.low_stock_threshold ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')}">
                          ${item.stock_quantity <= 0 ? 'Depleted' : (item.stock_quantity <= item.low_stock_threshold ? 'Low Stock' : 'Optimal')}
                        </span>
                      </td>
                      <td class="p-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                          <button onclick="adminApp.openStockAdjustModal(${item.id}, '${item.name}', ${item.stock_quantity})" class="btn-secondary py-1 px-3 text-xs bg-white">
                            Adjust +/-
                          </button>
                          <button onclick="adminApp.openStockLogsModal(${item.id}, '${item.name}')" class="text-secondary hover:text-primary font-semibold underline text-xs">
                            Logs
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render inventory error:', err);
      }
    },

    openStockAdjustModal(productId, productName, currentStock) {
      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">Adjust Stock: ${productName}</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveStockAdjustment(event, ${productId})" class="space-y-4 text-xs">
          <div class="p-3 bg-surface-container-low text-xs">
            Current Available Inventory: <strong class="text-primary text-sm">${currentStock} cuts</strong>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Adjustment Amount (+ to add, - to deduct) *</label>
            <input type="number" id="adj-amount" required placeholder="e.g. 10 or -5" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Reason for Adjustment *</label>
            <select id="adj-reason" class="form-input text-xs">
              <option value="New stock arrival from loom">New stock arrival from loom</option>
              <option value="Physical atelier inventory audit">Physical atelier inventory audit</option>
              <option value="Damaged bolt during cutting inspection">Damaged bolt during cutting inspection</option>
              <option value="Returned from customer">Returned from customer</option>
              <option value="VIP salon reservation">VIP salon reservation</option>
            </select>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Confirm Adjustment</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async saveStockAdjustment(e, productId) {
      e.preventDefault();
      try {
        const amount = document.getElementById('adj-amount').value;
        const reason = document.getElementById('adj-reason').value;

        await EBA_API.admin.adjustStock(productId, amount, reason);
        EBA_API.showToast('Inventory stock adjusted & logged');
        this.closeModal();
        this.renderInventory(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async openStockLogsModal(productId, productName) {
      try {
        const res = await EBA_API.admin.getInventoryLogs(productId);
        const logs = res.logs || [];

        const modalContent = document.getElementById('admin-modal-content');
        modalContent.innerHTML = `
          <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
            <h2 class="font-headline-sm uppercase text-primary">Audit Log: ${productName}</h2>
            <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="space-y-3 max-h-96 overflow-y-auto text-xs">
            ${logs.length === 0 ? `<p class="text-on-surface-variant">No stock movement logs recorded.</p>` : logs.map(l => `
              <div class="p-3 bg-surface-container-low border border-surface-container-high flex items-center justify-between">
                <div>
                  <span class="font-semibold text-primary block">${l.reason}</span>
                  <span class="text-on-surface-variant text-[11px]">${new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div class="text-right">
                  <span class="font-semibold ${l.change_amount > 0 ? 'text-emerald-700' : 'text-red-700'} block">
                    ${l.change_amount > 0 ? '+' : ''}${l.change_amount}
                  </span>
                  <span class="text-[10px] text-on-surface-variant">Stock: ${l.previous_stock} &rarr; ${l.new_stock}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        this.openModal();
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 5. ORDERS & DISPATCH MANAGEMENT
    // ----------------------------------------------------
    async renderOrders(area) {
      try {
        const res = await EBA_API.admin.getOrders();
        const orders = res.orders || [];

        area.innerHTML = `
          <div class="space-y-6">
            <!-- Filter Bar -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-2">
                <label class="font-label-sm uppercase tracking-wider text-on-surface-variant">Status:</label>
                <select id="admin-orders-filter-status" onchange="adminApp.filterOrdersStatus()" class="form-input text-xs w-44">
                  <option value="all">All Orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <!-- Orders Table -->
            <div class="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
              <table class="w-full text-left text-xs" id="admin-orders-table">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th class="p-4">Order #</th>
                    <th class="p-4">Customer Contact</th>
                    <th class="p-4">City / Area</th>
                    <th class="p-4">Amount</th>
                    <th class="p-4">Payment</th>
                    <th class="p-4">Order Status</th>
                    <th class="p-4">TCS Tracking</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">
                  ${orders.map(o => `
                    <tr class="hover:bg-surface-container-low transition-colors" data-status="${o.order_status}">
                      <td class="p-4 font-mono font-semibold text-primary">#${o.order_number}</td>
                      <td class="p-4">
                        <span class="font-semibold text-primary block">${o.customer_name}</span>
                        <span class="text-on-surface-variant text-[11px] block">${o.customer_phone}</span>
                      </td>
                      <td class="p-4 text-on-surface-variant">${o.city}, ${o.province}</td>
                      <td class="p-4 font-semibold text-primary">PKR ${o.total.toLocaleString()}</td>
                      <td class="p-4">
                        <span class="badge-status ${o.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'badge-gold'}">
                          ${o.payment_method.toUpperCase()} • ${o.payment_status}
                        </span>
                      </td>
                      <td class="p-4">
                        <span class="badge-status ${o.order_status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : (o.order_status === 'shipped' ? 'bg-blue-100 text-blue-800' : 'badge-dark')}">
                          ${o.order_status}
                        </span>
                      </td>
                      <td class="p-4 font-mono text-[11px] text-secondary font-semibold">
                        ${o.tracking_number || 'Unassigned'}
                      </td>
                      <td class="p-4 text-right">
                        <button onclick="adminApp.openOrderDetailsModal(${o.id})" class="btn-secondary py-1.5 px-3 text-xs bg-white">
                          Manage
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render orders error:', err);
      }
    },

    filterOrdersStatus() {
      const val = document.getElementById('admin-orders-filter-status').value;
      const rows = document.querySelectorAll('#admin-orders-table tbody tr');
      rows.forEach(r => {
        const st = r.getAttribute('data-status');
        r.style.display = (val === 'all' || st === val) ? '' : 'none';
      });
    },

    async openOrderDetailsModal(orderId) {
      try {
        const res = await EBA_API.admin.getOrder(orderId);
        const order = res.order;
        const items = res.items || [];

        const modalContent = document.getElementById('admin-modal-content');
        modalContent.innerHTML = `
          <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-6">
            <div>
              <span class="font-label-sm uppercase tracking-widest text-secondary">Order Docket Management</span>
              <h2 class="font-headline-sm uppercase text-primary text-xl">Order #${order.order_number}</h2>
            </div>
            <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
          </div>

          <div class="space-y-6 text-xs">
            <!-- Customer & Shipping Summary -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-container-low border border-surface-container-high">
              <div>
                <span class="font-label-sm uppercase tracking-wider text-secondary block mb-1">Customer Details</span>
                <p class="font-semibold text-primary text-sm">${order.customer_name}</p>
                <p class="text-on-surface-variant">${order.customer_email}</p>
                <p class="text-on-surface-variant">${order.customer_phone}</p>
              </div>
              <div>
                <span class="font-label-sm uppercase tracking-wider text-secondary block mb-1">Shipping Address</span>
                <p class="text-on-surface-variant">${order.shipping_address}, ${order.area || ''}</p>
                <p class="text-on-surface-variant">${order.city}, ${order.province} ${order.postal_code || ''}</p>
              </div>
            </div>

            <!-- Ordered Items Snapshot -->
            <div class="space-y-2">
              <span class="font-label-sm uppercase tracking-wider text-secondary block">Purchased Unstitched Weaves</span>
              <div class="border border-surface-container-high divide-y divide-surface-container-high">
                ${items.map(item => `
                  <div class="p-3 flex items-center justify-between bg-white">
                    <div class="flex items-center gap-3">
                      <img src="${item.image_url}" alt="${item.product_name}" class="w-10 h-14 object-cover bg-surface-container"/>
                      <div>
                        <span class="font-semibold text-primary block">${item.product_name}</span>
                        <span class="font-mono text-on-surface-variant text-[11px]">${item.sku} • Qty: ${item.quantity}</span>
                        ${item.tailoring_selected ? `<span class="text-secondary font-semibold font-label-sm block">+ Master Tailoring Service</span>` : ''}
                      </div>
                    </div>
                    <span class="font-semibold text-primary">PKR ${item.total_price.toLocaleString()}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Status Controls Form -->
            <div class="p-4 bg-surface-container-lowest border border-surface-container-high space-y-4">
              <span class="font-label-sm uppercase tracking-wider text-primary block">Update Order Status</span>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Order Fulfillment Status</label>
                  <select id="ord-status" class="form-input text-xs">
                    <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="processing" ${order.order_status === 'processing' ? 'selected' : ''}>Processing (Cutting & Packaging)</option>
                    <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    <option value="returned" ${order.order_status === 'returned' ? 'selected' : ''}>Returned</option>
                  </select>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Payment Status</label>
                  <select id="ord-payment" class="form-input text-xs">
                    <option value="pending" ${order.payment_status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="paid" ${order.payment_status === 'paid' ? 'selected' : ''}>Paid</option>
                    <option value="failed" ${order.payment_status === 'failed' ? 'selected' : ''}>Failed</option>
                    <option value="refunded" ${order.payment_status === 'refunded' ? 'selected' : ''}>Refunded</option>
                  </select>
                </div>
              </div>

              <!-- Tracking Info -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Courier Partner</label>
                  <input type="text" id="ord-courier" value="${order.courier_name || 'TCS Express'}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tracking Number Code</label>
                  <input type="text" id="ord-tracking" value="${order.tracking_number || ''}" placeholder="e.g. TCS-77291048" class="form-input text-xs font-mono"/>
                </div>
              </div>

              <div class="pt-2 flex justify-end gap-3">
                <button type="button" onclick="adminApp.saveOrderUpdates(${order.id})" class="btn-primary py-2 px-6">
                  Save Order Docket Updates
                </button>
              </div>
            </div>
          </div>
        `;
        this.openModal();
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async saveOrderUpdates(orderId) {
      try {
        const orderStatus = document.getElementById('ord-status').value;
        const paymentStatus = document.getElementById('ord-payment').value;
        const courier = document.getElementById('ord-courier').value;
        const tracking = document.getElementById('ord-tracking').value;

        await EBA_API.admin.updateOrderStatus(orderId, orderStatus, paymentStatus);
        if (tracking) {
          await EBA_API.admin.updateTracking(orderId, tracking, courier);
        }

        EBA_API.showToast('Order docket updated successfully');
        this.closeModal();
        this.renderOrders(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 6. PROMOTIONAL COUPONS
    // ----------------------------------------------------
    async renderCoupons(area) {
      try {
        const res = await EBA_API.admin.getCoupons();
        const coupons = res.coupons || [];

        area.innerHTML = `
          <div class="space-y-6">
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Promotional Vouchers</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Vouchers verified strictly on server-side checkout.</p>
              </div>
              <button onclick="adminApp.openAddCouponModal()" class="btn-primary py-2.5 px-4 text-xs">
                <span class="material-symbols-outlined text-[16px]">add</span>
                <span>Create Voucher</span>
              </button>
            </div>

            <div class="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th class="p-4">Code</th>
                    <th class="p-4">Type</th>
                    <th class="p-4">Discount</th>
                    <th class="p-4">Min. Order</th>
                    <th class="p-4">Redemptions</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">
                  ${coupons.map(c => `
                    <tr class="hover:bg-surface-container-low transition-colors">
                      <td class="p-4 font-mono font-bold text-sm text-primary">${c.code}</td>
                      <td class="p-4 uppercase">${c.type}</td>
                      <td class="p-4 font-semibold text-secondary">${c.type === 'percentage' ? `${c.value}% OFF` : `PKR ${c.value.toLocaleString()} OFF`}</td>
                      <td class="p-4">PKR ${c.min_order.toLocaleString()}</td>
                      <td class="p-4">${c.used_count} / ${c.usage_limit || 'Unlimited'}</td>
                      <td class="p-4">
                        <span class="badge-status ${c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-800'}">
                          ${c.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td class="p-4 text-right">
                        <button onclick="adminApp.deleteCoupon(${c.id})" class="text-outline hover:text-red-700 p-1">
                          <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render coupons error:', err);
      }
    },

    openAddCouponModal() {
      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">Create Voucher</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveNewCoupon(event)" class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="font-label-sm uppercase block mb-1">Code *</label>
              <input type="text" id="cp-code" required placeholder="e.g. LUXURY20" class="form-input text-xs uppercase font-mono"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Type *</label>
              <select id="cp-type" class="form-input text-xs">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed PKR Amount</option>
              </select>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Discount Value *</label>
              <input type="number" id="cp-value" required placeholder="e.g. 15 for 15% or 2500" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Minimum Order (PKR)</label>
              <input type="number" id="cp-min" value="10000" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Max Cap (PKR, for %)</label>
              <input type="number" id="cp-max" placeholder="3000" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Usage Limit</label>
              <input type="number" id="cp-limit" value="100" class="form-input text-xs"/>
            </div>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Save Voucher</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async saveNewCoupon(e) {
      e.preventDefault();
      try {
        await EBA_API.admin.createCoupon({
          code: document.getElementById('cp-code').value,
          type: document.getElementById('cp-type').value,
          value: document.getElementById('cp-value').value,
          min_order: document.getElementById('cp-min').value,
          max_discount: document.getElementById('cp-max').value || null,
          usage_limit: document.getElementById('cp-limit').value
        });
        EBA_API.showToast('Voucher created');
        this.closeModal();
        this.renderCoupons(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async deleteCoupon(id) {
      if (!confirm('Remove this coupon code?')) return;
      try {
        await EBA_API.admin.deleteCoupon(id);
        EBA_API.showToast('Coupon removed');
        this.renderCoupons(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 7. CUSTOMERS
    // ----------------------------------------------------
    async renderCustomers(area) {
      try {
        const res = await EBA_API.admin.getCustomers();
        const customers = res.customers || [];

        area.innerHTML = `
          <div class="space-y-6">
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Patron Directory (${customers.length})</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Customer profiles, total spent, and account statuses.</p>
              </div>
            </div>

            <div class="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th class="p-4">Customer</th>
                    <th class="p-4">Email Address</th>
                    <th class="p-4">Phone (WhatsApp)</th>
                    <th class="p-4">City</th>
                    <th class="p-4">Total Spent</th>
                    <th class="p-4">Orders</th>
                    <th class="p-4">Status</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">
                  ${customers.map(c => `
                    <tr class="hover:bg-surface-container-low transition-colors">
                      <td class="p-4 font-semibold text-primary">${c.name}</td>
                      <td class="p-4 text-on-surface-variant">${c.email}</td>
                      <td class="p-4">${c.phone || '-'}</td>
                      <td class="p-4 text-on-surface-variant">${c.city || 'Islamabad'}</td>
                      <td class="p-4 font-semibold text-secondary">PKR ${(c.total_spent || 0).toLocaleString()}</td>
                      <td class="p-4">${c.orders_count || 0}</td>
                      <td class="p-4">
                        <button onclick="adminApp.toggleCustomerStatus(${c.id}, '${c.status}')" class="badge-status ${c.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                          ${c.status}
                        </button>
                      </td>
                      <td class="p-4 text-right">
                        <button onclick="adminApp.openCustomerDetailsModal(${c.id})" class="text-secondary hover:text-primary underline font-semibold">
                          Profile
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render customers error:', err);
      }
    },

    async toggleCustomerStatus(id, current) {
      const next = current === 'active' ? 'suspended' : 'active';
      try {
        await EBA_API.admin.toggleCustomerStatus(id, next);
        EBA_API.showToast(`Customer account marked ${next}`);
        this.renderCustomers(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async openCustomerDetailsModal(id) {
      try {
        const res = await EBA_API.admin.getCustomer(id);
        const c = res.customer;
        const profile = res.profile || {};
        const orders = res.orders || [];

        const modalContent = document.getElementById('admin-modal-content');
        modalContent.innerHTML = `
          <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-6">
            <div>
              <span class="font-label-sm uppercase tracking-widest text-secondary">VIP Salon Patron</span>
              <h2 class="font-headline-sm uppercase text-primary text-xl">${c.name}</h2>
            </div>
            <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
          </div>
          <div class="space-y-4 text-xs">
            <div class="grid grid-cols-2 gap-4 p-4 bg-surface-container-low">
              <div>
                <p><strong>Email:</strong> ${c.email}</p>
                <p><strong>Phone:</strong> ${c.phone || '-'}</p>
                <p><strong>Status:</strong> ${c.status}</p>
              </div>
              <div>
                <p><strong>Total Spent:</strong> PKR ${(profile.total_spent || 0).toLocaleString()}</p>
                <p><strong>Total Orders:</strong> ${orders.length}</p>
                <p><strong>Notes:</strong> ${profile.notes || 'None'}</p>
              </div>
            </div>
            <div>
              <span class="font-label-sm uppercase tracking-wider block mb-2">Order History</span>
              <div class="space-y-2 max-h-48 overflow-y-auto">
                ${orders.map(o => `
                  <div class="p-2.5 bg-white border border-surface-container-high flex justify-between">
                    <span>#${o.order_number} (${new Date(o.created_at).toLocaleDateString()})</span>
                    <span class="font-semibold text-primary">PKR ${o.total.toLocaleString()} [${o.order_status}]</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
        this.openModal();
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 7B. ALL PAGE HERO BANNERS & CAMPAIGN HEADERS
    // ----------------------------------------------------
    async renderPageBanners(area) {
      try {
        const res = await EBA_API.admin.getCMS();
        const cms = res.cms || {};
        this.state.cms = cms;

        const hero = cms.hero_banner || {
          tagline: "Unstitched Autumn/Festive ’25 Edition",
          title: "The Art of Pakistani Weaves",
          subtitle: "Exquisite unstitched fabrics tailored for the discerning connoisseur — Hand-selected Egyptian Cotton, Festive Lawn, and Raw Silk woven across premier Pakistani mills.",
          image: "/assets/hero_campaign_editorial.png",
          badge1: "Complimentary Nationwide Shipping",
          badge2: "Cash on Delivery Available",
          cta_men_text: "Explore Men's Unstitched",
          cta_men_link: "#men",
          cta_women_text: "Explore Women's Haute Couture",
          cta_women_link: "#women",
          enabled: true
        };

        const menBanner = cms.men_banner || {
          tagline: "Haute Sartorial Weaves • The Gentleman's Edit",
          title: "Men's Unstitched Atelier",
          subtitle: "Timeless Pakistani craft meets modern sartorial precision. Discover 4.5-meter cuts of premium Egyptian Giza 120s cotton, royal pure Boski silk, crisp summer Latha, and seasonal Wash & Wear crafted for distinguished silhouette drapes.",
          image: "/assets/men_luxury_unstitched.png",
          badge1: "100% Authentic Thread Counts",
          badge2: "Mother-of-Pearl Buttons Included",
          badge3: "Complimentary Nationwide Shipping",
          enabled: true
        };

        const womenBanner = cms.women_banner || {
          tagline: "Festive Couture ’25 • Vol. I",
          title: "Women's Luxury Festive Lawn '25",
          subtitle: "Sumptuous 3-piece unstitched masterpieces featuring intricate zari marori embroidery, organza cutwork borders, and pure silk & printed chiffon dupattas crafted for celebratory splendor.",
          image: "/assets/woman_opulent_lawn.png",
          badge1: "3-Piece Luxury Festive Suites",
          badge2: "Pure Silk Chiffon Dupattas",
          badge3: "Bespoke Master Tailoring Available",
          enabled: true
        };

        const newArrivalsBanner = cms.new_arrivals_banner || {
          tagline: "Fresh Loom Dispatches • Autumn / Festive ’25",
          title: "New Unstitched Arrivals",
          subtitle: "Fresh off the master looms. Hand-curated seasonal releases in ultra-fine Egyptian cotton, embroidered festive lawn, and heritage textured weaves.",
          image: "/assets/hero_campaign_editorial.png",
          badge1: "Fresh Loom Dispatches",
          badge2: "Limited Edition Yardage",
          badge3: "48-Hour Priority Dispatch",
          enabled: true
        };

        const saleBanner = cms.sale_banner || {
          tagline: "Exclusive Archive Reductions",
          title: "Seasonal Archive & Sale",
          subtitle: "Exceptional values on select end-of-edition unstitched luxury fabrics. Complete with authentic selvedge verification and complimentary signature packaging.",
          image: "/assets/hero_campaign_split.png",
          badge1: "Privilege Reductions Up to 30%",
          badge2: "Authentic Yardage Certification",
          badge3: "Limited Vault Stocks",
          enabled: true
        };

        const catalogBanner = cms.catalog_banner || {
          tagline: "The Master Textile Vault",
          title: "Curated Atelier Catalog",
          subtitle: "Explore the complete archives of EBA Fashion Studio — from regal winter Karandi and Egyptian cottons to decadent celebratory lawn ensembles.",
          image: "/assets/hero_campaign_editorial.png",
          badge1: "Certified Thread Counts",
          badge2: "Nationwide Express Shipping",
          badge3: "Master Bespoke Tailoring",
          enabled: true
        };

        const cartBanner = cms.cart_banner || {
          tagline: "Atelier Bag • Haute Couture Dispatch",
          title: "Your Curated Wardrobe Bag",
          subtitle: "Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.",
          image: "/assets/hero_campaign_split.png",
          badge1: "Complimentary Archive Packaging",
          badge2: "Free Shipping Above PKR 5,000",
          enabled: true
        };

        const checkoutBanner = cms.checkout_banner || {
          tagline: "Verified Checkout Salon",
          title: "Express Atelier Checkout",
          subtitle: "256-Bit SSL Encrypted • Real-time SMS & WhatsApp Courier Dispatch Verification",
          image: "/assets/hero_campaign_editorial.png",
          badge1: "Live Inventory Locked",
          badge2: "TCS Nationwide Delivery",
          enabled: true
        };

        const bannerConfigs = [
          {
            id: 'men',
            key: 'men_banner',
            prefix: 'men',
            name: "Men's Unstitched Atelier",
            tag: "Men's Collection",
            icon: 'man',
            route: '#men',
            defaultImg: '/assets/men_luxury_unstitched.png',
            helpText: "High-impact campaign header on the Men's collection page.",
            data: menBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Weave Credential', defaultVal: '100% Authentic Thread Counts' },
              { key: 'badge2', label: 'Badge 2: Packaging Accent', defaultVal: 'Mother-of-Pearl Buttons Included' },
              { key: 'badge3', label: 'Badge 3: Delivery Privilege', defaultVal: 'Complimentary Nationwide Shipping' }
            ]
          },
          {
            id: 'women',
            key: 'women_banner',
            prefix: 'women',
            name: "Women's Luxury Festive Lawn",
            tag: "Women's Couture",
            icon: 'woman',
            route: '#women',
            defaultImg: '/assets/woman_opulent_lawn.png',
            helpText: "Opulent campaign banner on the Women's festive lawn collection page.",
            data: womenBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Suit Specification', defaultVal: '3-Piece Luxury Festive Suites' },
              { key: 'badge2', label: 'Badge 2: Dupatta Specification', defaultVal: 'Pure Silk Chiffon Dupattas' },
              { key: 'badge3', label: 'Badge 3: Atelier Tailoring', defaultVal: 'Bespoke Master Tailoring Available' }
            ]
          },
          {
            id: 'newarrivals',
            key: 'new_arrivals_banner',
            prefix: 'newarrivals',
            name: "New Unstitched Arrivals",
            tag: "Loom Releases",
            icon: 'auto_awesome',
            route: '#new-arrivals',
            defaultImg: '/assets/hero_campaign_editorial.png',
            helpText: "Header banner for fresh releases and featured looms across the boutique.",
            data: newArrivalsBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Dispatch Type', defaultVal: 'Fresh Loom Dispatches' },
              { key: 'badge2', label: 'Badge 2: Scarcity Spec', defaultVal: 'Limited Edition Yardage' },
              { key: 'badge3', label: 'Badge 3: Dispatch Speed', defaultVal: '48-Hour Priority Dispatch' }
            ]
          },
          {
            id: 'sale',
            key: 'sale_banner',
            prefix: 'sale',
            name: "Seasonal Archive & Sale",
            tag: "Archive Reductions",
            icon: 'loyalty',
            route: '#sale',
            defaultImg: '/assets/hero_campaign_split.png',
            helpText: "Banner for exclusive archive fabrics and seasonal promotional pricing.",
            data: saleBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Reduction Offer', defaultVal: 'Privilege Reductions Up to 30%' },
              { key: 'badge2', label: 'Badge 2: Yardage Verification', defaultVal: 'Authentic Yardage Certification' },
              { key: 'badge3', label: 'Badge 3: Stock Status', defaultVal: 'Limited Vault Stocks' }
            ]
          },
          {
            id: 'catalog',
            key: 'catalog_banner',
            prefix: 'catalog',
            name: "Curated Master Catalog",
            tag: "Textile Vault",
            icon: 'menu_book',
            route: '#catalog',
            defaultImg: '/assets/hero_campaign_editorial.png',
            helpText: "Header for the complete master textile catalog and fabric filters.",
            data: catalogBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Quality Guarantee', defaultVal: 'Certified Thread Counts' },
              { key: 'badge2', label: 'Badge 2: Logistics Partner', defaultVal: 'Nationwide Express Shipping' },
              { key: 'badge3', label: 'Badge 3: Atelier Service', defaultVal: 'Master Bespoke Tailoring' }
            ]
          },
          {
            id: 'cart',
            key: 'cart_banner',
            prefix: 'cart',
            name: "Shopping Bag / Wardrobe Cart",
            tag: "Client Cart",
            icon: 'shopping_bag',
            route: '#cart',
            defaultImg: '/assets/hero_campaign_split.png',
            helpText: "Luxury reassuring banner displayed above items in the customer bag.",
            data: cartBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Packaging Accent', defaultVal: 'Complimentary Archive Packaging' },
              { key: 'badge2', label: 'Badge 2: Shipping Privilege', defaultVal: 'Free Shipping Above PKR 5,000' }
            ]
          },
          {
            id: 'checkout',
            key: 'checkout_banner',
            prefix: 'checkout',
            name: "Express Atelier Checkout",
            tag: "Checkout Salon",
            icon: 'lock',
            route: '#checkout',
            defaultImg: '/assets/hero_campaign_editorial.png',
            helpText: "Security, escrow and logistics reassurance banner on the checkout page.",
            data: checkoutBanner,
            badges: [
              { key: 'badge1', label: 'Badge 1: Inventory Lock', defaultVal: 'Live Inventory Locked' },
              { key: 'badge2', label: 'Badge 2: Courier Partner', defaultVal: 'TCS Nationwide Delivery' }
            ]
          },
          {
            id: 'home',
            key: 'hero_banner',
            prefix: 'hero',
            name: "Homepage Hero Welcome",
            tag: "Homepage Prime",
            icon: 'cottage',
            route: '#home',
            defaultImg: '/assets/hero_campaign_editorial.png',
            helpText: "Prime hero campaign visual and headline on the storefront homepage entrance.",
            data: hero,
            badges: [
              { key: 'badge1', label: 'Badge 1: Delivery Offer', defaultVal: 'Complimentary Nationwide Shipping' },
              { key: 'badge2', label: 'Badge 2: Payment Reassurance', defaultVal: 'Cash on Delivery Available' }
            ],
            hasCtas: true
          }
        ];

        area.innerHTML = `
          <div class="space-y-6">
            <!-- Header Banner Summary -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span class="font-label-sm uppercase tracking-widest text-secondary font-semibold text-xs">Omnichannel Storefront Customizer</span>
                </div>
                <h3 class="font-headline-sm uppercase text-primary text-xl font-bold">All Page Hero Banners & Campaign Headers</h3>
                <p class="font-body-sm text-on-surface-variant text-xs mt-1 max-w-3xl">
                  Customize the hero banner visuals, headlines, taglines, subtext, and reassurance badges for every page across the storefront. Changes are synced with cloud storage and reflected instantly on the live site.
                </p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <a href="/" target="_blank" class="btn-secondary py-2.5 px-4 text-xs flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Storefront Live</span>
                </a>
              </div>
            </div>

            <!-- Page Selector Tabs -->
            <div class="bg-surface-container-low p-2 border border-surface-container-high overflow-x-auto">
              <div class="flex items-center gap-1.5 min-w-max" id="banner-tab-strip">
                <button onclick="adminApp.switchBannerTab('all')" data-tab="all" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-primary text-white font-semibold transition-all shadow-sm flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">apps</span>
                  <span>View All Pages (8)</span>
                </button>
                <button onclick="adminApp.switchBannerTab('men')" data-tab="men" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">man</span>
                  <span>Men's Atelier</span>
                </button>
                <button onclick="adminApp.switchBannerTab('women')" data-tab="women" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">woman</span>
                  <span>Women's Couture</span>
                </button>
                <button onclick="adminApp.switchBannerTab('newarrivals')" data-tab="newarrivals" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>New Arrivals</span>
                </button>
                <button onclick="adminApp.switchBannerTab('sale')" data-tab="sale" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">loyalty</span>
                  <span>Seasonal Sale</span>
                </button>
                <button onclick="adminApp.switchBannerTab('catalog')" data-tab="catalog" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>Master Catalog</span>
                </button>
                <button onclick="adminApp.switchBannerTab('cart')" data-tab="cart" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">shopping_bag</span>
                  <span>Shopping Bag</span>
                </button>
                <button onclick="adminApp.switchBannerTab('checkout')" data-tab="checkout" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">lock</span>
                  <span>Checkout Salon</span>
                </button>
                <button onclick="adminApp.switchBannerTab('home')" data-tab="home" class="px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[16px]">cottage</span>
                  <span>Homepage Hero</span>
                </button>
              </div>
            </div>

            <!-- Banner Customization Cards List -->
            <div class="space-y-6" id="banner-cards-container">
              ${bannerConfigs.map(cfg => `
                <div id="banner-card-${cfg.id}" data-banner-tab="${cfg.id}" class="page-banner-card bg-surface-container-lowest p-6 border border-surface-container-high space-y-5 transition-all">
                  
                  <!-- Card Header Bar -->
                  <div class="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-container-high">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <span class="material-symbols-outlined text-2xl">${cfg.icon}</span>
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h3 class="font-headline-sm uppercase text-primary text-base font-bold">${cfg.name}</h3>
                          <span class="bg-surface-container-high text-primary font-label-sm text-[10px] uppercase px-2 py-0.5 tracking-wider font-semibold">${cfg.tag}</span>
                        </div>
                        <div class="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                          <span>Route:</span>
                          <a href="/${cfg.route}" target="_blank" class="text-secondary font-mono hover:underline flex items-center gap-1 font-semibold">
                            <span>/${cfg.route}</span>
                            <span class="material-symbols-outlined text-[13px]">launch</span>
                          </a>
                          <span>•</span>
                          <span class="text-[11px]">${cfg.helpText}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <label class="flex items-center gap-2 cursor-pointer text-xs bg-surface-container-low px-3 py-2 border border-surface-container-high">
                        <input type="checkbox" id="cms-${cfg.prefix}-enabled" ${cfg.data.enabled !== false ? 'checked' : ''} class="custom-checkbox"/>
                        <span class="font-label-sm uppercase font-semibold text-primary">Active on Storefront</span>
                      </label>
                      <button type="button" onclick="adminApp.saveBannerById(event, '${cfg.id}')" class="btn-primary py-2 px-5 text-xs flex items-center gap-2 font-semibold shadow">
                        <span class="material-symbols-outlined text-[16px]">save</span>
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>

                  <!-- Visual Asset Manager -->
                  <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                    <div class="flex items-center justify-between">
                      <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Background Visual Asset</label>
                      <span class="text-[11px] text-secondary">Drop image file or paste web/local URL</span>
                    </div>

                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <!-- Live Preview with Fallback -->
                      <div class="relative w-48 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                        <img id="cms-img-${cfg.prefix}-preview" src="${cfg.data.image || cfg.defaultImg}" alt="${cfg.name} Preview" class="w-full h-full object-cover" onerror="this.src='${cfg.defaultImg}'"/>
                        <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Live Preview</div>
                      </div>

                      <!-- Dropzone & URL Input Controls -->
                      <div class="flex-1 w-full space-y-2">
                        <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                          ondragover="adminApp.handleDragOver(event, this)"
                          ondragleave="adminApp.handleDragLeave(event, this)"
                          ondrop="adminApp.handleDrop(event, 'cms-${cfg.prefix}')"
                          onclick="document.getElementById('cms-${cfg.prefix}-file').click()">
                          <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                          <div class="text-left">
                            <p class="text-xs font-semibold text-primary">Drop banner photo here, or <span class="text-secondary underline">browse files</span></p>
                            <p class="text-[10px] text-on-surface-variant">Recommended: 1920x600 high-res landscape (auto-compressed)</p>
                          </div>
                          <input type="file" id="cms-${cfg.prefix}-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-${cfg.prefix}')"/>
                        </div>

                        <div>
                          <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Local File Path</label>
                          <div class="flex items-center gap-2">
                            <input type="text" id="cms-img-${cfg.prefix}" value="${(cfg.data.image || cfg.defaultImg).replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-${cfg.prefix}', this.value)"/>
                            <button type="button" onclick="adminApp.resetCmsImage('cms-${cfg.prefix}', '${cfg.defaultImg}')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap" title="Reset to original default">Reset</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Editorial Copy & Typography -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label class="font-label-sm uppercase block mb-1 font-semibold text-primary">Editorial Tagline</label>
                      <input type="text" id="cms-${cfg.prefix}-tagline" value="${(cfg.data.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs" placeholder="e.g. Haute Sartorial Weaves • Vol. I"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase block mb-1 font-semibold text-primary">Headline Title</label>
                      <input type="text" id="cms-${cfg.prefix}-title" value="${(cfg.data.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs" placeholder="e.g. Master Textile Vault"/>
                    </div>
                    <div class="sm:col-span-2">
                      <label class="font-label-sm uppercase block mb-1 font-semibold text-primary">Subtext Description & Editorial Narrative</label>
                      <textarea id="cms-${cfg.prefix}-subtitle" rows="2" class="form-input text-xs" placeholder="Detailed luxury narrative...">${cfg.data.subtitle || ''}</textarea>
                    </div>

                    <!-- Badges (if configured) -->
                    ${(cfg.badges || []).map(b => `
                      <div>
                        <label class="font-label-sm uppercase block mb-1 font-semibold text-primary">${b.label}</label>
                        <input type="text" id="cms-${cfg.prefix}-${b.key}" value="${(cfg.data[b.key] || b.defaultVal || '').replace(/"/g, '&quot;')}" class="form-input text-xs" placeholder="${b.defaultVal}"/>
                      </div>
                    `).join('')}

                    <!-- CTAs if Homepage -->
                    ${cfg.hasCtas ? `
                      <div>
                        <label class="font-label-sm uppercase block mb-1 font-semibold text-primary">Men CTA Button Text</label>
                        <input type="text" id="cms-${cfg.prefix}-ctamen" value="${(cfg.data.cta_men_text || 'Explore Men\'s Unstitched').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                      </div>
                      <div>
                        <label class="font-label-sm uppercase block mb-1 font-semibold text-primary">Women CTA Button Text</label>
                        <input type="text" id="cms-${cfg.prefix}-ctawomen" value="${(cfg.data.cta_women_text || 'Explore Women\'s Haute Couture').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                      </div>
                    ` : ''}
                  </div>

                  <!-- Action Strip -->
                  <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-surface-container-high">
                    <div class="flex items-center gap-2">
                      <button type="button" onclick="adminApp.saveBannerById(event, '${cfg.id}')" class="btn-primary py-2.5 px-6 text-xs flex items-center gap-2 font-semibold shadow">
                        <span class="material-symbols-outlined text-[16px]">save</span>
                        <span>Save Changes</span>
                      </button>
                      <button type="button" onclick="adminApp.resetCmsImage('cms-${cfg.prefix}', '${cfg.defaultImg}')" class="btn-secondary py-2.5 px-3 text-xs">
                        Reset Visual
                      </button>
                    </div>
                    <a href="/${cfg.route}" target="_blank" class="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline font-label-sm uppercase font-semibold">
                      <span>Preview Live on Storefront</span>
                      <span class="material-symbols-outlined text-[16px]">launch</span>
                    </a>
                  </div>

                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render Page Banners error:', err);
        EBA_API.showToast(err.message || 'Failed to load page banners', 'error');
      }
    },

    switchBannerTab(tabId) {
      document.querySelectorAll('#banner-tab-strip button').forEach(btn => {
        const target = btn.getAttribute('data-tab');
        if (target === tabId) {
          btn.className = 'px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-primary text-white font-semibold transition-all shadow-sm flex items-center gap-1.5';
        } else {
          btn.className = 'px-4 py-2 text-xs uppercase font-label-sm tracking-wider bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low border border-surface-container-high transition-all flex items-center gap-1.5';
        }
      });

      document.querySelectorAll('.page-banner-card').forEach(card => {
        const cardTab = card.getAttribute('data-banner-tab');
        if (tabId === 'all' || cardTab === tabId) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    },

    // ----------------------------------------------------
    // 8. HOMEPAGE CMS
    // ----------------------------------------------------
    async renderCMS(area) {
      try {
        const res = await EBA_API.admin.getCMS();
        const cms = res.cms || {};
        this.state.cms = cms;

        const ann = cms.announcement_bar || { text: 'Exclusive Festive Eid Drop Now Live | Free Express Delivery Across Pakistan', enabled: true };
        const hero = cms.hero_banner || {
          tagline: "Unstitched Autumn/Festive ’25 Edition",
          title: "The Art of Pakistani Weaves",
          subtitle: "Exquisite unstitched fabrics tailored for the discerning connoisseur — Hand-selected Egyptian Cotton, Festive Lawn, and Raw Silk woven across premier Pakistani mills.",
          image: "/assets/hero_campaign_editorial.png",
          badge1: "Complimentary Nationwide Shipping",
          badge2: "Cash on Delivery Available",
          cta_men_text: "Explore Men's Unstitched",
          cta_men_link: "#men",
          cta_women_text: "Explore Women's Haute Couture",
          cta_women_link: "#women",
          enabled: true
        };
        const promo = cms.promotional_banner || {
          title: 'Woven on Historic Looms, Preserved for Generations',
          subtitle: 'Pakistani textile craft exists in a league of its own. From the riverbanks of the Indus where long-staple cotton was first domesticated 5,000 years ago, our atelier selects only the purest Supima and Egyptian Giza fibers.',
          image: '/assets/hero_campaign_split.png',
          enabled: true
        };
        const ticker = Array.isArray(cms.running_ticker) ? cms.running_ticker : [
          "100% Authentic Thread Counts",
          "Pure Supima & Egyptian Cotton 120s",
          "Master Artisan Embroideries",
          "Worldwide DHL Express Delivery",
          "Bespoke Studio Master-Tailoring"
        ];
        const portals = cms.portal_sections || {
          men: {
            title: "The Gentleman's Edit",
            edition: "Autumn / Winter Weaves • 01",
            description: "Timeless unstitched Latha, structured winter Karandi, luxurious pure Boski, and crease-resistant high-twist Wash & Wear cuts.",
            image: "/assets/men_luxury_unstitched.png"
          },
          women: {
            title: "The Couture Lawn ’25",
            edition: "Festive Lawn Drop • 02",
            description: "Intricate Kashmiri tilla motifs, jacquard borders, printed chiffon dupattas, and three-piece unstitched masterpieces woven on Swiss looms.",
            image: "/assets/woman_opulent_lawn.png"
          }
        };

        const menBanner = cms.men_banner || {
          tagline: "Haute Sartorial Weaves • The Gentleman's Edit",
          title: "Men's Unstitched Atelier",
          subtitle: "Timeless Pakistani craft meets modern sartorial precision. Discover 4.5-meter cuts of premium Egyptian Giza 120s cotton, royal pure Boski silk, crisp summer Latha, and seasonal Wash & Wear crafted for distinguished silhouette drapes.",
          image: "/assets/men_luxury_unstitched.png"
        };
        const womenBanner = cms.women_banner || {
          tagline: "Festive Couture ’25 • Vol. I",
          title: "Women's Luxury Festive Lawn '25",
          subtitle: "Sumptuous 3-piece unstitched masterpieces featuring intricate zari marori embroidery, organza cutwork borders, and pure silk & printed chiffon dupattas crafted for celebratory splendor.",
          image: "/assets/woman_opulent_lawn.png"
        };
        const newArrivalsBanner = cms.new_arrivals_banner || {
          tagline: "Fresh Loom Dispatches • Autumn / Festive ’25",
          title: "New Unstitched Arrivals",
          subtitle: "Fresh off the master looms. Hand-curated seasonal releases in ultra-fine Egyptian cotton, embroidered festive lawn, and heritage textured weaves.",
          image: "/assets/hero_campaign_editorial.png"
        };
        const saleBanner = cms.sale_banner || {
          tagline: "Exclusive Archive Reductions",
          title: "Seasonal Archive & Sale",
          subtitle: "Exceptional values on select end-of-edition unstitched luxury fabrics. Complete with authentic selvedge verification and complimentary signature packaging.",
          image: "/assets/hero_campaign_split.png"
        };
        const catalogBanner = cms.catalog_banner || {
          tagline: "The Master Textile Vault",
          title: "Curated Atelier Catalog",
          subtitle: "Explore the complete archives of EBA Fashion Studio — from regal winter Karandi and Egyptian cottons to decadent celebratory lawn ensembles.",
          image: "/assets/hero_campaign_editorial.png"
        };

        area.innerHTML = `
          <div class="space-y-8">
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high">
              <h3 class="font-headline-sm uppercase text-primary text-lg">Storefront CMS & Page Banners Management</h3>
              <p class="font-body-sm text-on-surface-variant text-xs">Manage banners for Homepage, Men's Collection, Women's Collection, New Arrivals, Sale, and Catalog with Drag & Drop uploads and instant storefront updates.</p>
            </div>

            <!-- Block 1: Announcement Bar -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <span class="font-headline-sm uppercase text-primary text-base">Top Announcement Banner</span>
                <label class="flex items-center gap-2 cursor-pointer text-xs">
                  <input type="checkbox" id="cms-ann-enabled" ${ann.enabled ? 'checked' : ''} class="custom-checkbox"/>
                  <span class="font-label-sm uppercase">Active on Storefront</span>
                </label>
              </div>
              <div>
                <label class="font-label-sm uppercase tracking-wider block mb-1">Banner Announcement Text</label>
                <input type="text" id="cms-ann-text" value="${(ann.text || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
              </div>
              <button onclick="adminApp.saveAnnouncementCMS(event)" class="btn-primary py-2.5 px-6 text-xs">
                Update Announcement Strip
              </button>
            </div>

            <!-- Block 2: Hero Campaign Banner with Drag & Drop Visual -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Hero Campaign Visual & Headline</h3>
                <span class="text-xs text-secondary font-medium">Storefront Main Welcome Banner</span>
              </div>
              
              <!-- Visual Asset Manager for Hero Banner -->
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Hero Background Visual</label>
                  <span class="text-[11px] text-secondary">Drop image file or paste direct web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <!-- Live Preview with Fallback -->
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-hero-preview" src="${hero.image || '/assets/hero_campaign_editorial.png'}" alt="Hero Visual Preview" class="w-full h-full object-cover" onerror="this.src='/assets/hero_campaign_editorial.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <!-- Dropzone & URL Input Controls -->
                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-hero')"
                      onclick="document.getElementById('cms-hero-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop new Hero photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Auto-compressed for instant loading (JPEG, PNG, WEBP)</p>
                      </div>
                      <input type="file" id="cms-hero-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-hero')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-hero" value="${(hero.image || '/assets/hero_campaign_editorial.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-hero', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-hero', '/assets/hero_campaign_editorial.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap" title="Reset to original">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tagline</label>
                  <input type="text" id="cms-hero-tagline" value="${(hero.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title (HTML supported for breaks)</label>
                  <input type="text" id="cms-hero-title" value="${(hero.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div class="sm:col-span-2">
                  <label class="font-label-sm uppercase block mb-1">Subtext Description</label>
                  <textarea id="cms-hero-subtitle" rows="2" class="form-input text-xs">${hero.subtitle || ''}</textarea>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Men CTA Text</label>
                  <input type="text" id="cms-hero-ctamen" value="${(hero.cta_men_text || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Women CTA Text</label>
                  <input type="text" id="cms-hero-ctawomen" value="${(hero.cta_women_text || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
              </div>
              <button onclick="adminApp.saveHeroCMS(event)" class="btn-primary py-2.5 px-6 text-xs">
                Save Hero Banner
              </button>
            </div>

            <!-- Block 2B: Men's Atelier Collection Banner -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Men's Atelier Collection Banner</h3>
                <span class="text-xs text-secondary font-medium">Storefront Page: #men</span>
              </div>
              
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Men Banner Background Visual</label>
                  <span class="text-[11px] text-secondary">Drop image or paste web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-men-preview" src="${menBanner.image || '/assets/men_luxury_unstitched.png'}" alt="Men Banner Preview" class="w-full h-full object-cover" onerror="this.src='/assets/men_luxury_unstitched.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-men')"
                      onclick="document.getElementById('cms-men-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop Men's collection photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Recommended: 1920x600 high-res portrait/editorial</p>
                      </div>
                      <input type="file" id="cms-men-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-men')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-men" value="${(menBanner.image || '/assets/men_luxury_unstitched.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-men', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-men', '/assets/men_luxury_unstitched.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tagline</label>
                  <input type="text" id="cms-men-tagline" value="${(menBanner.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title</label>
                  <input type="text" id="cms-men-title" value="${(menBanner.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div class="sm:col-span-2">
                  <label class="font-label-sm uppercase block mb-1">Subtext Description</label>
                  <textarea id="cms-men-subtitle" rows="2" class="form-input text-xs">${menBanner.subtitle || ''}</textarea>
                </div>
              </div>
              <button onclick="adminApp.savePageBanner(event, 'men_banner', 'men', '/assets/men_luxury_unstitched.png', 'Men\\'s Atelier Banner')" class="btn-primary py-2.5 px-6 text-xs">
                Save Men's Banner
              </button>
            </div>

            <!-- Block 2C: Women's Luxury Festive Lawn Banner -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Women's Couture Lawn Banner</h3>
                <span class="text-xs text-secondary font-medium">Storefront Page: #women</span>
              </div>
              
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Women Banner Background Visual</label>
                  <span class="text-[11px] text-secondary">Drop image or paste web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-women-preview" src="${womenBanner.image || '/assets/woman_opulent_lawn.png'}" alt="Women Banner Preview" class="w-full h-full object-cover" onerror="this.src='/assets/woman_opulent_lawn.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-women')"
                      onclick="document.getElementById('cms-women-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop Women's collection photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Recommended: 1920x600 high-res portrait/editorial</p>
                      </div>
                      <input type="file" id="cms-women-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-women')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-women" value="${(womenBanner.image || '/assets/woman_opulent_lawn.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-women', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-women', '/assets/woman_opulent_lawn.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tagline</label>
                  <input type="text" id="cms-women-tagline" value="${(womenBanner.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title</label>
                  <input type="text" id="cms-women-title" value="${(womenBanner.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div class="sm:col-span-2">
                  <label class="font-label-sm uppercase block mb-1">Subtext Description</label>
                  <textarea id="cms-women-subtitle" rows="2" class="form-input text-xs">${womenBanner.subtitle || ''}</textarea>
                </div>
              </div>
              <button onclick="adminApp.savePageBanner(event, 'women_banner', 'women', '/assets/woman_opulent_lawn.png', 'Women\\'s Couture Banner')" class="btn-primary py-2.5 px-6 text-xs">
                Save Women's Banner
              </button>
            </div>

            <!-- Block 2D: New Arrivals Collection Banner -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">New Arrivals Banner</h3>
                <span class="text-xs text-secondary font-medium">Storefront Page: #new-arrivals</span>
              </div>
              
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">New Arrivals Background Visual</label>
                  <span class="text-[11px] text-secondary">Drop image or paste web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-newarrivals-preview" src="${newArrivalsBanner.image || '/assets/hero_campaign_editorial.png'}" alt="New Arrivals Banner Preview" class="w-full h-full object-cover" onerror="this.src='/assets/hero_campaign_editorial.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-newarrivals')"
                      onclick="document.getElementById('cms-newarrivals-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop New Arrivals photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Recommended: 1920x600 high-res portrait/editorial</p>
                      </div>
                      <input type="file" id="cms-newarrivals-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-newarrivals')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-newarrivals" value="${(newArrivalsBanner.image || '/assets/hero_campaign_editorial.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-newarrivals', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-newarrivals', '/assets/hero_campaign_editorial.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tagline</label>
                  <input type="text" id="cms-newarrivals-tagline" value="${(newArrivalsBanner.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title</label>
                  <input type="text" id="cms-newarrivals-title" value="${(newArrivalsBanner.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div class="sm:col-span-2">
                  <label class="font-label-sm uppercase block mb-1">Subtext Description</label>
                  <textarea id="cms-newarrivals-subtitle" rows="2" class="form-input text-xs">${newArrivalsBanner.subtitle || ''}</textarea>
                </div>
              </div>
              <button onclick="adminApp.savePageBanner(event, 'new_arrivals_banner', 'newarrivals', '/assets/hero_campaign_editorial.png', 'New Arrivals Banner')" class="btn-primary py-2.5 px-6 text-xs">
                Save New Arrivals Banner
              </button>
            </div>

            <!-- Block 2E: Seasonal Archive & Sale Banner -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Seasonal Archive & Sale Banner</h3>
                <span class="text-xs text-secondary font-medium">Storefront Page: #sale</span>
              </div>
              
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Sale Banner Background Visual</label>
                  <span class="text-[11px] text-secondary">Drop image or paste web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-sale-preview" src="${saleBanner.image || '/assets/hero_campaign_split.png'}" alt="Sale Banner Preview" class="w-full h-full object-cover" onerror="this.src='/assets/hero_campaign_split.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-sale')"
                      onclick="document.getElementById('cms-sale-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop Sale photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Recommended: 1920x600 high-res portrait/editorial</p>
                      </div>
                      <input type="file" id="cms-sale-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-sale')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-sale" value="${(saleBanner.image || '/assets/hero_campaign_split.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-sale', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-sale', '/assets/hero_campaign_split.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tagline</label>
                  <input type="text" id="cms-sale-tagline" value="${(saleBanner.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title</label>
                  <input type="text" id="cms-sale-title" value="${(saleBanner.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div class="sm:col-span-2">
                  <label class="font-label-sm uppercase block mb-1">Subtext Description</label>
                  <textarea id="cms-sale-subtitle" rows="2" class="form-input text-xs">${saleBanner.subtitle || ''}</textarea>
                </div>
              </div>
              <button onclick="adminApp.savePageBanner(event, 'sale_banner', 'sale', '/assets/hero_campaign_split.png', 'Seasonal Sale Banner')" class="btn-primary py-2.5 px-6 text-xs">
                Save Sale Banner
              </button>
            </div>

            <!-- Block 2F: Master Catalog & Archive Banner -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Curated Master Catalog Banner</h3>
                <span class="text-xs text-secondary font-medium">Storefront Page: #catalog</span>
              </div>
              
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Catalog Banner Background Visual</label>
                  <span class="text-[11px] text-secondary">Drop image or paste web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-catalog-preview" src="${catalogBanner.image || '/assets/hero_campaign_editorial.png'}" alt="Catalog Banner Preview" class="w-full h-full object-cover" onerror="this.src='/assets/hero_campaign_editorial.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-catalog')"
                      onclick="document.getElementById('cms-catalog-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop Catalog photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Recommended: 1920x600 high-res portrait/editorial</p>
                      </div>
                      <input type="file" id="cms-catalog-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-catalog')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-catalog" value="${(catalogBanner.image || '/assets/hero_campaign_editorial.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-catalog', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-catalog', '/assets/hero_campaign_editorial.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Tagline</label>
                  <input type="text" id="cms-catalog-tagline" value="${(catalogBanner.tagline || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title</label>
                  <input type="text" id="cms-catalog-title" value="${(catalogBanner.title || '').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div class="sm:col-span-2">
                  <label class="font-label-sm uppercase block mb-1">Subtext Description</label>
                  <textarea id="cms-catalog-subtitle" rows="2" class="form-input text-xs">${catalogBanner.subtitle || ''}</textarea>
                </div>
              </div>
              <button onclick="adminApp.savePageBanner(event, 'catalog_banner', 'catalog', '/assets/hero_campaign_editorial.png', 'Master Catalog Banner')" class="btn-primary py-2.5 px-6 text-xs">
                Save Catalog Banner
              </button>
            </div>

            <!-- Block 3: The Loom Craft Narrative / Story Section with Drag & Drop Visual -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Loom Craft Narrative & Story Visual</h3>
                <span class="text-xs text-secondary font-medium">Storefront Mid-Page Story Editorial</span>
              </div>
              
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-3">
                <div class="flex items-center justify-between">
                  <label class="font-label-sm uppercase block text-xs font-semibold text-primary">Story Feature Visual</label>
                  <span class="text-[11px] text-secondary">Drop image file or paste web link</span>
                </div>

                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div class="relative w-44 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                    <img id="cms-img-story-preview" src="${promo.image || '/assets/hero_campaign_split.png'}" alt="Story Visual Preview" class="w-full h-full object-cover" onerror="this.src='/assets/hero_campaign_split.png'"/>
                    <div class="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 font-mono uppercase">Preview</div>
                  </div>

                  <div class="flex-1 w-full space-y-2">
                    <div class="border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer transition-all bg-white flex items-center justify-center gap-3"
                      ondragover="adminApp.handleDragOver(event, this)"
                      ondragleave="adminApp.handleDragLeave(event, this)"
                      ondrop="adminApp.handleDrop(event, 'cms-story')"
                      onclick="document.getElementById('cms-story-file').click()">
                      <span class="material-symbols-outlined text-2xl text-primary/70">cloud_upload</span>
                      <div class="text-left">
                        <p class="text-xs font-semibold text-primary">Drop new Story photo here, or <span class="text-secondary underline">browse files</span></p>
                        <p class="text-[10px] text-on-surface-variant">Auto-compressed for instant loading (JPEG, PNG, WEBP)</p>
                      </div>
                      <input type="file" id="cms-story-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-story')"/>
                    </div>

                    <div>
                      <label class="text-[10px] uppercase tracking-wider text-on-surface-variant font-label-sm block mb-1">Image URL / Path</label>
                      <div class="flex items-center gap-2">
                        <input type="text" id="cms-img-story" value="${(promo.image || '/assets/hero_campaign_split.png').replace(/"/g, '&quot;')}" class="form-input text-xs font-mono flex-1" placeholder="https://... or /assets/..." oninput="adminApp.handleCmsImageUrlChange('cms-story', this.value)"/>
                        <button type="button" onclick="adminApp.resetCmsImage('cms-story', '/assets/hero_campaign_split.png')" class="btn-secondary text-[11px] py-2 px-3 whitespace-nowrap" title="Reset to original">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="space-y-3 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Headline Title</label>
                  <input type="text" id="cms-story-title" value="${(promo.title || 'Woven on Historic Looms, Preserved for Generations').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Narrative Description</label>
                  <textarea id="cms-story-subtitle" rows="3" class="form-input text-xs">${promo.subtitle || ''}</textarea>
                </div>
              </div>
              <button onclick="adminApp.savePromoCMS(event)" class="btn-primary py-2.5 px-6 text-xs">
                Save Narrative Section
              </button>
            </div>

            <!-- Block 4: Running Marquee Ticker Strip -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <h3 class="font-headline-sm uppercase text-primary text-base pb-3 border-b border-surface-container-high">Running Marquee Ticker</h3>
              <p class="text-xs text-on-surface-variant">Enter highlight ticker phrases separated by new lines.</p>
              <div>
                <label class="font-label-sm uppercase block mb-1">Ticker Items (One per line)</label>
                <textarea id="cms-ticker-items" rows="4" class="form-input text-xs font-mono">${ticker.join('\n')}</textarea>
              </div>
              <button onclick="adminApp.saveTickerCMS(event)" class="btn-primary py-2.5 px-6 text-xs">
                Save Running Ticker
              </button>
            </div>

            <!-- Block 5: Wardrobe Domains & Category Portals with Drag & Drop Visuals -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-6">
              <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h3 class="font-headline-sm uppercase text-primary text-base">Wardrobe Domains & Category Portals</h3>
                <span class="text-xs text-secondary font-medium">Storefront Category Gateways</span>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Men Portal -->
                <div class="p-4 border border-surface-container-high space-y-3 bg-surface-container-low">
                  <span class="font-headline-sm uppercase text-primary text-sm font-bold block">Men's Atelier Domain</span>
                  
                  <div class="space-y-2">
                    <div class="flex items-center gap-3">
                      <div class="relative w-24 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                        <img id="cms-img-portal-men-preview" src="${(portals.men && portals.men.image) || '/assets/men_luxury_unstitched.png'}" class="w-full h-full object-cover" onerror="this.src='/assets/men_luxury_unstitched.png'"/>
                      </div>
                      <div class="flex-1 border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer bg-white transition-all"
                        ondragover="adminApp.handleDragOver(event, this)"
                        ondragleave="adminApp.handleDragLeave(event, this)"
                        ondrop="adminApp.handleDrop(event, 'cms-portal-men')"
                        onclick="document.getElementById('cms-portal-men-file').click()">
                        <span class="material-symbols-outlined text-xl text-primary/60">cloud_upload</span>
                        <p class="text-[11px] font-semibold text-primary">Drop Men visual</p>
                        <p class="text-[9px] text-on-surface-variant">or browse file</p>
                        <input type="file" id="cms-portal-men-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-portal-men')"/>
                      </div>
                    </div>
                    <div>
                      <input type="text" id="cms-img-portal-men" value="${((portals.men && portals.men.image) || '/assets/men_luxury_unstitched.png').replace(/"/g, '&quot;')}" class="form-input text-[11px] font-mono" placeholder="Image URL / Path..." oninput="adminApp.handleCmsImageUrlChange('cms-portal-men', this.value)"/>
                    </div>
                  </div>

                  <div>
                    <label class="font-label-sm uppercase block mb-1 text-[11px]">Title</label>
                    <input type="text" id="cms-men-title" value="${((portals.men && portals.men.title) || 'The Gentleman Edit').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1 text-[11px]">Edition Subtitle</label>
                    <input type="text" id="cms-men-edition" value="${((portals.men && portals.men.edition) || 'Autumn / Winter Weaves • 01').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1 text-[11px]">Description</label>
                    <textarea id="cms-men-desc" rows="2" class="form-input text-xs">${(portals.men && portals.men.description) || ''}</textarea>
                  </div>
                </div>

                <!-- Women Portal -->
                <div class="p-4 border border-surface-container-high space-y-3 bg-surface-container-low">
                  <span class="font-headline-sm uppercase text-primary text-sm font-bold block">Women's Couture Domain</span>
                  
                  <div class="space-y-2">
                    <div class="flex items-center gap-3">
                      <div class="relative w-24 h-28 shrink-0 bg-black/5 border border-surface-container-high overflow-hidden shadow">
                        <img id="cms-img-portal-women-preview" src="${(portals.women && portals.women.image) || '/assets/woman_opulent_lawn.png'}" class="w-full h-full object-cover" onerror="this.src='/assets/woman_opulent_lawn.png'"/>
                      </div>
                      <div class="flex-1 border-2 border-dashed border-primary/30 hover:border-primary p-3 text-center cursor-pointer bg-white transition-all"
                        ondragover="adminApp.handleDragOver(event, this)"
                        ondragleave="adminApp.handleDragLeave(event, this)"
                        ondrop="adminApp.handleDrop(event, 'cms-portal-women')"
                        onclick="document.getElementById('cms-portal-women-file').click()">
                        <span class="material-symbols-outlined text-xl text-primary/60">cloud_upload</span>
                        <p class="text-[11px] font-semibold text-primary">Drop Women visual</p>
                        <p class="text-[9px] text-on-surface-variant">or browse file</p>
                        <input type="file" id="cms-portal-women-file" accept="image/*" class="hidden" onchange="adminApp.handleFileSelect(event, 'cms-portal-women')"/>
                      </div>
                    </div>
                    <div>
                      <input type="text" id="cms-img-portal-women" value="${((portals.women && portals.women.image) || '/assets/woman_opulent_lawn.png').replace(/"/g, '&quot;')}" class="form-input text-[11px] font-mono" placeholder="Image URL / Path..." oninput="adminApp.handleCmsImageUrlChange('cms-portal-women', this.value)"/>
                    </div>
                  </div>

                  <div>
                    <label class="font-label-sm uppercase block mb-1 text-[11px]">Title</label>
                    <input type="text" id="cms-women-title" value="${((portals.women && portals.women.title) || 'The Couture Lawn ’25').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1 text-[11px]">Edition Subtitle</label>
                    <input type="text" id="cms-women-edition" value="${((portals.women && portals.women.edition) || 'Festive Lawn Drop • 02').replace(/"/g, '&quot;')}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1 text-[11px]">Description</label>
                    <textarea id="cms-women-desc" rows="2" class="form-input text-xs">${(portals.women && portals.women.description) || ''}</textarea>
                  </div>
                </div>
              </div>

              <button onclick="adminApp.savePortalsCMS(event)" class="btn-primary py-2.5 px-6 text-xs">
                Save Category Domains
              </button>
            </div>

          </div>
        `;
      } catch (err) {
        console.error('Render CMS error:', err);
      }
    },

    async saveAnnouncementCMS(event) {
      const saveBtn = event?.currentTarget || document.querySelector('button[onclick*="saveAnnouncementCMS"]');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin mr-2"></span>Updating...';
      }
      try {
        const text = document.getElementById('cms-ann-text').value;
        const enabled = document.getElementById('cms-ann-enabled').checked;
        await EBA_API.admin.updateCMS('announcement_bar', { text, enabled });
        if (this.state.cms) this.state.cms.announcement_bar = { text, enabled };
        EBA_API.showToast('Announcement bar updated on storefront');
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'Update Announcement Strip';
        }
      }
    },

    async saveHeroCMS(event) {
      const saveBtn = event?.currentTarget || document.querySelector('button[onclick*="saveHeroCMS"]');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin mr-2"></span>Saving Hero Banner...';
      }
      try {
        const tagline = document.getElementById('cms-hero-tagline').value;
        const title = document.getElementById('cms-hero-title').value;
        const subtitle = document.getElementById('cms-hero-subtitle').value;
        const cta_men_text = document.getElementById('cms-hero-ctamen').value;
        const cta_women_text = document.getElementById('cms-hero-ctawomen').value;
        const image = (document.getElementById('cms-img-hero').value || '').trim() || '/assets/hero_campaign_editorial.png';

        const existingHero = this.state.cms?.hero_banner || {};
        const heroPayload = {
          ...existingHero,
          tagline,
          title,
          subtitle,
          cta_men_text,
          cta_women_text,
          image,
          enabled: true
        };

        await EBA_API.admin.updateCMS('hero_banner', heroPayload);
        if (this.state.cms) this.state.cms.hero_banner = heroPayload;
        EBA_API.showToast('Hero campaign & banner image updated successfully!');
      } catch (err) {
        EBA_API.showToast(err.message || 'Failed to update Hero banner', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'Save Hero Banner';
        }
      }
    },

    async saveBannerById(event, bannerId) {
      const bannerMap = {
        men: { key: 'men_banner', prefix: 'men', defaultImg: '/assets/men_luxury_unstitched.png', name: "Men's Atelier Banner" },
        women: { key: 'women_banner', prefix: 'women', defaultImg: '/assets/woman_opulent_lawn.png', name: "Women's Couture Banner" },
        newarrivals: { key: 'new_arrivals_banner', prefix: 'newarrivals', defaultImg: '/assets/hero_campaign_editorial.png', name: "New Arrivals Banner" },
        sale: { key: 'sale_banner', prefix: 'sale', defaultImg: '/assets/hero_campaign_split.png', name: "Seasonal Sale Banner" },
        catalog: { key: 'catalog_banner', prefix: 'catalog', defaultImg: '/assets/hero_campaign_editorial.png', name: "Curated Master Catalog Banner" },
        cart: { key: 'cart_banner', prefix: 'cart', defaultImg: '/assets/hero_campaign_split.png', name: "Shopping Bag Banner" },
        checkout: { key: 'checkout_banner', prefix: 'checkout', defaultImg: '/assets/hero_campaign_editorial.png', name: "Checkout Salon Banner" },
        home: { key: 'hero_banner', prefix: 'hero', defaultImg: '/assets/hero_campaign_editorial.png', name: "Homepage Hero Banner" }
      };

      const cfg = bannerMap[bannerId];
      if (!cfg) {
        return EBA_API.showToast('Invalid banner: ' + bannerId, 'error');
      }

      return this.savePageBanner(event, cfg.key, cfg.prefix, cfg.defaultImg, cfg.name);
    },

    async savePageBanner(event, bannerKey, prefix, defaultImg, successLabel) {
      const saveBtn = event?.currentTarget;
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin mr-2"></span>Saving Banner...';
      }
      try {
        const tagline = document.getElementById(`cms-${prefix}-tagline`)?.value ?? '';
        const title = document.getElementById(`cms-${prefix}-title`)?.value ?? '';
        const subtitle = document.getElementById(`cms-${prefix}-subtitle`)?.value ?? '';
        const image = (document.getElementById(`cms-img-${prefix}`)?.value || '').trim() || defaultImg;
        const enabledCheckbox = document.getElementById(`cms-${prefix}-enabled`);
        const enabled = enabledCheckbox ? enabledCheckbox.checked : true;

        const existing = this.state.cms?.[bannerKey] || {};
        const payload = {
          ...existing,
          tagline,
          title,
          subtitle,
          image,
          enabled
        };

        if (document.getElementById(`cms-${prefix}-badge1`)) {
          payload.badge1 = document.getElementById(`cms-${prefix}-badge1`).value.trim();
        }
        if (document.getElementById(`cms-${prefix}-badge2`)) {
          payload.badge2 = document.getElementById(`cms-${prefix}-badge2`).value.trim();
        }
        if (document.getElementById(`cms-${prefix}-badge3`)) {
          payload.badge3 = document.getElementById(`cms-${prefix}-badge3`).value.trim();
        }
        if (document.getElementById(`cms-${prefix}-ctamen`)) {
          payload.cta_men_text = document.getElementById(`cms-${prefix}-ctamen`).value.trim();
        }
        if (document.getElementById(`cms-${prefix}-ctawomen`)) {
          payload.cta_women_text = document.getElementById(`cms-${prefix}-ctawomen`).value.trim();
        }
        if (document.getElementById(`cms-${prefix}-ctalinkmen`)) {
          payload.cta_men_link = document.getElementById(`cms-${prefix}-ctalinkmen`).value.trim();
        }
        if (document.getElementById(`cms-${prefix}-ctalinkwomen`)) {
          payload.cta_women_link = document.getElementById(`cms-${prefix}-ctalinkwomen`).value.trim();
        }

        await EBA_API.admin.updateCMS(bannerKey, payload);
        if (this.state.cms) this.state.cms[bannerKey] = payload;
        EBA_API.showToast(`${successLabel} updated successfully!`);
      } catch (err) {
        EBA_API.showToast(err.message || 'Failed to update banner', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'Save Banner';
        }
      }
    },

    async savePromoCMS(event) {
      const saveBtn = event?.currentTarget || document.querySelector('button[onclick*="savePromoCMS"]');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin mr-2"></span>Saving Narrative...';
      }
      try {
        const title = document.getElementById('cms-story-title').value;
        const subtitle = document.getElementById('cms-story-subtitle').value;
        const image = (document.getElementById('cms-img-story').value || '').trim() || '/assets/hero_campaign_split.png';

        const existingPromo = this.state.cms?.promotional_banner || {};
        const promoPayload = {
          ...existingPromo,
          title,
          subtitle,
          image,
          enabled: true
        };

        await EBA_API.admin.updateCMS('promotional_banner', promoPayload);
        if (this.state.cms) this.state.cms.promotional_banner = promoPayload;
        EBA_API.showToast('Craft narrative section updated successfully!');
      } catch (err) {
        EBA_API.showToast(err.message || 'Failed to update craft narrative', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'Save Narrative Section';
        }
      }
    },

    async saveTickerCMS(event) {
      const saveBtn = event?.currentTarget || document.querySelector('button[onclick*="saveTickerCMS"]');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin mr-2"></span>Saving Ticker...';
      }
      try {
        const raw = document.getElementById('cms-ticker-items').value;
        const items = raw.split('\n').map(s => s.trim()).filter(Boolean);
        await EBA_API.admin.updateCMS('running_ticker', items);
        if (this.state.cms) this.state.cms.running_ticker = items;
        EBA_API.showToast('Running marquee ticker updated successfully!');
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'Save Running Ticker';
        }
      }
    },

    async savePortalsCMS(event) {
      const saveBtn = event?.currentTarget || document.querySelector('button[onclick*="savePortalsCMS"]');
      const origText = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="inline-block w-3 h-3 border-2 border-white border-t-transparent animate-spin mr-2"></span>Saving Domains...';
      }
      try {
        const existingPortals = this.state.cms?.portal_sections || {};
        const portalsData = {
          men: {
            ...(existingPortals.men || {}),
            title: document.getElementById('cms-men-title').value,
            edition: document.getElementById('cms-men-edition').value,
            description: document.getElementById('cms-men-desc').value,
            image: (document.getElementById('cms-img-portal-men').value || '').trim() || '/assets/men_luxury_unstitched.png',
            cta_text: existingPortals.men?.cta_text || 'Shop Men',
            link: existingPortals.men?.link || '#men'
          },
          women: {
            ...(existingPortals.women || {}),
            title: document.getElementById('cms-women-title').value,
            edition: document.getElementById('cms-women-edition').value,
            description: document.getElementById('cms-women-desc').value,
            image: (document.getElementById('cms-img-portal-women').value || '').trim() || '/assets/woman_opulent_lawn.png',
            cta_text: existingPortals.women?.cta_text || 'Shop Women',
            link: existingPortals.women?.link || '#women'
          }
        };

        await EBA_API.admin.updateCMS('portal_sections', portalsData);
        if (this.state.cms) this.state.cms.portal_sections = portalsData;
        EBA_API.showToast('Category portals & domain visuals updated successfully!');
      } catch (err) {
        EBA_API.showToast(err.message || 'Failed to update category portals', 'error');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = origText || 'Save Category Domains';
        }
      }
    },

    // ----------------------------------------------------
    // 9. FINANCIAL REPORTS
    // ----------------------------------------------------
    async renderReports(area) {
      try {
        const res = await EBA_API.admin.getReports('30d');
        const summary = res.summary || {};
        const topProducts = res.topProducts || [];
        const paymentMethods = res.paymentMethods || [];
        const inv = res.inventorySnapshot || {};

        area.innerHTML = `
          <div class="space-y-8">
            <!-- Filter Strip -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Financial Performance & Valuation</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Accurate real-time transaction figures calculated from active database ledgers.</p>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="adminApp.switchReportsRange('today')" class="btn-secondary py-1.5 px-3 text-xs bg-white">Today</button>
                <button onclick="adminApp.switchReportsRange('7d')" class="btn-secondary py-1.5 px-3 text-xs bg-white">Last 7d</button>
                <button onclick="adminApp.switchReportsRange('30d')" class="btn-primary py-1.5 px-3 text-xs">Last 30d</button>
                <button onclick="adminApp.switchReportsRange('all')" class="btn-secondary py-1.5 px-3 text-xs bg-white">All Time</button>
              </div>
            </div>

            <!-- Financial Metrics Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-1">
                <span class="font-label-sm text-secondary uppercase">Gross Sales Revenue</span>
                <p class="font-headline-sm text-3xl text-primary font-bold">PKR ${(summary.total_revenue || 0).toLocaleString()}</p>
                <span class="text-[11px] text-on-surface-variant">Total net realized volume</span>
              </div>

              <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-1">
                <span class="font-label-sm text-secondary uppercase">Average Order Value</span>
                <p class="font-headline-sm text-3xl text-primary font-bold">PKR ${(summary.aov || 0).toLocaleString()}</p>
                <span class="text-[11px] text-on-surface-variant">Average spend per client</span>
              </div>

              <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-1">
                <span class="font-label-sm text-secondary uppercase">Warehouse Retail Valuation</span>
                <p class="font-headline-sm text-3xl text-primary font-bold">PKR ${(inv.inventory_retail_value || 0).toLocaleString()}</p>
                <span class="text-[11px] text-on-surface-variant">Gross retail stock worth</span>
              </div>

              <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-1">
                <span class="font-label-sm text-secondary uppercase">Estimated Inventory Cost</span>
                <p class="font-headline-sm text-3xl text-primary font-bold">PKR ${(inv.inventory_cost_value || 0).toLocaleString()}</p>
                <span class="text-[11px] text-on-surface-variant">Wholesale loom investment</span>
              </div>
            </div>

            <!-- Top Products & Payment Breakdown -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div class="lg:col-span-8 bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <h3 class="font-headline-sm uppercase text-primary text-lg pb-3 border-b border-surface-container-high">High Revenue Generating Pieces</h3>
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase">
                      <th class="pb-3">Product Name</th>
                      <th class="pb-3">SKU</th>
                      <th class="pb-3">Units Sold</th>
                      <th class="pb-3 text-right">Gross Total</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-surface-container-high">
                    ${topProducts.map(tp => `
                      <tr class="hover:bg-surface-container-low transition-colors">
                        <td class="py-3 font-semibold text-primary">${tp.product_name}</td>
                        <td class="py-3 font-mono text-on-surface-variant">${tp.sku}</td>
                        <td class="py-3 font-semibold text-secondary">${tp.units_sold} cuts</td>
                        <td class="py-3 text-right font-bold text-primary">PKR ${tp.gross_revenue.toLocaleString()}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>

              <div class="lg:col-span-4 bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <h3 class="font-headline-sm uppercase text-primary text-lg pb-3 border-b border-surface-container-high">Payment Channels</h3>
                <div class="space-y-3">
                  ${paymentMethods.map(pm => `
                    <div class="p-3 bg-surface-container-low border border-surface-container-high flex items-center justify-between text-xs">
                      <div>
                        <span class="font-semibold text-primary block uppercase">${pm.payment_method === 'cod' ? 'Cash on Delivery' : 'Direct Bank Wire'}</span>
                        <span class="text-on-surface-variant text-[11px]">${pm.order_count} transactions</span>
                      </div>
                      <span class="font-bold text-primary">PKR ${pm.revenue.toLocaleString()}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render reports error:', err);
      }
    },

    async switchReportsRange(range) {
      try {
        const area = document.getElementById('admin-content-area');
        const res = await EBA_API.admin.getReports(range);
        await this.renderReports(area);
        EBA_API.showToast(`Reports updated for ${range}`);
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 10. ADMIN USERS & ROLES
    // ----------------------------------------------------
    async renderUsers(area) {
      try {
        const res = await EBA_API.admin.getUsers();
        const users = res.users || [];

        area.innerHTML = `
          <div class="space-y-6">
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Staff & Role Privileges</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Manage administrative team members and server-side RBAC authorizations.</p>
              </div>
              <button onclick="adminApp.openAddUserModal()" class="btn-primary py-2.5 px-4 text-xs">
                <span class="material-symbols-outlined text-[16px]">add</span>
                <span>Add Admin Staff</span>
              </button>
            </div>

            <div class="bg-surface-container-lowest border border-surface-container-high overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container-high font-label-sm text-on-surface-variant uppercase tracking-wider">
                    <th class="p-4">Name</th>
                    <th class="p-4">Email</th>
                    <th class="p-4">Role</th>
                    <th class="p-4">Status</th>
                    <th class="p-4">Created</th>
                    <th class="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-surface-container-high">
                  ${users.map(u => `
                    <tr class="hover:bg-surface-container-low transition-colors">
                      <td class="p-4 font-semibold text-primary">${u.name}</td>
                      <td class="p-4 text-on-surface-variant">${u.email}</td>
                      <td class="p-4">
                        <span class="badge-status ${u.role === 'superadmin' ? 'badge-dark' : 'badge-gold'}">
                          ${u.role}
                        </span>
                      </td>
                      <td class="p-4">
                        <span class="badge-status bg-emerald-100 text-emerald-800">${u.status}</span>
                      </td>
                      <td class="p-4 text-on-surface-variant">${new Date(u.created_at).toLocaleDateString()}</td>
                      <td class="p-4 text-right">
                        ${u.email !== 'ahmedthor33@gmail.com' ? `
                          <button onclick="adminApp.deleteAdminUser(${u.id})" class="text-outline hover:text-red-700 p-1">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        ` : '<span class="text-secondary text-[11px] font-semibold tracking-wider uppercase">Owner & Super Admin</span>'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render users error:', err);
      }
    },

    openAddUserModal() {
      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">New Admin Staff Member</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveNewAdminUser(event)" class="space-y-4 text-xs">
          <div>
            <label class="font-label-sm uppercase block mb-1">Full Name *</label>
            <input type="text" id="usr-name" required placeholder="Staff Member Name" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Email Address *</label>
            <input type="email" id="usr-email" required placeholder="member@ebafashion.pk" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Role *</label>
            <select id="usr-role" class="form-input text-xs">
              <option value="staff">Staff (Inventory & Orders)</option>
              <option value="admin">Admin (Full Store Management)</option>
              <option value="superadmin">Super Admin (All Privileges)</option>
            </select>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Security Password *</label>
            <input type="password" id="usr-pass" required placeholder="••••••••" class="form-input text-xs"/>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Create Account</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async saveNewAdminUser(e) {
      e.preventDefault();
      try {
        await EBA_API.admin.createUser({
          name: document.getElementById('usr-name').value,
          email: document.getElementById('usr-email').value,
          role: document.getElementById('usr-role').value,
          password: document.getElementById('usr-pass').value
        });
        EBA_API.showToast('Admin staff account created');
        this.closeModal();
        this.renderUsers(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async deleteAdminUser(id) {
      if (!confirm('Remove this administrative staff member?')) return;
      try {
        await EBA_API.admin.deleteUser(id);
        EBA_API.showToast('Staff member removed');
        this.renderUsers(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 11. STORE SETTINGS
    // ----------------------------------------------------
    async renderSettings(area) {
      try {
        const res = await EBA_API.admin.getSettings();
        const settings = res.settings || {};

        const gen = settings.general || {};
        const ship = settings.shipping || {};
        const pay = settings.payments || {};

        area.innerHTML = `
          <div class="space-y-8">
            <!-- Supabase Cloud Integration -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-surface-container-high gap-2">
                <div>
                  <h3 class="font-headline-sm uppercase text-primary text-base">Supabase Cloud Backend</h3>
                  <p class="font-body-sm text-on-surface-variant text-xs">Managed PostgreSQL, Cloud Auth, and Scalable Storage.</p>
                </div>
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-semibold w-fit">
                  <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active & Connected
                </span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Project Reference ID</label>
                  <input type="text" readonly value="ydycwzcfptlbfvzbyzlb" class="form-input text-xs bg-surface-container-low font-mono text-primary font-semibold"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">API Base URL</label>
                  <input type="text" readonly value="https://ydycwzcfptlbfvzbyzlb.supabase.co" class="form-input text-xs bg-surface-container-low font-mono text-primary"/>
                </div>
              </div>
              <div class="p-4 bg-surface-container-low border border-surface-container-high space-y-2 text-xs">
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-primary">Turnkey SQL Migration File:</span>
                  <span class="font-mono text-secondary text-[11px]">supabase/setup.sql (460 lines)</span>
                </div>
                <p class="text-on-surface-variant">Contains the complete PostgreSQL schema (17 tables, foreign keys, RLS security policies, and pre-seeded Pakistani unstitched products).</p>
                <div class="flex flex-wrap gap-3 pt-2">
                  <a href="https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb/sql/new" target="_blank" class="btn-primary py-2 px-4 text-xs">
                    <span>Open Supabase SQL Editor</span>
                    <span class="material-symbols-outlined text-[14px]">launch</span>
                  </a>
                  <a href="https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb" target="_blank" class="btn-secondary py-2 px-4 text-xs bg-white">
                    <span>Project Dashboard</span>
                    <span class="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              </div>
            </div>

            <!-- General Settings -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <h3 class="font-headline-sm uppercase text-primary text-base pb-3 border-b border-surface-container-high">General Atelier Information</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Store Name</label>
                  <input type="text" id="set-storename" value="${gen.store_name || 'EBA Fashion Studio'}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Concierge Email</label>
                  <input type="email" id="set-email" value="${gen.email || 'concierge@ebafashion.pk'}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">WhatsApp Concierge Phone</label>
                  <input type="text" id="set-phone" value="${gen.whatsapp || '0325-4473333'}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Flagship Salon Address</label>
                  <input type="text" id="set-address" value="${gen.address || 'Gulberg III, Lahore, Pakistan'}" class="form-input text-xs"/>
                </div>
              </div>
              <button onclick="adminApp.saveGeneralSettings()" class="btn-primary py-2 px-6 text-xs">Save General Info</button>
            </div>

            <!-- Shipping Settings -->
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
              <h3 class="font-headline-sm uppercase text-primary text-base pb-3 border-b border-surface-container-high">Logistics & Shipping Thresholds</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label class="font-label-sm uppercase block mb-1">Standard Domestic Shipping Fee (PKR)</label>
                  <input type="number" id="set-ship-fee" value="${ship.standard_fee || 250}" class="form-input text-xs"/>
                </div>
                <div>
                  <label class="font-label-sm uppercase block mb-1">Complimentary Shipping Threshold (PKR)</label>
                  <input type="number" id="set-ship-thresh" value="${ship.free_shipping_threshold || 5000}" class="form-input text-xs"/>
                </div>
              </div>
              <button onclick="adminApp.saveShippingSettings()" class="btn-primary py-2 px-6 text-xs">Save Shipping Policies</button>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render settings error:', err);
      }
    },

    async saveGeneralSettings() {
      try {
        await EBA_API.admin.updateSettings('general', {
          store_name: document.getElementById('set-storename').value,
          email: document.getElementById('set-email').value,
          whatsapp: document.getElementById('set-phone').value,
          phone: document.getElementById('set-phone').value,
          address: document.getElementById('set-address').value
        });
        EBA_API.showToast('General store information updated');
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async saveShippingSettings() {
      try {
        await EBA_API.admin.updateSettings('shipping', {
          standard_fee: Number(document.getElementById('set-ship-fee').value),
          free_shipping_threshold: Number(document.getElementById('set-ship-thresh').value)
        });
        EBA_API.showToast('Shipping settings saved');
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 12. SHIPPING & LOGISTICS ZONES MANAGEMENT
    // ----------------------------------------------------
    async renderShippingZones(area) {
      try {
        const zones = await EBA_API.admin.getShippingZones();

        area.innerHTML = `
          <div class="space-y-6">
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Domestic & International Shipping Zones</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Configure destination corridors, flat delivery tariffs, free shipping order thresholds, and assigned couriers.</p>
              </div>
              <button onclick="adminApp.openAddShippingZoneModal()" class="btn-primary py-2.5 px-4 text-xs shrink-0">
                <span class="material-symbols-outlined text-[16px]">add</span>
                <span>Create Shipping Zone</span>
              </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              ${zones.map(z => `
                <div class="bg-surface-container-lowest border ${z.is_active !== false ? 'border-surface-container-high' : 'border-red-300 opacity-70'} p-6 space-y-4 flex flex-col justify-between hover:shadow-lg transition-all">
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <span class="font-label-lg uppercase tracking-wider text-primary font-bold text-sm">${z.name}</span>
                      <span class="badge-status ${z.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-200 text-neutral-700'}">
                        ${z.is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    <p class="font-label-sm uppercase tracking-widest text-secondary text-[11px] mb-3">
                      Courier Partner: ${z.courier || 'TCS Express'} • ${z.delivery_time || '2-4 Days'}
                    </p>

                    <div class="p-3 bg-surface-container-low border border-surface-container-high text-xs space-y-1.5 mb-4">
                      <div class="flex justify-between">
                        <span class="text-on-surface-variant">Standard Rate:</span>
                        <span class="font-bold text-primary">PKR ${(z.rate || 0).toLocaleString()}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-on-surface-variant">Free Delivery Above:</span>
                        <span class="font-bold text-secondary">PKR ${(z.free_threshold || 5000).toLocaleString()}</span>
                      </div>
                    </div>

                    <div>
                      <span class="font-label-sm uppercase text-[10px] text-on-surface-variant block mb-1 font-semibold">Covered Destinations / Cities:</span>
                      <div class="flex flex-wrap gap-1.5">
                        ${(Array.isArray(z.cities) ? z.cities : String(z.cities || '').split(',')).map(c => `
                          <span class="px-2 py-0.5 bg-surface text-primary border border-surface-container-high text-[11px]">
                            ${c.trim()}
                          </span>
                        `).join('')}
                      </div>
                    </div>
                  </div>

                  <div class="pt-4 border-t border-surface-container-high flex items-center justify-between">
                    <button onclick="adminApp.toggleShippingZoneActive('${z.id}')" class="text-xs font-semibold ${z.is_active !== false ? 'text-amber-700 hover:underline' : 'text-emerald-700 hover:underline'}">
                      ${z.is_active !== false ? 'Pause Zone' : 'Activate Zone'}
                    </button>
                    <div class="flex items-center gap-2">
                      <button onclick="adminApp.openEditShippingZoneModal('${z.id}')" class="p-1 hover:bg-surface-container rounded" title="Edit Zone">
                        <span class="material-symbols-outlined text-[18px] text-primary">edit</span>
                      </button>
                      <button onclick="adminApp.deleteShippingZone('${z.id}')" class="p-1 hover:bg-surface-container rounded text-red-600" title="Delete Zone">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render shipping zones error:', err);
      }
    },

    async openAddShippingZoneModal() {
      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">New Shipping & Delivery Zone</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveShippingZone(event, null)" class="space-y-4 text-xs">
          <div>
            <label class="font-label-sm uppercase block mb-1">Zone Title *</label>
            <input type="text" id="sz-name" required placeholder="e.g. Major Metros Express" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Covered Cities (Comma-separated) *</label>
            <input type="text" id="sz-cities" required placeholder="Karachi, Lahore, Islamabad, Rawalpindi" class="form-input text-xs"/>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="font-label-sm uppercase block mb-1">Standard Rate (PKR) *</label>
              <input type="number" id="sz-rate" required placeholder="250" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Free Delivery Spend Threshold (PKR) *</label>
              <input type="number" id="sz-threshold" required placeholder="5000" class="form-input text-xs"/>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="font-label-sm uppercase block mb-1">Estimated Delivery Time *</label>
              <input type="text" id="sz-time" required placeholder="1 - 2 Business Days" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Courier Partner *</label>
              <select id="sz-courier" class="form-input text-xs">
                <option value="TCS Express">TCS Express</option>
                <option value="Leopards Courier">Leopards Courier</option>
                <option value="DHL Express Worldwide">DHL Express Worldwide</option>
                <option value="Trax Logistics">Trax Logistics</option>
                <option value="M&P Courier">M&P Courier</option>
              </select>
            </div>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Save Shipping Zone</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async openEditShippingZoneModal(id) {
      const zones = await EBA_API.admin.getShippingZones();
      const z = zones.find(item => item.id === id);
      if (!z) return;

      const modalContent = document.getElementById('admin-modal-content');
      modalContent.innerHTML = `
        <div class="flex items-center justify-between pb-3 border-b border-surface-container-high mb-4">
          <h2 class="font-headline-sm uppercase text-primary">Edit Shipping Zone: ${z.name}</h2>
          <button onclick="adminApp.closeModal()"><span class="material-symbols-outlined">close</span></button>
        </div>
        <form onsubmit="adminApp.saveShippingZone(event, '${z.id}')" class="space-y-4 text-xs">
          <div>
            <label class="font-label-sm uppercase block mb-1">Zone Title *</label>
            <input type="text" id="sz-name" required value="${z.name}" class="form-input text-xs"/>
          </div>
          <div>
            <label class="font-label-sm uppercase block mb-1">Covered Cities (Comma-separated) *</label>
            <input type="text" id="sz-cities" required value="${Array.isArray(z.cities) ? z.cities.join(', ') : z.cities}" class="form-input text-xs"/>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="font-label-sm uppercase block mb-1">Standard Rate (PKR) *</label>
              <input type="number" id="sz-rate" required value="${z.rate}" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Free Delivery Spend Threshold (PKR) *</label>
              <input type="number" id="sz-threshold" required value="${z.free_threshold}" class="form-input text-xs"/>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="font-label-sm uppercase block mb-1">Estimated Delivery Time *</label>
              <input type="text" id="sz-time" required value="${z.delivery_time}" class="form-input text-xs"/>
            </div>
            <div>
              <label class="font-label-sm uppercase block mb-1">Courier Partner *</label>
              <select id="sz-courier" class="form-input text-xs">
                <option value="TCS Express" ${z.courier === 'TCS Express' ? 'selected' : ''}>TCS Express</option>
                <option value="Leopards Courier" ${z.courier === 'Leopards Courier' ? 'selected' : ''}>Leopards Courier</option>
                <option value="DHL Express Worldwide" ${z.courier === 'DHL Express Worldwide' ? 'selected' : ''}>DHL Express Worldwide</option>
                <option value="Trax Logistics" ${z.courier === 'Trax Logistics' ? 'selected' : ''}>Trax Logistics</option>
                <option value="M&P Courier" ${z.courier === 'M&P Courier' ? 'selected' : ''}>M&P Courier</option>
              </select>
            </div>
          </div>
          <div class="pt-3 flex justify-end gap-3">
            <button type="button" onclick="adminApp.closeModal()" class="btn-secondary px-4 py-2">Cancel</button>
            <button type="submit" class="btn-primary px-6 py-2">Save Zone Changes</button>
          </div>
        </form>
      `;
      this.openModal();
    },

    async saveShippingZone(e, existingId) {
      e.preventDefault();
      try {
        const zones = await EBA_API.admin.getShippingZones();
        const citiesRaw = document.getElementById('sz-cities').value;
        const cities = citiesRaw.split(',').map(c => c.trim()).filter(Boolean);

        const zoneData = {
          id: existingId || ('zone-' + Date.now().toString(36)),
          name: document.getElementById('sz-name').value,
          cities,
          rate: Number(document.getElementById('sz-rate').value),
          free_threshold: Number(document.getElementById('sz-threshold').value),
          delivery_time: document.getElementById('sz-time').value,
          courier: document.getElementById('sz-courier').value,
          is_active: true
        };

        let updatedZones = [];
        if (existingId) {
          updatedZones = zones.map(z => z.id === existingId ? { ...z, ...zoneData } : z);
        } else {
          updatedZones = [...zones, zoneData];
        }

        await EBA_API.admin.saveShippingZones(updatedZones);
        EBA_API.showToast('Shipping zone updated successfully');
        this.closeModal();
        this.renderShippingZones(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async toggleShippingZoneActive(id) {
      try {
        const zones = await EBA_API.admin.getShippingZones();
        const updatedZones = zones.map(z => z.id === id ? { ...z, is_active: !z.is_active } : z);
        await EBA_API.admin.saveShippingZones(updatedZones);
        EBA_API.showToast('Zone status toggled');
        this.renderShippingZones(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async deleteShippingZone(id) {
      if (!confirm('Are you sure you wish to delete this shipping zone?')) return;
      try {
        const zones = await EBA_API.admin.getShippingZones();
        const updatedZones = zones.filter(z => z.id !== id);
        await EBA_API.admin.saveShippingZones(updatedZones);
        EBA_API.showToast('Shipping zone removed');
        this.renderShippingZones(document.getElementById('admin-content-area'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // 13. PAKISTANI PAYMENT GATEWAYS (BANK, COD, JAZZCASH, EASYPAISA)
    // ----------------------------------------------------
    async renderPayments(area) {
      try {
        const payments = await EBA_API.admin.getPaymentGateways();
        const cod = payments.cod || {
          enabled: true,
          title: 'Cash on Delivery (COD)',
          handling_fee: 0,
          max_amount: 75000,
          description: 'Pay with physical cash upon doorstep delivery anywhere in Pakistan via TCS / Leopards.'
        };
        const bank = payments.bank_transfer || {
          enabled: true,
          title: 'Direct Bank Wire / Online IBAN Transfer',
          bank_name: 'Meezan Bank Ltd',
          account_title: 'EBA Fashion Studio Pvt Ltd',
          account_number: '01000948210001',
          iban: 'PK64MEZN0001000948210001',
          branch: 'Gulberg III Main Boulevard Flagship, Lahore',
          instructions: 'Please transfer invoice total to verified Meezan Bank and send receipt to WhatsApp 0325-4473333.'
        };
        const jazz = payments.jazzcash || {
          enabled: true,
          title: 'JazzCash Mobile Wallet & Direct Pay',
          merchant_id: '03001234567',
          merchant_name: 'EBA FASHION STUDIO',
          account_number: '0300 1234567',
          instructions: 'Send payment via JazzCash App or dial *786# to Till 0300 1234567.'
        };
        const easy = payments.easypaisa || {
          enabled: true,
          title: 'Easypaisa Mobile Wallet & QR Pay',
          till_id: '78491',
          account_title: 'EBA FASHION STUDIO',
          account_number: '0321 8456789',
          instructions: 'Send payment via Easypaisa App to Mobile Account: 0321 8456789.'
        };

        area.innerHTML = `
          <div class="space-y-6">
            <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 class="font-headline-sm uppercase text-primary text-lg">Pakistani Payment Channels</h3>
                <p class="font-body-sm text-on-surface-variant text-xs">Configure online bank accounts, mobile wallets (JazzCash, Easypaisa), and Cash on Delivery with real-time cloud synchronization.</p>
              </div>
              <button onclick="adminApp.saveAllPayments(event)" class="btn-save-payments btn-primary py-2.5 px-6 text-xs shrink-0 flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">save</span>
                <span>Save All Payment Settings</span>
              </button>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <!-- 1. Cash on Delivery (COD) -->
              <div class="bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <span class="material-symbols-outlined text-[18px]">payments</span>
                    </div>
                    <div>
                      <h4 class="font-headline-sm uppercase text-primary text-sm">1. Cash on Delivery (COD)</h4>
                      <span class="text-[11px] text-on-surface-variant">Doorstep physical cash collection via TCS courier</span>
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input type="checkbox" id="pay-cod-enabled" ${cod.enabled ? 'checked' : ''} class="custom-checkbox"/>
                    <span>Enabled</span>
                  </label>
                </div>

                <div class="space-y-3 text-xs">
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Display Title</label>
                    <input type="text" id="pay-cod-title" value="${cod.title || 'Cash on Delivery (COD)'}" class="form-input text-xs"/>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="font-label-sm uppercase block mb-1">COD Handling Surcharge (PKR)</label>
                      <input type="number" id="pay-cod-fee" value="${cod.handling_fee !== undefined ? cod.handling_fee : 0}" class="form-input text-xs"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Maximum Order Limit (PKR)</label>
                      <input type="number" id="pay-cod-max" value="${cod.max_amount !== undefined ? cod.max_amount : 75000}" class="form-input text-xs"/>
                    </div>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Customer Checkout Description</label>
                    <textarea id="pay-cod-desc" rows="2" class="form-input text-xs">${cod.description || 'Pay cash directly to the courier upon doorstep delivery and physical inspection.'}</textarea>
                  </div>
                </div>
              </div>

              <!-- 2. Direct Bank Wire / IBAN -->
              <div class="bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      <span class="material-symbols-outlined text-[18px]">account_balance</span>
                    </div>
                    <div>
                      <h4 class="font-headline-sm uppercase text-primary text-sm">2. Direct Bank Transfer / IBAN</h4>
                      <span class="text-[11px] text-on-surface-variant">Online interbank wire via 1Link (Meezan / HBL / Alfalah)</span>
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input type="checkbox" id="pay-bank-enabled" ${bank.enabled ? 'checked' : ''} class="custom-checkbox"/>
                    <span>Enabled</span>
                  </label>
                </div>

                <div class="space-y-3 text-xs">
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Gateway Display Title</label>
                    <input type="text" id="pay-bank-title" value="${bank.title || 'Direct Bank Wire / Online IBAN Transfer'}" class="form-input text-xs"/>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Bank Name *</label>
                      <input type="text" id="pay-bank-name" value="${bank.bank_name || 'Meezan Bank Ltd'}" class="form-input text-xs"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Account Title *</label>
                      <input type="text" id="pay-bank-account-title" value="${bank.account_title || 'EBA Fashion Studio Pvt Ltd'}" class="form-input text-xs"/>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Account Number</label>
                      <input type="text" id="pay-bank-acc" value="${bank.account_number || '01000948210001'}" class="form-input text-xs font-mono"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase block mb-1">IBAN *</label>
                      <input type="text" id="pay-bank-iban" value="${bank.iban || 'PK64MEZN0001000948210001'}" class="form-input text-xs font-mono font-bold"/>
                    </div>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Branch Name & City</label>
                    <input type="text" id="pay-bank-branch" value="${bank.branch || 'Gulberg III Main Boulevard Flagship, Lahore'}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Client Transfer Instructions</label>
                    <textarea id="pay-bank-inst" rows="2" class="form-input text-xs">${bank.instructions || 'Transfer funds to our verified account and send transaction slip to WhatsApp 0325-4473333.'}</textarea>
                  </div>
                </div>
              </div>

              <!-- 3. JazzCash Mobile Account -->
              <div class="bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-red-100 text-red-800 flex items-center justify-center font-bold">
                      <span class="material-symbols-outlined text-[18px]">smartphone</span>
                    </div>
                    <div>
                      <h4 class="font-headline-sm uppercase text-primary text-sm">3. JazzCash Mobile Wallet</h4>
                      <span class="text-[11px] text-on-surface-variant">Merchant Till & Mobile Account (*786# / App)</span>
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input type="checkbox" id="pay-jazz-enabled" ${jazz.enabled ? 'checked' : ''} class="custom-checkbox"/>
                    <span>Enabled</span>
                  </label>
                </div>

                <div class="space-y-3 text-xs">
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Gateway Display Title</label>
                    <input type="text" id="pay-jazz-title" value="${jazz.title || 'JazzCash Mobile Wallet & Direct Pay'}" class="form-input text-xs"/>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="font-label-sm uppercase block mb-1">JazzCash Mobile / Account # *</label>
                      <input type="text" id="pay-jazz-acc" value="${jazz.account_number || '0300 1234567'}" class="form-input text-xs font-mono font-bold"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Merchant Till ID / Number</label>
                      <input type="text" id="pay-jazz-merchant-id" value="${jazz.merchant_id || jazz.account_number || '0300 1234567'}" class="form-input text-xs font-mono"/>
                    </div>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Merchant Title / Account Name</label>
                    <input type="text" id="pay-jazz-name" value="${jazz.merchant_name || 'EBA FASHION STUDIO'}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Checkout Customer Instructions</label>
                    <textarea id="pay-jazz-inst" rows="2" class="form-input text-xs">${jazz.instructions || 'Send total via JazzCash App or dial *786# to Till 0300 1234567. Include Docket # in remarks.'}</textarea>
                  </div>
                </div>
              </div>

              <!-- 4. Easypaisa Mobile Account -->
              <div class="bg-surface-container-lowest border border-surface-container-high p-6 space-y-4">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                      <span class="material-symbols-outlined text-[18px]">qr_code_2</span>
                    </div>
                    <div>
                      <h4 class="font-headline-sm uppercase text-primary text-sm">4. Easypaisa Mobile Wallet</h4>
                      <span class="text-[11px] text-on-surface-variant">Mobile Account & Telenor Microfinance Pay</span>
                    </div>
                  </div>
                  <label class="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input type="checkbox" id="pay-easy-enabled" ${easy.enabled ? 'checked' : ''} class="custom-checkbox"/>
                    <span>Enabled</span>
                  </label>
                </div>

                <div class="space-y-3 text-xs">
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Gateway Display Title</label>
                    <input type="text" id="pay-easy-title" value="${easy.title || 'Easypaisa Mobile Wallet & QR Pay'}" class="form-input text-xs"/>
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Easypaisa Mobile # *</label>
                      <input type="text" id="pay-easy-acc" value="${easy.account_number || '0321 8456789'}" class="form-input text-xs font-mono font-bold"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase block mb-1">Till ID (Optional)</label>
                      <input type="text" id="pay-easy-till-id" value="${easy.till_id || '78491'}" class="form-input text-xs font-mono"/>
                    </div>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Account Title / Merchant Name</label>
                    <input type="text" id="pay-easy-name" value="${easy.account_title || 'EBA FASHION STUDIO'}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase block mb-1">Checkout Customer Instructions</label>
                    <textarea id="pay-easy-inst" rows="2" class="form-input text-xs">${easy.instructions || 'Send payment via Easypaisa App to Mobile Account: 0321 8456789. Save 3737 transaction SMS.'}</textarea>
                  </div>
                </div>
              </div>

            </div>

            <!-- Bottom Persistent Action Bar -->
            <div class="bg-surface-container-lowest p-4 border border-surface-container-high flex flex-col sm:flex-row items-center justify-between gap-3">
              <span class="text-xs text-on-surface-variant flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-secondary">cloud_done</span>
                <span>Configured settings synchronize instantly across Hostinger frontend and PostgreSQL cloud.</span>
              </span>
              <button onclick="adminApp.saveAllPayments(event)" class="btn-save-payments btn-primary py-2.5 px-6 text-xs flex items-center gap-2">
                <span class="material-symbols-outlined text-[16px]">save</span>
                <span>Save All Payment Settings</span>
              </button>
            </div>
          </div>
        `;
      } catch (err) {
        console.error('Render payments error:', err);
        area.innerHTML = `
          <div class="p-8 text-center bg-surface-container-lowest border border-error/20">
            <span class="material-symbols-outlined text-error text-3xl mb-2">error</span>
            <p class="text-xs text-on-surface-variant font-semibold">Failed to load payment channel configurations.</p>
            <p class="text-[11px] text-error mt-1">${err.message}</p>
            <button onclick="adminApp.renderPayments(document.getElementById('admin-content-area'))" class="btn-secondary py-1.5 px-4 text-xs mt-4">Retry</button>
          </div>
        `;
      }
    },

    async saveAllPayments(event) {
      if (event && event.preventDefault) event.preventDefault();
      
      const saveBtns = document.querySelectorAll('.btn-save-payments');
      saveBtns.forEach(btn => {
        btn.disabled = true;
        btn.dataset.prevHtml = btn.innerHTML;
        btn.innerHTML = `<span class="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span><span>Saving Settings...</span>`;
      });

      const getVal = (id, def = '') => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : def;
      };
      const getNum = (id, def = 0) => {
        const el = document.getElementById(id);
        const n = Number(el ? el.value : def);
        return isNaN(n) ? def : n;
      };
      const getChecked = (id, def = false) => {
        const el = document.getElementById(id);
        return el ? el.checked : def;
      };

      try {
        const payments = {
          cod: {
            enabled: getChecked('pay-cod-enabled', true),
            title: getVal('pay-cod-title', 'Cash on Delivery (COD)'),
            handling_fee: getNum('pay-cod-fee', 0),
            max_amount: getNum('pay-cod-max', 75000),
            description: getVal('pay-cod-desc', 'Pay cash directly to the courier upon doorstep delivery.')
          },
          bank_transfer: {
            enabled: getChecked('pay-bank-enabled', true),
            title: getVal('pay-bank-title', 'Direct Bank Wire / Online IBAN Transfer'),
            bank_name: getVal('pay-bank-name', 'Meezan Bank Ltd'),
            account_title: getVal('pay-bank-account-title', 'EBA Fashion Studio Pvt Ltd'),
            account_number: getVal('pay-bank-acc', '01000948210001'),
            iban: getVal('pay-bank-iban', 'PK64MEZN0001000948210001'),
            branch: getVal('pay-bank-branch', 'Gulberg III Main Boulevard Flagship, Lahore'),
            instructions: getVal('pay-bank-inst', 'Transfer funds to our verified account and WhatsApp receipt.')
          },
          jazzcash: {
            enabled: getChecked('pay-jazz-enabled', true),
            title: getVal('pay-jazz-title', 'JazzCash Mobile Wallet & Direct Pay'),
            merchant_id: getVal('pay-jazz-merchant-id', getVal('pay-jazz-acc', '0300 1234567')),
            merchant_name: getVal('pay-jazz-name', 'EBA FASHION STUDIO'),
            account_number: getVal('pay-jazz-acc', '0300 1234567'),
            instructions: getVal('pay-jazz-inst', 'Send total via JazzCash App or dial *786#.')
          },
          easypaisa: {
            enabled: getChecked('pay-easy-enabled', true),
            title: getVal('pay-easy-title', 'Easypaisa Mobile Wallet & QR Pay'),
            till_id: getVal('pay-easy-till-id', '78491'),
            account_title: getVal('pay-easy-name', 'EBA FASHION STUDIO'),
            account_number: getVal('pay-easy-acc', '0321 8456789'),
            instructions: getVal('pay-easy-inst', 'Send payment via Easypaisa App to Mobile Account.')
          }
        };

        await EBA_API.admin.savePaymentGateways(payments);
        EBA_API.showToast('All 4 Pakistani Payment Gateways updated successfully');

        // Refresh UI state to ensure saved values are cleanly reflected
        const area = document.getElementById('admin-content-area');
        if (area && this.state.currentSection === 'payments') {
          await this.renderPayments(area);
        }
      } catch (err) {
        console.error('Save payments error:', err);
        EBA_API.showToast(err.message || 'Failed to save payment gateway settings', 'error');
      } finally {
        saveBtns.forEach(btn => {
          btn.disabled = false;
          if (btn.dataset.prevHtml) btn.innerHTML = btn.dataset.prevHtml;
        });
      }
    },

    // ----------------------------------------------------
    // 14. DRAG & DROP MULTI-IMAGE UPLOADER & REORDERING
    // ----------------------------------------------------
    handleDragOver(e, el) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.add('border-primary', 'bg-surface-container-high');
    },

    handleDragLeave(e, el) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('border-primary', 'bg-surface-container-high');
    },

    async handleDrop(e, targetType) {
      e.preventDefault();
      e.stopPropagation();
      const dropZone = e.currentTarget;
      if (dropZone) dropZone.classList.remove('border-primary', 'bg-surface-container-high');

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await this.processImageFiles(files, targetType);
      }
    },

    async handleFileSelect(e, targetType) {
      const files = e.target.files;
      if (files && files.length > 0) {
        await this.processImageFiles(files, targetType);
      }
    },

    async processImageFiles(files, targetType) {
      try {
        EBA_API.showToast('Processing visual assets...', 'info');
        const res = await EBA_API.admin.uploadImages(files);
        const urls = res.urls || (res.url ? [res.url] : []);

        if (targetType === 'product') {
          urls.forEach(u => {
            this.state.currentModalImages.push({
              image_url: u,
              image_type: this.state.currentModalImages.length === 0 ? 'primary' : 'gallery',
              is_primary: this.state.currentModalImages.length === 0 ? 1 : 0
            });
          });
          this.renderProductModalImages();
          EBA_API.showToast(`Uploaded ${urls.length} product visual(s)`);
        } else if (targetType.startsWith('cms-')) {
          const fieldId = targetType.replace('cms-', 'cms-img-');
          const inputEl = document.getElementById(fieldId);
          const previewEl = document.getElementById(fieldId + '-preview');
          if (inputEl && urls[0]) {
            inputEl.value = urls[0];
          }
          if (previewEl && urls[0]) {
            previewEl.src = urls[0];
          }
          EBA_API.showToast('Visual asset attached to preview. Click "Save" below to apply to storefront.');
        }
      } catch (err) {
        EBA_API.showToast(err.message || 'Image processing error', 'error');
      }
    },

    handleCmsImageUrlChange(targetType, url) {
      const fieldId = targetType.startsWith('cms-img-') ? targetType : targetType.replace('cms-', 'cms-img-');
      const previewEl = document.getElementById(fieldId + '-preview');
      if (previewEl) {
        previewEl.src = (url && url.trim()) ? url.trim() : '/assets/hero_campaign_editorial.png';
      }
    },

    resetCmsImage(targetType, defaultUrl) {
      const fieldId = targetType.startsWith('cms-img-') ? targetType : targetType.replace('cms-', 'cms-img-');
      const inputEl = document.getElementById(fieldId);
      const previewEl = document.getElementById(fieldId + '-preview');
      if (inputEl) inputEl.value = defaultUrl;
      if (previewEl) previewEl.src = defaultUrl;
      EBA_API.showToast('Banner visual reset to original asset. Click Save to persist.');
    },

    addManualProductImage() {
      const input = document.getElementById('manual-image-url');
      if (!input) return;
      const url = (input.value || '').trim();
      if (!url) return;
      this.state.currentModalImages.push({
        image_url: url,
        image_type: this.state.currentModalImages.length === 0 ? 'primary' : 'gallery',
        is_primary: this.state.currentModalImages.length === 0 ? 1 : 0
      });
      input.value = '';
      this.renderProductModalImages();
      EBA_API.showToast('Product visual added to gallery');
    },

    renderProductModalImages() {
      const container = document.getElementById('product-images-grid');
      if (!container) return;

      if (!this.state.currentModalImages || this.state.currentModalImages.length === 0) {
        container.innerHTML = `
          <div class="col-span-full py-3 text-center text-on-surface-variant text-xs italic">
            No visuals attached. Drop files above to upload.
          </div>
        `;
        return;
      }

      container.innerHTML = this.state.currentModalImages.map((img, idx) => `
        <div class="relative group border ${img.is_primary ? 'border-secondary ring-2 ring-secondary/50' : 'border-surface-container-high'} bg-surface-container-lowest p-2 transition-all cursor-move flex flex-col justify-between shadow-sm"
          draggable="true"
          ondragstart="adminApp.handleImageDragStart(event, ${idx})"
          ondragover="event.preventDefault()"
          ondrop="adminApp.handleImageDrop(event, ${idx})">
          
          <div class="relative aspect-[3/4] overflow-hidden bg-black/5 mb-1.5">
            <img src="${img.image_url}" alt="Product visual ${idx+1}" class="w-full h-full object-cover"/>
            ${img.is_primary ? `
              <span class="absolute top-1 left-1 bg-secondary text-on-secondary text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 shadow">
                Primary
              </span>
            ` : ''}
            <span class="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 font-mono">
              #${idx+1}
            </span>
          </div>

          <div class="flex items-center justify-between gap-1 pt-1 border-t border-surface-container-high text-[10px]">
            ${!img.is_primary ? `
              <button type="button" onclick="adminApp.setPrimaryImage(${idx})" class="text-primary hover:text-secondary font-semibold uppercase tracking-wider">
                Set Cover
              </button>
            ` : '<span class="text-secondary font-bold uppercase tracking-wider text-[9px]">Main Cover</span>'}
            <button type="button" onclick="adminApp.removeModalImage(${idx})" class="text-outline hover:text-red-700 p-0.5" title="Remove image">
              <span class="material-symbols-outlined text-[14px]">delete</span>
            </button>
          </div>
        </div>
      `).join('');
    },

    setPrimaryImage(idx) {
      this.state.currentModalImages.forEach((img, i) => {
        img.is_primary = i === idx ? 1 : 0;
        img.image_type = i === idx ? 'primary' : 'gallery';
      });
      const [primaryImg] = this.state.currentModalImages.splice(idx, 1);
      this.state.currentModalImages.unshift(primaryImg);
      this.renderProductModalImages();
      EBA_API.showToast('Primary cover image updated');
    },

    removeModalImage(idx) {
      this.state.currentModalImages.splice(idx, 1);
      if (this.state.currentModalImages.length > 0 && !this.state.currentModalImages.some(i => i.is_primary)) {
        this.state.currentModalImages[0].is_primary = 1;
        this.state.currentModalImages[0].image_type = 'primary';
      }
      this.renderProductModalImages();
    },

    handleImageDragStart(e, idx) {
      this.state.draggedImageIdx = idx;
      e.dataTransfer.effectAllowed = 'move';
    },

    handleImageDrop(e, targetIdx) {
      e.preventDefault();
      const draggedIdx = this.state.draggedImageIdx;
      if (draggedIdx === null || draggedIdx === targetIdx) return;

      const [draggedItem] = this.state.currentModalImages.splice(draggedIdx, 1);
      this.state.currentModalImages.splice(targetIdx, 0, draggedItem);

      this.state.currentModalImages.forEach((img, i) => {
        img.is_primary = i === 0 ? 1 : 0;
        img.image_type = i === 0 ? 'primary' : 'gallery';
      });

      this.state.draggedImageIdx = null;
      this.renderProductModalImages();
      EBA_API.showToast('Visuals reordered');
    },

    // Modal Helpers
    openModal() {
      const modal = document.getElementById('admin-modal');
      if (modal) modal.classList.replace('hidden', 'flex');
    },

    closeModal() {
      const modal = document.getElementById('admin-modal');
      if (modal) modal.classList.replace('flex', 'hidden');
    }
  };

  window.adminApp = adminApp;
  document.addEventListener('DOMContentLoaded', () => adminApp.init());
})();
