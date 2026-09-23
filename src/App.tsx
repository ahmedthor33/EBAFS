import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, ScrollRestoration } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

// Layouts & Global Components
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { AdminLayout } from './components/admin/AdminLayout';

// Customer Pages
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { BrandsPage } from './pages/BrandsPage';
import { BrandDetailPage } from './pages/BrandDetailPage';
import { CartPage } from './pages/CartPage';
import { WishlistPage } from './pages/WishlistPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { AccountPage } from './pages/account/AccountPage';
import { OrdersPage } from './pages/account/OrdersPage';
import { OrderDetailPage } from './pages/account/OrderDetailPage';
import {
  AboutPage,
  ContactPage,
  ShippingPolicyPage,
  ReturnPolicyPage,
  TermsPage,
  PrivacyPolicyPage,
} from './pages/StaticPages';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminProductForm } from './pages/admin/AdminProductForm';
import { AdminBrands } from './pages/admin/AdminBrands';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminShipping } from './pages/admin/AdminShipping';
import { AdminPayments } from './pages/admin/AdminPayments';
import { AdminCustomers } from './pages/admin/AdminCustomers';
import { AdminAdmins } from './pages/admin/AdminAdmins';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminActivity } from './pages/admin/AdminActivity';

// Customer Layout Wrapper
const StorefrontLayout: React.FC = () => {
  return (
    <>
      <Header />
      <div className="main-content">
        <Outlet />
      </div>
      <Footer />
      <CartDrawer />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <Routes>
              {/* Customer Facing Storefront */}
              <Route element={<StorefrontLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage key="shop-all" />} />
                <Route path="/men" element={<ShopPage key="shop-men" initialGender="MEN" />} />
                <Route path="/women" element={<ShopPage key="shop-women" initialGender="WOMEN" />} />
                <Route path="/product/:slug" element={<ProductDetailsPage />} />
                <Route path="/brands" element={<BrandsPage />} />
                <Route path="/brand/:slug" element={<BrandDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />

                {/* Authentication & Customer Account */}
                <Route path="/signin" element={<SignInPage />} />
                <Route path="/signup" element={<SignUpPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/orders/:id" element={<OrderDetailPage />} />

                {/* Policies & Company Pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/shipping-policy" element={<ShippingPolicyPage />} />
                <Route path="/return-policy" element={<ReturnPolicyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
              </Route>

              {/* Completely Separated & Protected Admin Panel */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm />} />
                <Route path="products/:id/edit" element={<AdminProductForm />} />
                <Route path="brands" element={<AdminBrands />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="orders" element={<AdminOrders />} />
                <Route path="shipping" element={<AdminShipping />} />
                <Route path="payments" element={<AdminPayments />} />
                <Route path="customers" element={<AdminCustomers />} />
                <Route path="admins" element={<AdminAdmins />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="activity" element={<AdminActivity />} />
              </Route>
            </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
