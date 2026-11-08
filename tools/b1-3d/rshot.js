// 使い方: node tools/b1-3d/rshot.js <出力画像> <render.html のクエリ> [page]
// 複数枚: node rshot.js --batch list.json   （[{out, qs, page}]）
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright-core');
const ROOT = path.resolve(__dirname, '../..'); const THREE_DIR = process.env.THREE_DIR || '/tmp/three';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = u.startsWith('/three/') ? path.join(THREE_DIR, u.slice(7)) : path.join(ROOT, u);
  fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); s.end(d); }); }).listen(8771);
(async () => {
  let jobs = process.argv[2] === '--batch' ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : [{ out: process.argv[2], qs: process.argv[3], page: process.argv[4] }];
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const j of jobs) {
    const qs = new URLSearchParams(j.qs); const w = +qs.get('w') || 960, h = +qs.get('h') || 720;
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(`http://localhost:8771/tools/b1-3d/${j.page || 'render.html'}?${j.qs}`, { waitUntil: 'commit' });
    try { await p.waitForFunction('window.__done', null, { timeout: 600000 }); } catch (e) { console.log('TIMEOUT', j.out, errs.join(' | ')); await p.close(); continue; }
    fs.mkdirSync(path.dirname(j.out), { recursive: true });
    await (await p.$('canvas')).screenshot({ path: j.out, type: j.out.endsWith('.png') ? 'png' : 'jpeg', quality: j.out.endsWith('.png') ? undefined : 88 });
    console.log('shot', j.out, JSON.stringify(await p.evaluate('window.__info')), errs.filter(x => !/404/.test(x)).join(' | '));
    await p.close();
  }
  await b.close(); srv.close();
})();
