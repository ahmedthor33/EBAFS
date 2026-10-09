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

      // 2. Setup Global Listeners
      this.setupGlobalListeners();
      window.addEventListener('hashchange', () => this.handleRouting());

      // 3. Parallel background bootstrap (non-blocking)
      Promise.allSettled([
        this.loadCMSAndSettings(),
        this.refreshCart(),
        this.state.user ? this.refreshWishlist() : Promise.resolve(),
        this.initMetaPixel()
      ]).then(() => {
        const hash = window.location.hash || '#home';
        if (hash === '#cart' || hash === '#account') {
          this.handleRouting();
        }
      });

      // 4. Initial Route Dispatch immediately (instant perception of speed)
      await this.handleRouting();
    },

    async initMetaPixel() {
      try {
        const res = await EBA_API.store.getPixelSettings();
        const pixel = res.pixel || res;
        this.state.metaPixel = pixel;

        if (pixel && pixel.enabled && pixel.pixel_id) {
          // Asynchronously inject Meta Pixel base script
          if (!window.fbq) {
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
          }

          if (typeof window.fbq === 'function') {
            window.fbq('init', String(pixel.pixel_id));
            if (pixel.test_event_code) {
              window.fbq('set', 'test_event_code', pixel.test_event_code);
            }
            if (pixel.track_pageview !== false) {
              window.fbq('track', 'PageView');
            }
            console.log(`[EBA Atelier] Meta Pixel activated: ${pixel.pixel_id}`);
          }
        }
      } catch (err) {
        console.warn('[EBA Atelier] Meta Pixel notice:', err.message);
      }
    },

    trackMetaEvent(eventName, params = {}) {
      try {
        const pixel = this.state.metaPixel;
        if (!pixel || !pixel.enabled || !pixel.pixel_id) return;
        if (typeof window.fbq !== 'function') return;

        // Check if individual event tracking is disabled
        if (eventName === 'PageView' && pixel.track_pageview === false) return;
        if (eventName === 'ViewContent' && pixel.track_view_content === false) return;
        if (eventName === 'AddToCart' && pixel.track_add_to_cart === false) return;
        if (eventName === 'InitiateCheckout' && pixel.track_initiate_checkout === false) return;
        if (eventName === 'Purchase' && pixel.track_purchase === false) return;
        if (eventName === 'Search' && pixel.track_search === false) return;

        if (pixel.test_event_code) {
          window.fbq('set', 'test_event_code', pixel.test_event_code);
        }

        window.fbq('track', eventName, params);
      } catch (e) {
        console.warn(`[EBA Atelier] Meta Pixel '${eventName}' error:`, e.message);
      }
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

        // Update WhatsApp Concierge in footer dynamically from store settings
        const conciergePhone = this.state.settings?.general?.whatsapp || '0325-4473333';
        const cleanDigits = conciergePhone.replace(/\D/g, '').replace(/^0/, '92');
        const wLink = document.getElementById('footer-whatsapp-link');
        const wText = document.getElementById('footer-whatsapp-text');
        if (wText) wText.textContent = `${conciergePhone} (WhatsApp Concierge)`;
        if (wLink) wLink.href = `https://wa.me/${cleanDigits}`;
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
              this.trackMetaEvent('Search', { search_string: q });
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
      if (!container) return;

      container.innerHTML = `
        <div class="w-full py-32 flex flex-col items-center justify-center gap-4">
          <div class="w-8 h-8 border-2 border-primary border-t-transparent animate-spin"></div>
          <span class="font-label-sm text-secondary uppercase tracking-widest">EBA Atelier Loading...</span>
        </div>
      `;

      try {
        if (path === 'home' || path === '') {
          await this.renderHome(container);
        } else if (path === 'men') {
          await this.renderCatalog(container, { category: 'men', pageKey: 'men', title: "Men's Unstitched Atelier" });
        } else if (path === 'women' || path === 'festive-lawn-25') {
          await this.renderCatalog(container, { category: 'women', pageKey: 'women', title: "Women's Luxury Festive Lawn '25" });
        } else if (path === 'new-arrivals') {
          await this.renderCatalog(container, { is_featured: '1', pageKey: 'new_arrivals', title: 'New Unstitched Arrivals' });
        } else if (path === 'sale') {
          await this.renderCatalog(container, { is_sale: '1', pageKey: 'sale', title: 'Seasonal Archive & Sale' });
        } else if (path === 'catalog') {
          const cat = params.get('category');
          const q = params.get('q');
          const pageKey = cat === 'men' ? 'men' : (cat === 'women' ? 'women' : 'catalog');
          await this.renderCatalog(container, { category: cat, q, pageKey, title: q ? `Search: "${q}"` : 'Curated Atelier Catalog' });
        } else if (path.startsWith('product/')) {
          const slug = path.replace('product/', '');
          await this.renderProductDetails(container, slug);
          window.scrollTo({ top: 0, behavior: 'instant' });
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
          await this.renderWishlistPage(container);
        } else {
          await this.renderHome(container);
        }
      } catch (err) {
        console.error('[EBA Atelier Routing Error]:', err);
        container.innerHTML = `
          <div class="max-w-2xl mx-auto py-24 px-6 text-center space-y-4">
            <span class="material-symbols-outlined text-5xl text-secondary">error_outline</span>
            <h2 class="font-headline-sm uppercase text-primary">Atelier Page Unavailable</h2>
            <p class="font-body-sm text-on-surface-variant">${err.message || 'An unexpected issue occurred while rendering this page.'}</p>
            <div class="pt-4 flex justify-center gap-4">
              <a href="#home" class="btn-primary px-6 py-3 text-xs">Return to Home</a>
              <a href="#catalog" class="btn-secondary px-6 py-3 text-xs">Explore Catalog</a>
            </div>
          </div>
        `;
      }

      this.trackMetaEvent('PageView', { path: path || 'home' });
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

        const portals = this.state.cms?.portal_sections || {
          men: {
            title: "The Gentleman's Edit",
            edition: "Autumn / Winter Weaves • 01",
            description: "Timeless unstitched Latha, structured winter Karandi, luxurious pure Boski, and crease-resistant high-twist Wash & Wear cuts.",
            image: "/assets/men_luxury_unstitched.png",
            cta_text: "Shop Men",
            link: "#men"
          },
          women: {
            title: "The Couture Lawn ’25",
            edition: "Festive Lawn Drop • 02",
            description: "Intricate Kashmiri tilla motifs, jacquard borders, printed chiffon dupattas, and three-piece unstitched masterpieces woven on Swiss looms.",
            image: "/assets/woman_opulent_lawn.png",
            cta_text: "Shop Women",
            link: "#women"
          }
        };

        // Fetch featured products for the curated drops section
        let featuredProducts = [];
        try {
          const featuredRes = await EBA_API.products.list({ limit: 6, is_featured: '1' });
          featuredProducts = featuredRes?.products || [];
        } catch (pErr) {
          console.warn('Featured products fetch notice:', pErr);
          featuredProducts = [];
        }

        const heroImg = hero.image || '/assets/hero_campaign_editorial.png';
        const heroTitleClean = String(hero.title || 'The Art of Pakistani Weaves').replace(/<br\s*\/?>/gi, ' ');

        container.innerHTML = `
          <!-- HERO CAMPAIGN BANNER -->
          <section class="relative w-full overflow-hidden bg-surface">
            <div class="relative w-full h-[90vh] min-h-[600px] max-h-[920px] flex items-end overflow-hidden">
              <img src="${heroImg}" alt="${heroTitleClean}" class="absolute inset-0 w-full h-full object-cover object-center contrast-[1.03] brightness-100" style="image-rendering: -webkit-optimize-contrast;"/>
              <!-- Bottom gradient scrim: Leaves top 55% completely crystal clear and vibrant, smooth legibility scrim at bottom -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 via-45% to-transparent pointer-events-none"></div>
              
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
                  <img src="${promo.image || '/assets/hero_campaign_split.png'}" alt="${promo.title || 'Ustad Master Weavers Pakistani Looms'}" class="w-full h-full object-cover" onerror="this.onerror=null;this.src='/assets/hero_campaign_split.png';"/>
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

          <!-- WARDROBE DOMAINS & CATEGORY PORTALS -->
          <section class="w-full bg-surface-container-low py-20 px-margin-mobile md:px-margin border-t border-surface-container-high">
            <div class="max-w-7xl mx-auto">
              <div class="text-center max-w-2xl mx-auto mb-14">
                <span class="font-label-md uppercase tracking-[0.2em] text-secondary">Wardrobe Domains</span>
                <h2 class="font-headline-lg uppercase text-primary mt-1">Curated Category Edits</h2>
                <p class="font-body-sm text-on-surface-variant mt-2">Explore dedicated ateliers for gentlemen's unstitched fabrics and ladies' luxury festive lawn.</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <!-- Men's Domain -->
                <div class="group relative overflow-hidden bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between shadow-sm hover:shadow-xl transition-all">
                  <div class="relative aspect-[16/10] overflow-hidden bg-black/5">
                    <img src="${portals.men?.image || '/assets/men_luxury_unstitched.png'}" alt="${portals.men?.title || 'Men Atelier'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                    <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
                    <span class="absolute top-4 left-4 bg-primary/90 text-on-primary font-label-sm uppercase tracking-wider px-3 py-1 backdrop-blur-sm">
                      Men's Atelier
                    </span>
                  </div>
                  <div class="p-8 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span class="font-label-sm text-secondary uppercase tracking-widest block">${portals.men?.edition || 'Autumn / Winter Weaves • 01'}</span>
                      <h3 class="font-headline-md uppercase text-primary text-2xl mt-1">${portals.men?.title || "The Gentleman's Edit"}</h3>
                      <p class="font-body-sm text-on-surface-variant mt-2 leading-relaxed">${portals.men?.description || 'Timeless unstitched Latha, structured winter Karandi, luxurious pure Boski, and crease-resistant high-twist Wash & Wear cuts.'}</p>
                    </div>
                    <div class="pt-4">
                      <a href="${portals.men?.link || '#men'}" class="btn-primary inline-flex items-center gap-2 px-6 py-3 text-xs">
                        <span>${portals.men?.cta_text || 'Shop Men'}</span>
                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </a>
                    </div>
                  </div>
                </div>

                <!-- Women's Domain -->
                <div class="group relative overflow-hidden bg-surface-container-lowest border border-surface-container-high flex flex-col justify-between shadow-sm hover:shadow-xl transition-all">
                  <div class="relative aspect-[16/10] overflow-hidden bg-black/5">
                    <img src="${portals.women?.image || '/assets/woman_opulent_lawn.png'}" alt="${portals.women?.title || 'Women Atelier'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
                    <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent"></div>
                    <span class="absolute top-4 left-4 bg-primary/90 text-on-primary font-label-sm uppercase tracking-wider px-3 py-1 backdrop-blur-sm">
                      Women's Couture
                    </span>
                  </div>
                  <div class="p-8 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span class="font-label-sm text-secondary uppercase tracking-widest block">${portals.women?.edition || 'Festive Lawn Drop • 02'}</span>
                      <h3 class="font-headline-md uppercase text-primary text-2xl mt-1">${portals.women?.title || "The Couture Lawn ’25"}</h3>
                      <p class="font-body-sm text-on-surface-variant mt-2 leading-relaxed">${portals.women?.description || 'Intricate Kashmiri tilla motifs, jacquard borders, printed chiffon dupattas, and three-piece unstitched masterpieces woven on Swiss looms.'}</p>
                    </div>
                    <div class="pt-4">
                      <a href="${portals.women?.link || '#women'}" class="btn-primary inline-flex items-center gap-2 px-6 py-3 text-xs">
                        <span>${portals.women?.cta_text || 'Shop Women'}</span>
                        <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        `;
      } catch (err) {
        console.error('Render home error:', err);
        container.innerHTML = `
          <section class="relative w-full overflow-hidden bg-surface py-24 px-margin-mobile md:px-margin text-center">
            <div class="max-w-3xl mx-auto space-y-6">
              <span class="font-label-sm uppercase tracking-[0.2em] text-secondary">EBA Fashion Studio</span>
              <h1 class="font-display-lg uppercase text-primary text-3xl md:text-5xl">The Art of Pakistani Weaves</h1>
              <p class="font-body-md text-on-surface-variant leading-relaxed">
                Exquisite unstitched fabrics tailored for the discerning connoisseur — Hand-selected Egyptian Cotton, Festive Lawn, and Raw Silk woven across premier Pakistani mills.
              </p>
              <div class="pt-4 flex flex-wrap justify-center gap-4">
                <a href="#men" class="btn-primary px-8 py-3.5">Explore Men's Unstitched</a>
                <a href="#women" class="btn-secondary px-8 py-3.5">Explore Women's Couture</a>
              </div>
            </div>
          </section>
        `;
      }
    },

    // ----------------------------------------------------
    // VIEW 2: CATALOG / SHOPPING LISTING (MEN / WOMEN / ALL)
    // ----------------------------------------------------
    async renderCatalog(container, filterOptions = {}) {
      try {
        const pageKey = filterOptions.pageKey || (
          filterOptions.category === 'men' ? 'men' :
          (filterOptions.category === 'women' ? 'women' :
          (filterOptions.is_featured ? 'new_arrivals' :
          (filterOptions.is_sale ? 'sale' : 'catalog')))
        );

        const bannerDefaults = {
          men: {
            tagline: "Haute Sartorial Weaves • The Gentleman's Edit",
            title: "Men's Unstitched Atelier",
            subtitle: "Timeless Pakistani craft meets modern sartorial precision. Discover 4.5-meter cuts of premium Egyptian Giza 120s cotton, royal pure Boski silk, crisp summer Latha, and seasonal Wash & Wear crafted for distinguished silhouette drapes.",
            image: "/assets/men_luxury_unstitched.png",
            objectPosition: "object-[center_15%] md:object-[75%_18%]",
            badge1: "100% Authentic Thread Counts",
            badge2: "Mother-of-Pearl Buttons Included",
            badge3: "Complimentary Nationwide Shipping",
            pills: [
              { label: "All Men", filterKey: "category", filterVal: "men" },
              { label: "Egyptian Cotton 120s", filterKey: "fabric", filterVal: "Egyptian Giza Cotton 120s" },
              { label: "Pure Boski", filterKey: "fabric", filterVal: "Pure Chinese Boski" },
              { label: "Summer Latha", filterKey: "fabric", filterVal: "Summer Latha" },
              { label: "Winter Karandi", filterKey: "fabric", filterVal: "Winter Karandi" },
              { label: "Wash & Wear", filterKey: "fabric", filterVal: "Premium Wash & Wear" },
              { label: "Sale Edits", filterKey: "is_sale", filterVal: "1" }
            ],
            callout: "Master Tailoring Inclusions: Every unstitched cut ships with authentic mother-of-pearl buttons & signature EBA woven collar label."
          },
          women: {
            tagline: "Festive Couture ’25 • Vol. I",
            title: "Women's Luxury Festive Lawn '25",
            subtitle: "Sumptuous 3-piece unstitched masterpieces featuring intricate zari marori embroidery, organza cutwork borders, and pure silk & printed chiffon dupattas crafted for celebratory splendor.",
            image: "/assets/woman_opulent_lawn.png",
            objectPosition: "object-[center_12%] md:object-[75%_15%]",
            badge1: "3-Piece Luxury Festive Suites",
            badge2: "Pure Silk Chiffon Dupattas",
            badge3: "Bespoke Master Tailoring Available",
            pills: [
              { label: "All Ensembles", filterKey: "category", filterVal: "women" },
              { label: "3-Piece Festive", filterKey: "product_type", filterVal: "3-Piece Unstitched" },
              { label: "Supima Lawn", filterKey: "fabric", filterVal: "Supima Lawn 80s" },
              { label: "Pure Silk Chiffon", filterKey: "fabric", filterVal: "Pure Silk Chiffon" },
              { label: "Schiffli Organza", filterKey: "fabric", filterVal: "Schiffli Organza" },
              { label: "In Stock Ready to Ship", filterKey: "in_stock", filterVal: "1" }
            ],
            callout: "Master Tailoring Inclusions: Bespoke atelier stitching available with custom neckline, sleeve styling & premium silk lining."
          },
          new_arrivals: {
            tagline: "Fresh Loom Dispatches • Autumn / Festive ’25",
            title: "New Unstitched Arrivals",
            subtitle: "Fresh off the master looms. Hand-curated seasonal releases in ultra-fine Egyptian cotton, embroidered festive lawn, and heritage textured weaves.",
            image: "/assets/hero_campaign_editorial.png",
            objectPosition: "object-center md:object-[65%_center]",
            badge1: "Fresh Loom Dispatches",
            badge2: "Limited Edition Yardage",
            badge3: "48-Hour Priority Dispatch",
            pills: [
              { label: "All New Arrivals", filterKey: "is_featured", filterVal: "1" },
              { label: "Men's New", filterKey: "category", filterVal: "men" },
              { label: "Women's New", filterKey: "category", filterVal: "women" },
              { label: "Egyptian 120s", filterKey: "fabric", filterVal: "Egyptian Giza Cotton 120s" },
              { label: "Festive Lawn", filterKey: "fabric", filterVal: "Supima Lawn 80s" }
            ],
            callout: "Limited Edition Yardage: Direct from master looms with certified authentic thread counts & climate-sealed packaging."
          },
          sale: {
            tagline: "Exclusive Archive Reductions",
            title: "Seasonal Archive & Sale",
            subtitle: "Exceptional values on select end-of-edition unstitched luxury fabrics. Complete with authentic selvedge verification and complimentary signature packaging.",
            image: "/assets/hero_campaign_split.png",
            objectPosition: "object-center",
            badge1: "Privilege Reductions Up to 30%",
            badge2: "Authentic Yardage Certification",
            badge3: "Limited Vault Stocks",
            pills: [
              { label: "All Sale Items", filterKey: "is_sale", filterVal: "1" },
              { label: "Men's Sale", filterKey: "category", filterVal: "men" },
              { label: "Women's Sale", filterKey: "category", filterVal: "women" },
              { label: "In Stock", filterKey: "in_stock", filterVal: "1" }
            ],
            callout: "Archive Privilege: All sale fabrics include complimentary heirloom gift box packaging and inspection guarantee."
          },
          catalog: {
            tagline: "The Master Textile Vault",
            title: filterOptions.q ? `Search: "${filterOptions.q}"` : "Curated Atelier Catalog",
            subtitle: "Explore the complete archives of EBA Fashion Studio — from regal winter Karandi and Egyptian cottons to decadent celebratory lawn ensembles.",
            image: "/assets/hero_campaign_editorial.png",
            objectPosition: "object-center md:object-[65%_center]",
            badge1: "Certified Thread Counts",
            badge2: "Nationwide Express Shipping",
            badge3: "Master Bespoke Tailoring",
            pills: [
              { label: "All Collections", filterKey: "category", filterVal: "" },
              { label: "Men's Atelier", filterKey: "category", filterVal: "men" },
              { label: "Women's Couture", filterKey: "category", filterVal: "women" },
              { label: "New Arrivals", filterKey: "is_featured", filterVal: "1" },
              { label: "Seasonal Sale", filterKey: "is_sale", filterVal: "1" }
            ],
            callout: "Complimentary Nationwide Express Shipping on all orders above PKR 5,000 • Verified Cash on Delivery"
          }
        };

        const activeDefault = bannerDefaults[pageKey] || bannerDefaults.catalog;
        const cmsKey = pageKey === 'new_arrivals' ? 'new_arrivals_banner' : `${pageKey}_banner`;
        const cmsBanner = this.state.cms?.[cmsKey] || {};

        const banner = {
          tagline: cmsBanner.tagline || activeDefault.tagline,
          title: filterOptions.q ? `Search: "${filterOptions.q}"` : (cmsBanner.title || activeDefault.title),
          subtitle: cmsBanner.subtitle || activeDefault.subtitle,
          image: cmsBanner.image || activeDefault.image,
          objectPosition: cmsBanner.objectPosition || activeDefault.objectPosition || 'object-center md:object-[75%_20%]',
          badge1: cmsBanner.badge1 || activeDefault.badge1,
          badge2: cmsBanner.badge2 || activeDefault.badge2,
          badge3: cmsBanner.badge3 || activeDefault.badge3,
          pills: activeDefault.pills,
          callout: activeDefault.callout
        };

        // Fetch facets
        const facetsRes = await EBA_API.products.getFacets();
        const facets = facetsRes || {};

        container.innerHTML = `
          <!-- EDITORIAL COLLECTION HERO BANNER -->
          <section class="relative w-full min-h-[380px] md:min-h-[460px] lg:min-h-[500px] bg-neutral-950 overflow-hidden flex items-center">
            <!-- Background Visual with Luxury Overlay (Crystal Clear & Vibrant) -->
            <img src="${banner.image}" alt="${banner.title}" class="absolute inset-0 w-full h-full object-cover ${banner.objectPosition || 'object-center md:object-[75%_20%]'} contrast-[1.02] brightness-100 transition-transform duration-1000 scale-100 hover:scale-105" onerror="this.src='/assets/hero_campaign_editorial.png'" style="image-rendering: -webkit-optimize-contrast;"/>
            <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 md:via-black/20 via-45% to-transparent pointer-events-none"></div>
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

            <div class="relative z-10 w-full max-w-7xl mx-auto px-margin-mobile md:px-margin py-12 flex flex-col justify-center">
              <!-- Breadcrumb Rail -->
              <nav class="flex items-center gap-2 font-label-sm uppercase tracking-widest text-surface-dim/90 text-[11px] mb-4">
                <a href="#home" class="hover:text-white transition-colors">Home</a>
                <span class="text-white/40">/</span>
                <span class="text-secondary-fixed font-semibold">${banner.title}</span>
              </nav>

              <!-- Editorial Tagline -->
              <div class="flex items-center gap-2 mb-2">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                <span class="font-label-sm uppercase tracking-[0.25em] text-secondary-fixed font-semibold text-xs drop-shadow-sm">${banner.tagline}</span>
              </div>

              <!-- Main Title -->
              <h1 class="font-display-lg text-3xl sm:text-5xl lg:text-6xl text-white uppercase leading-tight font-normal tracking-tight max-w-3xl drop-shadow-md">
                ${banner.title}
              </h1>

              <!-- Subtitle Description -->
              <p class="font-body-md text-surface-dim max-w-2xl leading-relaxed mt-3 text-xs sm:text-sm font-light drop-shadow-sm">
                ${banner.subtitle}
              </p>

              <!-- Trust Badges Pill Row -->
              <div class="flex flex-wrap items-center gap-2 sm:gap-3 mt-6">
                ${banner.badge1 ? `
                  <div class="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 text-white font-label-sm text-[11px] uppercase tracking-wider shadow-sm">
                    <span class="material-symbols-outlined text-[15px] text-secondary-fixed">verified</span>
                    <span>${banner.badge1}</span>
                  </div>
                ` : ''}
                ${banner.badge2 ? `
                  <div class="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 text-white font-label-sm text-[11px] uppercase tracking-wider shadow-sm">
                    <span class="material-symbols-outlined text-[15px] text-secondary-fixed">local_shipping</span>
                    <span>${banner.badge2}</span>
                  </div>
                ` : ''}
                ${banner.badge3 ? `
                  <div class="inline-flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/20 px-3 py-1.5 text-white font-label-sm text-[11px] uppercase tracking-wider shadow-sm">
                    <span class="material-symbols-outlined text-[15px] text-secondary-fixed">straighten</span>
                    <span>${banner.badge3}</span>
                  </div>
                ` : ''}
              </div>
            </div>
          </section>

          <!-- Interactive Quick Filter Ribbon & Sorting Bar -->
          <div class="w-full bg-surface-container-lowest border-b border-surface-container-high px-margin-mobile md:px-margin py-3.5 shadow-sm sticky top-0 z-20">
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <!-- Quick Filter Pills -->
              <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                ${(banner.pills || []).map((pill, idx) => `
                  <button type="button" onclick="app.applyQuickPillFilter('${pill.filterKey}', '${pill.filterVal}', this)" class="quick-pill-btn shrink-0 px-4 py-2 text-xs font-label-sm uppercase tracking-wider transition-all border ${idx === 0 ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-transparent'}">
                    ${pill.label}
                  </button>
                `).join('')}
              </div>

              <!-- Sorting & Layout Controls -->
              <div class="flex items-center justify-between md:justify-end gap-4 shrink-0">
                <div class="flex items-center gap-2">
                  <label for="catalog-sort" class="font-label-sm uppercase tracking-wider text-on-surface-variant text-xs hidden sm:inline">Sort:</label>
                  <select id="catalog-sort" onchange="app.applyCatalogSort()" class="bg-surface-container-low border border-surface-container-high px-3 py-1.5 text-xs font-label-sm uppercase tracking-wider focus:outline-none cursor-pointer">
                    <option value="featured">Featured Edit</option>
                    <option value="newest">Newest Arrivals</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="bestselling">Bestselling</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Master Atelier Reassurance Strip -->
          <div class="w-full bg-surface-container-low border-b border-surface-container-high px-margin-mobile md:px-margin py-3">
            <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2 text-primary">
                <span class="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <span class="font-label-sm uppercase tracking-wider font-semibold">${banner.callout}</span>
              </div>
              <div class="flex items-center gap-3 text-on-surface-variant font-label-sm uppercase text-[11px] shrink-0">
                <span>Free WhatsApp Concierge: <strong class="text-primary">0325-4473333</strong></span>
              </div>
            </div>
          </div>

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

    applyQuickPillFilter(key, val, btnEl) {
      if (btnEl) {
        document.querySelectorAll('.quick-pill-btn').forEach(b => {
          b.className = 'quick-pill-btn shrink-0 px-4 py-2 text-xs font-label-sm uppercase tracking-wider transition-all border bg-surface-container-low text-on-surface hover:bg-surface-container border-transparent';
        });
        btnEl.className = 'quick-pill-btn shrink-0 px-4 py-2 text-xs font-label-sm uppercase tracking-wider transition-all border bg-primary text-white border-primary shadow-sm';
      }

      if (key === 'category') {
        const rad = document.querySelector(`input[name="cat_filter"][value="${val}"]`);
        if (rad) rad.checked = true;
        this.applyCatalogFilter('category', val);
      } else if (key === 'fabric') {
        this.applyCatalogFilter('fabric', val);
      } else if (key === 'product_type') {
        this.applyCatalogFilter('product_type', val);
      } else if (key === 'is_sale') {
        this.applyCatalogFilter('is_sale', val);
      } else if (key === 'is_featured') {
        this.applyCatalogFilter('is_featured', val);
      } else if (key === 'in_stock') {
        this.applyCatalogFilter('in_stock', val);
      } else {
        this.applyCatalogFilter(key, val);
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
      document.querySelectorAll('.quick-pill-btn').forEach((b, idx) => {
        b.className = idx === 0 
          ? 'quick-pill-btn shrink-0 px-4 py-2 text-xs font-label-sm uppercase tracking-wider transition-all border bg-primary text-white border-primary shadow-sm'
          : 'quick-pill-btn shrink-0 px-4 py-2 text-xs font-label-sm uppercase tracking-wider transition-all border bg-surface-container-low text-on-surface hover:bg-surface-container border-transparent';
      });
      document.querySelectorAll('input[name="cat_filter"]').forEach(r => r.checked = r.value === '');
      document.querySelectorAll('#catalog-sidebar input[type="checkbox"]').forEach(c => c.checked = false);
      this.loadCatalogProducts();
    },

    // ----------------------------------------------------
    // VIEW 3: PRODUCT DETAILS PAGE (MATCHING GUL-E-NOOR DESIGN)
    // ----------------------------------------------------
    async renderProductDetails(container, slug) {
      try {
        const cleanSlug = decodeURIComponent(slug || '').trim();
        const res = await EBA_API.products.get(cleanSlug);
        const product = res?.product || (res?.id ? res : null);
        const related = res?.related || [];

        if (!product) {
          container.innerHTML = `<div class="p-20 text-center font-headline-sm">Product not found.</div>`;
          return;
        }

        // Fire Meta Pixel ViewContent event
        this.trackMetaEvent('ViewContent', {
          content_name: product.name,
          content_ids: [String(product.id || product.sku)],
          content_type: 'product',
          value: Number(product.sale_price || product.price),
          currency: this.state.metaPixel?.currency || 'PKR'
        });

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

          <!-- ATELIER ASSURANCE BANNER STRIP -->
          <div class="w-full bg-primary text-white py-3 px-margin-mobile md:px-margin border-b border-surface-container-high">
            <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] font-label-sm uppercase tracking-widest text-surface-dim">
              <span class="flex items-center gap-1.5 text-white font-semibold">
                <span class="material-symbols-outlined text-[16px] text-secondary-fixed">verified</span>
                100% Authentic Mill-Certified Yardage
              </span>
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-secondary-fixed">local_shipping</span>
                Nationwide 48-Hour Dispatch via TCS
              </span>
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-secondary-fixed">payments</span>
                Cash on Delivery (COD) Available
              </span>
              <span class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[16px] text-secondary-fixed">straighten</span>
                Optional Master Atelier Bespoke Stitching
              </span>
            </div>
          </div>

          <!-- Product Details Grid -->
          <section class="max-w-7xl mx-auto px-margin-mobile md:px-margin py-6 md:py-12">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-start">
              
              <!-- Left Gallery (7 cols) -->
              <div class="lg:col-span-7 flex flex-col md:flex-row gap-4">
                <!-- Vertical Thumbnails -->
                <div class="flex md:flex-col gap-3 order-2 md:order-1 overflow-x-auto md:overflow-visible shrink-0 no-scrollbar">
                  ${images.map((img, idx) => `
                    <button onclick="app.switchProductDetailImage('${img.image_url}', this)" class="w-16 h-20 md:w-20 md:h-28 overflow-hidden border ${idx === 0 ? 'border-primary' : 'border-surface-container-high'} shrink-0 group">
                      <img src="${img.image_url}" alt="Thumbnail" draggable="false" class="w-full h-full object-cover group-hover:scale-105 transition-transform pointer-events-none select-none"/>
                    </button>
                  `).join('')}
                </div>

                <!-- Main Featured High-Res View (Touch-scroll enabled for mobile) -->
                <div class="flex-1 aspect-[3/4] bg-surface-container-high relative overflow-hidden border border-surface-container-high order-1 md:order-2 group touch-pan-y select-none">
                  <img id="detail-main-img" src="${primaryImg.image_url}" alt="${product.name}" draggable="false" class="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105 pointer-events-none select-none touch-pan-y"/>
                  
                  <div class="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
                    ${product.is_sale ? `<span class="badge-status badge-gold">Seasonal Sale</span>` : ''}
                    ${product.is_featured ? `<span class="badge-status badge-dark">Atelier Drop</span>` : ''}
                  </div>

                  <button onclick="app.toggleWishlist(${product.id})" class="wishlist-btn ${this.isWishlisted(product.id) ? 'active' : ''} pointer-events-auto">
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

        // Fire Meta Pixel AddToCart event
        this.trackMetaEvent('AddToCart', {
          content_ids: [String(productId)],
          content_type: 'product',
          num_items: qty,
          currency: this.state.metaPixel?.currency || 'PKR'
        });

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
      const cart = this.state.cart || {
        items: [],
        subtotal: 0,
        tailoringTotal: 0,
        shippingFee: 0,
        total: 0,
        itemCount: 0,
        amountToFreeShipping: 5000,
        freeShippingThreshold: 5000
      };
      const items = Array.isArray(cart.items) ? cart.items : [];
      const subtotal = Number(cart.subtotal) || 0;
      const tailoringTotal = Number(cart.tailoringTotal) || 0;
      const freeShippingThreshold = Number(cart.freeShippingThreshold) || 5000;
      const totalBeforeShipping = subtotal + tailoringTotal;
      const amountToFreeShipping = typeof cart.amountToFreeShipping === 'number'
        ? cart.amountToFreeShipping
        : Math.max(0, freeShippingThreshold - totalBeforeShipping);
      const shippingFee = typeof cart.shippingFee === 'number'
        ? cart.shippingFee
        : (totalBeforeShipping >= freeShippingThreshold || items.length === 0 ? 0 : 250);
      const total = Number(cart.total) || (totalBeforeShipping + shippingFee);
      const itemCount = typeof cart.itemCount === 'number'
        ? cart.itemCount
        : items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

      const cartBanner = this.state.cms?.cart_banner || {
        tagline: "Atelier Bag • Haute Couture Dispatch",
        title: "Your Curated Wardrobe Bag",
        subtitle: "Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.",
        image: "/assets/hero_campaign_split.png",
        badge1: "Complimentary Archive Packaging",
        badge2: "Free nationwide express delivery above PKR 5,000",
        enabled: true
      };

      const appliedCoupon = this.state.appliedCoupon;
      const discountAmount = appliedCoupon ? Number(appliedCoupon.discount_amount || appliedCoupon.discount || 0) : 0;
      const finalPayable = Math.max(0, total - discountAmount);

      container.innerHTML = `
        <!-- Delivery Progress Strip -->
        <section class="w-full bg-surface-container-low border-b border-surface-container-high py-3 px-margin-mobile md:px-margin">
          <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-secondary text-[18px]">verified</span>
              <span class="font-label-sm uppercase tracking-widest text-primary font-semibold">
                ${amountToFreeShipping <= 0 ? 'Complimentary Express Delivery Activated' : `Add PKR ${(amountToFreeShipping || 0).toLocaleString()} more for Free Express Delivery`}
              </span>
            </div>
            <div class="flex items-center gap-3 text-on-surface-variant font-label-sm uppercase">
              <span>48-Hour Dispatch via TCS</span>
              <span>•</span>
              <span class="text-secondary font-semibold">COD Available Worldwide</span>
            </div>
          </div>
        </section>

        <!-- LUXURY ATELIER CART BANNER -->
        <section class="relative w-full bg-neutral-950 text-on-primary py-12 md:py-16 px-margin-mobile md:px-margin overflow-hidden border-b border-surface-container-high">
          <div class="absolute inset-0 bg-cover bg-center contrast-[1.02] brightness-100" style="background-image: url('${cartBanner.image || '/assets/hero_campaign_split.png'}'); image-rendering: -webkit-optimize-contrast;"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 via-50% to-transparent pointer-events-none"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
          
          <div class="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                <span class="font-label-sm uppercase tracking-[0.25em] text-secondary-fixed text-xs font-semibold">${cartBanner.tagline || 'Atelier Bag • Haute Couture Dispatch'}</span>
              </div>
              <h1 class="font-display-lg text-3xl sm:text-5xl text-white uppercase tracking-tight">${cartBanner.title || 'Your Curated Wardrobe Bag'}</h1>
              <p class="font-body-sm text-surface-dim mt-2 max-w-xl text-xs sm:text-sm">
                ${cartBanner.subtitle || 'Every unstitched length is delivered in a climate-sealed monogrammed heirloom box with authentic yardage certification.'}
              </p>
            </div>
            
            <div class="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 p-4 shrink-0">
              <span class="material-symbols-outlined text-secondary-fixed text-3xl">inventory_2</span>
              <div class="text-xs">
                <span class="font-label-sm uppercase tracking-wider text-white block font-semibold">${cartBanner.badge1 || 'Complimentary Archive Packaging'}</span>
                <span class="text-surface-dim text-[11px]">${cartBanner.badge2 || 'Free nationwide express delivery above PKR 5,000'}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Cart Subheader Actions -->
        <header class="w-full max-w-7xl mx-auto px-margin-mobile md:px-margin pt-6 pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="font-headline-sm uppercase text-primary text-xl">Bag Contents</span>
            <span class="font-body-sm text-on-surface-variant font-normal">(${itemCount} Items)</span>
          </div>
          <a href="#catalog" class="font-label-sm text-secondary uppercase hover:underline">
            &larr; Continue Curating Wardrobe
          </a>
        </header>

        <!-- Cart Workspace -->
        <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin pb-20">
          ${items.length === 0 ? `
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
                  ${items.map(item => {
                    const unitPrice = Number(item.unit_price || item.price || 0);
                    const qty = Math.max(1, parseInt(item.quantity) || 1);
                    const lineTotal = unitPrice * qty;
                    const itemImage = item.image_url || '/assets/gul_e_noor_details.png';
                    const itemSku = item.sku || `EBA-${item.product_id || item.id}`;
                    const itemName = item.name || 'Luxury Unstitched Fabric';
                    const itemSlug = item.slug || 'catalog';
                    const itemFabric = item.fabric || 'Unstitched Fabric';

                    return `
                    <div class="bg-surface-container-lowest p-6 border border-surface-container-high flex flex-col sm:flex-row gap-6 items-start">
                      <img src="${itemImage}" alt="${itemName}" loading="lazy" decoding="async" class="w-full sm:w-32 aspect-[3/4] object-cover bg-surface-container shrink-0"/>
                      
                      <div class="flex-1 flex flex-col justify-between h-full w-full">
                        <div>
                          <div class="flex justify-between items-start gap-4">
                            <span class="font-label-sm uppercase tracking-wider text-secondary">${itemSku}</span>
                            <span class="font-headline-sm text-primary">PKR ${lineTotal.toLocaleString()}</span>
                          </div>
                          <h3 class="font-headline-sm uppercase text-primary hover:text-secondary cursor-pointer mt-1">
                            <a href="#product/${itemSlug}">${itemName}</a>
                          </h3>
                          <p class="font-body-sm text-on-surface-variant mt-1">${itemFabric}</p>
                          
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
                            <button onclick="app.updateCartQty(${item.id}, ${qty - 1})" class="px-2.5 py-1 text-sm text-primary hover:bg-surface-container-low">-</button>
                            <span class="px-3 text-xs font-semibold">${qty}</span>
                            <button onclick="app.updateCartQty(${item.id}, ${qty + 1})" class="px-2.5 py-1 text-sm text-primary hover:bg-surface-container-low">+</button>
                          </div>

                          <button onclick="app.removeCartItem(${item.id})" class="font-label-sm uppercase tracking-wider text-outline hover:text-red-700 flex items-center gap-1 transition-colors">
                            <span class="material-symbols-outlined text-[16px]">delete</span>
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Order Summary & Coupons (4 cols) -->
              <div class="lg:col-span-4 bg-surface-container-lowest p-6 border border-surface-container-high space-y-6 sticky top-28">
                <h3 class="font-headline-sm uppercase text-primary text-xl pb-3 border-b border-surface-container-high">Order Summary</h3>

                <!-- Coupon Entry -->
                <div class="space-y-2">
                  <label class="font-label-sm uppercase tracking-wider text-on-surface-variant block">Promotional Voucher</label>
                  <div class="flex gap-2">
                    <input type="text" id="cart-coupon-input" placeholder="e.g. WELCOME10" class="form-input text-xs uppercase" value="${appliedCoupon ? (appliedCoupon.code || '') : ''}"/>
                    <button onclick="app.applyCartCoupon()" class="btn-secondary px-4 py-2 text-xs shrink-0">Apply</button>
                  </div>
                  ${appliedCoupon ? `
                    <div class="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-2">
                      <span>Code <strong>${appliedCoupon.code}</strong> applied!</span>
                      <button onclick="app.removeCartCoupon()" class="text-red-600 hover:underline">Remove</button>
                    </div>
                  ` : ''}
                </div>

                <!-- Ledger -->
                <div class="space-y-3 pt-3 border-t border-surface-container-high text-xs">
                  <div class="flex justify-between text-on-surface-variant">
                    <span>Fabric Subtotal</span>
                    <span class="font-semibold text-primary">PKR ${subtotal.toLocaleString()}</span>
                  </div>
                  ${tailoringTotal > 0 ? `
                    <div class="flex justify-between text-on-surface-variant">
                      <span>Bespoke Tailoring Fee</span>
                      <span class="font-semibold text-primary">PKR ${tailoringTotal.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  ${appliedCoupon && discountAmount > 0 ? `
                    <div class="flex justify-between text-emerald-700 font-semibold">
                      <span>Voucher Discount</span>
                      <span>-PKR ${discountAmount.toLocaleString()}</span>
                    </div>
                  ` : ''}
                  <div class="flex justify-between text-on-surface-variant">
                    <span>TCS Nationwide Shipping</span>
                    <span class="font-semibold ${shippingFee === 0 ? 'text-secondary' : 'text-primary'}">
                      ${shippingFee === 0 ? 'Complimentary' : `PKR ${shippingFee.toLocaleString()}`}
                    </span>
                  </div>

                  <div class="flex justify-between text-base font-semibold text-primary pt-3 border-t border-surface-container-high">
                    <span>Total Amount</span>
                    <span class="font-headline-sm">
                      PKR ${finalPayable.toLocaleString()}
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
        this.state.appliedCoupon = res.coupon || { code, discount_amount: res.discount || 0 };
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
        const cart = this.state.cart;
        const currentItem = (cart?.items || []).find(i => i.id === itemId);
        const addTailoring = currentItem ? (currentItem.add_tailoring ? 1 : 0) : 0;
        await EBA_API.cart.update(itemId, newQty, addTailoring);
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
        const cart = this.state.cart;
        const currentItem = (cart?.items || []).find(i => i.id === itemId);
        const currentQty = currentItem ? currentItem.quantity : 1;
        await EBA_API.cart.update(itemId, currentQty, addTailoring ? 1 : 0);
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

      // Fire Meta Pixel InitiateCheckout event
      this.trackMetaEvent('InitiateCheckout', {
        num_items: cart.itemCount,
        value: cart.total,
        currency: this.state.metaPixel?.currency || 'PKR',
        content_ids: (cart.items || []).map(i => String(i.product_id))
      });

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
          { id: 'bank_transfer', name: 'Direct Bank Wire / Online Transfer (Meezan Bank IBAN)', bank_name: 'Meezan Bank Ltd', account_title: 'EBA Fashion Studio Pvt Ltd', account_number: '01000948210001', iban: 'PK64MEZN0001000948210001', branch: 'Gulberg III Main Boulevard Flagship, Lahore', instructions: 'Transfer to verified Meezan account and WhatsApp receipt to 0325-4473333.' }
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
      const checkoutBanner = this.state.cms?.checkout_banner || {
        tagline: "Verified Checkout Salon",
        title: "Express Atelier Checkout",
        subtitle: "256-Bit SSL Encrypted • Real-time SMS & WhatsApp Courier Dispatch Verification",
        image: "/assets/hero_campaign_editorial.png",
        badge1: "Live Inventory Locked",
        badge2: "TCS Nationwide",
        enabled: true
      };

      container.innerHTML = `
        <!-- CHECKOUT LUXURY ATELIER BANNER -->
        <section class="relative w-full bg-neutral-950 text-on-primary py-10 md:py-12 px-margin-mobile md:px-margin overflow-hidden border-b border-surface-container-high">
          <div class="absolute inset-0 bg-cover bg-center contrast-[1.02] brightness-100" style="background-image: url('${checkoutBanner.image || '/assets/hero_campaign_editorial.png'}'); image-rendering: -webkit-optimize-contrast;"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 via-50% to-transparent pointer-events-none"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>

          <div class="relative z-10 max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                <span class="font-label-sm uppercase tracking-[0.2em] text-secondary-fixed text-xs font-semibold">${checkoutBanner.tagline || 'Verified Checkout Salon'}</span>
              </div>
              <h1 class="font-display-lg text-2xl sm:text-4xl text-white uppercase tracking-tight">${checkoutBanner.title || 'Express Atelier Checkout'}</h1>
              <p class="font-body-sm text-surface-dim text-xs mt-1">${checkoutBanner.subtitle || '256-Bit SSL Encrypted • Real-time SMS & WhatsApp Courier Dispatch Verification'}</p>
            </div>

            <div class="flex items-center gap-2 sm:gap-4 text-xs font-label-sm uppercase tracking-wider text-surface-dim shrink-0 bg-white/10 px-3.5 py-2 border border-white/15">
              <span class="flex items-center gap-1.5 text-white font-semibold"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${checkoutBanner.badge1 || 'Live Inventory Locked'}</span>
              <span class="text-white/40">•</span>
              <span class="text-secondary-fixed font-semibold">${checkoutBanner.badge2 || 'TCS Nationwide'}</span>
            </div>
          </div>
        </section>

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
                                <p class="text-[11px] text-on-surface-variant mt-2">${pm.instructions || 'Transfer funds to our verified account and WhatsApp receipt to 0325-4473333.'}</p>
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

        // Fire Meta Pixel Purchase event
        this.trackMetaEvent('Purchase', {
          content_ids: (orderData.items || []).map(i => String(i.product_id)),
          content_type: 'product',
          value: Number(res.order?.total || 0),
          currency: this.state.metaPixel?.currency || 'PKR',
          num_items: (orderData.items || []).length,
          order_id: res.order?.order_number
        });

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
              <div class="absolute inset-0 bg-cover bg-center contrast-[1.02] brightness-100 transition-transform duration-1000 scale-105" style="background-image: url('/assets/woman_opulent_lawn.png'); image-rendering: -webkit-optimize-contrast;"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 via-45% to-transparent pointer-events-none"></div>
              
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
        let user = this.state.user || { name: 'Ahmed (Owner & Super Admin)', email: 'ahmedthor33@gmail.com' };
        let addresses = [];
        let orders = [];
        let wishlist = [];

        try {
          const profileRes = await EBA_API.auth.me();
          if (profileRes && profileRes.user) {
            user = profileRes.user;
            this.state.user = user;
          }
          if (profileRes && profileRes.addresses) {
            addresses = profileRes.addresses;
          }
        } catch (pErr) {
          console.warn('Profile fetch notice:', pErr);
        }

        try {
          const ordersRes = await EBA_API.orders.myOrders();
          orders = ordersRes?.orders || [];
        } catch (oErr) {
          console.warn('Orders fetch notice:', oErr);
        }

        try {
          const wishlistRes = await EBA_API.wishlist.get();
          wishlist = wishlistRes?.items || [];
        } catch (wErr) {
          console.warn('Wishlist fetch notice:', wErr);
        }

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
                <a href="/admin.html" target="_blank" class="btn-primary bg-secondary text-primary font-bold px-8 py-3.5 text-xs uppercase tracking-widest flex items-center gap-2.5 hover:bg-white transition-all shadow-md whitespace-nowrap self-start md:self-auto">
                  <span class="material-symbols-outlined text-[18px]">dashboard_customize</span>
                  <span>Open Admin Panel</span>
                  <span class="material-symbols-outlined text-[16px]">launch</span>
                </a>
              </div>
            ` : ''}

            <!-- VIP Member Salon Banner -->
            <div class="relative w-full bg-primary text-on-primary p-8 md:p-10 border border-surface-container-high overflow-hidden shadow-lg">
              <div class="absolute inset-0 bg-cover bg-center md:bg-[position:75%_20%] contrast-[1.02] brightness-100" style="background-image: url('/assets/men_luxury_unstitched.png'); image-rendering: -webkit-optimize-contrast;"></div>
              <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 md:via-black/20 via-45% to-transparent pointer-events-none"></div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
              <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
                    <span class="font-label-sm uppercase tracking-[0.25em] text-secondary-fixed text-xs font-semibold">Private Patron Salon • Lahore Atelier</span>
                  </div>
                  <h2 class="font-display-lg text-2xl sm:text-4xl text-white uppercase tracking-tight">The EBA Private Salon Portal</h2>
                  <p class="font-body-sm text-surface-dim mt-1.5 max-w-xl text-xs sm:text-sm">
                    Exclusive member sanctuary: Track live TCS logistics, browse your curated wishlists, and consult with bespoke tailoring artisans.
                  </p>
                </div>
                <div class="flex items-center gap-4 shrink-0">
                  <div class="bg-white/10 border border-white/20 p-3.5 text-center min-w-[80px]">
                    <span class="font-headline-sm text-white text-lg block">${orders.length}</span>
                    <span class="font-label-sm text-surface-dim uppercase text-[10px] tracking-wider">Orders Logged</span>
                  </div>
                  <div class="bg-white/10 border border-white/20 p-3.5 text-center min-w-[80px]">
                    <span class="font-headline-sm text-secondary-fixed text-lg block">${wishlist.length}</span>
                    <span class="font-label-sm text-surface-dim uppercase text-[10px] tracking-wider">Saved Weaves</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Member Header -->
            <div class="bg-surface-container-lowest p-8 border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div class="flex items-center gap-5">
                <div class="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-fixed flex items-center justify-center font-serif text-2xl font-bold">
                  ${(user.name || 'AH').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <span class="font-label-sm uppercase tracking-widest text-secondary font-semibold">
                    ${isAdmin ? 'Store Owner & Super Admin' : 'VIP Salon Patron'}
                  </span>
                  <h1 class="font-headline-lg uppercase text-primary">${user.name || 'Valued Patron'}</h1>
                  <p class="font-body-sm text-on-surface-variant">${user.email || ''} • ${user.phone || 'Phone on file'}</p>
                </div>
              </div>
              <div class="flex items-center gap-4">
                ${isAdmin ? `
                  <a href="/admin.html" target="_blank" class="btn-primary bg-secondary text-primary font-bold px-5 py-2.5 text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-white transition-all shadow-sm">
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
                            <span class="text-on-surface-variant ml-2">• ${new Date(o.created_at || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="badge-status badge-dark">${o.order_status || 'pending'}</span>
                            <span class="badge-status badge-outline">${(o.payment_method || 'cod').toUpperCase()} • ${o.payment_status || 'pending'}</span>
                          </div>
                        </div>

                        <div class="flex items-center justify-between text-xs">
                          <div>
                            <p class="text-on-surface-variant">Shipped via <strong>${o.courier_name || 'TCS Express'}</strong></p>
                            <p class="font-mono text-secondary mt-0.5">Tracking: ${o.tracking_number || 'Processing'}</p>
                          </div>
                          <div class="text-right">
                            <span class="text-on-surface-variant block">Total:</span>
                            <span class="font-headline-sm text-primary">PKR ${(o.total || 0).toLocaleString()}</span>
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
                        <img src="${w.primary_image || '/assets/gul_e_noor_details.png'}" alt="${w.name || 'Fabric'}" class="w-10 h-14 object-cover bg-surface-container"/>
                        <div class="flex-1 min-w-0">
                          <p class="font-semibold text-primary truncate">${w.name || 'Luxury Unstitched Fabric'}</p>
                          <p class="text-secondary font-semibold">PKR ${(w.sale_price || w.price || 0).toLocaleString()}</p>
                        </div>
                        <button onclick="app.moveWishlistToCart(${w.id || w.product_id})" class="text-primary hover:text-secondary" title="Add to Bag">
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
        const user = this.state.user || { name: 'Ahmed', email: 'ahmedthor33@gmail.com' };
        const isAdmin = this.isUserAdmin();
        container.innerHTML = `
          <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin py-12 space-y-8">
            ${isAdmin ? `
              <div class="bg-primary text-on-primary p-6 md:p-8 border-2 border-secondary shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-secondary text-[22px]">admin_panel_settings</span>
                    <span class="font-label-sm uppercase tracking-widest text-secondary font-bold">Owner & Super Administrator Access</span>
                  </div>
                  <h2 class="font-headline-md uppercase text-white tracking-wide">EBA Administrative Atelier Console</h2>
                  <p class="font-body-sm text-surface-dim max-w-2xl leading-relaxed">
                    Authenticated as store owner. You have full access to manage store orders, products, inventory, coupons, and CMS content.
                  </p>
                </div>
                <a href="/admin.html" target="_blank" class="btn-primary bg-secondary text-primary font-bold px-8 py-3.5 text-xs uppercase tracking-widest flex items-center gap-2.5 hover:bg-white transition-all shadow-md whitespace-nowrap">
                  <span class="material-symbols-outlined text-[18px]">dashboard_customize</span>
                  <span>Open Admin Panel</span>
                  <span class="material-symbols-outlined text-[16px]">launch</span>
                </a>
              </div>
            ` : ''}
            <div class="bg-surface-container-lowest p-8 border border-surface-container-high flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span class="font-label-sm uppercase tracking-widest text-secondary font-semibold">${isAdmin ? 'Store Owner & Super Admin' : 'VIP Salon Patron'}</span>
                <h1 class="font-headline-lg uppercase text-primary">${user.name || 'Valued Patron'}</h1>
                <p class="font-body-sm text-on-surface-variant">${user.email || ''}</p>
              </div>
              <div class="flex items-center gap-4">
                ${isAdmin ? `
                  <a href="/admin.html" target="_blank" class="btn-primary bg-secondary text-primary font-bold px-5 py-2.5 text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-white transition-all shadow-sm">
                    <span class="material-symbols-outlined text-[16px]">shield_person</span>
                    <span>Admin Panel</span>
                    <span class="material-symbols-outlined text-[14px]">arrow_outward</span>
                  </a>
                ` : ''}
                <button onclick="app.handleSignOut()" class="btn-secondary px-6 py-2.5 text-xs">Sign Out</button>
              </div>
            </div>
          </div>
        `;
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
      const unitPrice = Number(p.sale_price || p.price || 0);
      const originalPrice = Number(p.price || 0);

      return `
        <article class="product-card group" id="product-card-${p.id}">
          <div class="product-image-container">
            <a href="#product/${p.slug}" class="block w-full h-full relative" aria-label="View ${p.name || 'Piece'}">
              <img src="${p.primary_image || '/assets/gul_e_noor_details.png'}" alt="${p.name || 'Unstitched Luxury'}" loading="lazy" decoding="async" class="product-image-main"/>
              ${p.hover_image ? `<img src="${p.hover_image}" alt="${p.name || 'View'} - Alternate View" loading="lazy" decoding="async" class="product-image-hover"/>` : ''}
            </a>

            <!-- Floating Badges -->
            <div class="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
              ${isSale ? `<span class="badge-status badge-gold">Seasonal Sale</span>` : ''}
              ${p.is_featured ? `<span class="badge-status badge-dark">Atelier Drop</span>` : ''}
            </div>

            <!-- Wishlist Heart Trigger -->
            <button onclick="event.stopPropagation(); app.toggleWishlist(${p.id})" class="wishlist-btn ${isWish ? 'active' : ''}" title="Save to Wishlist">
              <span class="material-symbols-outlined text-[18px]">favorite</span>
            </button>

            <!-- Quick Add Bar on Hover -->
            <div class="quick-action-bar">
              <button onclick="event.stopPropagation(); app.quickAdd(${p.id})" class="btn-primary flex-1 py-2 text-xs bg-white text-primary hover:bg-secondary hover:text-white">
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
                <a href="#product/${p.slug}">${p.name || 'Luxury Unstitched Fabric'}</a>
              </h3>
            </div>

            <div class="pt-3 mt-3 border-t border-surface-container-high flex items-center justify-between">
              <div class="flex items-baseline gap-2">
                <span class="font-headline-sm text-primary text-base">PKR ${unitPrice.toLocaleString()}</span>
                ${isSale && originalPrice > 0 ? `<span class="text-xs text-on-surface-variant line-through">PKR ${originalPrice.toLocaleString()}</span>` : ''}
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
        if (cart && typeof cart === 'object') {
          const items = Array.isArray(cart.items) ? cart.items : [];
          const subtotal = Number(cart.subtotal) || 0;
          const tailoringTotal = Number(cart.tailoringTotal) || 0;
          const freeShippingThreshold = Number(cart.freeShippingThreshold) || 5000;
          const totalBeforeShipping = subtotal + tailoringTotal;
          const amountToFreeShipping = typeof cart.amountToFreeShipping === 'number'
            ? cart.amountToFreeShipping
            : Math.max(0, freeShippingThreshold - totalBeforeShipping);
          const shippingFee = typeof cart.shippingFee === 'number'
            ? cart.shippingFee
            : (totalBeforeShipping >= freeShippingThreshold || items.length === 0 ? 0 : 250);
          const total = Number(cart.total) || (totalBeforeShipping + shippingFee);
          const itemCount = typeof cart.itemCount === 'number'
            ? cart.itemCount
            : items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);

          this.state.cart = {
            ...cart,
            items,
            subtotal,
            tailoringTotal,
            shippingFee,
            freeShippingThreshold,
            amountToFreeShipping,
            total,
            itemCount
          };
        }
      } catch (err) {
        console.warn('Refresh cart failed:', err);
      }

      if (!this.state.cart) {
        this.state.cart = {
          items: [],
          itemCount: 0,
          subtotal: 0,
          tailoringTotal: 0,
          shippingFee: 0,
          freeShippingThreshold: 5000,
          amountToFreeShipping: 5000,
          total: 0
        };
      }

      // Update header badges
      const badge = document.getElementById('cart-badge');
      if (badge) {
        if (this.state.cart.itemCount > 0) {
          badge.textContent = this.state.cart.itemCount;
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }

      // Update Drawer UI
      this.renderCartDrawer();
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

      const cart = this.state.cart || { items: [], subtotal: 0, tailoringTotal: 0, shippingFee: 0, total: 0, itemCount: 0, amountToFreeShipping: 5000, freeShippingThreshold: 5000 };
      if (!list) return;

      if (count) count.textContent = `(${cart.itemCount || 0})`;
      if (subtotal) subtotal.textContent = `PKR ${(cart.subtotal || 0).toLocaleString()}`;
      if (total) total.textContent = `PKR ${(cart.total || 0).toLocaleString()}`;

      if (tailoringRow && tailoring) {
        if ((cart.tailoringTotal || 0) > 0) {
          tailoringRow.classList.remove('hidden');
          tailoring.textContent = `PKR ${(cart.tailoringTotal || 0).toLocaleString()}`;
        } else {
          tailoringRow.classList.add('hidden');
        }
      }

      if (shipping) {
        shipping.textContent = cart.shippingFee === 0 ? 'Complimentary' : `PKR ${(cart.shippingFee || 0).toLocaleString()}`;
      }

      // Progress bar towards Free shipping
      if (shippingMsg && shippingProgress) {
        const threshold = Number(cart.freeShippingThreshold) || 5000;
        const amtNeeded = typeof cart.amountToFreeShipping === 'number'
          ? cart.amountToFreeShipping
          : Math.max(0, threshold - ((cart.subtotal || 0) + (cart.tailoringTotal || 0)));
        if (amtNeeded <= 0) {
          shippingMsg.textContent = 'Complimentary Express Delivery Activated';
          shippingProgress.style.width = '100%';
        } else {
          const pct = Math.min(100, Math.max(0, Math.round(((threshold - amtNeeded) / threshold) * 100)));
          shippingMsg.textContent = `Add PKR ${(amtNeeded || 0).toLocaleString()} for Free Express Delivery`;
          shippingProgress.style.width = `${pct}%`;
        }
      }

      if (!cart.items || cart.items.length === 0) {
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
          <img src="${item.image_url || '/assets/gul_e_noor_details.png'}" alt="${item.name || 'Fabric'}" loading="lazy" decoding="async" class="w-16 h-20 object-cover bg-surface-container shrink-0"/>
          <div class="flex-1 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start">
                <span class="font-semibold text-primary line-clamp-1">${item.name || 'Luxury Unstitched Fabric'}</span>
                <button onclick="app.removeCartItem(${item.id})" class="text-outline hover:text-red-700 ml-2">×</button>
              </div>
              <span class="text-on-surface-variant font-mono text-[11px]">${item.sku || 'EBA-EDITION'}</span>
              ${item.add_tailoring ? `<span class="text-secondary font-semibold font-label-sm block mt-0.5">+ Master Tailoring</span>` : ''}
            </div>

            <div class="flex items-center justify-between mt-2 pt-2 border-t border-surface-container-high">
              <div class="flex items-center border border-surface-container-high bg-white">
                <button onclick="app.updateCartQty(${item.id}, ${item.quantity - 1})" class="px-2 py-0.5 text-xs">-</button>
                <span class="px-2 font-semibold">${item.quantity}</span>
                <button onclick="app.updateCartQty(${item.id}, ${item.quantity + 1})" class="px-2 py-0.5 text-xs">+</button>
              </div>
              <span class="font-semibold text-primary">PKR ${((Number(item.unit_price || item.price || 0) * (Number(item.quantity) || 1))).toLocaleString()}</span>
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

    async renderWishlistPage(container) {
      if (!this.state.user) {
        container.innerHTML = `
          <section class="max-w-4xl mx-auto px-margin-mobile md:px-margin py-20 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-surface-container-high mx-auto flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-3xl text-secondary">favorite</span>
            </div>
            <span class="font-label-sm uppercase tracking-[0.2em] text-secondary font-semibold">Client Salon • Wishlist</span>
            <h1 class="font-headline-lg uppercase text-primary">Your Private Wishlist</h1>
            <p class="font-body-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Sign in to your private client salon to curate, inspect, and save your preferred unstitched fabrics across your devices.
            </p>
            <div class="pt-6 flex flex-wrap justify-center gap-4">
              <button onclick="app.toggleAuthModal(true)" class="btn-primary px-8 py-3.5 text-xs">Sign In to Client Salon</button>
              <a href="#catalog" class="btn-secondary px-8 py-3.5 text-xs">Explore Collections</a>
            </div>
          </section>
        `;
        return;
      }

      await this.refreshWishlist();
      const wishlist = this.state.wishlist || [];

      if (wishlist.length === 0) {
        container.innerHTML = `
          <section class="max-w-4xl mx-auto px-margin-mobile md:px-margin py-20 text-center space-y-4">
            <div class="w-16 h-16 rounded-full bg-surface-container-high mx-auto flex items-center justify-center mb-2">
              <span class="material-symbols-outlined text-3xl text-secondary">favorite_border</span>
            </div>
            <span class="font-label-sm uppercase tracking-[0.2em] text-secondary font-semibold">Client Salon • Wishlist</span>
            <h1 class="font-headline-lg uppercase text-primary">Your Wishlist is Empty</h1>
            <p class="font-body-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
              Explore our master unstitched lawn, raw silk, and Egyptian cotton edits to save your desired pieces.
            </p>
            <div class="pt-6 flex justify-center">
              <a href="#catalog" class="btn-primary px-8 py-3.5 text-xs">Explore Collections</a>
            </div>
          </section>
        `;
        return;
      }

      container.innerHTML = `
        <section class="max-w-7xl mx-auto px-margin-mobile md:px-margin py-12">
          <header class="pb-8 border-b border-surface-container-high mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span class="font-label-sm uppercase tracking-[0.2em] text-secondary font-semibold block mb-1">Client Salon Private Vault</span>
              <h1 class="font-headline-lg uppercase text-primary">Saved Curations (${wishlist.length})</h1>
            </div>
            <a href="#catalog" class="font-label-sm text-secondary uppercase hover:underline">&larr; Continue Curating</a>
          </header>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${wishlist.map(item => this.renderProductCardHTML(item)).join('')}
          </div>
        </section>
      `;
    },

    showWishlist() {
      window.location.hash = '#wishlist';
    },

    // ----------------------------------------------------
    // AUTHENTICATION MODAL & STATE
    // ----------------------------------------------------
    isUserAdmin() {
      const u = this.state.user || EBA_API.admin.getUser() || EBA_API.auth.getUser();
      if (!u) return false;
      const email = (u.email || '').toLowerCase().trim();
      const role = (u.role || '').toLowerCase().trim();
      const name = (u.name || '').toLowerCase().trim();

      const hasAdminSession = !!(EBA_API.admin.getToken() || localStorage.getItem('ebafs_admin_token') || localStorage.getItem('ebafs_admin_user'));
      const isOwnerEmail = email === 'ahmedthor33@gmail.com' || email.includes('ahmedthor') || email.startsWith('ahmed');
      const isOwnerName = name.startsWith('ahmed') || name.includes('super admin') || name.includes('owner');
      const isAdminRole = role === 'superadmin' || role === 'admin' || role === 'owner';

      return isAdminRole || isOwnerEmail || isOwnerName || hasAdminSession;
    },

    updateHeaderAuthUI() {
      const userName = document.getElementById('header-user-name');
      if (userName) {
        if (this.state.user) {
          userName.textContent = (this.state.user.name || 'Account').split(' ')[0];
        } else {
          userName.textContent = 'Account';
        }
      }

      // Admin Panel Access: Strictly hidden from all regular customers;
      // dynamically injected ONLY when signed in as Owner (ahmedthor33@gmail.com) or Super Admin.
      const isAdmin = this.isUserAdmin();

      // 1. Main Navigation Link (Next to My Account)
      const navAdminSlot = document.getElementById('nav-admin-slot');
      if (navAdminSlot) {
        if (isAdmin) {
          navAdminSlot.innerHTML = `
            <a href="/admin.html" target="_blank" class="py-2 border-b-2 border-transparent text-secondary hover:text-primary font-bold transition-colors flex items-center gap-1" title="Administrative Atelier Console">
              <span class="material-symbols-outlined text-[15px]">admin_panel_settings</span>
              <span>Admin Panel</span>
              <span class="material-symbols-outlined text-[12px]">launch</span>
            </a>
          `;
        } else {
          navAdminSlot.innerHTML = '';
        }
      }

      // 2. Header Utility Button
      const headerAdminSlot = document.getElementById('header-admin-slot');
      if (headerAdminSlot) {
        if (isAdmin) {
          headerAdminSlot.innerHTML = `
            <a href="/admin.html" target="_blank" class="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-secondary border border-secondary/50 hover:bg-secondary hover:text-on-secondary transition-all text-xs font-semibold uppercase tracking-wider shadow-sm" title="Administrative Atelier Console">
              <span class="material-symbols-outlined text-[16px]">shield_person</span>
              <span class="hidden md:inline">Admin Panel</span>
              <span class="material-symbols-outlined text-[13px]">arrow_outward</span>
            </a>
          `;
        } else {
          headerAdminSlot.innerHTML = '';
        }
      }

      // 3. Mobile Navigation Drawer Link
      const mobileAdminSlot = document.getElementById('mobile-admin-slot');
      if (mobileAdminSlot) {
        if (isAdmin) {
          mobileAdminSlot.innerHTML = `
            <a href="/admin.html" target="_blank" class="py-2 text-secondary font-bold flex items-center justify-between border-t border-surface-container-high pt-2">
              <span class="flex items-center gap-2">
                <span class="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                <span>Admin Atelier Console</span>
              </span>
              <span class="material-symbols-outlined text-[18px]">launch</span>
            </a>
          `;
        } else {
          mobileAdminSlot.innerHTML = '';
        }
      }

      // 4. Footer Console Link
      const footerAdminSlot = document.getElementById('footer-admin-slot');
      if (footerAdminSlot) {
        if (isAdmin) {
          footerAdminSlot.innerHTML = `
            <a href="/admin.html" target="_blank" class="hover:text-secondary-fixed transition-colors text-xs text-secondary-fixed font-semibold">Administrative Atelier Console &rarr;</a>
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
