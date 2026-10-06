import { createClient } from '@supabase/supabase-js';
import { LocalContentSource, SupabaseContentSource, type ContentSource } from './content/source';
import { LocalDataStore } from './data/local';
import { SupabaseDataStore } from './data/supabase';
import type { DataStore } from './data/types';

/** Supabase when its env vars are set at build time; otherwise the local dev/demo backend. */
function create(): { store: DataStore; content: ContentSource } {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (url && key) {
    const sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
    return { store: new SupabaseDataStore(sb), content: new SupabaseContentSource(sb) };
  }
  return { store: new LocalDataStore(), content: new LocalContentSource() };
}

export const backend = create();
