import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Dev-only: serves lesson JSON from `content/` at /__content/* and the
 * publisher's audio folder at /__audio/*, with Range support so audio
 * segments can be seeked.
 */
export function localContent(opts: { contentDir: string; audioDir: string }): Plugin {
  return {
    name: 'local-content',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = decodeURIComponent((req.url ?? '').split('?')[0]);
        let root: string | null = null;
        let rel = '';
        if (url.startsWith('/__content/')) {
          root = opts.contentDir;
          rel = url.slice('/__content/'.length);
        } else if (url.startsWith('/__audio/')) {
          root = opts.audioDir;
          rel = url.slice('/__audio/'.length);
        }
        if (!root) return next();

        const file = path.resolve(root, rel);
        if (!file.startsWith(path.resolve(root)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          res.statusCode = 404;
          return res.end('Not found');
        }
        const size = fs.statSync(file).size;
        const type = file.endsWith('.json') ? 'application/json; charset=utf-8' : 'audio/mpeg';
        res.setHeader('Content-Type', type);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');

        const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
        if (range) {
          const start = range[1] ? Number(range[1]) : 0;
          const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
          res.setHeader('Content-Length', end - start + 1);
          fs.createReadStream(file, { start, end }).pipe(res);
        } else {
          res.setHeader('Content-Length', size);
          fs.createReadStream(file).pipe(res);
        }
      });
    },
  };
}
