"""Publish only actual scanned serial LOD comparisons; never adopt the variants."""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--progress', type=Path, required=True)
p.add_argument('--register', type=Path, required=True)
args = p.parse_args()
root = Path(__file__).resolve().parents[2]
base = root / 'assets/3d/dungeons/b3_industrial_candidates'
names = {a['id']: a['name'] for a in json.loads((root / 'tools/f3-industrial/parts.json').read_text())}
updated = []
for folder in sorted((base / 'lod_reviews').iterdir()):
    mp = folder / 'comparison/manifest.json'
    if not mp.exists():
        continue
    m = json.loads(mp.read_text())
    receipt = json.loads((folder / 'SHARED_BLENDER53_QA_NOT_APPROVED.json').read_text())
    assert m['status'] == receipt['status'] == 'NOT_APPROVED'
    assert m['original_modified'] is False
    assert hashlib.sha256(mp.read_bytes()).hexdigest() == receipt['files']['comparison/manifest.json']['sha256']
    source = base / m['assetId'] / 'props' / ('f3_' + m['assetId'] + '.glb')
    assert hashlib.sha256(source.read_bytes()).hexdigest() == m['sourceSha256']
    log = (folder / 'security/shared-gateway/output.log').read_text()
    assert re.search(r'^Infected files: 0\s*$', log, re.M)
    assert re.search(r'^Scanned files: [1-9]', log, re.M)
    assert not re.search(r'^Total errors: [1-9]|ERROR:', log, re.M)
    images = []
    for v in m['variants']:
        for row in v['files']:
            file = folder / 'comparison' / row['name']
            assert hashlib.sha256(file.read_bytes()).hexdigest() == row['sha256']
            assert row['sha256'] == receipt['files']['comparison/' + row['name']]['sha256']
            if file.suffix == '.png':
                images.append({'view': file.stem, 'file': 'comparison/' + file.name})
    assert len(images) == 12
    ident = 'f3-industrial-' + m['assetId'].replace('_', '-').lower() + '-lod-review'
    registry = json.loads((args.progress / 'index.json').read_text())
    prior = next((r for r in registry['models'] if r['id'] == ident), None)
    if prior and str(prior.get('run_id')) == str(m['workflowRun']):
        continue
    manifest = {'id': ident, 'name': names[m['assetId']] + '・LOD比較',
                'floor': '第3層 遺跡都市', 'version': 'LOD0/1/2 技術比較・ゲーム未採用',
                'status': '制作中', 'run_id': int(m['workflowRun']),
                'source_sha': m['sourceCommit'], 'updated_at': datetime.now(timezone.utc).isoformat(),
                'publication_cleared': True, 'images': images}
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json') as f:
        json.dump(manifest, f, ensure_ascii=False)
        f.flush()
        subprocess.run(['python3', str(args.register), '--registry', str(args.progress),
                        '--manifest', f.name, '--source', str(folder)], check=True)
    updated.append(ident)
print(json.dumps({'registered': updated, 'gameApproval': 'NOT_APPROVED'}, ensure_ascii=False))
