// Service-role client for admin scripts. Reads app/.env.local (never committed).
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const root = path.resolve(import.meta.dirname, '..');

const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in app/.env.local');
  process.exit(1);
}

export const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
