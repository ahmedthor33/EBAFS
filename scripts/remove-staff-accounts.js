const db = require('../db/database');
const { supabase } = require('../db/supabase');

async function removeStaffRoles() {
  console.log('--- Removing All Staff and Admin Accounts Except ahmedthor33@gmail.com ---');

  // 1. Delete from local SQLite
  const del = db.prepare("DELETE FROM users WHERE email IN ('admin@ebafashion.pk', 'staff@ebafashion.pk')").run();
  console.log(`✅ Removed ${del.changes} accounts from local SQLite.`);

  // Also remove any role assigned to other users if any
  const otherStaff = db.prepare("SELECT id, name, email, role FROM users WHERE role != 'customer' AND email != 'ahmedthor33@gmail.com'").all();
  if (otherStaff.length > 0) {
    console.log('Found additional non-owner staff:', otherStaff);
    for (const u of otherStaff) {
      db.prepare("DELETE FROM users WHERE id = ?").run(u.id);
      console.log(`Deleted user: ${u.email}`);
    }
  }

  // 2. Delete from Supabase Cloud
  try {
    const { error } = await supabase.from('users').delete().in('email', ['admin@ebafashion.pk', 'staff@ebafashion.pk']);
    if (error) {
      console.warn('Supabase delete warning:', error.message);
    } else {
      console.log('✅ Removed non-owner accounts from Supabase Cloud.');
    }
  } catch (err) {
    console.warn('Supabase delete exception:', err.message);
  }

  // 3. Confirm remaining accounts
  const users = db.prepare("SELECT id, name, email, role, status FROM users").all();
  console.log('\nRemaining Users in Database:');
  console.table(users);
}

removeStaffRoles().catch(err => {
  console.error('Removal failed:', err);
  process.exit(1);
});
