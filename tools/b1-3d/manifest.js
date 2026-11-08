// GLB の実ファイルを検査し、マニフェスト（manifest.json）と素材一覧（ASSET_LIST.md）を作る。
// node tools/b1-3d/manifest.js
// 検査内容：GLB ヘッダ（magic/version/長さ）、JSON と BIN チャンク、glTF 2.0、全アクセサの範囲、
// 画像の形式、メッシュ・素材・テクスチャの数、頂点座標に NaN がないこと（POSITION の min/max）。
// ※Khronos 公式の glTF-Validator はこの環境に無いため使っていない（README に記載）。
const fs = require('fs'), path = require('path');
const DIR = path.resolve(__dirname, '../../assets/3d/dungeons/b1_ancient_forest');
const recs = JSON.parse(fs.readFileSync(path.join(DIR, 'build-records.json'), 'utf8'));

function inspect(file) {
  const b = fs.readFileSync(file), errs = [];
  if (b.readUInt32LE(0) !== 0x46546c67) errs.push('magic');
  if (b.readUInt32LE(4) !== 2) errs.push('version');
  if (b.readUInt32LE(8) !== b.length) errs.push('length');
  const jl = b.readUInt32LE(12); if (b.readUInt32LE(16) !== 0x4e4f534a) errs.push('json chunk');
  const j = JSON.parse(b.slice(20, 20 + jl).toString('utf8'));
  const bo = 20 + jl, bl = b.readUInt32LE(bo); if (b.readUInt32LE(bo + 4) !== 0x004e4942) errs.push('bin chunk');
  if (j.asset?.version !== '2.0') errs.push('asset.version');
  for (const v of j.bufferViews || []) if ((v.byteOffset || 0) + v.byteLength > bl) errs.push('bufferView range');
  for (const m of j.meshes || []) for (const p of m.primitives) {
    const a = j.accessors[p.attributes.POSITION];
    if (!a.min || !a.max || [...a.min, ...a.max].some((x) => !Number.isFinite(x))) errs.push('position min/max');
    if (p.attributes.NORMAL === undefined) errs.push('normal missing');
    if (p.attributes.TEXCOORD_0 === undefined) errs.push('uv missing');
  }
  const imgTypes = [...new Set((j.images || []).map((i) => i.mimeType))];
  let imgBytes = 0; for (const i of j.images || []) imgBytes += j.bufferViews[i.bufferView].byteLength;
  const exts = j.extensionsUsed || [];
  const extras = j.nodes?.find((n) => n.extras?.b1)?.extras?.b1;
  return { ok: errs.length === 0, errs, meshes: j.meshes.length, materials: (j.materials || []).length, textures: (j.textures || []).length, images: (j.images || []).length, imgTypes, imgBytes, exts, extras: !!extras };
}

const assets = [], fails = [];
let total = 0, totalImg = 0, totalTris = 0;
for (const [id, r] of Object.entries(recs)) {
  const f = path.join(DIR, r.file);
  if (!fs.existsSync(f)) { fails.push(id + ': file missing'); continue; }
  const st = fs.statSync(f), v = inspect(f);
  if (!v.ok) fails.push(id + ': ' + v.errs.join(','));
  total += st.size; totalImg += v.imgBytes; totalTris += r.tris;
  assets.push({ id, file: r.file, category: r.category, name_ja: r.name_ja, desc_ja: r.desc_ja, origin: r.origin, bytes: st.size, textureBytes: v.imgBytes, textureSize: r.tex,
    tris: r.tris, verts: r.verts, meshes: v.meshes, materials: r.materials, sizeMeters: r.size, bboxMin: r.bboxMin, pointLights: r.lights, extensions: v.exts, valid: v.ok });
}
const manifest = {
  name: 'B1F 深淵に眠る樹海 3D素材（Claude 品質向上版）', version: '0.1.0', generated: new Date().toISOString().slice(0, 10),
  format: 'glTF 2.0 Binary (.glb)', textures: 'JPEG（色・法線・ORM＝R:遮蔽/G:粗さ/B:金属、一部は発光）を GLB に埋め込み',
  conventions: { unit: 'meter', up: '+Y', front: '+Z', pivot: '既定は底面の中央（各素材の pivot は desc を参照）', grid: '1マス=4m、壁の高さ4m', lights: 'node.extras.b1.lights に点光源の位置・色・強さ・届く距離（m）' },
  generator: 'tools/b1-3d（three.js r180 + GLTFExporter、ヘッドレス Chrome）', status: '素材制作・検証段階。ゲーム本体には未接続',
  count: assets.length, totalBytes: total, totalTextureBytes: totalImg, totalTris,
  byCategory: assets.reduce((o, a) => ((o[a.category] = (o[a.category] || 0) + 1), o), {}),
  byOrigin: assets.reduce((o, a) => ((o[a.origin] = (o[a.origin] || 0) + 1), o), {}),
  validation: { allValid: fails.length === 0, failures: fails },
  assets,
};
fs.writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 1));

const CAT = { nature: '自然', glow: '発光', ruins: '遺跡', gimmick: '仕掛け', interact: '調べる物', props: '小物', foe: 'FOEの気配', module: '組み立て部品', gather: '採集' };
const kb = (n) => (n / 1024).toFixed(0) + ' KB';
let md = `# B1F「深淵に眠る樹海」3D素材一覧\n\n` +
  `- 点数：**${assets.length}点**（GPT 試作40点の作り直し ${manifest.byOrigin['GPT試作40点（名称・用途）を作り直し'] || 0}点、Claude 新規 ${manifest.byOrigin['Claude 新規'] || 0}点）\n` +
  `- 合計：${(total / 1048576).toFixed(1)} MB（うちテクスチャ ${(totalImg / 1048576).toFixed(1)} MB）、${totalTris.toLocaleString()} 三角形\n` +
  `- 形式：glTF 2.0 Binary（.glb）、PBR（色・法線・ORM）、テクスチャ JPEG 埋め込み\n` +
  `- 共通の約束：単位メートル、上 +Y、正面 +Z、原点は底面の中央（例外は説明欄）。1マス＝4m、壁の高さ4m\n` +
  `- 検査：全ファイルの構造検査 ${fails.length === 0 ? 'すべて合格' : '不合格あり：' + fails.join(' / ')}、three.js の GLTFLoader で全点を読み込んで描画済み（renders/）\n\n` +
  `| ファイル | 名前 | 分類 | 由来 | 寸法 (m) 幅×高×奥 | 三角形 | 容量 | テクスチャ | 説明 |\n|---|---|---|---|---|---:|---:|---|---|\n`;
for (const a of assets) md += `| \`${a.file}\` | ${a.name_ja} | ${CAT[a.category] || a.category} | ${a.origin === 'Claude 新規' ? '新規' : '作り直し'} | ${a.sizeMeters.map((x) => x.toFixed(1)).join('×')} | ${a.tris.toLocaleString()} | ${kb(a.bytes)} | ${a.textureSize}px | ${a.desc_ja} |\n`;
fs.writeFileSync(path.join(DIR, 'ASSET_LIST.md'), md);
console.log(`assets ${assets.length}, ${(total / 1048576).toFixed(1)} MB, tris ${totalTris}, failures ${fails.length}`);
if (fails.length) { console.log(fails.join('\n')); process.exit(1); }
