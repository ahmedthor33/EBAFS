// EBA Fashion Studio - Storefront Single-Page Experience
(function () {
  const app = {
    state: {
      cms: null,
      settings: null,
      cart: { items: [], subtotal: 0, tailoringTotal: 0, shippingFee: 0, total: 0, itemCount: 0 },
      wishlist: [],
      user: null,
      facets: null,
      currentFilter: {},
      currentView: 'home',
      appliedCoupon: null
    },

    async init() {
      // 1. Load user auth state
      this.state.user = EBA_API.auth.getUser();
      this.updateHeaderAuthUI();

      // 2. Fetch CMS and Settings
      await this.loadCMSAndSettings();

      // 3. Fetch Cart & Wishlist
      await this.refreshCart();
      if (this.state.user) {
        await this.refreshWishlist();
      }

      // 4. Setup Global Listeners
      this.setupGlobalListeners();

      // 5. Initial Route Dispatch
      this.handleRouting();
      window.addEventListener('hashchange', () => this.handleRouting());
    },

    async loadCMSAndSettings() {
      try {
        const data = await EBA_API.cms.get();
        this.state.cms = data.cms || {};
        this.state.settings = data.settings || {};

        // Update Announcement Bar
        if (this.state.cms.announcement_bar) {
          const bar = document.getElementById('top-announcement-bar');
          const text = document.getElementById('announcement-text');
          if (this.state.cms.announcement_bar.enabled === false) {
            bar.classList.add('hidden');
          } else {
            bar.classList.remove('hidden');
            text.textContent = this.state.cms.announcement_bar.text;
          }
        }
      } catch (err) {
        console.warn('Failed to load CMS:', err);
      }
    },

    setupGlobalListeners() {
      // Instant search input
      const searchInput = document.getElementById('store-search-input');
      const previewBox = document.getElementById('search-preview-box');
      let searchTimeout;

      if (searchInput && previewBox) {
        searchInput.addEventListener('input', (e) => {
          clearTimeout(searchTimeout);
          const q = e.target.value.trim();
          if (q.length < 2) {
            previewBox.innerHTML = '';
            previewBox.classList.add('hidden');
            return;
          }

          searchTimeout = setTimeout(async () => {
            try {
              const res = await EBA_API.products.list({ q, limit: 5 });
              if (res.products && res.products.length > 0) {
                previewBox.innerHTML = res.products.map(p => `
                  <a href="#product/${p.slug}" class="flex items-center gap-3 p-3 hover:bg-surface-container-low border-b border-surface-container-high transition-colors">
                    <img src="${p.primary_image}" alt="${p.name}" class="w-10 h-14 object-cover"/>
                    <div class="flex flex-col min-w-0">
                      <span class="font-body-sm font-semibold text-primary truncate">${p.name}</span>
                      <span class="font-label-sm text-secondary">PKR ${(p.sale_price || p.price).toLocaleString()}</span>
                    </div>
                  </a>
                `).join('') + `
                  <a href="#catalog?q=${encodeURIComponent(q)}" class="block p-2 text-center font-label-sm uppercase tracking-wider text-secondary bg-surface-container-low hover:bg-surface-container">
                    View all matching pieces &rarr;
                  </a>
                `;
                previewBox.classList.remove('hidden');
              } else {
                previewBox.innerHTML = `<div class="p-4 text-center font-body-sm text-on-surface-variant">No atelier unstitched weaves match "${q}"</div>`;
                previewBox.classList.remove('hidden');
              }
            } catch (err) {
              console.error(err);
            }
          }, 250);
        });

        // Hide search on outside click
        document.addEventListener('click', (e) => {
          if (!searchInput.contains(e.target) && !previewBox.contains(e.target)) {
            previewBox.classList.add('hidden');
          }
        });

        searchInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const q = searchInput.value.trim();
            if (q) {
              previewBox.classList.add('hidden');
              window.location.hash = `#catalog?q=${encodeURIComponent(q)}`;
            }
          }
        });
      }

      // Mobile search
      const mobileSearch = document.getElementById('mobile-search-input');
      if (mobileSearch) {
        mobileSearch.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const q = mobileSearch.value.trim();
            if (q) {
              this.toggleMobileMenu();
              window.location.hash = `#catalog?q=${encodeURIComponent(q)}`;
            }
          }
        });
      }
    },

    // ----------------------------------------------------
    // ROUTING SYSTEM
    // ----------------------------------------------------
    async handleRouting() {
      const hash = window.location.hash || '#home';
      const [path, queryString] = hash.slice(1).split('?');
      const params = new URLSearchParams(queryString || '');

      // Highlight active nav item
      document.querySelectorAll('#main-nav-links a').forEach(a => {
        const nav = a.getAttribute('data-nav');
        if (nav === path || (path === '' && nav === 'home')) {
          a.className = 'py-2 border-b-2 border-primary text-primary transition-colors';
        } else {
          a.className = 'py-2 border-b-2 border-transparent text-on-surface-variant hover:text-primary hover:border-primary transition-colors';
        }
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });

      const container = document.getElementById('app-view');
      container.innerHTML = `
        <div class="w-full py-32 flex flex-col items-center justify-center gap-4">
          <div class="w-8 h-8 border-2 border-primary border-t-transparent animate-spin"></div>
          <span class="font-label-sm text-secondary uppercase tracking-widest">EBA Atelier Loading...</span>
        </div>
      `;

      if (path === 'home' || path === '') {
        await this.renderHome(container);
      } else if (path === 'men') {
        await this.renderCatalog(container, { category: 'men', title: "Men's Unstitched Atelier" });
      } else if (path === 'women' || path === 'festive-lawn-25') {
        await this.renderCatalog(container, { category: 'women', title: "Women's Haute Couture" });
      } else if (path === 'new-arrivals') {
        await this.renderCatalog(container, { is_featured: '1', title: 'New Unstitched Arrivals' });
      } else if (path === 'sale') {
        await this.renderCatalog(container, { is_sale: '1', title: 'Seasonal Archive & Sale' });
      } else if (path === 'catalog') {
        const cat = params.get('category');
        const q = params.get('q');
        await this.renderCatalog(container, { category: cat, q, title: q ? `Search: "${q}"` : 'Curated Atelier Catalog' });
      } else if (path.startsWith('product/')) {
        const slug = path.replace('product/', '');
        await this.renderProductDetails(container, slug);
      } else if (path === 'cart') {
        await this.renderCartPage(container);
      } else if (path === 'checkout') {
        await this.renderCheckoutPage(container);
      } else if (path.startsWith('order-confirmation/')) {
        const orderNumber = path.replace('order-confirmation/', '');
        await this.renderOrderConfirmation(container, orderNumber);
      } else if (path === 'account') {
        await this.renderAccountPage(container);
      } else if (path === 'wishlist') {
        this.showWishlist();
      } else {
        await this.renderHome(container);
      }
    },

    // ----------------------------------------------------
    // VIEW 1: HOME PAGE
    // ----------------------------------------------------
    async renderHome(container) {
      try {
        const hero = this.state.cms?.hero_banner || {
          tagline: "Unstitched Autumn/Festive ’25 Edition",
          title: "The Art of<br/>Pakistani Weaves",
          subtitle: "Exquisite unstitched fabrics tailored for the discerning connoisseur — Hand-selected Egyptian Cotton, Festive Lawn, and Raw Silk woven across premier Pakistani mills.",
          image: "/assets/hero_campaign_editorial.png",
          badge1: "Complimentary Nationwide Shipping",
          badge2: "Cash on Delivery Available",
          cta_men_text: "Explore Men's Unstitched",
          cta_men_link: "#men",
          cta_women_text: "Explore Women's Couture",
          cta_women_link: "#women"
        };

        const ticker = this.state.cms?.running_ticker || [
          "100% Authentic Thread Counts",
          "Pure Supima & Egyptian Cotton 120s",
          "Master Artisan Embroideries",
          "Worldwide DHL Express Delivery",
          "Bespoke Studio Master-Tailoring"
        ];

        const promo = this.state.cms?.promotional_banner || {
          title: "Woven on Historic Looms, Preserved for Generations",
          subtitle: "Pakistani textile craft exists in a league of its own. From the riverbanks of the Indus where long-staple cotton was first domesticated 5,000 years ago, our atelier selects only the purest Supima and Egyptian Giza fibers.",
          image: "/assets/hero_campaign_split.png"
        };

        // Fetch featured products for the curated drops section
        const featuredRes = await EBA_API.products.list({ limit: 6, is_featured: '1' });
        const featuredProducts = featuredRes.products || [];

        container.innerHTML = `
          <!-- HERO CAMPAIGN BANNER -->
          <section class="relative w-full overflow-hidden bg-surface">
            <div class="relative w-full h-[90vh] min-h-[600px] max-h-[920px] flex items-end overflow-hidden">
              <img src="${hero.image}" alt="${hero.title.replace(/<br\/>/g, ' ')}" class="absolute inset-0 w-full h-full object-cover object-center filter brightness-95"/>
              <div class="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/35 to-primary/30 pointer-events-none"></div>
              
              <div class="relative z-10 w-full px-margin-mobile md:px-margin pb-16 max-w-7xl mx-auto flex flex-col justify-end">
                <div class="flex flex-wrap items-center gap-3 mb-6">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-surface/90 text-on-surface font-label-sm uppercase tracking-widest backdrop-blur-sm">
                    <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    ${hero.badge1 || 'Complimentary Nationwide Shipping'}
                  </span>
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-surface/90 text-on-surface font-label-sm uppercase tracking-widest backdrop-blur-sm">
                    <span class="material-symbols-outlined text-[14px] text-secondary">payments</span>
                    ${hero.badge2 || 'Cash on Delivery Available'}
                  </span>
                </div>
                
                <div class="max-w-3xl">
                  <p class="font-label-md uppercase tracking-[0.25em] text-secondary-fixed mb-3">${hero.tagline}</p>
                  <h1 class="font-display-lg text-on-primary tracking-tight leading-none mb-4 uppercase drop-shadow-sm">
                    ${hero.title}
                  </h1>
                  <p class="font-body-lg text-surface-variant font-light max-w-2xl leading-relaxed mb-8">
                    ${hero.subtitle}
                  </p>
                </div>

                <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <a href="${hero.cta_men_link || '#men'}" class="btn-primary text-center px-8 py-4 bg-on-primary text-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed">
                    <span>${hero.cta_men_text || "Explore Men's Unstitched"}</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </a>
                  <a href="${hero.cta_women_link || '#women'}" class="btn-secondary text-center px-8 py-4 bg-primary/70 backdrop-blur-md text-on-primary border-white/30 hover:bg-on-primary hover:text-primary">
                    <span>${hero.cta_women_text || "Explore Women's Couture"}</span>
                    <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <!-- RUNNING TICKER STRIP -->
          <div class="w-full bg-primary text-on-primary py-3.5 px-margin-mobile md:px-margin overflow-hidden flex items-center border-b border-surface-container-high">
            <div class="marquee-track font-label-sm uppercase tracking-[0.2em] whitespace-nowrap gap-12">
              ${ticker.map(t => `<span class="inline-flex items-center gap-2"><span class="w-1.5 h-1.5 bg-secondary-fixed"></span> ${t}</span>`).join('')}
              ${ticker.map(t => `<span class="inline-flex items-center gap-2"><span class="w-1.5 h-1.5 bg-secondary-fixed"></span> ${t}</span>`).join('')}
            </div>
          </div>

          <!-- CURATED CATALOG / FEATURED UNSTITCHED DROPS -->
          <section class="w-full bg-surface-container-low py-20 px-margin-mobile md:px-margin border-t border-b border-surface-container-high">
            <div class="max-w-7xl mx-auto">
              <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-surface-container-high gap-6">
                <div>
                  <span class="font-label-md uppercase tracking-[0.2em] text-secondary">Curated Atelier Catalog</span>
                  <h2 class="font-headline-lg uppercase text-primary mt-1">Featured Unstitched Drops</h2>
                </div>
                
                <div class="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0" id="home-featured-tabs">
                  <button onclick="app.filterHomeFeatured(this, 'all')" class="px-4 py-2 bg-primary text-on-primary font-label-md uppercase tracking-wider transition-colors active-tab">All Arrivals</button>
                  <button onclick="app.filterHomeFeatured(this, 'men')" class="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface font-label-md uppercase tracking-wider transition-colors">Men's Unstitched</button>
                  <button onclick="app.filterHomeFeatured(this, 'women')" class="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface font-label-md uppercase tracking-wider transition-colors">Women's Couture</button>
                  <button onclick="app.filterHomeFeatured(this, 'cotton')" class="px-4 py-2 bg-surface hover:bg-surface-container text-on-surface font-label-md uppercase tracking-wider transition-colors">Egyptian Cotton</button>
                </div>
              </div>

              <!-- Product Grid -->
              <div id="home-featured-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                ${featuredProducts.length > 0 ? featuredProducts.map(p => this.renderProductCardHTML(p)).join('') : `
                  <div class="col-span-full py-16 px-6 text-center bg-surface-container-lowest border border-surface-container-high space-y-3">
                    <span class="material-symbols-outlined text-secondary text-4xl">inventory_2</span>
                    <h3 class="font-headline-sm uppercase text-primary">New Collection In Production</h3>
                    <p class="font-body-sm text-on-surface-variant max-w-md mx-auto">
                      Our master weavers and atelier team are currently preparing the upcoming seasonal drops. Check back shortly or visit our Gulberg III Flagship.
                    </p>
                  </div>
                `}
              </div>

              <div class="mt-14 text-center">
                <a href="#catalog" class="btn-secondary px-10 py-4">
                  <span>Explore Full Atelier Archive</span>
                  <span class="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>
            </div>
          </section>

          <!-- CRAFTSMANSHIP & ATELIER STORYTELLING -->
          <section class="w-full bg-surface py-24 px-margin-mobile md:px-margin">
            <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div class="lg:col-span-6 relative">
                <div class="relative aspect-[4/5] overflow-hidden bg-surface-container-high shadow-2xl">
                  <img src="${promo.image || '/assets/hero_campaign_split.png'}" alt="${promo.title || 'Ustad Master Weavers Pakistani Looms'}" class="w-full h-full object-cover"/>
                  <div class="absolute bottom-6 left-6 right-6 p-6 bg-surface-container-lowest/90 backdrop-blur-md border border-surface-container-high">
                    <span class="font-label-sm uppercase tracking-widest text-secondary block mb-1">Authentic Yardage Protocol</span>
                    <p class="font-headline-sm uppercase text-primary">Unstitched Luxury Without Compromise</p>
                  </div>
                </div>
              </div>

              <div class="lg:col-span-6 flex flex-col gap-6">
                <span class="font-label-md uppercase tracking-[0.2em] text-secondary">The Loom Craft Narrative</span>
                <h2 class="font-display-lg uppercase text-primary leading-tight">
                  ${promo.title || 'Woven on Historic Looms, Preserved for Generations'}
                </h2>
                <p class="font-body-md text-on-surface-variant leading-relaxed">
                  ${promo.subtitle || 'Pakistani textile craft exists in a league of its own. From the riverbanks of the Indus where long-staple cotton was first domesticated 5,000 years ago, our atelier selects only the purest Supima and Egyptian Giza fibers.'}
                </p>
                <p class="font-body-md text-on-surface-variant leading-relaxed">
                  Every unstitched length is delivered with generous yardage (4.0m to 4.5m for gentlemen; 3-piece complete sets with embroidered daman and pure silk dupattas for ladies) to give your master tailor complete architectural freedom.
                </p>

                <div class="grid grid-cols-2 gap-6 pt-4 border-t border-surface-container-high">
                  <div>
                    <span class="font-serif text-3xl text-primary font-semibold block">120s</span>
                    <span class="font-label-sm text-secondary uppercase tracking-wider">Combed Thread Counts</span>
                  </div>
                  <div>
                    <span class="font-serif text-3xl text-primary font-semibold block">100%</span>
                    <span class="font-label-sm text-secondary uppercase tracking-wider">Natural Pure Fibers</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `;
      } catch (err) {
        console.error('Render home error:', err);
        container.innerHTML = `<div class="p-16 text-center text-red-600">Failed to render home view</div>`;
      }
    },

    // ----------------------------------------------------
    // VIEW 2: CATALOG / SHOPPING LISTING (MEN / WOMEN / ALL)
    // ----------------------------------------------------
    async renderCatalog(container, filterOptions = {}) {
      try {
        const title = filterOptions.title || 'Curated Atelier Catalog';
        
        // Fetch facets
        const facetsRes = await EBA_API.products.getFacets();
        const facets = facetsRes || {};

        container.innerHTML = `
          <!-- Collection Hero Header -->
          <header class="w-full bg-surface-container-low border-b border-surface-container-high py-12 px-margin-mobile md:px-margin">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <nav class="flex items-center gap-2 font-label-sm uppercase tracking-wider text-on-surface-variant mb-2">
                  <a href="#home" class="hover:text-primary">Home</a>
                  <span>/</span>
                  <span class="text-primary font-semibold">${title}</span>
                </nav>
                <h1 class="font-display-lg uppercase text-primary leading-tight">${title}</h1>
              </div>
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-2">
                  <label for="catalog-sort" class="font-label-sm uppercase tracking-wider text-on-surface-variant hidden sm:inline">Sort By:</label>
                  <select id="catalog-sort" onchange="app.applyCatalogSort()" class="bg-surface-container-lowest border border-surface-container-high px-3 py-2 text-xs font-label-sm uppercase tracking-wider focus:outline-none">
                    <option value="featured">Featured Edit</option>
                    <option value="newest">Newest Arrivals</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="bestselling">Bestselling</option>
                  </select>
                </div>
              </div>
            </div>
          </header>

          <!-- Main Catalog Content -->
          <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin py-12">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <!-- Faceted Filter Sidebar (3 cols) -->
              <aside class="lg:col-span-3 bg-surface-container-lowest p-6 border border-surface-container-high space-y-6 sticky top-28" id="catalog-sidebar">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <h3 class="font-headline-sm uppercase text-primary text-lg">Refine By</h3>
                  <button onclick="app.resetCatalogFilters()" class="font-label-sm text-secondary uppercase hover:underline">Reset All</button>
                </div>

                <!-- Category Filters -->
                <div>
                  <span class="font-label-lg uppercase text-primary block mb-3">Domain & Category</span>
                  <div class="space-y-2 text-xs">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cat_filter" value="" ${!filterOptions.category ? 'checked' : ''} onchange="app.applyCatalogFilter('category', '')" class="custom-checkbox"/>
                      <span>All Collections</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cat_filter" value="men" ${filterOptions.category === 'men' ? 'checked' : ''} onchange="app.applyCatalogFilter('category', 'men')" class="custom-checkbox"/>
                      <span>Men's Unstitched</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="cat_filter" value="women" ${filterOptions.category === 'women' ? 'checked' : ''} onchange="app.applyCatalogFilter('category', 'women')" class="custom-checkbox"/>
                      <span>Women's Couture Lawn</span>
                    </label>
                  </div>
                </div>

                <!-- Suit Type Filters -->
                <div class="pt-4 border-t border-surface-container-high">
                  <span class="font-label-lg uppercase text-primary block mb-3">Suit Type</span>
                  <div class="space-y-2 text-xs">
                    ${(facets.suitTypes || ['3-Piece Unstitched', 'Unstitched 4.5m', 'Unstitched 4.0m']).map(st => `
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" value="${st}" onchange="app.toggleArrayFilter('product_type', '${st}')" class="custom-checkbox"/>
                        <span>${st}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Fabric & Weave Filters -->
                <div class="pt-4 border-t border-surface-container-high">
                  <span class="font-label-lg uppercase text-primary block mb-3">Fabric & Weave</span>
                  <div class="space-y-2 text-xs max-h-48 overflow-y-auto">
                    ${(facets.fabrics || ['Supima Lawn 80s', 'Egyptian Giza Cotton 120s', 'Pure Silk Chiffon', 'Winter Karandi', 'Pure Chinese Boski']).map(f => `
                      <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" value="${f}" onchange="app.toggleArrayFilter('fabric', '${f}')" class="custom-checkbox"/>
                        <span class="truncate">${f}</span>
                      </label>
                    `).join('')}
                  </div>
                </div>

                <!-- Stock Availability -->
                <div class="pt-4 border-t border-surface-container-high">
                  <label class="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" id="filter-in-stock" onchange="app.applyCatalogFilter('in_stock', this.checked ? '1' : '')" class="custom-checkbox"/>
                    <span class="font-label-sm uppercase tracking-wider text-primary">In Stock Ready to Ship</span>
                  </label>
                </div>
              </aside>

              <!-- Product Grid Wall (9 cols) -->
              <div class="lg:col-span-9 flex flex-col gap-8">
                <div class="flex items-center justify-between text-xs text-on-surface-variant">
                  <span id="catalog-count-badge">Curating atelier weaves...</span>
                </div>

                <div id="catalog-product-grid" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  <!-- Rendered via JS -->
                </div>
              </div>

            </div>
          </div>
        `;

        this.state.currentFilter = { ...filterOptions };
        await this.loadCatalogProducts();
      } catch (err) {
        console.error('Render catalog error:', err);
      }
    },

    async loadCatalogProducts() {
      const grid = document.getElementById('catalog-product-grid');
      const countBadge = document.getElementById('catalog-count-badge');
      if (!grid) return;

      grid.innerHTML = `
        <div class="col-span-full py-16 text-center text-on-surface-variant font-label-sm uppercase tracking-widest">
          Fetching authentic textiles...
        </div>
      `;

      try {
        const res = await EBA_API.products.list(this.state.currentFilter);
        const products = res.products || [];

        if (countBadge) {
          countBadge.textContent = `Showing ${products.length} authenticated unstitched pieces`;
        }

        if (products.length === 0) {
          grid.innerHTML = `
            <div class="col-span-full bg-surface-container-lowest p-12 text-center border border-surface-container-high space-y-4">
              <span class="material-symbols-outlined text-4xl text-outline">inventory_2</span>
              <h3 class="font-headline-sm uppercase text-primary">No Matching Unstitched Weaves</h3>
              <p class="font-body-sm text-on-surface-variant">Try resetting filters to explore our full seasonal archive.</p>
              <button onclick="app.resetCatalogFilters()" class="btn-secondary px-6 py-2.5 text-xs">Reset All Filters</button>
            </div>
          `;
          return;
        }

        grid.innerHTML = products.map(p => this.renderProductCardHTML(p)).join('');
      } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="col-span-full text-center text-red-600">Error loading catalog products.</div>`;
      }
    },

    applyCatalogFilter(key, val) {
      if (!val) {
        delete this.state.currentFilter[key];
      } else {
        this.state.currentFilter[key] = val;
      }
      this.loadCatalogProducts();
    },

    toggleArrayFilter(key, val) {
      // Toggle string contains
      if (this.state.currentFilter[key] === val) {
        delete this.state.currentFilter[key];
      } else {
        this.state.currentFilter[key] = val;
      }
      this.loadCatalogProducts();
    },

    applyCatalogSort() {
      const sortSelect = document.getElementById('catalog-sort');
      if (sortSelect) {
        this.state.currentFilter.sort = sortSelect.value;
        this.loadCatalogProducts();
      }
    },

    resetCatalogFilters() {
      this.state.currentFilter = {};
      const sortSelect = document.getElementById('catalog-sort');
      if (sortSelect) sortSelect.value = 'featured';
      this.loadCatalogProducts();
    },

    // ----------------------------------------------------
    // VIEW 3: PRODUCT DETAILS PAGE (MATCHING GUL-E-NOOR DESIGN)
    // ----------------------------------------------------
    async renderProductDetails(container, slug) {
      try {
        const res = await EBA_API.products.get(slug);
        const product = res.product;
        const related = res.related || [];

        if (!product) {
          container.innerHTML = `<div class="p-20 text-center font-headline-sm">Product not found.</div>`;
          return;
        }

        const images = product.images || [{ image_url: '/assets/gul_e_noor_details.png', is_primary: 1 }];
        const primaryImg = images.find(img => img.is_primary) || images[0];

        const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
        const isOutOfStock = product.stock_quantity <= 0;

        container.innerHTML = `
          <!-- Breadcrumb Rail -->
          <div class="w-full bg-surface-container-low border-b border-surface-container-high py-3 px-margin-mobile md:px-margin">
            <div class="max-w-7xl mx-auto flex items-center gap-2 font-label-sm uppercase tracking-wider text-on-surface-variant text-[11px]">
              <a href="#home" class="hover:text-primary">Home</a>
              <span>/</span>
              <a href="#${product.category_slug || 'catalog'}" class="hover:text-primary">${product.category_name || 'Catalog'}</a>
              <span>/</span>
              <span class="text-primary font-semibold truncate">${product.name}</span>
            </div>
          </div>

          <!-- Product Details Grid -->
          <section class="max-w-7xl mx-auto px-margin-mobile md:px-margin py-12">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              <!-- Left Gallery (7 cols) -->
              <div class="lg:col-span-7 flex flex-col md:flex-row gap-4">
                <!-- Vertical Thumbnails -->
                <div class="flex md:flex-col gap-3 order-2 md:order-1 overflow-x-auto md:overflow-visible shrink-0">
                  ${images.map((img, idx) => `
                    <button onclick="app.switchProductDetailImage('${img.image_url}', this)" class="w-16 h-20 md:w-20 md:h-28 overflow-hidden border ${idx === 0 ? 'border-primary' : 'border-surface-container-high'} shrink-0 group">
                      <img src="${img.image_url}" alt="Thumbnail" class="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                    </button>
                  `).join('')}
                </div>

                <!-- Main Featured High-Res View -->
                <div class="flex-1 aspect-[3/4] bg-surface-container-high relative overflow-hidden border border-surface-container-high order-1 md:order-2 group">
                  <img id="detail-main-img" src="${primaryImg.image_url}" alt="${product.name}" class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"/>
                  
                  <div class="absolute top-4 left-4 flex flex-col gap-2">
                    ${product.is_sale ? `<span class="badge-status badge-gold">Seasonal Sale</span>` : ''}
                    ${product.is_featured ? `<span class="badge-status badge-dark">Atelier Drop</span>` : ''}
                  </div>

                  <button onclick="app.toggleWishlist(${product.id})" class="wishlist-btn ${this.isWishlisted(product.id) ? 'active' : ''}">
                    <span class="material-symbols-outlined text-[20px]">favorite</span>
                  </button>
                </div>
              </div>

              <!-- Right Specs & Order Configurator (5 cols) -->
              <div class="lg:col-span-5 flex flex-col gap-6">
                <div>
                  <div class="flex items-center justify-between text-secondary font-label-sm uppercase tracking-widest mb-1">
                    <span>${product.brand_name || 'EBA Signature Atelier'}</span>
                    <span>SKU: ${product.sku}</span>
                  </div>
                  <h1 class="font-display-lg uppercase text-primary leading-tight text-3xl md:text-4xl">${product.name}</h1>
                  
                  <!-- Price & Stock Strip -->
                  <div class="flex items-baseline gap-4 mt-3">
                    <span class="font-headline-lg text-primary">PKR ${(product.sale_price || product.price).toLocaleString()}</span>
                    ${product.sale_price ? `<span class="font-body-md text-on-surface-variant line-through">PKR ${product.price.toLocaleString()}</span>` : ''}
                  </div>

                  <!-- Live Stock Pill -->
                  <div class="mt-3">
                    ${isOutOfStock 
                      ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 font-label-sm uppercase tracking-wider"><span class="w-2 h-2 rounded-full bg-red-600"></span> Sold Out in Current Run</span>`
                      : (isLowStock 
                        ? `<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-900 font-label-sm uppercase tracking-wider"><span class="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span> Low Stock: Only ${product.stock_quantity} Cuts Remaining</span>`
                        : `<span class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 font-label-sm uppercase tracking-wider"><span class="w-2 h-2 rounded-full bg-emerald-600"></span> In Stock • 24h TCS Dispatch</span>`)}
                  </div>
                </div>

                <!-- Short Editorial Description -->
                <p class="font-body-md text-on-surface-variant leading-relaxed pb-4 border-b border-surface-container-high">
                  ${product.short_description || product.description}
                </p>

                <!-- Color & Fabric Meta -->
                <div class="space-y-3 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="font-label-sm uppercase tracking-wider text-on-surface-variant">Palette:</span>
                    <span class="font-semibold text-primary flex items-center gap-2">
                      <span class="w-3.5 h-3.5 border border-surface-container-high" style="background-color: ${product.color_hex || '#c5a880'}"></span>
                      ${product.color || 'Artisanal Dyed'}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="font-label-sm uppercase tracking-wider text-on-surface-variant">Weave & Thread Count:</span>
                    <span class="font-semibold text-primary">${product.fabric || '100% Fine Combed Weave'}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="font-label-sm uppercase tracking-wider text-on-surface-variant">Edition:</span>
                    <span class="font-semibold text-primary">${product.product_type || '3-Piece Unstitched'}</span>
                  </div>
                </div>

                <!-- MASTER TAILORING ADD-ON (FROM STITCH DESIGN) -->
                <div class="bg-surface-container-low p-4 border border-surface-container-high flex flex-col gap-3">
                  <div class="flex items-start gap-3">
                    <input type="checkbox" id="detail-tailor-toggle" onchange="app.toggleDetailTailoring(this)" class="custom-checkbox mt-1"/>
                    <label for="detail-tailor-toggle" class="cursor-pointer">
                      <span class="font-label-lg uppercase tracking-wider text-primary block">
                        Add Master Tailor Stitching Service (+PKR 4,500)
                      </span>
                      <span class="font-body-sm text-on-surface-variant block mt-0.5 leading-snug">
                        Custom studio bespoke tailoring. Our master ustad will cut and stitch to standard sizing (XS–XL) or your custom dimensions.
                      </span>
                    </label>
                  </div>

                  <div id="detail-tailor-sizes" class="hidden pt-3 border-t border-surface-container-high flex flex-col gap-2">
                    <span class="font-label-sm uppercase tracking-wider text-primary">Select Preferred Stitched Size:</span>
                    <div class="flex items-center gap-2">
                      ${['XS', 'S', 'M', 'L', 'XL', 'Custom'].map(sz => `
                        <label class="px-3 py-1.5 border border-surface-container-high bg-white text-xs font-semibold cursor-pointer hover:border-primary">
                          <input type="radio" name="tailor_size" value="${sz}" ${sz === 'M' ? 'checked' : ''} class="hidden"/>
                          <span>${sz}</span>
                        </label>
                      `).join('')}
                    </div>
                  </div>
                </div>

                <!-- Quantity & Actions -->
                <div class="space-y-4 pt-2">
                  <div class="flex items-center gap-4">
                    <div class="flex items-center border border-surface-container-high bg-white">
                      <button onclick="app.decrementDetailQty()" class="px-3 py-3 text-primary hover:bg-surface-container-low transition-colors">-</button>
                      <input type="number" id="detail-qty" value="1" min="1" max="${Math.max(1, product.stock_quantity)}" class="w-12 text-center text-xs font-semibold focus:outline-none"/>
                      <button onclick="app.incrementDetailQty(${product.stock_quantity})" class="px-3 py-3 text-primary hover:bg-surface-container-low transition-colors">+</button>
                    </div>

                    <button onclick="app.handleAddToCartFromDetail(${product.id})" ${isOutOfStock ? 'disabled' : ''} class="btn-primary flex-1 py-4 text-xs ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}">
                      <span class="material-symbols-outlined text-[18px]">shopping_bag</span>
                      <span>${isOutOfStock ? 'Sold Out' : 'Add to Shopping Bag'}</span>
                    </button>
                  </div>

                  <button onclick="app.handleDirectCheckout(${product.id})" ${isOutOfStock ? 'disabled' : ''} class="btn-gold w-full py-3.5 text-xs text-center ${isOutOfStock ? 'opacity-50 cursor-not-allowed' : ''}">
                    Express Checkout with 1-Click
                  </button>
                </div>

                <!-- Accordion Tabs -->
                <div class="border-t border-surface-container-high pt-4 space-y-3">
                  <details class="group py-2 border-b border-surface-container-high" open>
                    <summary class="font-label-lg uppercase tracking-wider text-primary cursor-pointer flex items-center justify-between list-none">
                      <span>Fabric Composition & Yardage</span>
                      <span class="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div class="pt-3 font-body-sm text-on-surface-variant space-y-2">
                      <p>${product.description || 'Delivered in full uncut bolts according to master atelier specifications.'}</p>
                      <ul class="list-disc pl-5 space-y-1 text-xs">
                        <li>Shirt / Kurta Fabric: 3.0m - 3.25m unstitched length</li>
                        <li>Trouser / Shalwar Cambric: 2.5m pure dyed fabric</li>
                        <li>Dupatta: 2.5m crinkle pure chiffon or Swiss organza</li>
                        <li>Embellishment: Intricate tilla / schiffli motifs</li>
                      </ul>
                    </div>
                  </details>

                  <details class="group py-2 border-b border-surface-container-high">
                    <summary class="font-label-lg uppercase tracking-wider text-primary cursor-pointer flex items-center justify-between list-none">
                      <span>Care Instructions</span>
                      <span class="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div class="pt-3 font-body-sm text-on-surface-variant space-y-1 text-xs">
                      <p>• Dry clean recommended for heavy embroidered chiffon & raw silk.</p>
                      <p>• For fine cottons, gentle hand wash in cold water with mild detergent.</p>
                      <p>• Do not tumble dry. Dry in shade to preserve genuine thread colors.</p>
                    </div>
                  </details>

                  <details class="group py-2 border-b border-surface-container-high">
                    <summary class="font-label-lg uppercase tracking-wider text-primary cursor-pointer flex items-center justify-between list-none">
                      <span>Delivery & White Glove Dispatch</span>
                      <span class="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div class="pt-3 font-body-sm text-on-surface-variant space-y-1 text-xs">
                      <p>• <strong>Domestic Pakistan:</strong> 2–4 business days via TCS Express with live WhatsApp tracking codes.</p>
                      <p>• <strong>Complimentary Shipping:</strong> Automatically activated on orders above PKR 5,000.</p>
                      <p>• <strong>Cash on Delivery:</strong> Available across all major Pakistani cities.</p>
                    </div>
                  </details>
                </div>

              </div>
            </div>
          </section>

          <!-- Related Products Carousel -->
          ${related.length > 0 ? `
            <section class="w-full bg-surface-container-low py-16 px-margin-mobile md:px-margin border-t border-surface-container-high">
              <div class="max-w-7xl mx-auto">
                <span class="font-label-md uppercase tracking-[0.2em] text-secondary block mb-1">Curated Complementary Pieces</span>
                <h3 class="font-headline-lg uppercase text-primary mb-8">You May Also Desire</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  ${related.map(p => this.renderProductCardHTML(p)).join('')}
                </div>
              </div>
            </section>
          ` : ''}
        `;
      } catch (err) {
        console.error('Product details error:', err);
      }
    },

    switchProductDetailImage(url, btn) {
      const main = document.getElementById('detail-main-img');
      if (main) main.src = url;
      btn.parentElement.querySelectorAll('button').forEach(b => b.classList.replace('border-primary', 'border-surface-container-high'));
      btn.classList.replace('border-surface-container-high', 'border-primary');
    },

    toggleDetailTailoring(checkbox) {
      const sizeBox = document.getElementById('detail-tailor-sizes');
      if (sizeBox) {
        if (checkbox.checked) sizeBox.classList.remove('hidden');
        else sizeBox.classList.add('hidden');
      }
    },

    incrementDetailQty(max) {
      const input = document.getElementById('detail-qty');
      if (input && Number(input.value) < max) input.value = Number(input.value) + 1;
    },

    decrementDetailQty() {
      const input = document.getElementById('detail-qty');
      if (input && Number(input.value) > 1) input.value = Number(input.value) - 1;
    },

    async handleAddToCartFromDetail(productId) {
      const qtyInput = document.getElementById('detail-qty');
      const qty = qtyInput ? parseInt(qtyInput.value) : 1;
      const tailorToggle = document.getElementById('detail-tailor-toggle');
      const addTailoring = tailorToggle && tailorToggle.checked ? 1 : 0;
      const sizeRadio = document.querySelector('input[name="tailor_size"]:checked');
      const size = addTailoring && sizeRadio ? sizeRadio.value : null;

      try {
        await EBA_API.cart.add(productId, qty, addTailoring, size);
        EBA_API.showToast('Added to your bespoke shopping bag');
        await this.refreshCart();
        this.toggleCartDrawer(true);
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async handleDirectCheckout(productId) {
      await this.handleAddToCartFromDetail(productId);
      window.location.hash = '#checkout';
    },

    // ----------------------------------------------------
    // VIEW 4: DEDICATED SHOPPING BAG PAGE (MATCHING STITCH)
    // ----------------------------------------------------
    async renderCartPage(container) {
      await this.refreshCart();
      const cart = this.state.cart;

      container.innerHTML = `
        <!-- Delivery Progress Strip -->
        <section class="w-full bg-surface-container-low border-b border-surface-container-high py-3 px-margin-mobile md:px-margin">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[18px]">verified</span>
              <span class="font-label-sm uppercase tracking-widest text-primary font-semibold">
                ${cart.amountToFreeShipping === 0 ? 'Complimentary Express Delivery Activated' : `Add PKR ${cart.amountToFreeShipping.toLocaleString()} more for Free Express Delivery`}
              </span>
            </div>
            <div class="flex items-center gap-3 text-on-surface-variant font-label-sm uppercase">
              <span>48-Hour Dispatch via TCS</span>
              <span>•</span>
              <span class="text-secondary font-semibold">COD Available Worldwide</span>
            </div>
          </div>
        </section>

        <!-- Cart Header -->
        <header class="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin pt-10 pb-6 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <h1 class="font-display-lg uppercase text-primary">
            Your Shopping Bag <span class="font-body-md text-on-surface-variant font-normal">(${cart.itemCount} Items)</span>
          </h1>
          <a href="#catalog" class="font-label-sm text-secondary uppercase hover:underline">
            &larr; Continue Curating Wardrobe
          </a>
        </header>

        <!-- Cart Workspace -->
        <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin pb-20">
          ${cart.items.length === 0 ? `
            <div class="bg-surface-container-lowest p-16 text-center border border-surface-container-high space-y-4">
              <span class="material-symbols-outlined text-5xl text-outline">shopping_bag</span>
              <h2 class="font-headline-sm uppercase text-primary">Your Shopping Bag is Empty</h2>
              <p class="font-body-sm text-on-surface-variant max-w-md mx-auto">Explore our master unstitched lawn, raw silk, and Egyptian cotton collections.</p>
              <a href="#catalog" class="btn-primary px-8 py-3.5 text-xs inline-flex">Explore Collections</a>
            </div>
          ` : `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              
              <!-- Items List (8 cols) -->
              <div class="lg:col-span-8 flex flex-col gap-6">
                <!-- Atelier Perks Banner -->
                <div class="bg-surface-container-low p-4 border border-surface-container-high flex items-center justify-between gap-4 text-xs">
                  <div class="flex items-center gap-3">
                    <span class="material-symbols-outlined text-secondary text-2xl">inventory_2</span>
                    <div>
                      <p class="font-label-lg uppercase tracking-wider text-primary">Curated Atelier Perks Included</p>
                      <p class="font-body-sm text-on-surface-variant">Signature archive packaging, complimentary swatch booklet, and inspection seal.</p>
                    </div>
                  </div>
                  <span class="badge-status badge-gold shrink-0">Complimentary</span>
                </div>

                <!-- Items -->
                <div class="space-y-4">
                  ${cart.items.map(item => `
                    <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-col sm:flex-row gap-6 items-start">
                      <img src="${item.image_url}" alt="${item.name}" class="w-full sm:w-32 aspect-[3/4] object-cover bg-surface-container shrink-0"/>
                      
                      <div class="flex-1 flex flex-col justify-between h-full w-full">
                        <div>
                          <div class="flex justify-between items-start gap-4">
                            <span class="font-label-sm uppercase tracking-wider text-secondary">${item.sku}</span>
                            <span class="font-headline-sm text-primary">PKR ${(item.unit_price * item.quantity).toLocaleString()}</span>
                          </div>
                          <h3 class="font-headline-sm uppercase text-primary hover:text-secondary cursor-pointer mt-1">
                            <a href="#product/${item.slug}">${item.name}</a>
                          </h3>
                          <p class="font-body-sm text-on-surface-variant mt-1">${item.fabric || 'Unstitched Fabric'}</p>
                          
                          <!-- Tailoring Toggle within cart -->
                          <div class="bg-surface-container-low p-3 mt-3 flex items-center justify-between text-xs">
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" onchange="app.updateCartTailoring(${item.id}, this.checked)" ${item.add_tailoring ? 'checked' : ''} class="custom-checkbox"/>
                              <span class="font-label-sm uppercase tracking-wider text-primary">Master Tailoring (+PKR 4,500)</span>
                            </label>
                            ${item.add_tailoring ? `<span class="text-secondary font-semibold font-label-sm">Active</span>` : ''}
                          </div>
                        </div>

                        <div class="flex items-center justify-between pt-4 mt-4 border-t border-surface-container-high">
                          <div class="flex items-center border border-surface-container-high bg-white">
                            <button onclick="app.updateCartQty(${item.id}, ${item.quantity - 1})" class="px-2.5 py-1 text-sm text-primary hover:bg-surface-container-low">-</button>
                            <span class="px-3 text-xs font-semibold">${item.quantity}</span>
                            <button onclick="app.updateCartQty(${item.id}, ${item.quantity + 1})" class="px-2.5 py-1 text-sm text-primary hover:bg-surface-container-low">+</button>
                          </div>

                          <button onclick="app.removeCartItem(${item.id})" class="font-label-sm uppercase tracking-wider text-outline hover:text-red-700 flex items-center gap-1 transition-colors">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Order Summary & Coupons (4 cols) -->
              <div class="lg:col-span-4 bg-surface-container-lowest p-6 border border-surface-container-high space-y-6 sticky top-28">
                <h3 class="font-headline-sm uppercase text-primary text-xl pb-3 border-b border-surface-container-high">Order Summary</h3>

                <!-- Coupon Entry -->
                <div class="space-y-2">
                  <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block">Promotional Voucher</label>
                  <div class="flex gap-2">
                    <input type="text" id="cart-coupon-input" placeholder="e.g. WELCOME10" class="form-input text-xs uppercase" value="${this.state.appliedCoupon ? this.state.appliedCoupon.code : ''}"/>
                    <button onclick="app.applyCartCoupon()" class="btn-secondary px-4 py-2 text-xs shrink-0">Apply</button>
                  </div>
                  ${this.state.appliedCoupon ? `
                    <div class="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-2">
                      <span>Code <strong>${this.state.appliedCoupon.code}</strong> applied!</span>
                      <button onclick="app.removeCartCoupon()" class="text-red-600 hover:underline">Remove</button>
                    </div>
                  ` : ''}
                </div>

                <!-- Ledger -->
                <div class="space-y-3 pt-3 border-t border-surface-container-high text-xs">
                  <div class="flex justify-between text-on-surface-variant">
                    <span>Fabric Subtotal</span>
                    <span class="font-semibold text-primary">PKR ${cart.subtotal.toLocaleString()}</span>
                  </div>
                  ${cart.tailoringTotal > 0 ? `
                    <div class="flex justify-between text-on-surface-variant">
                      <span>Bespoke Tailoring Fee</span>
                      <span class="font-semibold text-primary">PKR ${cart.tailoringTotal.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  ${this.state.appliedCoupon ? `
                    <div class="flex justify-between text-emerald-700 font-semibold">
                      <span>Voucher Discount</span>
                      <span>-PKR ${this.state.appliedCoupon.discount_amount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between text-on-surface-variant">
                    <span>TCS Nationwide Shipping</span>
                    <span class="font-semibold ${cart.shippingFee === 0 ? 'text-secondary' : 'text-primary'}">
                      ${cart.shippingFee === 0 ? 'Complimentary' : `PKR ${cart.shippingFee.toLocaleString()}`}
                    </span>
                  </div>

                  <div class="flex justify-between text-base font-semibold text-primary pt-3 border-t border-surface-container-high">
                    <span>Total Amount</span>
                    <span class="font-headline-sm">
                      PKR ${(cart.total - (this.state.appliedCoupon ? this.state.appliedCoupon.discount_amount : 0)).toLocaleString()}
                    </span>
                  </div>
                </div>

                <a href="#checkout" class="btn-primary w-full text-center py-4 text-xs block">
                  Proceed to Express Checkout &rarr;
                </a>
              </div>

            </div>
          `}
        </div>
      `;
    },

    async applyCartCoupon() {
      const input = document.getElementById('cart-coupon-input');
      const code = input ? input.value.trim() : '';
      if (!code) return;

      try {
        const res = await EBA_API.cart.validateCoupon(code, this.state.cart.subtotal);
        this.state.appliedCoupon = res.coupon;
        EBA_API.showToast(res.message);
        await this.renderCartPage(document.getElementById('app-view'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    removeCartCoupon() {
      this.state.appliedCoupon = null;
      EBA_API.showToast('Coupon removed');
      this.renderCartPage(document.getElementById('app-view'));
    },

    async updateCartQty(itemId, newQty) {
      try {
        await EBA_API.cart.update(itemId, newQty);
        await this.refreshCart();
        if (window.location.hash === '#cart') {
          await this.renderCartPage(document.getElementById('app-view'));
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async updateCartTailoring(itemId, addTailoring) {
      try {
        await EBA_API.cart.update(itemId, undefined, addTailoring ? 1 : 0);
        await this.refreshCart();
        if (window.location.hash === '#cart') {
          await this.renderCartPage(document.getElementById('app-view'));
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async removeCartItem(itemId) {
      try {
        await EBA_API.cart.remove(itemId);
        EBA_API.showToast('Item removed from shopping bag');
        await this.refreshCart();
        if (window.location.hash === '#cart') {
          await this.renderCartPage(document.getElementById('app-view'));
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // VIEW 5: CHECKOUT PAGE (MATCHING STITCH CHECKOUT SCREEN)
    // ----------------------------------------------------
    async renderCheckoutPage(container) {
      await this.refreshCart();
      const cart = this.state.cart;

      if (cart.items.length === 0) {
        window.location.hash = '#cart';
        return;
      }

      // Fetch dynamic payment gateways and shipping zones
      let paymentMethods = [];
      let shippingZones = [];
      try {
        const pmRes = await EBA_API.store.getPaymentMethods();
        paymentMethods = (pmRes && pmRes.methods && pmRes.methods.length) ? pmRes.methods : [];
      } catch (e) {
        console.warn('Fallback payment methods', e);
      }
      if (paymentMethods.length === 0) {
        paymentMethods = [
          { id: 'cod', name: 'Cash on Delivery (COD)', description: 'Pay physical cash upon doorstep delivery anywhere in Pakistan via verified TCS courier.' },
          { id: 'bank_transfer', name: 'Direct Bank Wire / Online Transfer (Meezan Bank IBAN)', bank_name: 'Meezan Bank Ltd', account_title: 'EBA Fashion Studio Pvt Ltd', account_number: '01000948210001', iban: 'PK64MEZN0001000948210001', branch: 'Gulberg III Main Boulevard Flagship, Lahore', instructions: 'Transfer to verified Meezan account and WhatsApp receipt to +92 321 8456789.' }
        ];
      }

      try {
        const szRes = await EBA_API.store.getShippingZones();
        shippingZones = (szRes && szRes.zones && szRes.zones.length) ? szRes.zones : [];
      } catch (e) {
        console.warn('Fallback shipping zones', e);
      }

      this.state.checkoutPaymentMethods = paymentMethods;
      this.state.checkoutShippingZones = shippingZones;

      const user = this.state.user || {};
      const discount = this.state.appliedCoupon ? this.state.appliedCoupon.discount_amount : 0;
      const initialTotal = Math.max(0, cart.total - discount);

      container.innerHTML = `
        <!-- 4-STEP PROGRESS HEADER TRACKER (FROM STITCH SCREEN) -->
        <section class="w-full bg-surface-container-low py-8 px-margin-mobile md:px-margin border-b border-surface-container-high">
          <div class="max-w-6xl mx-auto">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <span class="font-label-sm uppercase tracking-widest text-secondary block mb-1">EBA Atelier • Checkout Concierge</span>
                <h1 class="font-headline-lg uppercase text-primary">Express Checkout</h1>
              </div>
              <div class="flex items-center gap-2 text-on-surface-variant font-label-md uppercase tracking-wider">
                <span class="material-symbols-outlined text-secondary text-base">verified_user</span>
                <span>SSL 256-Bit Encrypted Transaction</span>
              </div>
            </div>

            <!-- 4-Step Tracker -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div class="bg-surface-container-lowest p-4 relative overflow-hidden flex flex-col justify-between border border-surface-container-high">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-label-sm text-secondary uppercase font-semibold">Step 01</span>
                  <span class="material-symbols-outlined text-secondary text-sm">check_circle</span>
                </div>
                <span class="font-label-lg uppercase tracking-wide text-primary">Customer & Address</span>
                <span class="font-body-sm text-on-surface-variant mt-1 truncate">${user.name || 'Verified Checkout'}</span>
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary"></div>
              </div>

              <div class="bg-surface-container-lowest p-4 relative overflow-hidden flex flex-col justify-between border border-surface-container-high">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-label-sm text-secondary uppercase font-semibold">Step 02</span>
                  <span class="material-symbols-outlined text-secondary text-sm">check_circle</span>
                </div>
                <span class="font-label-lg uppercase tracking-wide text-primary">Shipping Method</span>
                <span class="font-body-sm text-on-surface-variant mt-1" id="step2-courier-display">Express Logistics</span>
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary"></div>
              </div>

              <div class="bg-primary text-on-primary p-4 relative overflow-hidden flex flex-col justify-between shadow-md">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-label-sm text-secondary-fixed uppercase font-semibold">Step 03 • In Progress</span>
                  <span class="inline-block w-2 h-2 rounded-full bg-secondary-fixed animate-ping"></span>
                </div>
                <span class="font-label-lg uppercase tracking-wide text-on-primary">Payment Selection</span>
                <span class="font-body-sm text-surface-variant mt-1" id="step3-payment-display">COD / Bank / JazzCash / Easypaisa</span>
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-secondary-fixed"></div>
              </div>

              <div class="bg-surface-container p-4 relative overflow-hidden flex flex-col justify-between opacity-70 border border-surface-container-high">
                <div class="flex items-center justify-between mb-2">
                  <span class="font-label-sm text-on-surface-variant uppercase font-semibold">Step 04</span>
                  <span class="material-symbols-outlined text-on-surface-variant text-sm">hourglass_empty</span>
                </div>
                <span class="font-label-lg uppercase tracking-wide text-on-surface">Order Confirmation</span>
                <span class="font-body-sm text-on-surface-variant mt-1">Instant Verification</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 2-Column Checkout Workspace -->
        <section class="max-w-6xl mx-auto px-margin-mobile md:px-margin py-12">
          <form id="checkout-form" onsubmit="app.handlePlaceOrder(event)" class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            <!-- Left Forms (7 cols) -->
            <div class="lg:col-span-7 flex flex-col gap-8">
              
              <!-- Contact Details & WhatsApp Alert -->
              <div class="bg-surface-container-lowest p-6 sm:p-8 border border-surface-container-high space-y-6">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <div class="flex items-center gap-3">
                    <span class="w-7 h-7 bg-primary text-on-primary flex items-center justify-center font-label-md">1</span>
                    <h2 class="font-headline-sm uppercase text-primary">Customer & Dispatch Details</h2>
                  </div>
                  <span class="font-label-sm uppercase tracking-wider text-secondary flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">check</span> Verified Session
                  </span>
                </div>

                <!-- Pakistan Postal Alert -->
                <div class="bg-secondary-fixed/20 p-4 border border-secondary-fixed/30 flex items-start gap-3 text-xs">
                  <span class="material-symbols-outlined text-secondary text-lg mt-0.5">sms</span>
                  <div>
                    <p class="font-label-lg uppercase tracking-wide text-secondary font-semibold">Pakistan Postal & Courier Notification</p>
                    <p class="font-body-sm text-on-secondary-fixed-variant mt-0.5 leading-relaxed">Our verified courier partners transmit real-time dispatch verification codes via WhatsApp and SMS prior to door-to-door delivery.</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="sm:col-span-2">
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Full Name *</label>
                    <input type="text" id="chk-name" required value="${user.name || 'Fatima Noor'}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Email Address *</label>
                    <input type="email" id="chk-email" required value="${user.email || 'fatima.noor@example.com'}" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Phone Number (WhatsApp) *</label>
                    <input type="tel" id="chk-phone" required value="${user.phone || '+92 321 8456789'}" class="form-input text-xs"/>
                  </div>
                </div>
              </div>

              <!-- Shipping Destination Address -->
              <div class="bg-surface-container-lowest p-6 sm:p-8 border border-surface-container-high space-y-6">
                <div class="flex items-center gap-3 pb-3 border-b border-surface-container-high">
                  <span class="w-7 h-7 bg-primary text-on-primary flex items-center justify-center font-label-md">2</span>
                  <h2 class="font-headline-sm uppercase text-primary">Destination Address & Shipping Zone</h2>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="sm:col-span-2">
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Street Address / House # *</label>
                    <input type="text" id="chk-address" required value="House 14-B, Street 32" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Sector / Area *</label>
                    <input type="text" id="chk-area" value="Sector F-7/2" class="form-input text-xs"/>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">City (Calculates Delivery Rate) *</label>
                    <select id="chk-city" required onchange="app.updateCheckoutShipping()" class="form-input text-xs">
                      <option value="Islamabad" selected>Islamabad (Federal Capital)</option>
                      <option value="Lahore">Lahore (Punjab)</option>
                      <option value="Karachi">Karachi (Sindh)</option>
                      <option value="Rawalpindi">Rawalpindi</option>
                      <option value="Faisalabad">Faisalabad</option>
                      <option value="Multan">Multan</option>
                      <option value="Peshawar">Peshawar (KPK)</option>
                      <option value="Quetta">Quetta (Balochistan)</option>
                      <option value="Sialkot">Sialkot</option>
                      <option value="Gujranwala">Gujranwala</option>
                      <option value="Hyderabad">Hyderabad</option>
                      <option value="Abbottabad">Abbottabad</option>
                      <option value="Muzaffarabad">Muzaffarabad (AJK)</option>
                      <option value="Gilgit">Gilgit (Gilgit-Baltistan)</option>
                      <option value="International">International (Worldwide Express)</option>
                    </select>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Province / Territory *</label>
                    <select id="chk-province" required class="form-input text-xs">
                      <option value="Islamabad Capital Territory" selected>Islamabad Capital Territory</option>
                      <option value="Punjab">Punjab</option>
                      <option value="Sindh">Sindh</option>
                      <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
                      <option value="Balochistan">Balochistan</option>
                      <option value="Azad Kashmir">Azad Kashmir</option>
                      <option value="International">International Destination</option>
                    </select>
                  </div>
                  <div>
                    <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Postal Code</label>
                    <input type="text" id="chk-postal" value="44000" class="form-input text-xs"/>
                  </div>
                </div>

                <div id="zone-alert-box" class="p-3 bg-surface-container text-xs flex items-center justify-between border-l-2 border-primary">
                  <span class="text-on-surface-variant" id="zone-alert-text">Zone: Major Metros (Express Corridor) • 1 - 2 Business Days</span>
                  <span class="font-semibold text-secondary" id="zone-courier-tag">TCS Express</span>
                </div>
              </div>

              <!-- Payment Method Selection -->
              <div class="bg-surface-container-lowest p-6 sm:p-8 border border-surface-container-high space-y-6">
                <div class="flex items-center gap-3 pb-3 border-b border-surface-container-high">
                  <span class="w-7 h-7 bg-primary text-on-primary flex items-center justify-center font-label-md">3</span>
                  <h2 class="font-headline-sm uppercase text-primary">Payment Selection</h2>
                </div>

                <div class="space-y-4" id="checkout-payment-methods-list">
                  ${paymentMethods.map((pm, idx) => {
                    const isFirst = idx === 0;
                    let icon = 'payments';
                    let badge = '';
                    if (pm.id === 'cod') {
                      icon = 'local_shipping';
                      badge = '<span class="badge-status badge-gold">Doorstep Cash</span>';
                    } else if (pm.id === 'bank_transfer') {
                      icon = 'account_balance';
                      badge = '<span class="badge-status text-blue-700 bg-blue-50 border border-blue-200">1Link IBAN</span>';
                    } else if (pm.id === 'jazzcash') {
                      icon = 'smartphone';
                      badge = '<span class="badge-status text-red-700 bg-red-50 border border-red-200">JazzCash Wallet</span>';
                    } else if (pm.id === 'easypaisa') {
                      icon = 'qr_code_2';
                      badge = '<span class="badge-status text-emerald-700 bg-emerald-50 border border-emerald-200">Easypaisa Wallet</span>';
                    }

                    return `
                      <div class="border ${isFirst ? 'border-primary bg-surface-container-low' : 'border-surface-container-high bg-white'} p-4 transition-colors payment-method-card" id="pay-card-${pm.id}">
                        <label class="flex items-start gap-4 cursor-pointer">
                          <input type="radio" name="payment_method" value="${pm.id}" ${isFirst ? 'checked' : ''} onchange="app.selectPaymentMethod('${pm.id}')" class="custom-checkbox mt-1"/>
                          <div class="flex-1">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-[18px] text-primary">${icon}</span>
                                <span class="font-label-lg uppercase tracking-wider text-primary font-bold text-xs sm:text-sm">${pm.name}</span>
                              </div>
                              ${badge}
                            </div>
                            <p class="font-body-sm text-on-surface-variant mt-1 leading-relaxed text-xs">${pm.description || ''}</p>
                            
                            <!-- Expandable Payment Channel Details -->
                            <div id="pay-details-${pm.id}" class="${isFirst ? '' : 'hidden'} mt-3 p-3.5 bg-surface-container text-xs space-y-1.5 font-sans border-l-2 border-secondary">
                              ${pm.id === 'bank_transfer' ? `
                                <div class="font-mono text-primary space-y-1">
                                  <p><strong>Bank:</strong> ${pm.bank_name || 'Meezan Bank Ltd'}</p>
                                  <p><strong>Account Title:</strong> ${pm.account_title || 'EBA Fashion Studio Pvt Ltd'}</p>
                                  <p><strong>Account Number:</strong> ${pm.account_number || '01000948210001'}</p>
                                  <p><strong>IBAN:</strong> <span class="font-bold text-secondary">${pm.iban || 'PK64MEZN0001000948210001'}</span></p>
                                  <p><strong>Branch:</strong> ${pm.branch || 'Gulberg III Main Boulevard Flagship, Lahore'}</p>
                                </div>
                                <p class="text-[11px] text-on-surface-variant mt-2">${pm.instructions || 'Transfer funds to our verified account and WhatsApp receipt to +92 321 8456789.'}</p>
                              ` : ''}

                              ${pm.id === 'jazzcash' ? `
                                <div class="space-y-1 font-mono text-primary">
                                  <p><strong>Merchant Title:</strong> ${pm.merchant_name || 'EBA FASHION STUDIO'}</p>
                                  <p><strong>JazzCash Till / Mobile:</strong> <span class="font-bold text-red-600">${pm.account_number || pm.merchant_id || '0300 1234567'}</span></p>
                                </div>
                                <p class="text-[11px] text-on-surface-variant mt-2">${pm.instructions || 'Send total via JazzCash App or dial *786# to Till 0300 1234567.'}</p>
                              ` : ''}

                              ${pm.id === 'easypaisa' ? `
                                <div class="space-y-1 font-mono text-primary">
                                  <p><strong>Account Title:</strong> ${pm.account_title || 'EBA FASHION STUDIO'}</p>
                                  <p><strong>Easypaisa Till / Mobile:</strong> <span class="font-bold text-emerald-700">${pm.account_number || '0321 8456789'} (Till: ${pm.till_id || '78491'})</span></p>
                                </div>
                                <p class="text-[11px] text-on-surface-variant mt-2">${pm.instructions || 'Send payment via Easypaisa App or scan QR code. Save 3737 confirmation SMS.'}</p>
                              ` : ''}

                              ${pm.id === 'cod' ? `
                                <p class="text-[11px] text-on-surface-variant">Standard TCS parcel verification enabled. Exact cash payment in PKR required upon door delivery.</p>
                              ` : ''}
                            </div>
                          </div>
                        </label>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>

            </div>

            <!-- Right Column: Live Order Review (5 cols) -->
            <div class="lg:col-span-5 bg-surface-container-lowest p-6 sm:p-8 border border-surface-container-high space-y-6 sticky top-28">
              <h3 class="font-headline-sm uppercase text-primary text-xl pb-3 border-b border-surface-container-high">Order Summary</h3>

              <!-- Items Snapshot -->
              <div class="space-y-4 max-h-72 overflow-y-auto pr-1">
                ${cart.items.map(item => `
                  <div class="flex items-center gap-4 text-xs">
                    <img src="${item.image_url}" alt="${item.name}" class="w-12 h-16 object-cover bg-surface-container shrink-0"/>
                    <div class="flex-1 min-w-0">
                      <p class="font-semibold text-primary truncate">${item.name}</p>
                      <p class="text-on-surface-variant">${item.fabric || 'Unstitched'}</p>
                      ${item.add_tailoring ? `<span class="text-secondary font-semibold font-label-sm">+ Master Tailoring</span>` : ''}
                      <p class="text-on-surface-variant">Qty: ${item.quantity}</p>
                    </div>
                    <span class="font-semibold text-primary shrink-0">PKR ${(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                `).join('')}
              </div>

              <!-- Price Totals -->
              <div class="space-y-2 pt-4 border-t border-surface-container-high text-xs">
                <div class="flex justify-between text-on-surface-variant">
                  <span>Fabric Subtotal</span>
                  <span class="font-semibold text-primary">PKR ${cart.subtotal.toLocaleString()}</span>
                </div>
                ${cart.tailoringTotal > 0 ? `
                  <div class="flex justify-between text-on-surface-variant">
                    <span>Bespoke Tailoring Fee</span>
                    <span class="font-semibold text-primary">PKR ${cart.tailoringTotal.toLocaleString()}</span>
                  </div>
                ` : ''}
                ${discount > 0 ? `
                  <div class="flex justify-between text-emerald-700 font-semibold">
                    <span>Voucher Discount</span>
                    <span>-PKR ${discount.toLocaleString()}</span>
                  </div>
                ` : ''}
                <div class="flex justify-between text-on-surface-variant">
                  <span id="chk-courier-display">TCS Express Delivery</span>
                  <span id="chk-shipping-display" class="font-semibold text-primary">Complimentary</span>
                </div>
                <div class="flex justify-between text-lg font-semibold text-primary pt-3 border-t border-surface-container-high">
                  <span>Total Amount</span>
                  <span class="font-headline-sm" id="chk-total-display">PKR ${initialTotal.toLocaleString()}</span>
                </div>
              </div>

              <button type="submit" id="place-order-btn" class="btn-primary w-full py-4 text-xs">
                <span>Confirm & Place Order</span>
                <span class="material-symbols-outlined text-[18px]">verified</span>
              </button>

              <p class="font-label-sm text-[10px] text-on-surface-variant text-center leading-normal uppercase">
                By placing your order, you authorize EBA Fashion Studio to transmit dispatch updates via WhatsApp and SMS.
              </p>
            </div>

          </form>
        </section>
      `;

      // Trigger initial shipping calculation based on default city
      this.updateCheckoutShipping();
    },

    selectPaymentMethod(methodId) {
      document.querySelectorAll('.payment-method-card').forEach(c => {
        c.className = 'border border-surface-container-high bg-white p-4 transition-colors payment-method-card';
      });
      const activeCard = document.getElementById(`pay-card-${methodId}`);
      if (activeCard) {
        activeCard.className = 'border border-primary bg-surface-container-low p-4 transition-colors payment-method-card';
      }

      document.querySelectorAll('[id^="pay-details-"]').forEach(d => d.classList.add('hidden'));
      const activeDetails = document.getElementById(`pay-details-${methodId}`);
      if (activeDetails) activeDetails.classList.remove('hidden');

      const step3Display = document.getElementById('step3-payment-display');
      if (step3Display) {
        const titles = {
          cod: 'Cash on Delivery',
          bank_transfer: 'Meezan Bank Wire',
          jazzcash: 'JazzCash Wallet',
          easypaisa: 'Easypaisa Wallet'
        };
        step3Display.textContent = titles[methodId] || methodId;
      }
    },

    updateCheckoutShipping() {
      const cityEl = document.getElementById('chk-city');
      if (!cityEl) return;
      const city = cityEl.value.trim().toLowerCase();
      const zones = this.state.checkoutShippingZones || [];

      let matchedZone = zones.find(z => {
        if (!z.is_active) return false;
        if (city === 'international' && z.id === 'zone-international') return true;
        return Array.isArray(z.cities) && z.cities.some(c => city === c.toLowerCase() || city.includes(c.toLowerCase()) || c.toLowerCase().includes(city));
      }) || zones[0];

      const cart = this.state.cart;
      const subtotal = cart.subtotal + (cart.tailoringTotal || 0);
      const discount = this.state.appliedCoupon ? this.state.appliedCoupon.discount_amount : 0;
      const totalBeforeShipping = Math.max(0, subtotal - discount);

      let rate = 250;
      let threshold = 5000;
      let courier = 'TCS Express';
      let deliveryTime = '1 - 3 Days';
      let zoneName = 'Standard Nationwide';

      if (matchedZone) {
        rate = Number(matchedZone.rate) || 0;
        threshold = typeof matchedZone.free_threshold === 'number' ? matchedZone.free_threshold : 5000;
        courier = matchedZone.courier || 'TCS Express';
        deliveryTime = matchedZone.delivery_time || '2 - 3 Days';
        zoneName = matchedZone.name || 'Regional Zone';
      }

      const shippingFee = (totalBeforeShipping >= threshold) ? 0 : rate;
      const finalTotal = totalBeforeShipping + shippingFee;

      const shippingEl = document.getElementById('chk-shipping-display');
      const courierEl = document.getElementById('chk-courier-display');
      const totalEl = document.getElementById('chk-total-display');
      const zoneAlertText = document.getElementById('zone-alert-text');
      const zoneCourierTag = document.getElementById('zone-courier-tag');
      const step2Display = document.getElementById('step2-courier-display');

      if (shippingEl) {
        shippingEl.textContent = shippingFee === 0 ? 'Complimentary' : `PKR ${shippingFee.toLocaleString()}`;
        shippingEl.className = shippingFee === 0 ? 'font-semibold text-secondary' : 'font-semibold text-primary';
      }
      if (courierEl) courierEl.textContent = `${courier} (${deliveryTime})`;
      if (step2Display) step2Display.textContent = `${courier} (${shippingFee === 0 ? 'Free' : `PKR ${shippingFee}`})`;
      if (totalEl) totalEl.textContent = `PKR ${finalTotal.toLocaleString()}`;
      if (zoneAlertText) zoneAlertText.textContent = `Zone: ${zoneName} • ${deliveryTime} • Threshold: PKR ${threshold.toLocaleString()}`;
      if (zoneCourierTag) zoneCourierTag.textContent = courier;
    },

    async handlePlaceOrder(e) {
      e.preventDefault();
      const btn = document.getElementById('place-order-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>Processing Order...</span>`;
      }

      const orderData = {
        customer_name: document.getElementById('chk-name').value,
        customer_email: document.getElementById('chk-email').value,
        customer_phone: document.getElementById('chk-phone').value,
        shipping_address: document.getElementById('chk-address').value,
        area: document.getElementById('chk-area').value,
        city: document.getElementById('chk-city').value,
        province: document.getElementById('chk-province').value,
        postal_code: document.getElementById('chk-postal').value,
        payment_method: document.querySelector('input[name="payment_method"]:checked').value,
        coupon_code: this.state.appliedCoupon ? this.state.appliedCoupon.code : null,
        items: this.state.cart.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          add_tailoring: i.add_tailoring,
          tailoring_size: i.tailoring_size
        }))
      };

      try {
        const res = await EBA_API.orders.checkout(orderData);
        EBA_API.showToast('Order confirmed by EBA Atelier!');
        await this.refreshCart();
        this.state.appliedCoupon = null;
        window.location.hash = `#order-confirmation/${res.order.order_number}`;
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>Confirm & Place Order</span><span class="material-symbols-outlined text-[18px]">verified</span>`;
        }
      }
    },

    // ----------------------------------------------------
    // VIEW 6: ORDER CONFIRMATION PAGE (MATCHING STITCH)
    // ----------------------------------------------------
    async renderOrderConfirmation(container, orderNumber) {
      try {
        const res = await EBA_API.orders.lookup(orderNumber);
        const order = res.order;
        const items = res.items || [];

        container.innerHTML = `
          <!-- Top Stepper / Confirmed Rail -->
          <section class="w-full bg-surface-container-lowest border-b border-surface-container-high py-6 px-margin-mobile md:px-margin">
            <div class="max-w-6xl mx-auto flex items-center justify-between">
              <span class="font-label-sm uppercase tracking-widest text-secondary font-semibold flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[18px]">verified</span> Order Logged
              </span>
              <span class="font-label-sm text-on-surface-variant uppercase">Docket: ${order.order_number}</span>
            </div>
          </section>

          <!-- Monogram Banner -->
          <section class="w-full bg-surface px-margin-mobile md:px-margin pt-12 pb-10 text-center">
            <div class="max-w-3xl mx-auto flex flex-col items-center">
              <div class="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 border border-surface-container-highest">
                <span class="font-headline-sm uppercase text-secondary font-semibold">EBA</span>
              </div>
              <span class="font-label-md uppercase tracking-[0.2em] text-secondary mb-2">Atelier Confirmation • Dispatch Receipt</span>
              <h1 class="font-display-lg uppercase text-primary leading-tight">Thank You, ${order.customer_name}.</h1>
              <p class="font-body-md text-on-surface-variant mt-3 max-w-xl leading-relaxed">
                Order reference <strong class="text-primary font-semibold">#${order.order_number}</strong> has been securely logged. An instant verification dispatch code has been transmitted via WhatsApp to <strong class="text-primary">${order.customer_phone}</strong>.
              </p>

              <div class="flex flex-wrap items-center justify-center gap-4 mt-8 no-print">
                <button onclick="window.print()" class="btn-secondary px-6 py-3 text-xs flex items-center gap-2">
                  <span class="material-symbols-outlined text-[16px]">print</span>
                  <span>Print Formal Invoice</span>
                </button>
                <a href="#home" class="btn-primary px-8 py-3 text-xs">Continue Curating Wardrobe</a>
              </div>
            </div>
          </section>

          <!-- Order Breakdown & Logistics Details -->
          <section class="max-w-6xl mx-auto px-margin-mobile md:px-margin pb-20 print-area">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <!-- Left Column: Logistics Tracker & Customer Info (7 cols) -->
              <div class="lg:col-span-7 space-y-6">
                <!-- Logistics Status Tracker -->
                <div class="bg-surface-container-lowest p-6 sm:p-8 border border-surface-container-high space-y-6">
                  <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                    <span class="font-label-sm uppercase tracking-widest text-secondary">Live Fabric Logistics</span>
                    <span class="badge-status badge-dark">${order.order_status}</span>
                  </div>

                  <!-- 4-Stage Timeline -->
                  <div class="space-y-6">
                    <div class="flex gap-4">
                      <div class="flex flex-col items-center">
                        <span class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">✓</span>
                        <div class="w-0.5 h-10 bg-primary"></div>
                      </div>
                      <div>
                        <p class="font-label-lg uppercase tracking-wide text-primary">Order Logged & Authenticated</p>
                        <p class="font-body-sm text-on-surface-variant text-xs mt-0.5">Specifications submitted to our master unstitched cutting ledger.</p>
                      </div>
                    </div>

                    <div class="flex gap-4">
                      <div class="flex flex-col items-center">
                        <span class="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center text-xs">2</span>
                        <div class="w-0.5 h-10 bg-surface-container-high"></div>
                      </div>
                      <div>
                        <p class="font-label-lg uppercase tracking-wide text-primary">Fabric Inspection & Heirloom Packing</p>
                        <p class="font-body-sm text-on-surface-variant text-xs mt-0.5">Yardage checked for pre-shrunk integrity and sealed in climate packaging.</p>
                      </div>
                    </div>

                    <div class="flex gap-4">
                      <div class="flex flex-col items-center">
                        <span class="w-6 h-6 rounded-full bg-surface-container-high text-primary flex items-center justify-center text-xs">3</span>
                      </div>
                      <div>
                        <p class="font-label-lg uppercase tracking-wide text-primary">TCS Courier Dispatch</p>
                        <p class="font-body-sm text-on-surface-variant text-xs mt-0.5">Tracking Number: <strong>${order.tracking_number || 'Assigning...'}</strong></p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Shipping Address Card -->
                <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-2 text-xs">
                  <span class="font-label-sm uppercase tracking-widest text-secondary block mb-2">Delivery Address</span>
                  <p class="font-semibold text-primary text-sm">${order.customer_name}</p>
                  <p class="text-on-surface-variant">${order.shipping_address}, ${order.area || ''}</p>
                  <p class="text-on-surface-variant">${order.city}, ${order.province} ${order.postal_code || ''}</p>
                  <p class="text-on-surface-variant mt-2 font-medium">Payment: ${order.payment_method === 'cod' ? 'Cash on Delivery (Pending)' : 'Bank Transfer'}</p>
                </div>
              </div>

              <!-- Right Column: Order Items & Financials (5 cols) -->
              <div class="lg:col-span-5 bg-surface-container-lowest p-6 sm:p-8 border border-surface-container-high space-y-6">
                <h3 class="font-headline-sm uppercase text-primary text-lg pb-3 border-b border-surface-container-high">Order Items Snapshot</h3>
                
                <div class="space-y-4">
                  ${items.map(item => `
                    <div class="flex items-center gap-4 text-xs pb-3 border-b border-surface-container-high last:border-b-0">
                      <img src="${item.image_url}" alt="${item.product_name}" class="w-12 h-16 object-cover bg-surface-container shrink-0"/>
                      <div class="flex-1 min-w-0">
                        <p class="font-semibold text-primary truncate">${item.product_name}</p>
                        <p class="text-on-surface-variant font-mono">${item.sku}</p>
                        ${item.tailoring_selected ? `<span class="text-secondary font-semibold font-label-sm">+ Master Tailoring</span>` : ''}
                        <p class="text-on-surface-variant">Qty: ${item.quantity}</p>
                      </div>
                      <span class="font-semibold text-primary shrink-0">PKR ${item.total_price.toLocaleString()}</span>
                    </div>
                  `).join('')}
                </div>

                <div class="space-y-2 pt-4 border-t border-surface-container-high text-xs">
                  <div class="flex justify-between text-on-surface-variant">
                    <span>Subtotal</span>
                    <span class="font-semibold text-primary">PKR ${order.subtotal.toLocaleString()}</span>
                  </div>
                  ${order.discount > 0 ? `
                    <div class="flex justify-between text-emerald-700 font-semibold">
                      <span>Discount</span>
                      <span>-PKR ${order.discount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between text-on-surface-variant">
                    <span>Shipping Fee</span>
                    <span class="font-semibold text-primary">${order.shipping_fee === 0 ? 'Complimentary' : `PKR ${order.shipping_fee.toLocaleString()}`}</span>
                  </div>
                  <div class="flex justify-between text-base font-semibold text-primary pt-3 border-t border-surface-container-high">
                    <span>Total Paid/Due</span>
                    <span class="font-headline-sm">PKR ${order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

            </div>
          </section>
        `;
      } catch (err) {
        container.innerHTML = `<div class="p-20 text-center text-red-600">Failed to load order confirmation</div>`;
      }
    },

    // ----------------------------------------------------
    // VIEW 7: CLIENT SALON ACCOUNT PORTAL (MATCHING STITCH SIGN-IN)
    // ----------------------------------------------------
    async renderAccountPage(container) {
      if (!this.state.user) {
        // Render Haute Couture Sign In / Sign Up Salon screen matching Stitch!
        container.innerHTML = `
          <div class="w-full min-h-[calc(100vh-5rem)] flex flex-col lg:flex-row bg-surface">
            <!-- Left Column: Editorial Salon Showcase (45% on lg) -->
            <div class="lg:w-[45%] w-full relative min-h-[580px] lg:min-h-full flex flex-col justify-between p-8 md:p-12 overflow-hidden bg-primary text-on-primary">
              <div class="absolute inset-0 bg-cover bg-center transition-transform duration-1000 scale-105" style="background-image: url('/assets/woman_opulent_lawn.png')"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-primary via-primary/75 to-primary/40 mix-blend-multiply pointer-events-none"></div>
              
              <div class="relative z-10 flex items-center justify-between w-full border-b border-white/20 pb-4">
                <div class="flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                  <span class="font-label-sm uppercase tracking-widest text-secondary-fixed">Private Member Salon</span>
                </div>
                <span class="font-label-sm uppercase text-white/60 tracking-widest">Est. 1988 • Lahore</span>
              </div>

              <div class="relative z-10 my-auto py-8">
                <div class="backdrop-blur-md bg-black/60 border border-white/20 p-8 shadow-2xl relative">
                  <div class="absolute -top-3 left-6 px-3 bg-secondary text-white font-label-sm uppercase tracking-widest font-semibold">
                    By Invitation & Heritage
                  </div>
                  <h2 class="font-display-lg text-surface-container-lowest leading-tight tracking-tight mt-2">
                    The EBA Private Salon & Atelier Society
                  </h2>
                  <p class="font-body-sm text-surface-dim mt-3 max-w-md">
                    Enter our sanctuary reserved for connoisseurs of unstitched raw silks, imperial lawns, and artisanal threadwork.
                  </p>

                  <ul class="mt-6 space-y-3.5 border-t border-white/20 pt-6 text-xs">
                    <li class="flex items-start gap-3">
                      <span class="material-symbols-outlined text-secondary-fixed text-base mt-0.5">star</span>
                      <div>
                        <span class="font-label-sm uppercase tracking-wider text-white font-semibold">Early Access Drops</span>
                        <p class="text-surface-dim text-[11px]">Private 48-hour access window for Festive Lawn and handspun limited editions.</p>
                      </div>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="material-symbols-outlined text-secondary-fixed text-base mt-0.5">straighten</span>
                      <div>
                        <span class="font-label-sm uppercase tracking-wider text-white font-semibold">Bespoke Master Stitching</span>
                        <p class="text-surface-dim text-[11px]">Personalized atelier consultations, hand-finishing, and custom silken lining.</p>
                      </div>
                    </li>
                    <li class="flex items-start gap-3">
                      <span class="material-symbols-outlined text-secondary-fixed text-base mt-0.5">local_shipping</span>
                      <div>
                        <span class="font-label-sm uppercase tracking-wider text-white font-semibold">TCS White Glove Dispatch</span>
                        <p class="text-surface-dim text-[11px]">Yardage packed in monogrammed wooden heirloom trunks with climate seal.</p>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="relative z-10 flex items-center justify-between border-t border-white/20 pt-4 text-xs text-white/60 font-label-sm uppercase">
                <span>Atelier Vault Verification</span>
                <span>Gulberg III Flagship</span>
              </div>
            </div>

            <!-- Right Column: Authentication Forms (55% on lg) -->
            <div class="lg:w-[55%] w-full flex flex-col justify-center p-8 md:p-16 bg-surface">
              <div class="w-full max-w-md mx-auto space-y-8">
                <!-- Tab Controls -->
                <div class="flex items-center border-b border-surface-container-high">
                  <button id="auth-page-tab-signin" onclick="app.switchAuthPageTab('signin')" class="pb-3 px-4 font-label-lg uppercase tracking-widest text-primary border-b-2 border-primary transition-all">Sign In</button>
                  <button id="auth-page-tab-signup" onclick="app.switchAuthPageTab('signup')" class="pb-3 px-4 font-label-lg uppercase tracking-widest text-on-surface-variant border-b-2 border-transparent hover:text-primary transition-all">Create Account</button>
                </div>

                <!-- Sign In Form -->
                <div id="auth-page-signin-panel" class="space-y-6">
                  <div>
                    <h3 class="font-headline-lg uppercase text-primary">Patron Authentication</h3>
                    <p class="font-body-sm text-on-surface-variant mt-1">Please enter your verified atelier credentials.</p>
                  </div>

                  <form onsubmit="app.handlePageSignIn(event)" class="space-y-4">
                    <div>
                      <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Email Address *</label>
                      <input type="email" id="page-signin-email" required class="form-input text-xs" value="fatima@example.com"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Password *</label>
                      <input type="password" id="page-signin-password" required class="form-input text-xs" value="fatima123"/>
                    </div>
                    <button type="submit" class="btn-primary w-full py-4 text-xs">Sign In</button>
                  </form>
                </div>

                <!-- Sign Up Form -->
                <div id="auth-page-signup-panel" class="space-y-6 hidden">
                  <div>
                    <h3 class="font-headline-lg uppercase text-primary">Create Your Account</h3>
                    <p class="font-body-sm text-on-surface-variant mt-1">Register for private collection access, order tracking, and bespoke tailoring.</p>
                  </div>

                  <form onsubmit="app.handlePageSignUp(event)" class="space-y-4">
                    <div>
                      <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Full Name *</label>
                      <input type="text" id="page-signup-name" required class="form-input text-xs" placeholder="Fatima Noor"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Email Address *</label>
                      <input type="email" id="page-signup-email" required class="form-input text-xs" placeholder="fatima@example.com"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Phone Number (WhatsApp) *</label>
                      <input type="tel" id="page-signup-phone" required class="form-input text-xs" placeholder="+92 321 8456789"/>
                    </div>
                    <div>
                      <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block mb-1">Password *</label>
                      <input type="password" id="page-signup-password" required minlength="6" class="form-input text-xs" placeholder="••••••••"/>
                    </div>
                    <button type="submit" class="btn-primary w-full py-4 text-xs">Create Account</button>
                  </form>
                </div>

              </div>
            </div>
          </div>
        `;
        return;
      }

      // Authenticated Patron Dashboard
      try {
        const profileRes = await EBA_API.auth.me();
        const ordersRes = await EBA_API.orders.myOrders();
        const wishlistRes = await EBA_API.wishlist.get();

        const user = profileRes.user;
        const addresses = profileRes.addresses || [];
        const orders = ordersRes.orders || [];
        const wishlist = wishlistRes.items || [];
        const isAdmin = this.isUserAdmin();

        container.innerHTML = `
          <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin py-12 space-y-8">
            
            ${isAdmin ? `
              <!-- Exclusive Owner / Super Admin Console Access Banner (Visible ONLY to Owner / Admin) -->
              <div class="bg-primary text-on-primary p-6 md:p-8 border-2 border-secondary shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-secondary text-[22px]">admin_panel_settings</span>
                    <span class="font-label-sm uppercase tracking-widest text-secondary font-bold">Owner & Super Administrator Access</span>
                  </div>
                  <h2 class="font-headline-md uppercase text-white tracking-wide">EBA Administrative Atelier Console</h2>
                  <p class="font-body-sm text-surface-dim max-w-2xl leading-relaxed">
                    Authenticated with unrestricted privileges as store owner (<strong class="text-white">${user.email}</strong>). Manage live Pakistani payments (COD, JazzCash, Easypaisa, Bank Wire), TCS shipping zones, luxury product catalog, coupons, and dynamic CMS banners.
                  </p>
                </div>
                <a href="/admin" target="_blank" class="btn-primary bg-secondary text-primary font-bold px-8 py-3.5 text-xs uppercase tracking-widest flex items-center gap-2.5 hover:bg-white transition-all shadow-md whitespace-nowrap self-start md:self-auto">
                  <span class="material-symbols-outlined text-[18px]">dashboard_customize</span>
                  <span>Open Admin Panel</span>
                  <span class="material-symbols-outlined text-[16px]">launch</span>
                </a>
              </div>
            ` : ''}

            <!-- Member Header -->
            <div class="bg-surface-container-lowest p-8 border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div class="flex items-center gap-5">
                <div class="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center font-serif text-2xl font-bold">
                  ${user.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span class="font-label-sm uppercase tracking-widest text-secondary font-semibold">
                    ${isAdmin ? 'Store Owner & Super Admin' : 'VIP Salon Patron'}
                  </span>
                  <h1 class="font-headline-lg uppercase text-primary">${user.name}</h1>
                  <p class="font-body-sm text-on-surface-variant">${user.email} • ${user.phone || 'Phone not set'}</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                ${isAdmin ? `
                  <a href="/admin" target="_blank" class="btn-primary bg-secondary text-primary font-bold px-5 py-2.5 text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-white transition-all shadow-sm">
                    <span class="material-symbols-outlined text-[16px]">shield_person</span>
                    <span>Admin Panel</span>
                    <span class="material-symbols-outlined text-[14px]">arrow_outward</span>
                  </a>
                ` : ''}
                <button onclick="app.handleSignOut()" class="btn-secondary px-6 py-2.5 text-xs">Sign Out</button>
              </div>
            </div>

            <!-- Patron Dashboard Tabs -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <!-- Left: Order History (8 cols) -->
              <div class="lg:col-span-8 space-y-6">
                <div class="flex items-center justify-between pb-3 border-b border-surface-container-high">
                  <h2 class="font-headline-sm uppercase text-primary">Your Bespoke Order History (${orders.length})</h2>
                </div>

                ${orders.length === 0 ? `
                  <div class="bg-surface-container-lowest p-12 text-center border border-surface-container-high text-on-surface-variant font-body-sm">
                    No orders placed yet. Explore our unstitched lawn and cotton collections.
                  </div>
                ` : `
                  <div class="space-y-4">
                    ${orders.map(o => `
                      <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-4">
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-surface-container-high text-xs">
                          <div>
                            <span class="font-semibold text-primary font-mono text-sm">#${o.order_number}</span>
                            <span class="text-on-surface-variant ml-2">• ${new Date(o.created_at).toLocaleDateString()}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="badge-status badge-dark">${o.order_status}</span>
                            <span class="badge-status badge-outline">${o.payment_method.toUpperCase()} • ${o.payment_status}</span>
                          </div>
                        </div>

                        <div class="flex items-center justify-between text-xs">
                          <div>
                            <p class="text-on-surface-variant">Shipped via <strong>${o.courier_name}</strong></p>
                            <p class="font-mono text-secondary mt-0.5">Tracking: ${o.tracking_number || 'Processing'}</p>
                          </div>
                          <div class="text-right">
                            <span class="text-on-surface-variant block">Total:</span>
                            <span class="font-headline-sm text-primary">PKR ${o.total.toLocaleString()}</span>
                          </div>
                        </div>

                        <div class="pt-2 flex justify-end gap-3">
                          <a href="#order-confirmation/${o.order_number}" class="btn-secondary py-2 px-4 text-xs">
                            View Logistics & Receipt &rarr;
                          </a>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>

              <!-- Right: Saved Details & Wishlist (4 cols) -->
              <div class="lg:col-span-4 space-y-6">
                <!-- Address Card -->
                <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-3">
                  <h3 class="font-label-lg uppercase tracking-wider text-primary">Default Delivery Address</h3>
                  ${addresses.length > 0 ? `
                    <div class="text-xs text-on-surface-variant space-y-1">
                      <p class="font-semibold text-primary">${addresses[0].full_name}</p>
                      <p>${addresses[0].street_address}, ${addresses[0].area || ''}</p>
                      <p>${addresses[0].city}, ${addresses[0].province}</p>
                      <p>Phone: ${addresses[0].phone}</p>
                    </div>
                  ` : `
                    <p class="text-xs text-on-surface-variant">No delivery address saved yet.</p>
                  `}
                </div>

                <!-- Wishlist Summary -->
                <div class="bg-surface-container-lowest p-6 border border-surface-container-high space-y-3">
                  <div class="flex items-center justify-between">
                    <h3 class="font-label-lg uppercase tracking-wider text-primary">Curated Wishlist</h3>
                    <span class="font-label-sm text-secondary font-semibold">${wishlist.length} Items</span>
                  </div>
                  <div class="space-y-3 max-h-60 overflow-y-auto">
                    ${wishlist.map(w => `
                      <div class="flex items-center gap-3 text-xs pb-2 border-b border-surface-container-high last:border-b-0">
                        <img src="${w.primary_image}" alt="${w.name}" class="w-10 h-14 object-cover bg-surface-container"/>
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-primary truncate">${w.name}</p>
                          <p class="text-secondary font-semibold">PKR ${(w.sale_price || w.price).toLocaleString()}</p>
                        </div>
                        <button onclick="app.moveWishlistToCart(${w.id})" class="text-primary hover:text-secondary" title="Add to Bag">
                          <span class="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                        </button>
                      </div>
                    `).join('')}
                  </div>
                </div>

              </div>

            </div>
          </div>
        `;
      } catch (err) {
        console.error('Account render error:', err);
      }
    },

    switchAuthPageTab(mode) {
      const signinTab = document.getElementById('auth-page-tab-signin');
      const signupTab = document.getElementById('auth-page-tab-signup');
      const signinPanel = document.getElementById('auth-page-signin-panel');
      const signupPanel = document.getElementById('auth-page-signup-panel');

      if (mode === 'signin') {
        signinTab.className = 'pb-3 px-4 font-label-lg uppercase tracking-widest text-primary border-b-2 border-primary transition-all';
        signupTab.className = 'pb-3 px-4 font-label-lg uppercase tracking-widest text-on-surface-variant border-b-2 border-transparent hover:text-primary transition-all';
        signinPanel.classList.remove('hidden');
        signupPanel.classList.add('hidden');
      } else {
        signupTab.className = 'pb-3 px-4 font-label-lg uppercase tracking-widest text-primary border-b-2 border-primary transition-all';
        signinTab.className = 'pb-3 px-4 font-label-lg uppercase tracking-widest text-on-surface-variant border-b-2 border-transparent hover:text-primary transition-all';
        signupPanel.classList.remove('hidden');
        signinPanel.classList.add('hidden');
      }
    },

    async handlePageSignIn(e) {
      e.preventDefault();
      const email = document.getElementById('page-signin-email').value;
      const pass = document.getElementById('page-signin-password').value;
      try {
        const res = await EBA_API.auth.login(email, pass);
        this.state.user = res.user;
        this.updateHeaderAuthUI();
        EBA_API.showToast(`Welcome back, ${res.user.name}`);
        await this.renderAccountPage(document.getElementById('app-view'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async handlePageSignUp(e) {
      e.preventDefault();
      const name = document.getElementById('page-signup-name').value;
      const email = document.getElementById('page-signup-email').value;
      const phone = document.getElementById('page-signup-phone').value;
      const pass = document.getElementById('page-signup-password').value;
      try {
        const res = await EBA_API.auth.register(name, email, phone, pass);
        this.state.user = res.user;
        this.updateHeaderAuthUI();
        EBA_API.showToast(`Welcome to EBA Atelier Society, ${res.user.name}`);
        await this.renderAccountPage(document.getElementById('app-view'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // SHARED PRODUCT CARD HTML GENERATOR
    // ----------------------------------------------------
    renderProductCardHTML(p) {
      const isWish = this.isWishlisted(p.id);
      const isSale = p.is_sale;
      const price = p.sale_price || p.price;

      return `
        <article class="product-card group" id="product-card-${p.id}">
          <div class="product-image-container">
            <img src="${p.primary_image || '/assets/gul_e_noor_details.png'}" alt="${p.name}" class="product-image-main"/>
            ${p.hover_image ? `<img src="${p.hover_image}" alt="${p.name}" class="product-image-hover"/>` : ''}

            <!-- Floating Badges -->
            <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
              ${isSale ? `<span class="badge-status badge-gold">Seasonal Sale</span>` : ''}
              ${p.is_featured ? `<span class="badge-status badge-dark">Atelier Drop</span>` : ''}
            </div>

            <!-- Wishlist Heart Trigger -->
            <button onclick="app.toggleWishlist(${p.id})" class="wishlist-btn ${isWish ? 'active' : ''}" title="Save to Wishlist">
              <span class="material-symbols-outlined text-[18px]">favorite</span>
            </button>

            <!-- Quick Add Bar on Hover -->
            <div class="quick-action-bar">
              <button onclick="app.quickAdd(${p.id})" class="btn-primary flex-1 py-2 text-xs bg-white text-primary hover:bg-secondary hover:text-white">
                Quick Add to Bag
              </button>
              <a href="#product/${p.slug}" class="btn-secondary py-2 px-3 text-xs bg-black/60 text-white border-white/40 hover:bg-white hover:text-black">
                Details
              </a>
            </div>
          </div>

          <!-- Card Content -->
          <div class="p-5 flex flex-col flex-1 justify-between bg-white">
            <div>
              <div class="flex items-center justify-between text-secondary font-label-sm uppercase tracking-wider mb-1">
                <span>${p.brand_name || 'EBA Atelier'}</span>
                <span>${p.fabric ? p.fabric.split('&')[0] : 'Unstitched'}</span>
              </div>
              
              <h3 class="font-headline-sm text-primary text-lg leading-snug line-clamp-1 hover:text-secondary transition-colors cursor-pointer">
                <a href="#product/${p.slug}">${p.name}</a>
              </h3>
            </div>

            <div class="pt-3 mt-3 border-t border-surface-container-high flex items-center justify-between">
              <div class="flex items-baseline gap-2">
                <span class="font-headline-sm text-primary text-base">PKR ${price.toLocaleString()}</span>
                ${isSale ? `<span class="text-xs text-on-surface-variant line-through">PKR ${p.price.toLocaleString()}</span>` : ''}
              </div>

              <!-- Colorway Swatch Dot -->
              <span class="swatch-item" style="background-color: ${p.color_hex || '#c5a880'}" title="${p.color || 'Colorway'}"></span>
            </div>
          </div>
        </article>
      `;
    },

    // ----------------------------------------------------
    // CART STATE & DRAWER MANAGEMENT
    // ----------------------------------------------------
    async refreshCart() {
      try {
        const cart = await EBA_API.cart.get();
        this.state.cart = cart;

        // Update header badges
        const badge = document.getElementById('cart-badge');
        if (badge) {
          if (cart.itemCount > 0) {
            badge.textContent = cart.itemCount;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }

        // Update Drawer UI
        this.renderCartDrawer();
      } catch (err) {
        console.warn('Refresh cart failed:', err);
      }
    },

    renderCartDrawer() {
      const list = document.getElementById('drawer-items-list');
      const count = document.getElementById('drawer-item-count');
      const subtotal = document.getElementById('drawer-subtotal');
      const tailoringRow = document.getElementById('drawer-tailoring-row');
      const tailoring = document.getElementById('drawer-tailoring');
      const shipping = document.getElementById('drawer-shipping');
      const total = document.getElementById('drawer-total');
      const shippingMsg = document.getElementById('drawer-shipping-msg');
      const shippingProgress = document.getElementById('drawer-shipping-progress');

      const cart = this.state.cart;
      if (!list) return;

      count.textContent = `(${cart.itemCount})`;
      subtotal.textContent = `PKR ${cart.subtotal.toLocaleString()}`;
      total.textContent = `PKR ${cart.total.toLocaleString()}`;

      if (cart.tailoringTotal > 0) {
        tailoringRow.classList.remove('hidden');
        tailoring.textContent = `PKR ${cart.tailoringTotal.toLocaleString()}`;
      } else {
        tailoringRow.classList.add('hidden');
      }

      shipping.textContent = cart.shippingFee === 0 ? 'Complimentary' : `PKR ${cart.shippingFee.toLocaleString()}`;

      // Progress bar towards Free shipping
      if (cart.amountToFreeShipping === 0) {
        shippingMsg.textContent = 'Complimentary Express Delivery Activated';
        shippingProgress.style.width = '100%';
      } else {
        const pct = Math.min(100, Math.round(((cart.freeShippingThreshold - cart.amountToFreeShipping) / cart.freeShippingThreshold) * 100));
        shippingMsg.textContent = `Add PKR ${cart.amountToFreeShipping.toLocaleString()} for Free Express Delivery`;
        shippingProgress.style.width = `${pct}%`;
      }

      if (cart.items.length === 0) {
        list.innerHTML = `
          <div class="py-16 text-center text-on-surface-variant font-body-sm space-y-3">
            <span class="material-symbols-outlined text-4xl text-outline">shopping_bag</span>
            <p>Your bespoke shopping bag is empty.</p>
          </div>
        `;
        return;
      }

      list.innerHTML = cart.items.map(item => `
        <div class="flex gap-4 p-3 bg-surface-container-lowest border border-surface-container-high text-xs">
          <img src="${item.image_url}" alt="${item.name}" class="w-16 h-20 object-cover bg-surface-container shrink-0"/>
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start">
                <span class="font-semibold text-primary line-clamp-1">${item.name}</span>
                <button onclick="app.removeCartItem(${item.id})" class="text-outline hover:text-red-700 ml-2">×</button>
              </div>
              <span class="text-on-surface-variant font-mono text-[11px]">${item.sku}</span>
              ${item.add_tailoring ? `<span class="text-secondary font-semibold font-label-sm block mt-0.5">+ Master Tailoring</span>` : ''}
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-surface-container-high">
              <div class="flex items-center border border-surface-container-high bg-white">
                <button onclick="app.updateCartQty(${item.id}, ${item.quantity - 1})" class="px-2 py-0.5 text-xs">-</button>
                <span class="px-2 font-semibold">${item.quantity}</span>
                <button onclick="app.updateCartQty(${item.id}, ${item.quantity + 1})" class="px-2 py-0.5 text-xs">+</button>
              </div>
              <span class="font-semibold text-primary">PKR ${(item.unit_price * item.quantity).toLocaleString()}</span>
            </div>
          </div>
        </div>
      `).join('');
    },

    toggleCartDrawer(open) {
      const backdrop = document.getElementById('cart-drawer-backdrop');
      if (backdrop) {
        if (open) backdrop.classList.add('active');
        else backdrop.classList.remove('active');
      }
    },

    async quickAdd(productId) {
      try {
        await EBA_API.cart.add(productId, 1);
        EBA_API.showToast('Added to your bespoke shopping bag');
        await this.refreshCart();
        this.toggleCartDrawer(true);
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    // ----------------------------------------------------
    // WISHLIST MANAGEMENT
    // ----------------------------------------------------
    async refreshWishlist() {
      try {
        const res = await EBA_API.wishlist.get();
        this.state.wishlist = res.items || [];
        const badge = document.getElementById('wishlist-badge');
        if (badge) {
          if (this.state.wishlist.length > 0) {
            badge.textContent = this.state.wishlist.length;
            badge.classList.remove('hidden');
          } else {
            badge.classList.add('hidden');
          }
        }
      } catch (err) {
        console.warn('Wishlist refresh failed:', err);
      }
    },

    isWishlisted(productId) {
      return this.state.wishlist.some(w => w.id === productId || w.product_id === productId);
    },

    async toggleWishlist(productId) {
      if (!this.state.user) {
        this.toggleAuthModal(true);
        EBA_API.showToast('Please sign in to save pieces to your private wishlist', 'info');
        return;
      }

      try {
        const res = await EBA_API.wishlist.toggle(productId);
        EBA_API.showToast(res.message);
        await this.refreshWishlist();

        // Update any heart icons on page
        const cardBtn = document.querySelector(`#product-card-${productId} .wishlist-btn`);
        if (cardBtn) {
          if (res.added) cardBtn.classList.add('active');
          else cardBtn.classList.remove('active');
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async moveWishlistToCart(productId) {
      try {
        await EBA_API.wishlist.moveToCart(productId);
        EBA_API.showToast('Transferred to shopping bag');
        await this.refreshCart();
        await this.refreshWishlist();
        if (window.location.hash === '#account') {
          await this.renderAccountPage(document.getElementById('app-view'));
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    showWishlist() {
      if (!this.state.user) {
        this.toggleAuthModal(true);
        return;
      }
      window.location.hash = '#account';
    },

    // ----------------------------------------------------
    // AUTHENTICATION MODAL & STATE
    // ----------------------------------------------------
    isUserAdmin() {
      if (!this.state.user) return false;
      const email = (this.state.user.email || '').toLowerCase().trim();
      const role = (this.state.user.role || '').toLowerCase().trim();
      return email === 'ahmedthor33@gmail.com' || role === 'superadmin' || role === 'admin';
    },

    updateHeaderAuthUI() {
      const userName = document.getElementById('header-user-name');
      if (userName) {
        if (this.state.user) {
          userName.textContent = this.state.user.name.split(' ')[0];
        } else {
          userName.textContent = 'Sign In';
        }
      }

      // Admin Panel Access: Strictly hidden from all regular customers;
      // dynamically injected ONLY when signed in as Owner (ahmedthor33@gmail.com) or Super Admin.
      const isAdmin = this.isUserAdmin();

      const headerAdminSlot = document.getElementById('header-admin-slot');
      if (headerAdminSlot) {
        if (isAdmin) {
          headerAdminSlot.innerHTML = `
            <a href="/admin" target="_blank" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-secondary border border-secondary/50 hover:bg-secondary hover:text-on-secondary transition-all text-xs font-semibold uppercase tracking-wider shadow-sm" title="Administrative Atelier Console">
              <span class="material-symbols-outlined text-[16px]">shield_person</span>
              <span class="hidden md:inline">Admin Panel</span>
              <span class="material-symbols-outlined text-[13px]">arrow_outward</span>
            </a>
          `;
        } else {
          headerAdminSlot.innerHTML = '';
        }
      }

      const mobileAdminSlot = document.getElementById('mobile-admin-slot');
      if (mobileAdminSlot) {
        if (isAdmin) {
          mobileAdminSlot.innerHTML = `
            <a href="/admin" target="_blank" class="py-2 text-secondary font-bold flex items-center justify-between border-t border-surface-container-high pt-2">
              <span>Admin Atelier Console</span>
              <span class="material-symbols-outlined text-[18px]">launch</span>
            </a>
          `;
        } else {
          mobileAdminSlot.innerHTML = '';
        }
      }

      const footerAdminSlot = document.getElementById('footer-admin-slot');
      if (footerAdminSlot) {
        if (isAdmin) {
          footerAdminSlot.innerHTML = `
            <a href="/admin" target="_blank" class="hover:text-secondary-fixed transition-colors text-xs text-secondary-fixed font-semibold">Administrative Atelier Console &rarr;</a>
          `;
        } else {
          footerAdminSlot.innerHTML = '';
        }
      }
    },

    handleAuthButtonClick() {
      if (this.state.user) {
        window.location.hash = '#account';
      } else {
        this.toggleAuthModal(true);
      }
    },

    toggleAuthModal(show) {
      const modal = document.getElementById('auth-modal');
      if (modal) {
        if (show) modal.classList.replace('hidden', 'flex');
        else modal.classList.replace('flex', 'hidden');
      }
    },

    switchAuthMode(mode) {
      const signinBtn = document.getElementById('modal-tab-signin');
      const signupBtn = document.getElementById('modal-tab-signup');
      const signinForm = document.getElementById('signin-form');
      const signupForm = document.getElementById('signup-form');
      const title = document.getElementById('auth-modal-title');

      if (mode === 'signin') {
        signinBtn.className = 'flex-1 pb-2 font-label-sm uppercase tracking-wider text-primary border-b-2 border-primary';
        signupBtn.className = 'flex-1 pb-2 font-label-sm uppercase tracking-wider text-on-surface-variant border-b-2 border-transparent';
        signinForm.classList.remove('hidden');
        signupForm.classList.add('hidden');
        title.textContent = 'Member Sign In';
        const subtitle = document.getElementById('auth-modal-subtitle');
        if (subtitle) subtitle.textContent = 'Access your saved unstitched measurements and orders.';
      } else {
        signupBtn.className = 'flex-1 pb-2 font-label-sm uppercase tracking-wider text-primary border-b-2 border-primary';
        signinBtn.className = 'flex-1 pb-2 font-label-sm uppercase tracking-wider text-on-surface-variant border-b-2 border-transparent';
        signupForm.classList.remove('hidden');
        signinForm.classList.add('hidden');
        title.textContent = 'Create Account';
        const subtitle = document.getElementById('auth-modal-subtitle');
        if (subtitle) subtitle.textContent = 'Register for bespoke orders, parcel tracking, and priority drops.';
      }
    },

    async handleSignIn(e) {
      e.preventDefault();
      const email = document.getElementById('signin-email').value;
      const pass = document.getElementById('signin-password').value;

      try {
        const res = await EBA_API.auth.login(email, pass);
        this.state.user = res.user;
        this.updateHeaderAuthUI();
        this.toggleAuthModal(false);
        EBA_API.showToast(`Welcome back, ${res.user.name}`);
        await this.refreshWishlist();
        await this.refreshCart();
        if (window.location.hash === '#account') {
          await this.renderAccountPage(document.getElementById('app-view'));
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async handleSignUp(e) {
      e.preventDefault();
      const name = document.getElementById('signup-name').value;
      const email = document.getElementById('signup-email').value;
      const phone = document.getElementById('signup-phone').value;
      const pass = document.getElementById('signup-password').value;

      try {
        const res = await EBA_API.auth.register(name, email, phone, pass);
        this.state.user = res.user;
        this.updateHeaderAuthUI();
        this.toggleAuthModal(false);
        EBA_API.showToast(`Welcome to EBA Atelier Society, ${res.user.name}`);
        if (window.location.hash === '#account') {
          await this.renderAccountPage(document.getElementById('app-view'));
        }
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async handlePageSignIn(e) {
      e.preventDefault();
      const email = document.getElementById('page-signin-email').value;
      const pass = document.getElementById('page-signin-password').value;

      try {
        const res = await EBA_API.auth.login(email, pass);
        this.state.user = res.user;
        this.updateHeaderAuthUI();
        EBA_API.showToast(`Welcome back, ${res.user.name}`);
        await this.refreshWishlist();
        await this.refreshCart();
        await this.renderAccountPage(document.getElementById('app-view'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    async handlePageSignUp(e) {
      e.preventDefault();
      const name = document.getElementById('page-signup-name').value;
      const email = document.getElementById('page-signup-email').value;
      const phone = document.getElementById('page-signup-phone').value;
      const pass = document.getElementById('page-signup-password').value;

      try {
        const res = await EBA_API.auth.register(name, email, phone, pass);
        this.state.user = res.user;
        this.updateHeaderAuthUI();
        EBA_API.showToast(`Welcome to EBA Atelier Society, ${res.user.name}`);
        await this.renderAccountPage(document.getElementById('app-view'));
      } catch (err) {
        EBA_API.showToast(err.message, 'error');
      }
    },

    handleSignOut() {
      EBA_API.auth.logout();
      this.state.user = null;
      this.updateHeaderAuthUI();
      EBA_API.showToast('You have exited the member salon');
      window.location.hash = '#home';
    },

    toggleMobileMenu() {
      const menu = document.getElementById('mobile-nav');
      if (menu) menu.classList.toggle('hidden');
    },

    showPolicyModal(policy) {
      if (policy === 'shipping') {
        alert("EBA Domestic & DHL Global Shipping Policy:\n\n• Domestic Express: 2 to 4 business days via TCS & Leopards Courier.\n• Free Delivery: Automatically applied on all orders above PKR 5,000.\n• International Delivery: DHL Express worldwide dispatched within 48 hours.");
      } else {
        alert("7-Day Unstitched Inspection Guarantee:\n\nIf your unstitched yardage has not been cut or washed, you may request an exchange or inspection refund within 7 calendar days of delivery.");
      }
    },

    // Homepage featured tab switcher
    async filterHomeFeatured(btn, category) {
      const container = document.getElementById('home-featured-tabs');
      if (container) {
        container.querySelectorAll('button').forEach(b => {
          b.className = 'px-4 py-2 bg-surface hover:bg-surface-container text-on-surface font-label-md uppercase tracking-wider transition-colors';
        });
        btn.className = 'px-4 py-2 bg-primary text-on-primary font-label-md uppercase tracking-wider transition-colors active-tab';
      }

      const grid = document.getElementById('home-featured-grid');
      if (!grid) return;

      let params = { limit: 6 };
      if (category === 'men') params.category = 'men';
      else if (category === 'women') params.category = 'women';
      else if (category === 'cotton') params.subcategory = 'egyptian-cotton-120s';
      else params.is_featured = '1';

      try {
        const res = await EBA_API.products.list(params);
        grid.innerHTML = (res.products || []).map(p => this.renderProductCardHTML(p)).join('');
      } catch (e) {
        console.error(e);
      }
    }
  };

  window.app = app;
  document.addEventListener('DOMContentLoaded', () => app.init());
})();
