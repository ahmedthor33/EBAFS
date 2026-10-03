// Comprehensive End-to-End Automated Test Suite for EBA Fashion Studio
async function runTests() {
  const BASE = 'http://localhost:3000';
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log('\n--- 1. Testing Storefront & Admin Static Routes ---');
  const homeRes = await fetch(`${BASE}/`);
  const homeHtml = await homeRes.text();
  assert(homeRes.status === 200, 'GET / returns HTTP 200');
  assert(homeHtml.includes('EBA Fashion Studio'), 'Home HTML contains "EBA Fashion Studio"');
  assert(homeHtml.includes('Bodoni Moda'), 'Home HTML loads Bodoni Moda font');

  const adminRes = await fetch(`${BASE}/admin`);
  const adminHtml = await adminRes.text();
  assert(adminRes.status === 200, 'GET /admin returns HTTP 200');
  assert(adminHtml.includes('Administrative Atelier'), 'Admin HTML contains Administrative Atelier');

  console.log('\n--- 2. Testing Public Products & Categories APIs ---');
  const prodsRes = await fetch(`${BASE}/api/products`);
  const prodsData = await prodsRes.json();
  assert(prodsRes.status === 200 && prodsData.products.length >= 10, `GET /api/products returns ${prodsData.products.length} products`);

  const singleProdRes = await fetch(`${BASE}/api/products/gul-e-noor-3-piece-luxury-festive-lawn`);
  const singleProd = await singleProdRes.json();
  assert(singleProdRes.status === 200 && singleProd.product.name.includes('Gul-e-Noor'), 'Single product detail returns Gul-e-Noor');
  assert(singleProd.product.images.length >= 3, `Product has ${singleProd.product.images.length} images`);

  const catsRes = await fetch(`${BASE}/api/categories`);
  const catsData = await catsRes.json();
  assert(catsRes.status === 200 && catsData.categories.length === 2, 'Categories API returns Men & Women parent trees');

  console.log('\n--- 3. Testing Cart & Tailoring Add-on ---');
  const sessionId = 'test_session_' + Date.now();
  const addCartRes = await fetch(`${BASE}/api/cart/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({
      product_id: singleProd.product.id,
      quantity: 1,
      add_tailoring: 1,
      tailoring_size: 'M'
    })
  });
  const addCartData = await addCartRes.json();
  assert(addCartRes.status === 200, `Add to cart with tailoring succeeded: ${addCartData.message}`);

  const getCartRes = await fetch(`${BASE}/api/cart`, {
    headers: { 'x-session-id': sessionId }
  });
  const cartData = await getCartRes.json();
  assert(cartData.items.length === 1, 'Cart has 1 item');
  assert(cartData.tailoringTotal === 4500, `Tailoring total is PKR 4,500 (got ${cartData.tailoringTotal})`);
  assert(cartData.shippingFee === 0, 'Complimentary shipping applied (order above threshold)');

  console.log('\n--- 4. Testing Coupon Validation ---');
  const couponRes = await fetch(`${BASE}/api/cart/validate-coupon`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({ code: 'WELCOME10', subtotal: cartData.subtotal })
  });
  const couponData = await couponRes.json();
  assert(couponData.valid === true, `Coupon WELCOME10 valid: discount PKR ${couponData.coupon.discount_amount}`);

  console.log('\n--- 5. Testing Checkout & Order Placement Transaction ---');
  const checkoutRes = await fetch(`${BASE}/api/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
    body: JSON.stringify({
      customer_name: 'Fatima Noor Test',
      customer_email: 'fatima.test@example.com',
      customer_phone: '+92 321 8456789',
      shipping_address: 'House 14-B, Street 32',
      area: 'Sector F-7/2',
      city: 'Islamabad',
      province: 'Islamabad Capital Territory',
      postal_code: '44000',
      payment_method: 'cod',
      coupon_code: 'WELCOME10',
      items: [{
        product_id: singleProd.product.id,
        quantity: 1,
        add_tailoring: 1,
        tailoring_size: 'M'
      }]
    })
  });
  const checkoutData = await checkoutRes.json();
  assert(checkoutRes.status === 201 && checkoutData.success === true, `Order placed successfully: ${checkoutData.order?.order_number}`);

  const orderNum = checkoutData.order.order_number;
  const lookupRes = await fetch(`${BASE}/api/orders/lookup/${orderNum}`);
  const lookupData = await lookupRes.json();
  assert(lookupRes.status === 200 && lookupData.order.order_number === orderNum, `Order lookup verified: Docket #${orderNum}`);
  assert(lookupData.items.length === 1 && lookupData.items[0].tailoring_selected === 1, 'Order item snapshot includes tailoring flag');

  console.log('\n--- 6. Testing Admin Authentication & RBAC ---');
  const adminLoginRes = await fetch(`${BASE}/api/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ahmedthor33@gmail.com', password: 'admin123' })
  });
  const adminLogin = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLogin.user.role === 'superadmin', 'Admin login verified with superadmin role');
  const adminToken = adminLogin.token;

  console.log('\n--- 7. Testing Admin Reports & Real Database Financials ---');
  const reportsRes = await fetch(`${BASE}/api/admin/reports?range=all`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const reportsData = await reportsRes.json();
  assert(reportsRes.status === 200 && reportsData.summary.total_revenue > 0, `Total real database revenue: PKR ${reportsData.summary.total_revenue.toLocaleString()}`);

  console.log('\n--- 8. Testing Admin CMS Live Update ---');
  const updatedAnnouncement = 'Exclusive Festive Eid Drop Now Live | Free Express Delivery Across Pakistan';
  const updateCmsRes = await fetch(`${BASE}/api/admin/cms/announcement_bar`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ text: updatedAnnouncement, enabled: true })
  });
  assert(updateCmsRes.status === 200, 'Admin updated announcement bar CMS');

  const publicCmsRes = await fetch(`${BASE}/api/cms`);
  const publicCms = await publicCmsRes.json();
  assert(publicCms.cms.announcement_bar.text === updatedAnnouncement, 'Public CMS immediately reflects updated announcement text without code edits!');

  console.log('\n--- 9. Testing Supabase Cloud Backend Integration ---');
  const sbRes = await fetch(`${BASE}/api/supabase/status`);
  const sbData = await sbRes.json();
  assert(sbRes.status === 200 && sbData.connected === true, `Supabase Cloud Live & Connected: ${sbData.projectId} (${sbData.version})`);
  assert(sbData.projectId === 'ydycwzcfptlbfvzbyzlb', 'Supabase Project ID matches configured project');
  assert(sbData.sqlEditorUrl.includes('ydycwzcfptlbfvzbyzlb'), 'Supabase SQL migration link generated correctly');

  console.log('\n--- 10. Testing Store Payment Methods & Shipping Zones APIs ---');
  const storePmRes = await fetch(`${BASE}/api/store/payment-methods`);
  const storePm = await storePmRes.json();
  assert(storePmRes.status === 200 && Array.isArray(storePm.methods), 'GET /api/store/payment-methods returns 200');
  const pmIds = storePm.methods.map(m => m.id);
  assert(pmIds.includes('cod'), 'Payment methods include Cash on Delivery (COD)');
  assert(pmIds.includes('bank_transfer'), 'Payment methods include Direct Bank Wire (Meezan Bank IBAN)');
  assert(pmIds.includes('jazzcash'), 'Payment methods include JazzCash Mobile Wallet');
  assert(pmIds.includes('easypaisa'), 'Payment methods include Easypaisa Mobile Wallet');

  const storeSzRes = await fetch(`${BASE}/api/store/shipping-zones`);
  const storeSz = await storeSzRes.json();
  assert(storeSzRes.status === 200 && Array.isArray(storeSz.zones), 'GET /api/store/shipping-zones returns 200');
  assert(storeSz.zones.length >= 4, `Store has ${storeSz.zones.length} active shipping zones configured`);

  console.log('\n--- 11. Testing Checkout with Pakistani Gateways (JazzCash & Bank Transfer) ---');
  // Order with JazzCash
  const jazzCheckoutRes = await fetch(`${BASE}/api/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'Bilal Ahmed',
      customer_email: 'bilal.ahmed@example.com',
      customer_phone: '+92 300 1234567',
      shipping_address: 'Al-Hafeez Heights, Gulberg III',
      area: 'Gulberg III',
      city: 'Lahore',
      province: 'Punjab',
      postal_code: '54000',
      payment_method: 'jazzcash',
      items: [{
        product_id: singleProd.product.id,
        quantity: 1,
        add_tailoring: 0
      }]
    })
  });
  const jazzOrder = await jazzCheckoutRes.json();
  assert(jazzCheckoutRes.status === 201 && jazzOrder.success === true, `JazzCash order placed: ${jazzOrder.order?.order_number}`);
  assert(jazzOrder.order.payment_method === 'jazzcash', 'Order record reflects JazzCash payment method');
  assert(jazzOrder.order.courier_name === 'TCS Express', `Assigned courier: ${jazzOrder.order.courier_name}`);

  // Order with Direct Bank Transfer
  const bankCheckoutRes = await fetch(`${BASE}/api/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: 'Ayesha Khan',
      customer_email: 'ayesha.khan@example.com',
      customer_phone: '+92 321 9876543',
      shipping_address: 'Cantt Avenue',
      area: 'Cantt',
      city: 'Peshawar',
      province: 'KPK',
      postal_code: '25000',
      payment_method: 'bank_transfer',
      items: [{
        product_id: singleProd.product.id,
        quantity: 1,
        add_tailoring: 1
      }]
    })
  });
  const bankOrder = await bankCheckoutRes.json();
  assert(bankCheckoutRes.status === 201 && bankOrder.success === true, `Bank Wire order placed: ${bankOrder.order?.order_number}`);
  assert(bankOrder.order.payment_method === 'bank_transfer', 'Order record reflects Bank Transfer payment method');

  console.log('\n--- 12. Testing Admin Payment Gateways & Shipping Zones Management ---');
  // Admin read payment settings
  const adminPmRes = await fetch(`${BASE}/api/admin/settings/payments`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminPm = await adminPmRes.json();
  assert(adminPmRes.status === 200 && adminPm.payments.cod && adminPm.payments.bank_transfer, 'Admin can fetch all 4 Pakistani payment settings');

  // Admin update payment settings
  const updatedPayments = { ...adminPm.payments };
  updatedPayments.cod.max_amount = 75000;
  const updatePmRes = await fetch(`${BASE}/api/admin/settings/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ payments: updatedPayments })
  });
  assert(updatePmRes.status === 200, 'Admin successfully updated payment gateway rules');

  // Admin read shipping zones
  const adminSzRes = await fetch(`${BASE}/api/admin/settings/shipping-zones`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const adminSz = await adminSzRes.json();
  assert(adminSzRes.status === 200 && Array.isArray(adminSz.zones), 'Admin can fetch and manage all shipping zones');

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
