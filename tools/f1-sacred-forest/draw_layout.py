"""Draw the actual planned individual-asset placements as a labelled SVG."""
import ast,html,math,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'tools/f1-sacred-forest/assemble_scene.py'
tree=ast.parse(source.read_text())
fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='planned_placements')
env={'random':random,'math':math}
exec(compile(ast.Module(body=[fn],type_ignores=[]),str(source),'exec'),env)
rows=env['planned_placements']()
def pt(x,y):return 45+(x+18)*18,105+(26-y)*18
parts=['<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1100" viewBox="0 0 1100 1100">',
 '<rect width="1100" height="1100" fill="#f3f0e8"/>',
 '<g font-family="Noto Sans CJK JP, sans-serif" fill="#29362e">',
 '<text x="45" y="42" font-size="26" font-weight="700">鎮守の根庭 — 一層後半 空間設計</text>',
 '<text x="45" y="70" font-size="14">個別GLBの配置図 / 既存ゲーム未統合 / 図は実レンダ画像ではありません</text>']
for r in rows:
 if 'floor' not in r['asset_id']:continue
 x,y=pt(*r['position'][:2]);dressing=r['role']=='dressing_only'
 color='#aaa88b' if 'soil' in r['asset_id'] else '#c8c0aa'
 parts.append(f'<rect x="{x-36:.2f}" y="{y-36:.2f}" width="72" height="72" fill="{color}" stroke="#f3f0e8" stroke-width=".7" opacity="{.3 if dressing else 1}"/>')
x,y=pt(-1,18)
parts.append(f'<rect x="{x}" y="{y}" width="36" height="576" fill="#dce4cf" opacity=".5"/>')
for r in rows:
 a=r['asset_id'];
 if r['position'][1]>26:continue
 x,y=pt(*r['position'][:2]);s=r['scale'];s=s if isinstance(s,(int,float)) else s[0]
 if 'floor' in a:continue
 if a=='sacred_cedar_tree':
  parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{40*s:.1f}" fill="#49664a" fill-opacity=".45" stroke="#344c39" stroke-width="1.4"/><circle cx="{x:.1f}" cy="{y:.1f}" r="6" fill="#554634"/>')
 elif 'wall' in a or 'arch' in a:
  angle=-r['rotation_z_degrees'];dash='stroke-dasharray="12 5"' if 'collapsed' in a else ''
  parts.append(f'<g transform="translate({x:.1f},{y:.1f}) rotate({angle:.1f})"><path d="M-36 0H36" stroke="#555c56" stroke-width="10" {dash}/></g>')
 elif a=='weathered_torii_gate':
  parts.append(f'<path d="M{x-34:.1f} {y:.1f}H{x+34:.1f}" stroke="#985a43" stroke-width="8"/>')
 elif a=='sacred_hokora_shrine':
  parts.append(f'<rect x="{x-18:.1f}" y="{y-18:.1f}" width="36" height="36" fill="#9e8860" stroke="#4d4638" stroke-width="3"/>')
 elif a=='mossy_granite_boulder':
  parts.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{19*s:.1f}" ry="{13*s:.1f}" fill="#777e6c"/>')
 elif 'stele' in a or 'lantern' in a:
  parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{6*s+2:.1f}" fill="#e2d6ae" stroke="#555b4b" stroke-width="2"/>')
 elif 'fern' in a or 'shrub' in a or 'flower' in a:
  color='#e5e1c6' if 'flower' in a else '#637948'
  parts.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{9*s:.1f}" fill="{color}"/>')
 elif 'log' in a:
  parts.append(f'<path d="M{x-27:.1f} {y+10:.1f}L{x+27:.1f} {y-10:.1f}" stroke="#706046" stroke-width="10"/>')
for label,(x0,y0) in [('入口・根の参道',(0,-14.8)),('退色鳥居',(0,-6.1)),('開放中庭',(0,3)),('朽ちた小祠',(-4.8,8.5)),('封印回廊',(0,14)),('御神木',(6.7,3.5))]:
 x,y=pt(x0,y0);label=html.escape(label)
 parts.append(f'<text x="{x+11:.1f}" y="{y-11:.1f}" font-size="13" paint-order="stroke" stroke="#f3f0e8" stroke-width="4">{label}</text>')
for i,(head,body) in enumerate([
 ('01 根の参道','低い囲いと根で視野を圧縮'),('02 神域の境界','朱を限定し、先の明るさを予告'),
 ('03 根の中庭','天井を抜き、古木と石碑を主役に'),('04 祀りの痕跡','朽ちた小祠・札・奉納物'),('05 地下封印回廊','開放空間から再び暗い奥へ')]):
 y=150+i*90
 parts.append(f'<text x="815" y="{y}" font-size="17" font-weight="700">{head}</text><text x="815" y="{y+27}" font-size="12">{body}</text>')
parts+=['<text x="815" y="655" font-size="14">主空間 24 × 32m</text>',
 '<text x="815" y="680" font-size="14">設計通路 幅2m / 高さ3m</text>',
 '<text x="815" y="705" font-size="14">歩行高さ0m / 目高1.6m</text>',
 '<text x="815" y="760" font-size="12">薄い外周は視覚用の背景。</text>',
 '<text x="815" y="783" font-size="12">ゲームの歩行領域拡張ではない。</text>',
 f'<text x="45" y="1060" font-size="13">17個別アセット / {len(rows)+1}配置（背景地面1・遠景の一部は省略） / 出典: assemble_scene.py / 2026-11-16 JST</text>',
 '</g></svg>']
out=ROOT/'docs/3d/f1-sacred-forest-layout.svg';out.write_text('\n'.join(parts)+'\n')
print(out)
