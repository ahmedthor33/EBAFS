import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { CartItem, Product, ProductVariant } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant | null) => Promise<void>;
  removeFromCart: (productId: string, variantId?: string | null) => Promise<void>;
  updateQuantity: (productId: string, quantity: number, variantId?: string | null) => Promise<void>;
  clearCart: () => Promise<void>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isLoading: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load cart from Supabase or localStorage
  const loadCart = async () => {
    setIsLoading(true);

    if (isSupabaseConfigured() && user) {
      try {
        // Fetch or create user cart
        let { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!cart) {
          const { data: newCart } = await supabase
            .from('carts')
            .insert([{ user_id: user.id }])
            .select('id')
            .single();
          cart = newCart;
        }

        if (cart) {
          const { data: cartItems } = await supabase
            .from('cart_items')
            .select(`
              id,
              cart_id,
              product_id,
              variant_id,
              quantity,
              product:products(*, brand:brands(*), images:product_images(*)),
              variant:product_variants(*)
            `)
            .eq('cart_id', cart.id);

          if (cartItems) {
            setItems(cartItems as unknown as CartItem[]);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase loadCart fallback:', err);
      }
    }

    // LocalStorage fallback
    const saved = localStorage.getItem('eba_cart');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        setItems([]);
      }
    } else {
      setItems([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadCart();
  }, [user]);

  // Sync to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('eba_cart', JSON.stringify(items));
    }
  }, [items, user]);

  const addToCart = async (product: Product, quantity = 1, variant: ProductVariant | null = null) => {
    const existingIndex = items.findIndex(
      it => it.product_id === product.id && (it.variant_id ?? null) === (variant?.id ?? null)
    );

    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = [...items];
      updated[existingIndex].quantity += quantity;
    } else {
      const newItem: CartItem = {
        id: `ci_${Date.now()}`,
        product_id: product.id,
        variant_id: variant?.id || null,
        quantity,
        product,
        variant,
      };
      updated = [...items, newItem];
    }

    setItems(updated);
    setIsCartOpen(true);

    if (isSupabaseConfigured() && user) {
      try {
        const { data: cart } = await supabase.from('carts').select('id').eq('user_id', user.id).single();
        if (cart) {
          await supabase.from('cart_items').upsert({
            cart_id: cart.id,
            product_id: product.id,
            variant_id: variant?.id || null,
            quantity: existingIndex > -1 ? updated[existingIndex].quantity : quantity,
          }, { onConflict: 'cart_id,product_id,variant_id' });
        }
      } catch (err) {
        console.warn('Supabase addToCart sync error:', err);
      }
    }
  };

  const removeFromCart = async (productId: string, variantId?: string | null) => {
    const updated = items.filter(
      it => !(it.product_id === productId && (it.variant_id ?? null) === (variantId ?? null))
    );
    setItems(updated);

    if (isSupabaseConfigured() && user) {
      try {
        const { data: cart } = await supabase.from('carts').select('id').eq('user_id', user.id).single();
        if (cart) {
          let q = supabase.from('cart_items').delete().eq('cart_id', cart.id).eq('product_id', productId);
          if (variantId) q = q.eq('variant_id', variantId);
          await q;
        }
      } catch (err) {
        console.warn('Supabase removeFromCart sync error:', err);
      }
    }
  };

  const updateQuantity = async (productId: string, quantity: number, variantId?: string | null) => {
    if (quantity <= 0) {
      await removeFromCart(productId, variantId);
      return;
    }

    const updated = items.map(it => {
      if (it.product_id === productId && (it.variant_id ?? null) === (variantId ?? null)) {
        return { ...it, quantity };
      }
      return it;
    });
    setItems(updated);

    if (isSupabaseConfigured() && user) {
      try {
        const { data: cart } = await supabase.from('carts').select('id').eq('user_id', user.id).single();
        if (cart) {
          let q = supabase
            .from('cart_items')
            .update({ quantity, updated_at: new Date().toISOString() })
            .eq('cart_id', cart.id)
            .eq('product_id', productId);
          if (variantId) q = q.eq('variant_id', variantId);
          await q;
        }
      } catch (err) {
        console.warn('Supabase updateQuantity sync error:', err);
      }
    }
  };

  const clearCart = async () => {
    setItems([]);
    localStorage.removeItem('eba_cart');

    if (isSupabaseConfigured() && user) {
      try {
        const { data: cart } = await supabase.from('carts').select('id').eq('user_id', user.id).single();
        if (cart) {
          await supabase.from('cart_items').delete().eq('cart_id', cart.id);
        }
      } catch (err) {
        console.warn('Supabase clearCart sync error:', err);
      }
    }
  };

  const itemCount = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity, 0);
  }, [items]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = it.product.sale_price ?? it.product.price;
      return sum + price * it.quantity;
    }, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
