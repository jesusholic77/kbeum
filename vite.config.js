import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 엑셀이 같은 폴더에 있으므로 기본값은 vite.config.js 위치(=프로젝트 루트). KB_DATA_DIR로 덮어쓸 수 있다.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.KB_DATA_DIR || __dirname;
const ALLOWED = new Set(['TC명단.xlsx', '개인별실적.xlsx', '시상.xlsx']);

function kbDataPlugin() {
  return {
    name: 'kb-data-serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/data/')) return next();
        const pathOnly = req.url.split('?')[0];

        // /data/_meta : 파일별 mtime/size JSON
        if (pathOnly === '/data/_meta') {
          const result = { dir: DATA_DIR, files: {} };
          for (const f of ALLOWED) {
            const p = path.join(DATA_DIR, f);
            try {
              const s = fs.statSync(p);
              result.files[f] = { size: s.size, mtime: s.mtime.toISOString() };
            } catch (e) {
              result.files[f] = { error: e.message };
            }
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(JSON.stringify(result));
          return;
        }

        // /data/<파일명> : Google Drive 폴더에서 스트림으로 응답
        const filename = decodeURIComponent(pathOnly.slice(6));
        if (!ALLOWED.has(filename)) return next();
        const fullPath = path.join(DATA_DIR, filename);
        fs.stat(fullPath, (err, stat) => {
          if (err) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ error: '파일 없음', path: fullPath, message: err.message }));
            return;
          }
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          res.setHeader('Content-Length', stat.size);
          res.setHeader('Last-Modified', stat.mtime.toUTCString());
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          fs.createReadStream(fullPath).pipe(res);
        });
      });
    },
  };
}

export default defineConfig({
  // GitHub Pages 서브패스 호환을 위해 상대 경로. user.github.io/kb-tc-dashboard/ 등 모든 형태에서 동작.
  base: './',
  plugins: [react(), kbDataPlugin()],
  server: { port: 5173, open: true },
});
