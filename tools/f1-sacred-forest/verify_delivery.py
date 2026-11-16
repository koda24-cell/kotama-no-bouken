"""Final receipts: actual delivered files, not a declaration of art approval."""
import datetime,hashlib,json,struct,subprocess,zlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates'
V=BASE/'verification'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
manifest=read(BASE/'manifest.json');assert manifest['count']==17 and len(manifest['assets'])==17
for a in manifest['assets']:
    assert sha(BASE/a['file'])==a['sha256'],a['id']
    assert sha(BASE/a['source'])==a['sourceBlendSha256'],a['id']
    for image,digest in a['evidenceHashes'].items():assert sha(BASE/image)==digest,image
layout=read(BASE/'scene/assembly-layout.json')
scene=BASE/layout['optionalSceneGLB']['file'];assert sha(scene)==layout['optionalSceneGLB']['sha256']
conformance=read(V/'khronos-validation.json')
assert len(conformance['reports'])==18 and conformance['errors']==0
assert sum(r['report']['issues']['numWarnings'] for r in conformance['reports'])==0
for r in conformance['reports']:assert sha(BASE/r['file'])==r['sha256']
browser=read(V/'browser-verification.json')
assert len(browser['assets'])==17 and len(browser['seams'])==2 and browser['errors']==[]
assert browser['scene']['sha256']==sha(scene) and browser['scene']['invalid']==[]
assert set(browser['scene']['rootExtraAssetIds'])=={a['id'] for a in manifest['assets']}
mcp=read(V/'mcp-scene-readback.json');assert mcp['status']=='ok'
assert len(mcp['result']['asset_ids'])==17 and len(mcp['result']['cameras'])==5
assert mcp['result']['externalImagesRequired']==[]
clearance=read(V/'scene-clearance.json');assert clearance['passed'] and not clearance['conflicts']
assert clearance['sceneGlbSha256']==sha(scene)
assert clearance['sceneBlendSha256']==sha(BASE/'scene/scene.blend')
views={}
for name in ('entry','courtyard','sealed_corridor','shrine_detail','birdseye'):
    record=layout['renders'][name];p=BASE/record['file'];data=p.read_bytes()
    assert sha(p)==record['sha256']
    assert struct.unpack_from('>II',data,16)==(1600,1000)
    offset=8;metadata={}
    while offset+12<=len(data):
        length=struct.unpack_from('>I',data,offset)[0];kind=data[offset+4:offset+8];chunk=data[offset+8:offset+8+length]
        if kind in (b'tEXt',b'zTXt'):
            key,value=chunk.split(b'\0',1)
            if kind==b'zTXt':value=zlib.decompress(value[1:])
            metadata[key.decode('latin1')]=value.decode('latin1')
        offset+=length+12
    assert int(metadata['cycles.ViewLayer.samples'])>=48
    assert metadata['Camera']=='camera_'+name
    views[name]=dict(file=record['file'],sha256=sha(p),width=1600,height=1000,
                     samples=int(metadata['cycles.ViewLayer.samples']),camera=metadata['Camera'])
game=read(BASE/'scene/game-layout-candidate.json')
summary=dict(status='candidate_verified_pending_user_review',gameIntegrated=False,
 generatedAtUTC=datetime.datetime.now(datetime.timezone.utc).isoformat(),
 sourceRevision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
 assets=17,individualTriangles=sum(a['tris'] for a in manifest['assets']),individualGlbBytes=manifest['totalBytes'],
 individualEvidenceImages=sum(len(a['renders']) for a in manifest['assets']),
 sceneGlb=dict(file=layout['optionalSceneGLB']['file'],sha256=sha(scene),bytes=scene.stat().st_size,
               triangles=browser['scene']['triangles'],drawCalls=browser['scene']['renderer']['calls']),
 sceneSource=dict(file='scene/scene.blend',sha256=sha(BASE/'scene/scene.blend'),packedImages=mcp['result']['imagesPacked']),
 views=views,conformanceFiles=18,conformanceErrors=0,conformanceWarnings=0,browserErrors=0,
 sourcePortabilityVerified=True,centralRouteClearanceVerified=True,
 realDevicePerformanceApproved=False,artApproval='pending_user_review',
 notes=['Standalone review environment and unapplied game-layout candidate.',
        'Cycles lighting/sky is not embedded as game runtime behaviour in GLB.',
        'CPU SwiftShader readback is not a device FPS guarantee.'])
(V/'delivery-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:summary[k] for k in ('status','assets','individualGlbBytes','individualEvidenceImages','conformanceErrors','browserErrors')},indent=2))
