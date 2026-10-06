// Uploads built lessons (content/lessons/*.json) and the recordings they use
// to the private Storage buckets. Run: npm run content && npm run upload-content
import fs from 'node:fs';
import path from 'node:path';
import { admin, root } from './supabase-admin.ts';

const lessonsDir = path.join(root, 'content', 'lessons');
const audioDir = process.env.AUDIO_DIR ?? path.resolve(root, '../cesky-krok-za-krokem-1-audionahravky');

function tracksIn(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => tracksIn(v, found));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === 'track' && typeof v === 'string') found.add(v);
      else tracksIn(v, found);
    }
  }
  return found;
}

async function upload(bucket: string, dest: string, file: string, contentType: string) {
  const body = fs.readFileSync(file);
  const { error } = await admin.storage.from(bucket).upload(dest, body, { contentType, upsert: true, cacheControl: '3600' });
  if (error) throw new Error(`${bucket}/${dest}: ${error.message}`);
  console.log(`  ↑ ${bucket}/${dest} (${(body.length / 1024).toFixed(0)} KB)`);
}

const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.json'));
const tracks = new Set<string>();
console.log('Lessons:');
for (const f of files) {
  await upload('content', `lessons/${f}`, path.join(lessonsDir, f), 'application/json');
  if (f !== 'index.json') tracksIn(JSON.parse(fs.readFileSync(path.join(lessonsDir, f), 'utf8')), tracks);
}

const { data: existing, error } = await admin.storage.from('audio').list('', { limit: 1000 });
if (error) throw new Error(error.message);
const have = new Map(existing.map((o) => [o.name, Number(o.metadata?.size ?? 0)]));

console.log(`Audio (${tracks.size} tracks):`);
for (const t of [...tracks].sort()) {
  const file = path.join(audioDir, `${t}.mp3`);
  if (have.get(`${t}.mp3`) === fs.statSync(file).size) {
    console.log(`  = audio/${t}.mp3`);
    continue;
  }
  await upload('audio', `${t}.mp3`, file, 'audio/mpeg');
}
console.log('Done.');
