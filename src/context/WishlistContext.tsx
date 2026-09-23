import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Product } from '../types';

interface WishlistContextType {
  wishlist: Product[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadWishlist = async () => {
    setIsLoading(true);

    if (isSupabaseConfigured() && user) {
      try {
        let { data: wl } = await supabase
          .from('wishlists')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!wl) {
          const { data: newWl } = await supabase
            .from('wishlists')
            .insert([{ user_id: user.id }])
            .select('id')
            .single();
          wl = newWl;
        }

        if (wl) {
          const { data: items } = await supabase
            .from('wishlist_items')
            .select('product_id, product:products(*, brand:brands(*), images:product_images(*))')
            .eq('wishlist_id', wl.id);

          if (items) {
            setWishlist(items.map((it: any) => it.product).filter(Boolean));
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase loadWishlist fallback:', err);
      }
    }

    const saved = localStorage.getItem('eba_wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {
        setWishlist([]);
      }
    } else {
      setWishlist([]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadWishlist();
  }, [user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem('eba_wishlist', JSON.stringify(wishlist));
    }
  }, [wishlist, user]);

  const isInWishlist = (productId: string) => {
    return wishlist.some(p => p.id === productId);
  };

  const toggleWishlist = async (product: Product) => {
    const exists = isInWishlist(product.id);
    let updated: Product[];

    if (exists) {
      updated = wishlist.filter(p => p.id !== product.id);
    } else {
      updated = [...wishlist, product];
    }
    setWishlist(updated);

    if (isSupabaseConfigured() && user) {
      try {
        const { data: wl } = await supabase.from('wishlists').select('id').eq('user_id', user.id).single();
        if (wl) {
          if (exists) {
            await supabase.from('wishlist_items').delete().eq('wishlist_id', wl.id).eq('product_id', product.id);
          } else {
            await supabase.from('wishlist_items').insert([{ wishlist_id: wl.id, product_id: product.id }]);
          }
        }
      } catch (err) {
        console.warn('Supabase wishlist toggle sync error:', err);
      }
    }
  };

  const removeFromWishlist = async (productId: string) => {
    const updated = wishlist.filter(p => p.id !== productId);
    setWishlist(updated);

    if (isSupabaseConfigured() && user) {
      try {
        const { data: wl } = await supabase.from('wishlists').select('id').eq('user_id', user.id).single();
        if (wl) {
          await supabase.from('wishlist_items').delete().eq('wishlist_id', wl.id).eq('product_id', productId);
        }
      } catch (err) {
        console.warn('Supabase removeFromWishlist error:', err);
      }
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        isLoading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within a WishlistProvider');
  return context;
};
