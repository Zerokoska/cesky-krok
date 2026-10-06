// Adds an email to the sign-up allowlist with a role.
// Run: node scripts/allow-email.ts someone@example.com student "Olena"
import { admin } from './supabase-admin.ts';

const [email, role, name = ''] = process.argv.slice(2);
if (!email || (role !== 'teacher' && role !== 'student')) {
  console.error('Usage: node scripts/allow-email.ts <email> <teacher|student> [display name]');
  process.exit(1);
}

const { error } = await admin.from('allowed_emails').upsert({ email: email.toLowerCase(), role, display_name: name });
if (error) throw new Error(error.message);
const { data } = await admin.from('allowed_emails').select('email, role, display_name');
console.log('Allowlist:', data);
