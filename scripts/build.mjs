import { build } from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['src/main.ts'],
  bundle: true,
  write: false,
  minify: true,
  format: 'iife',
  target: 'es2022',
  legalComments: 'inline',
  loader: { '.glb': 'binary' },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = await readFile('src/style.css', 'utf8');
const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#111d30">
  <meta name="description" content="雨宿り。一个可以自由旋转、平移和缩放的雨夜便利店微缩世界。">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23111d30'/%3E%3Cpath d='M12 29a20 20 0 0 1 40 0H12zm20-13v31q0 10-9 6' fill='%2382b9ad' stroke='%23fff1ce' stroke-width='3'/%3E%3C/svg%3E">
  <title>雨宿り · 雨夜便利店</title>
  <style>${css}</style>
</head>
<body>
  <main id="scene" aria-label="雨夜便利店街角三维模型"></main>
  <noscript>请启用 JavaScript 以观看这个微缩世界。</noscript>
  <script>${js}</script>
</body>
</html>`;
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', html);
await writeFile('雨夜便利店.html', html);
console.log(`Built a self-contained HTML: ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB. No remote assets.`);
