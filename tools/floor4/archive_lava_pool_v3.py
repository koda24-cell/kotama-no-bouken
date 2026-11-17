"""One-shot archival action for the single user-approved lava pool C V3."""
import os,json,hashlib,struct,pathlib,shutil,subprocess
source=pathlib.Path('/tmp/b4-lava-pool-source')
stem='b4-lava-c_pool-v3'
m=json.loads((source/'manifest-c_pool-v3.json').read_text())
expected=[stem+'.glb',stem+'.blend']+[stem+'-'+v+'.png' for v in ('angle','front','side','top')]
assert m['approval']=='NOT_APPROVED'
assert set(x['file'] for x in m['files'])==set(expected)
for x in m['files']:
 p=source/x['file']
 assert p.exists() and p.stat().st_size>5000
 assert hashlib.sha256(p.read_bytes()).hexdigest()==x['sha256']
with (source/(stem+'.glb')).open('rb') as f:
 assert f.read(4)==b'glTF'
 f.seek(12);n,t=struct.unpack('<II',f.read(8))
 gltf=json.loads(f.read(n))
assert len(gltf.get('meshes',[]))>5 and len(gltf.get('images',[]))>=2
print('verified C only',len(gltf['meshes']),len(gltf['images']))
subprocess.run(['git','fetch','origin','development'],check=True)
subprocess.run(['git','checkout','-b','feature/gpt-b4-lava-pool-v3-approved-20261117','origin/development'],check=True)
base=pathlib.Path('assets/models/floor4')
review=base/'reviews/b4-lava-pool-v3'
review.mkdir(parents=True,exist_ok=True)
shutil.copy2(source/(stem+'.glb'),base/'b4-lava-pool-v3.glb')
for view in ('angle','front','side','top'):
 shutil.copy2(source/(stem+'-'+view+'.png'),review/(view+'.png'))
shutil.copy2(source/(stem+'.blend'),review/'source.blend')
files=[base/'b4-lava-pool-v3.glb']+sorted(review.glob('*.png'))+[review/'source.blend']
manifest={
 'asset':'b4-lava-pool-v3','source':stem,
 'source_run_id':43998531627,'source_artifact_id':14290673461,
 'user_selection':'C only; A,B,D,E excluded',
 'approval':'USER_APPROVED_2026-11-17',
 'game_integration':'NOT_DONE',
 'files':[{'path':str(p),'size':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
}
(review/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
handoff="""# B4 溶岩溜まり C / V3 — 完成承認・Claude向け引き継ぎ

- 2026-11-17: ユーザーが5種類から青丸の C（溶岩溜まり）のみ採用。A蛇行流・B合流・D滝・E冷却地帯は不採用。ゲームへ組み込まない。
- Blender実レンダー: https://github.com/koda24-cell/kotama-no-bouken/actions/runs/43998531627 (success), Artifact 14290673461。
- 正式GLB: assets/models/floor4/b4-lava-pool-v3.glb
- 正面/側面/斜め/俯瞰PNG、Blend、SHA256 manifest: assets/models/floor4/reviews/b4-lava-pool-v3/
- 既存マグマ河川PR #450と溶岩5種PR #454は別の未完成作業。採用済みCのみこのPRへ含める。
- Claude: Blenderを実行せずGLB/PNG/manifestを確認。Three.js/GLTFLoaderで実表示、サイズ/原点/法線/UV/発光/接続/パフォーマンスを検証後、別PRでゲームへ統合。既存マップ/セーブを壊さない。
- 未実施: ゲーム統合、動的流体/VFX、FPS・接続タイル検証。静止GLBの美術承認と実装完了は別。
"""
pathlib.Path('docs/3d/B4_LAVA_POOL_V3_COMPLETED_20261117.md').write_text(handoff)
p=pathlib.Path('docs/3d/FLOOR4_COMPLETED_ASSETS.md')
s=p.read_text()
row='| 溶岩溜まり（単体Cのみ） | V3 | assets/models/floor4/b4-lava-pool-v3.glb | assets/models/floor4/reviews/b4-lava-pool-v3/ | docs/3d/B4_LAVA_POOL_V3_COMPLETED_20261117.md | 未実施 |\n'
assert '溶岩溜まり（単体Cのみ）' not in s
assert '完成承認は2026-11-17。' in s
s=s.replace('完成承認は2026-11-17。',row+'\n完成承認は2026-11-17。')
s+='\n2026-11-17: 溶岩単体5候補のうち C（溶岩溜まり）のみ採用。A/B/D/Eは不採用。CのGLB/PNG/Blend/manifestを正式保存。ゲーム統合は未実施。\n'
p.write_text(s)
subprocess.run(['git','add','assets/models/floor4/b4-lava-pool-v3.glb',str(review),'docs/3d/B4_LAVA_POOL_V3_COMPLETED_20261117.md',str(p)],check=True)
subprocess.run(['git','-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','Archive approved lava pool C V3 with GLB, four PNG, Blend and handoff'],check=True)
subprocess.run(['git','push','origin','feature/gpt-b4-lava-pool-v3-approved-20261117'],check=True)
