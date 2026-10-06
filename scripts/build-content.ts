// Builds content/lessons/*.json (+ index.json) from content/src/lesson-XX.mjs,
// validating each lesson against the app schema. Run: node scripts/build-content.ts
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { lesson as lessonSchema } from '../src/content/schema.ts';

const root = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(root, 'content', 'src');
const outDir = path.join(root, 'content', 'lessons');
fs.mkdirSync(outDir, { recursive: true });

const sources = fs.readdirSync(srcDir).filter((f) => /^lesson-\d{2}\.mjs$/.test(f)).sort();
const index = [];
for (const file of sources) {
  const mod = await import(pathToFileURL(path.join(srcDir, file)).href);
  const result = lessonSchema.safeParse(mod.default);
  if (!result.success) {
    console.error(`✗ ${file}`);
    for (const issue of result.error.issues) console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    process.exit(1);
  }
  const L = result.data;
  fs.writeFileSync(path.join(outDir, `${L.id}.json`), JSON.stringify(L));
  index.push({ id: L.id, number: L.number, title: L.title, pages: L.pages });
  const exercises = L.steps.reduce((n, s) => n + s.blocks.filter((b) => b.kind === 'exercise').length, 0);
  console.log(`✓ ${file} → ${L.id}.json (${L.steps.length} steps, ${exercises} exercises, ${L.vocabulary.length} words)`);
}
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index));
console.log(`✓ index.json (${index.length} lessons)`);
