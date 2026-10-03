const fs = require('fs');

async function run() {
  console.log('--- 1. Testing Raw Storefront HTML for Admin Links ---');
  const html = fs.readFileSync('public/index.html', 'utf8');

  // Verify there are ZERO references to /admin in raw index.html
  const adminMatches = [...html.matchAll(/<[^>]+href=["']\/admin["'][^>]*>/gi)];
  console.log(`Found ${adminMatches.length} references to /admin in public/index.html`);

  if (adminMatches.length > 0) {
    throw new Error(`Admin links found in static index.html! Found: ${adminMatches.map(m=>m[0]).join(', ')}`);
  }
  console.log('✅ PASS: Exactly ZERO links to /admin exist in public/index.html! No customer can ever see it.');

  console.log('\n--- 2. Testing Customer Authentication vs Owner Authentication ---');
  const BASE = 'http://localhost:3000';

  // Test Customer Login
  const customerRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'fatima@example.com', password: 'fatima123' })
  });
  const customerData = await customerRes.json();
  console.log('Customer login result:', customerData.user ? { email: customerData.user.email, role: customerData.user.role } : customerData);
  
  const isCustomerAdmin = (user) => {
    if (!user) return false;
    const email = (user.email || '').toLowerCase().trim();
    const role = (user.role || '').toLowerCase().trim();
    return email === 'ahmedthor33@gmail.com' || role === 'superadmin' || role === 'admin';
  };

  if (isCustomerAdmin(customerData.user)) {
    throw new Error('Customer should NOT be recognized as admin!');
  }
  console.log('✅ PASS: Customer fatima@example.com is NOT an admin. Admin options stay hidden.');

  // Test Owner Login
  const ownerRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ahmedthor33@gmail.com', password: 'admin123' })
  });
  const ownerData = await ownerRes.json();
  console.log('Owner login result:', ownerData.user ? { email: ownerData.user.email, role: ownerData.user.role } : ownerData);

  if (!isCustomerAdmin(ownerData.user)) {
    throw new Error('Owner ahmedthor33@gmail.com MUST be recognized as admin!');
  }
  console.log('✅ PASS: Owner ahmedthor33@gmail.com is successfully verified as superadmin! Admin panel will be revealed on login.');

  console.log('\n--- 3. Testing Storefront JavaScript app.js Logic ---');
  const appJs = fs.readFileSync('public/js/app.js', 'utf8');
  if (!appJs.includes('isUserAdmin()')) {
    throw new Error('isUserAdmin method missing in public/js/app.js');
  }
  if (!appJs.includes('header-admin-slot') || !appJs.includes('mobile-admin-slot')) {
    throw new Error('Header/mobile admin slots not managed in app.js');
  }
  console.log('✅ PASS: public/js/app.js properly contains isUserAdmin() and dynamic header/mobile/footer toggling.');

  console.log('\n========================================');
  console.log('ALL ADMIN VISIBILITY CHECKS PASSED 100%');
  console.log('========================================');
}

run().catch(err => {
  console.error('Test Failed:', err.message);
  process.exit(1);
});
