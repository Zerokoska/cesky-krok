import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { localContent } from './scripts/vite-local-content.ts';

const root = import.meta.dirname;
const audioDir = process.env.AUDIO_DIR ?? path.resolve(root, '../cesky-krok-za-krokem-1-audionahravky');

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), localContent({ contentDir: path.resolve(root, 'content'), audioDir })],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
