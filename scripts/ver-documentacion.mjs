import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../.sitio-publicado', import.meta.url));
const port = Number(process.env.PUERTO ?? 8200);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

http
  .createServer((request, response) => {
    const url = decodeURIComponent((request.url ?? '/').split('?')[0]);
    let file = path.join(root, url);
    if (!file.startsWith(root)) file = root;
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    const found = fs.existsSync(file);
    const target = found ? file : path.join(root, '404.html');
    response.writeHead(found ? 200 : 404, {
      'content-type': types[path.extname(target)] ?? 'application/octet-stream',
    });
    fs.createReadStream(target).pipe(response);
  })
  .listen(port, '127.0.0.1', () =>
    console.log(`Documentación en http://localhost:${port}`),
  );
