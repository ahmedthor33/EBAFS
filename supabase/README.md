# EBA Fashion Studio — Supabase Cloud Backend Integration

## Project Configuration
- **Supabase Project Reference**: `ydycwzcfptlbfvzbyzlb`
- **Supabase Base URL**: `https://ydycwzcfptlbfvzbyzlb.supabase.co`
- **Dashboard URL**: [https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb](https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb)
- **SQL Editor**: [https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb/sql/new](https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb/sql/new)

---

## What Has Been Installed & Configured

1. **Supabase JavaScript SDK (`@supabase/supabase-js`) & `dotenv`**:
   Installed and initialized in `db/supabase.js`.
2. **Environment Variables**:
   Saved in `.env` and `.env.example`.
3. **Turnkey SQL Migration Script**:
   Generated at [`supabase/setup.sql`](./setup.sql).
   Contains:
   - 17 production tables (`users`, `customer_profiles`, `addresses`, `roles_permissions`, `brands`, `categories`, `products`, `product_images`, `wishlist`, `cart_items`, `coupons`, `coupon_usages`, `orders`, `order_items`, `inventory_logs`, `cms_content`, `store_settings`).
   - Row Level Security (RLS) policies allowing public storefront browsing and secure transactions.
   - Pre-seeded data with all 10 Pakistani unstitched products, categories, coupons, and CMS content.
4. **Live Status API Endpoint**:
   Accessible at `GET /api/supabase/status`.
5. **Admin Console Integration**:
   Real-time Supabase Cloud badge in the Admin sidebar and a dedicated integration management card under **Store Settings**.

---

## 1-Click Database Setup on Supabase

To initialize all PostgreSQL tables and seed data in your Supabase project:

1. Open the [Supabase SQL Editor](https://supabase.com/dashboard/project/ydycwzcfptlbfvzbyzlb/sql/new).
2. Open the generated file [`supabase/setup.sql`](./setup.sql) in your editor.
3. Copy all contents, paste into the Supabase SQL editor, and click **RUN**.
4. Run the data sync command:
   ```bash
   npm run supabase:sync
   ```
