# EBA Fashion Studio — Luxury Full-Stack Ecommerce Platform

A production-ready full-stack ecommerce application for **EBA Fashion Studio** (Pakistani Haute Couture Unstitched Fabrics: Lawn, Egyptian Cotton 120s, Pure Raw Silk, Winter Karandi, and Pure Boski), designed from the ground up matching the **Google Stitch** design system.

---

## 🏛️ Architecture Overview

- **Design System**: Editorial minimalism, museum-grade typography (**Bodoni Moda** headlines & **Plus Jakarta Sans** grotesques), architectural lines, bone ivory canvas (`#F9F9F7`), deep obsidian (`#111111`), champagne gold accents (`#C5A880`), 0px border-radius primitives.
- **Storefront**: Dynamic Single-Page Experience with hash routing (`#home`, `#men`, `#women`, `#festive-lawn-25`, `#sale`, `#product/:slug`, `#cart`, `#checkout`, `#order-confirmation/:orderNumber`, `#account`).
- **Admin Application**: Fully protected portal with server-side Role-Based Access Control (RBAC), accessible at `/admin`.
- **Backend**: Node.js v24 + Express RESTful API.
- **Database**: Relational SQLite via Node's native `node:sqlite` (`ebafs.db`) with WAL mode, foreign keys, ACID transactions, and atomic inventory management.
- **Storage**: Real image and asset storage under `/uploads` and `/assets`.

---

## ⚡ Quick Start

```bash
# 1. Start the server (runs on port 3000)
npm start

# 2. Re-seed demo database (optional)
npm run seed

# 3. Run automated end-to-end test suite
npm test
```

- **Customer Storefront**: [http://localhost:3000](http://localhost:3000)
- **Admin Atelier Console**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 Authentication Credentials

### Admin Users (Protected Console)
| Role | Email | Password | Privileges |
|---|---|---|---|
| **Super Admin** | `admin@ebafashion.pk` | `admin123` | Full system access (Catalog, Sales, Content, Reports, Users, Settings) |
| **Staff Member** | `staff@ebafashion.pk` | `staff123` | Products viewing, inventory adjustments, order management |

### Demo Customer
| Role | Email | Password | Notes |
|---|---|---|---|
| **VIP Patron** | `fatima@example.com` | `fatima123` | Pre-configured customer profile with past order history |

---

## 💎 Features Implemented

### 1. Customer Storefront
- **CMS Announcement Bar**: Live editable promo strip with nationwide shipping notices.
- **Hero Campaign Banner**: Editorial campaign with high-res photography, trust tags, and dual CTAs.
- **Marquee Ticker**: Real authentic thread-counts running ticker.
- **Gateway Portals**: Separate Men's Atelier (*The Gentleman's Edit*) and Women's Couture Lawn portals.
- **Faceted Product Filter**: Filter unstitched fabrics by Category, Suit Type (3-Piece, 2-Piece, Unstitched 4.5m), Fabric & Weave, Stock Availability, and Sort By (Price, Newest, Bestselling).
- **Product Details View**:
  - High-res multi-angle thumbnail gallery and preview.
  - Price & Sale Price in PKR.
  - Fabric & yardage specifications (Shirt, Dupatta, Trousers length and thread count).
  - **Master Tailor Stitching Service** toggle (+PKR 4,500) with size selector (XS–XL, Custom).
  - Real-time stock status (In stock, low-stock warning, sold-out badge).
  - Accordion tabs for Fabric Details, Care Instructions, and Dispatch Policies.
- **Shopping Bag**:
  - Slide-over quick cart drawer accessible from header.
  - Dedicated cart page (`#cart`).
  - Item tailoring toggle and quantity adjustments.
  - Real-time server-side coupon validation (`WELCOME10`, `FESTIVE25`, `VIPATELIER`).
  - Dynamic Free Express Delivery progress bar (threshold: PKR 5,000).
- **Express Checkout**:
  - 4-Step progress tracker matching Google Stitch UI.
  - Pakistan WhatsApp & SMS dispatch notice.
  - Destination address with major Pakistan city selectors.
  - Payment options: **Cash on Delivery (COD)** and **Direct Bank Transfer** (with Meezan Bank IBAN details).
  - Server-side inventory deduction and order snapshot creation.
- **Order Confirmation**:
  - EBA Crest seal and order reference `#EBA-XXXXX-PK`.
  - 4-Stage Live Fabric Logistics timeline tracker.
  - Itemized receipt breakdown.
  - One-click Print/PDF invoice action.
- **Private Member Salon**:
  - Customer registration and login.
  - Past order history with live courier tracking codes (TCS Express).
  - Saved addresses and persistent wishlist with 1-click "Move to Bag".

### 2. Admin Atelier Console (`/admin`)
- **Dashboard**: Real database financial metrics (Revenue, Orders, AOV, Dispatched Units, Customers), recent orders table, top selling pieces.
- **Catalog Management**:
  - Products: Full CRUD, image uploads/reorder, pricing, stock, fabric, duplicate product, toggle publish/draft/featured/sale.
  - Categories: Hierarchical parent/child category tree (Men, Women, subcategories), Add/Edit/Delete.
  - Brands: Manage atelier brand houses.
- **Inventory Health**: Stock levels overview, low stock alerts, manual adjustments (+/-) with audit trail logging.
- **Sales & Orders**: View all orders, filter by status, update fulfillment and payment statuses, assign courier tracking numbers (TCS Express), print dispatch receipts.
- **Promotions & Coupons**: CRUD for percentage and fixed discount vouchers with minimum order and usage caps.
- **Patron Management**: Directory of registered customers, total spending in PKR, order history, account active/suspended toggle.
- **Homepage CMS**: Live editable Announcement Bar text & toggle, Hero Campaign banner, gateway cards, and promotional sections. Changes update the public site immediately.
- **Financial Intelligence**: Date-range filtered revenue analytics (Today, 7 days, 30 days, All-time), top products leaderboard, payment channel split.
- **Staff & RBAC**: Admin users management and granular permissions matrix.
- **Store Configuration**: General info, domestic shipping fee and free delivery thresholds, payment gateway toggles, master tailoring fee settings.

---

## 🧪 Automated Test Suite

An end-to-end integration test suite is included in `test-e2e.js`:
```bash
node test-e2e.js
```
Validates:
1. Static routes and font loading
2. Product catalog and single product detail
3. Persistent cart with tailoring service calculations
4. Server-side coupon verification
5. Order placement, stock deduction, and tracking lookup
6. Admin authentication and RBAC permissions
7. Financial reporting database queries
8. Real-time CMS updates and storefront reflection
