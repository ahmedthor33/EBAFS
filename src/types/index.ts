export type Role = 'OWNER' | 'MANAGER' | 'ORDER_MANAGER' | 'CONTENT_MANAGER' | 'CUSTOMER';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: Role;
  created_at?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  is_featured: boolean;
  is_active: boolean;
  display_order: number;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: 'MEN' | 'WOMEN' | 'UNISEX';
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  subcategories?: Subcategory[];
  created_at?: string;
}

export interface Subcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
}

export interface ProductImage {
  id: string;
  product_id?: string;
  url: string;
  alt_text?: string;
  display_order: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id?: string;
  sku?: string;
  size?: string;
  color?: string;
  fabric?: string;
  price?: number;
  stock_quantity: number;
}

export interface Product {
  id: string;
  brand_id?: string;
  category_id?: string;
  subcategory_id?: string;
  name: string;
  slug: string;
  sku?: string;
  description?: string;
  short_description?: string;
  price: number;
  sale_price?: number | null;
  cost_price?: number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  fabric?: string;
  color?: string;
  season?: string;
  gender: 'MEN' | 'WOMEN' | 'UNISEX';
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED';
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_on_sale: boolean;
  created_at?: string;
  updated_at?: string;

  // Joined relations
  brand?: Brand;
  category?: Category;
  subcategory?: Subcategory;
  images?: ProductImage[];
  variants?: ProductVariant[];
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  product_id: string;
  product: Product;
  created_at?: string;
}

export interface CartItem {
  id: string;
  cart_id?: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  product: Product;
  variant?: ProductVariant | null;
}

export interface Address {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  street_address: string;
  city: string;
  province: string;
  postal_code?: string;
  is_default: boolean;
}

export interface ShippingZone {
  id: string;
  name: string;
  provinces: string[];
  rate: number;
  free_shipping_threshold?: number | null;
  estimated_days?: string;
  is_active: boolean;
}

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  instructions?: string;
  account_details?: Record<string, any>;
  is_active: boolean;
  display_order: number;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  product_sku?: string;
  product_image?: string;
  variant_title?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: {
    full_name: string;
    phone: string;
    street_address: string;
    city: string;
    province: string;
    postal_code?: string;
  };
  subtotal: number;
  shipping_fee: number;
  discount: number;
  total_amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  customer_notes?: string;
  internal_notes?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  method: string;
  transaction_reference?: string;
  proof_image_url?: string;
  status: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface SiteSettings {
  id: string;
  store_name: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  instagram_url: string;
  facebook_url: string;
  tiktok_url: string;
  announcement_text: string;
  hero_banners?: Array<{
    id?: number | string;
    title: string;
    eyebrow: string;
    subtitle: string;
    bgImage?: string;
    image?: string;
    btnMen?: string;
    btnWomen?: string;
    linkMen?: string;
    linkWomen?: string;
    link_men?: string;
    link_women?: string;
  }>;
  promo_banner?: {
    eyebrow: string;
    title: string;
    paragraph: string;
    image: string;
    btnText: string;
    btnLink: string;
  };
  currency: string;
  category_banners?: {
    men?: {
      eyebrow?: string;
      title?: string;
      desc?: string;
      bgImage?: string;
    };
    women?: {
      eyebrow?: string;
      title?: string;
      desc?: string;
      bgImage?: string;
    };
    all?: {
      eyebrow?: string;
      title?: string;
      desc?: string;
      bgImage?: string;
    };
    brands?: {
      eyebrow?: string;
      title?: string;
      desc?: string;
      bgImage?: string;
    };
  };
}

export interface AdminActivityLog {
  id: string;
  admin_user_id?: string;
  admin_email?: string;
  action: string;
  entity: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}
