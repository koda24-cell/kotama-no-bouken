// 使い方: THREE_DIR=/path/to/three.js(r180) node tools/b1-3d/build.js [id,id,...]
// three.js r180 の build/ と examples/jsm/ が必要（README 参照）。Chrome をヘッドレスで使う。
const path = require('path'), fs = require('fs'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || '/opt/node-tools/node_modules/playwright-core');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'assets/3d/dungeons/b1_ancient_forest');
const THREE_DIR = process.env.THREE_DIR || '/tmp/three';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
function serve(port) {
  return http.createServer((q, s) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    const p = u.startsWith('/three/') ? path.join(THREE_DIR, u.slice(7)) : path.join(ROOT, u);
    fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); return s.end(); } s.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' }); s.end(d); });
  }).listen(port);
}
(async () => {
  const only = process.argv[2] || '';
  const srv = serve(8770);
  const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text()); });
  await p.exposeFunction('saveFile', (rel, b64) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, Buffer.from(b64, 'base64')); });
  await p.goto(`http://localhost:8770/tools/b1-3d/build.html?only=${only}`, { waitUntil: 'commit' });
  await p.waitForFunction('window.__done', null, { timeout: 0 });
  const res = await p.evaluate('window.__results');
  // 既存の記録に上書き統合
  const recFile = path.join(OUT, 'build-records.json');
  const old = fs.existsSync(recFile) ? JSON.parse(fs.readFileSync(recFile, 'utf8')) : {};
  for (const r of res) { if (r.error) console.log('FAIL', r.id, r.error); else { old[r.id] = r; console.log(`ok ${r.id.padEnd(34)} ${String(r.tris).padStart(7)} tris ${(r.bytes / 1024).toFixed(0).padStart(6)} KB  ${r.size.join('x')}  ${r.ms}ms`); } }
  fs.writeFileSync(recFile, JSON.stringify(old, null, 1));
  await b.close(); srv.close();
  if (res.some((r) => r.error)) process.exit(1);
})();
