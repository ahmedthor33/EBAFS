import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Order, OrderItem, ShippingZone, PaymentMethod, OrderStatus, PaymentStatus } from '../types';
import { initialShippingZones, initialPaymentMethods } from '../data/initialData';

export const orderService = {
  // Fetch shipping zones
  async getShippingZones(): Promise<ShippingZone[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('shipping_zones')
          .select('*')
          .eq('is_active', true);
        if (!error && data && data.length > 0) return data as ShippingZone[];
      } catch (err) {
        console.warn('getShippingZones fallback:', err);
      }
    }
    const local = localStorage.getItem('eba_local_zones');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter((z: any) => z.is_active);
      } catch (e) {}
    }
    return initialShippingZones;
  },

  // Admin: Get all shipping zones
  async getAllShippingZonesAdmin(): Promise<ShippingZone[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('shipping_zones')
          .select('*')
          .order('name');
        if (!error && data && data.length > 0) {
          localStorage.setItem('eba_local_zones', JSON.stringify(data));
          return data as ShippingZone[];
        }
      } catch (err) {
        console.warn('getAllShippingZonesAdmin fallback:', err);
      }
    }
    const local = localStorage.getItem('eba_local_zones');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialShippingZones;
  },

  // Admin: Create shipping zone
  async createShippingZone(zone: Partial<ShippingZone>): Promise<ShippingZone> {
    const payload = {
      name: zone.name,
      provinces: zone.provinces || [],
      rate: zone.rate || 0,
      free_shipping_threshold: zone.free_shipping_threshold ?? 5000,
      estimated_days: zone.estimated_days || '2 - 4 Working Days',
      is_active: zone.is_active ?? true,
    };

    let created: ShippingZone | null = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('shipping_zones')
          .insert([payload])
          .select()
          .single();
        if (!error && data) created = data as ShippingZone;
      } catch (err) {
        console.warn('Supabase createShippingZone error:', err);
      }
    }

    if (!created) {
      created = {
        id: `zone_${Date.now()}`,
        ...payload,
      } as ShippingZone;
    }

    const localZones = await this.getAllShippingZonesAdmin();
    const updated = [created, ...localZones.filter(z => z.id !== created!.id)];
    localStorage.setItem('eba_local_zones', JSON.stringify(updated));
    return created;
  },

  // Admin: Update shipping zone
  async updateShippingZone(id: string, zone: Partial<ShippingZone>): Promise<void> {
    const payload = {
      ...(zone.name ? { name: zone.name } : {}),
      ...(zone.provinces ? { provinces: zone.provinces } : {}),
      ...(zone.rate !== undefined ? { rate: zone.rate } : {}),
      ...(zone.free_shipping_threshold !== undefined ? { free_shipping_threshold: zone.free_shipping_threshold } : {}),
      ...(zone.estimated_days ? { estimated_days: zone.estimated_days } : {}),
      ...(zone.is_active !== undefined ? { is_active: zone.is_active } : {}),
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('shipping_zones')
          .update(payload)
          .eq('id', id);
        if (error) console.warn('Supabase updateShippingZone error:', error);
      } catch (err) {
        console.warn('updateShippingZone error:', err);
      }
    }

    const localZones = await this.getAllShippingZonesAdmin();
    const updated = localZones.map(z => z.id === id ? { ...z, ...payload } : z);
    localStorage.setItem('eba_local_zones', JSON.stringify(updated));
  },

  // Admin: Delete shipping zone
  async deleteShippingZone(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('shipping_zones')
          .delete()
          .eq('id', id);
        if (error) console.warn('Supabase deleteShippingZone error:', error);
      } catch (err) {
        console.warn('deleteShippingZone error:', err);
      }
    }

    const localZones = await this.getAllShippingZonesAdmin();
    const updated = localZones.filter(z => z.id !== id);
    localStorage.setItem('eba_local_zones', JSON.stringify(updated));
  },

  // Calculate shipping fee based on province and subtotal
  calculateShippingFee(zones: ShippingZone[], province: string, subtotal: number): number {
    const matchedZone = zones.find(z =>
      z.provinces.some(p => p.toLowerCase() === province.toLowerCase())
    );

    if (!matchedZone) {
      return 300; // Default national rate
    }

    if (matchedZone.free_shipping_threshold && subtotal >= matchedZone.free_shipping_threshold) {
      return 0; // Free shipping threshold met
    }

    return matchedZone.rate;
  },

  // Fetch active payment methods for storefront
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        if (!error && data && data.length > 0) return data as PaymentMethod[];
      } catch (err) {
        console.warn('getPaymentMethods fallback:', err);
      }
    }
    const local = localStorage.getItem('eba_payment_methods');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter((m: any) => m.is_active);
      } catch (e) {}
    }
    return initialPaymentMethods.filter(m => m.is_active);
  },

  // Admin: Fetch all payment methods (active & disabled)
  async getAllPaymentMethodsAdmin(): Promise<PaymentMethod[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('payment_methods')
          .select('*')
          .order('display_order', { ascending: true });
        if (!error && data && data.length > 0) {
          localStorage.setItem('eba_payment_methods', JSON.stringify(data));
          return data as PaymentMethod[];
        }
      } catch (err) {
        console.warn('getAllPaymentMethodsAdmin fallback:', err);
      }
    }
    const local = localStorage.getItem('eba_payment_methods');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return initialPaymentMethods;
  },

  // Generate luxury order number
  generateOrderNumber(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `EBA-${dateStr}-${random}`;
  },

  // Create an order
  async createOrder(
    orderData: Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>,
    items: Array<Omit<OrderItem, 'id' | 'order_id'>>
  ): Promise<Order> {
    const orderNumber = this.generateOrderNumber();

    if (isSupabaseConfigured()) {
      try {
        const totalAmount = orderData.total_amount || (orderData.subtotal + (orderData.shipping_fee || 0) - (orderData.discount || 0));
        const { data: order, error: orderErr } = await supabase
          .from('orders')
          .insert([{
            order_number: orderNumber,
            user_id: orderData.user_id || null,
            customer_name: orderData.customer_name,
            customer_email: orderData.customer_email,
            customer_phone: orderData.customer_phone,
            shipping_address: orderData.shipping_address,
            subtotal: orderData.subtotal,
            shipping_fee: orderData.shipping_fee || 0,
            shipping_cost: orderData.shipping_fee || 0,
            discount: orderData.discount || 0,
            discount_amount: orderData.discount || 0,
            total: totalAmount,
            total_amount: totalAmount,
            payment_method: orderData.payment_method,
            payment_status: orderData.payment_status || 'PENDING',
            order_status: 'PENDING',
            customer_notes: orderData.customer_notes || null,
            admin_notes: orderData.internal_notes || null,
            internal_notes: orderData.internal_notes || null,
          }])
          .select()
          .single();

        if (orderErr) throw orderErr;

        // Insert order items
        const itemRows = items.map(it => ({
          order_id: order.id,
          product_id: it.product_id || null,
          product_name: it.product_name,
          sku: it.product_sku || null,
          product_sku: it.product_sku || null,
          product_image: it.product_image || null,
          variant_title: it.variant_title || null,
          price: it.price,
          quantity: it.quantity,
          total: it.subtotal,
          subtotal: it.subtotal,
        }));

        try {
          const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
          if (itemsErr) {
            console.warn('Order items insert retry with standard columns:', itemsErr.message);
            // Fallback with strictly core columns if extra columns not in DB yet
            await supabase.from('order_items').insert(items.map(it => ({
              order_id: order.id,
              product_id: it.product_id || null,
              product_name: it.product_name,
              sku: it.product_sku || null,
              price: it.price,
              quantity: it.quantity,
              total: it.subtotal,
            })));
          }
        } catch (itemCatch) {
          console.warn('Item insert fallback exception:', itemCatch);
        }

        return { ...order, items: itemRows as any };
      } catch (err: any) {
        console.error('Supabase createOrder error, falling back to local order store:', err);
      }
    }

    // Local fallback order persistence
    const localOrder: Order = {
      id: `ord_${Date.now()}`,
      order_number: orderNumber,
      ...orderData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items.map((it, idx) => ({
        id: `oi_${Date.now()}_${idx}`,
        order_id: `ord_${Date.now()}`,
        ...it,
      })),
    };

    const existingOrders = JSON.parse(localStorage.getItem('eba_local_orders') || '[]');
    existingOrders.unshift(localOrder);
    localStorage.setItem('eba_local_orders', JSON.stringify(existingOrders));

    return localOrder;
  },

  // Fetch orders for customer
  async getCustomerOrders(userId: string, email?: string): Promise<Order[]> {
    if (isSupabaseConfigured() && userId) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!error && data) return data as Order[];
      } catch (err) {
        console.warn('getCustomerOrders fallback:', err);
      }
    }

    // Local storage lookup
    const localOrders: Order[] = JSON.parse(localStorage.getItem('eba_local_orders') || '[]');
    return localOrders.filter(o => o.user_id === userId || (email && o.customer_email.toLowerCase() === email.toLowerCase()));
  },

  // Fetch single order by number or ID
  async getOrderByNumber(orderNumber: string): Promise<Order | null> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('order_number', orderNumber)
          .single();

        if (!error && data) return data as Order;
      } catch (err) {
        console.warn('getOrderByNumber fallback:', err);
      }
    }

    const localOrders: Order[] = JSON.parse(localStorage.getItem('eba_local_orders') || '[]');
    return localOrders.find(o => o.order_number === orderNumber) || null;
  },

  // Admin: Get all orders
  async getAllOrdersAdmin(statusFilter?: OrderStatus, search?: string): Promise<Order[]> {
    if (isSupabaseConfigured()) {
      try {
        let query = supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .order('created_at', { ascending: false });

        if (statusFilter) {
          query = query.eq('order_status', statusFilter);
        }
        if (search) {
          query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%`);
        }

        const { data, error } = await query;
        if (!error && data) return data as Order[];
      } catch (err) {
        console.warn('getAllOrdersAdmin fallback:', err);
      }
    }

    let orders: Order[] = JSON.parse(localStorage.getItem('eba_local_orders') || '[]');
    if (statusFilter) {
      orders = orders.filter(o => o.order_status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(o =>
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_email.toLowerCase().includes(q)
      );
    }
    return orders;
  },

  // Admin: Update order status
  async updateOrderStatus(orderId: string, orderStatus: OrderStatus, internalNotes?: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const updatePayload: Record<string, any> = { order_status: orderStatus, updated_at: new Date().toISOString() };
      if (internalNotes !== undefined) {
        updatePayload.internal_notes = internalNotes;
        updatePayload.admin_notes = internalNotes;
      }

      const { error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) {
        // If internal_notes column is missing, retry with just admin_notes
        if (error.message.includes('internal_notes')) {
          delete updatePayload.internal_notes;
          await supabase.from('orders').update(updatePayload).eq('id', orderId);
        } else if (error.message.includes('admin_notes')) {
          delete updatePayload.admin_notes;
          await supabase.from('orders').update(updatePayload).eq('id', orderId);
        } else {
          console.warn('Supabase updateOrderStatus warning:', error.message);
        }
      }
    }

    // Local storage sync
    const orders: Order[] = JSON.parse(localStorage.getItem('eba_local_orders') || '[]');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx].order_status = orderStatus;
      if (internalNotes !== undefined) orders[idx].internal_notes = internalNotes;
      orders[idx].updated_at = new Date().toISOString();
      localStorage.setItem('eba_local_orders', JSON.stringify(orders));
    }
  },

  // Admin: Update payment status
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;
    }

    const orders: Order[] = JSON.parse(localStorage.getItem('eba_local_orders') || '[]');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx].payment_status = paymentStatus;
      orders[idx].updated_at = new Date().toISOString();
      localStorage.setItem('eba_local_orders', JSON.stringify(orders));
    }
  },
};
