const db = require('../db/database');
const { supabase } = require('../db/supabase');

const defaultPayments = {
  cod: {
    enabled: true,
    title: "Cash on Delivery (COD)",
    description: "Pay with physical cash upon doorstep delivery anywhere in Pakistan via TCS / Leopards.",
    handling_fee: 0,
    max_amount: 50000
  },
  bank_transfer: {
    enabled: true,
    title: "Direct Bank Wire / Online IBAN Transfer",
    bank_name: "Meezan Bank Ltd",
    account_title: "EBA Fashion Studio Pvt Ltd",
    account_number: "01000948210001",
    iban: "PK64MEZN0001000948210001",
    branch: "Gulberg III Main Boulevard Flagship, Lahore",
    instructions: "Please transfer the invoice total to our verified Meezan Bank account and email your payment transaction slip/screenshot with your Docket Number to accounts@ebafashion.pk or WhatsApp +92 321 8456789."
  },
  jazzcash: {
    enabled: true,
    title: "JazzCash Mobile Wallet & Direct Pay",
    merchant_id: "03001234567",
    merchant_name: "EBA FASHION STUDIO",
    account_number: "0300 1234567",
    instructions: "Send payment via JazzCash App or dial *786# to Till/Mobile Number: 0300 1234567. Include your Order Docket number in the transfer remarks."
  },
  easypaisa: {
    enabled: true,
    title: "Easypaisa Mobile Wallet & QR Pay",
    till_id: "78491",
    account_title: "EBA FASHION STUDIO",
    account_number: "0321 8456789",
    instructions: "Send payment via Easypaisa App to Mobile Account: 0321 8456789 or scan the EBA verified QR code. Save your 3737 confirmation SMS."
  }
};

const defaultShippingZones = [
  {
    id: "zone-major-metros",
    name: "Major Metros (Express Corridor)",
    cities: ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad"],
    rate: 200,
    free_threshold: 5000,
    delivery_time: "1 - 2 Business Days",
    courier: "TCS Express",
    is_active: true
  },
  {
    id: "zone-punjab-sindh",
    name: "Rest of Punjab & Sindh",
    cities: ["Multan", "Sialkot", "Gujranwala", "Hyderabad", "Sukkur", "Bahawalpur", "Sargodha", "Gujrat"],
    rate: 250,
    free_threshold: 5000,
    delivery_time: "2 - 3 Business Days",
    courier: "Leopards Courier",
    is_active: true
  },
  {
    id: "zone-kpk-balochistan",
    name: "KPK, Balochistan, Gilgit & AJK",
    cities: ["Peshawar", "Quetta", "Abbottabad", "Mardan", "Swat", "Muzaffarabad", "Mirpur", "Gilgit"],
    rate: 350,
    free_threshold: 7000,
    delivery_time: "3 - 5 Business Days",
    courier: "TCS Express Overnight",
    is_active: true
  },
  {
    id: "zone-international",
    name: "International Express (Worldwide Air)",
    cities: ["UK", "USA", "UAE", "Saudi Arabia", "Canada", "Australia"],
    rate: 8500,
    free_threshold: 50000,
    delivery_time: "3 - 5 Business Days",
    courier: "DHL Express Worldwide",
    is_active: true
  }
];

// Save in SQLite
db.prepare(`
  INSERT INTO store_settings (key, value, updated_at)
  VALUES ('payments', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
`).run(JSON.stringify(defaultPayments));

db.prepare(`
  INSERT INTO store_settings (key, value, updated_at)
  VALUES ('shipping_zones', ?, CURRENT_TIMESTAMP)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
`).run(JSON.stringify(defaultShippingZones));

console.log('Advanced Settings (Payments & Shipping Zones) initialized in SQLite!');

// Also sync to Supabase if connected
(async () => {
  try {
    const { error: pErr } = await supabase.from('store_settings').upsert({
      key: 'payments',
      value: JSON.stringify(defaultPayments)
    }, { onConflict: 'key' });
    if (pErr) console.warn('Supabase payments sync note:', pErr.message);

    const { error: sErr } = await supabase.from('store_settings').upsert({
      key: 'shipping_zones',
      value: JSON.stringify(defaultShippingZones)
    }, { onConflict: 'key' });
    if (sErr) console.warn('Supabase shipping_zones sync note:', sErr.message);

    console.log('Advanced Settings also synced to Supabase Cloud!');
  } catch (e) {
    console.warn('Supabase sync note:', e.message);
  }
})();
