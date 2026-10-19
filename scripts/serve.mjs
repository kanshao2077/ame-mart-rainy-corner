import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const directory = path.resolve('dist');
const port = Number(process.env.PORT || 4178);
const server = http.createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(directory, '.' + (requested === '/' ? '/index.html' : requested));
    if (!file.startsWith(directory + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) throw new Error('not a file');
    const mime = file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream';
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
