from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[2];b=ROOT/'assets/3d/dungeons/b1_closed_ruins_v3'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
scripts={'v3_moss_veil':'build_moss_veil.py','v3_shade_understory':'build_shade_understory.py','v3_root_rubble':'build_root_rubble.py','v3_collapse_oculus':'build_collapse_oculus.py','v3_eroded_bank':'build_eroded_bank.py'}
assets=[]
for p in sorted((b/'metrics').glob('*.json')):
    d=json.loads(p.read_text());assert len(d['renders'])==4 and d['renderedFrom']=='reimported GLB'
    assert sha(b/d['file'])==d['sha256'];d['sourceSha256']=sha(b/d['source']);d['renderSHA256']={r:sha(b/r) for r in d['renders']};d['buildScript']='tools/f1-closed-ruins-v3/assets/'+scripts[d['id']];d['buildScriptSha256']=sha(ROOT/d['buildScript']);d['commonAdapterSha256']=sha(ROOT/'tools/f1-closed-ruins-v3/asset_common.py');assets.append(d)
assert len(assets)==5
source=json.loads((b/'verification/source-portability.json').read_text());assert source['passed']
for s in source['sources']:assert sha(b/s['file'])==s['sha256']
fmt=json.loads((b/'verification/khronos-validation.json').read_text());assert fmt['errors']==0 and fmt['warnings']==0
for r in fmt['reports']:assert r['sha256']==next(a['sha256'] for a in assets if a['id']==r['id'])
old=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates';original=json.loads((old/'manifest.json').read_text())
assert len(original['assets'])==17
for a in original['assets']:assert sha(old/a['file'])==a['sha256']
out={'revision':3,'status':'candidate_pending_user_art_review','count':5,'original17Unchanged':True,'individualReimportViews':20,'geometryTriangles':sum(a['tris'] for a in assets),'production':'Each asset generated in a separate sequential Blender invocation; actual reimported GLB views reviewed','assets':assets,'verification':{'formatErrors':0,'formatWarnings':0,'packedSourceReopen':True}}
(b/'manifest.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['assets']}))
