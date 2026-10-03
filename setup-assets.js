const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'stitch_extracted', 'stitch_eba_fashion_studio_design_system');
const target = path.join(__dirname, 'public', 'assets');

if (!fs.existsSync(target)) {
  fs.mkdirSync(target, { recursive: true });
}

const mappings = [
  { src: 'editorial_portrait_of_a_pakistani_woman_wearing_an_opulent_3_piece_luxury/screen.png', dest: 'woman_opulent_lawn.png' },
  { src: 'editorial_split_fashion_campaign_hero_for_pakistani_luxury_brand_eba_fashion/screen.png', dest: 'hero_campaign_split.png' },
  { src: 'high_end_pakistani_luxury_men_s_unstitched_fabric_collection_portrait._handsome/screen.png', dest: 'men_luxury_unstitched.png' },
  { src: 'ultra_high_end_cinematic_editorial_fashion_campaign_hero_for_luxury_pakistani/screen.png', dest: 'hero_campaign_editorial.png' },
  { src: 'eba_fashion_studio_wordmark_logo/screen.png', dest: 'logo.png' },
  { src: 'gul_e_noor_3_piece_unstitched_product_details/screen.png', dest: 'gul_e_noor_details.png' },
  { src: 'women_s_festive_lawn_collection_eba_studio/screen.png', dest: 'women_collection.png' },
  { src: 'men_s_unstitched_collection_eba_studio/screen.png', dest: 'men_collection.png' },
  { src: 'order_confirmation_eba_fashion_studio/screen.png', dest: 'order_confirmation_preview.png' },
  { src: 'shopping_bag_eba_fashion_studio/screen.png', dest: 'shopping_bag_preview.png' },
  { src: 'checkout_eba_fashion_studio/screen.png', dest: 'checkout_preview.png' },
  { src: 'sign_in_sign_up_eba_fashion_studio/screen.png', dest: 'sign_in_preview.png' },
];

for (const m of mappings) {
  const srcPath = path.join(base, m.src);
  const destPath = path.join(target, m.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${m.src} -> ${m.dest}`);
  } else {
    console.warn(`Source not found: ${srcPath}`);
  }
}
console.log('Asset copy complete!');
