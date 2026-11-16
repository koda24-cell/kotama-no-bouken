"""Final receipts: actual delivered files, not a declaration of art approval."""
import datetime,hashlib,json,struct,subprocess,zlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates'
V=BASE/'verification'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
manifest=read(BASE/'manifest.json');assert manifest['count']==17 and len(manifest['assets'])==17
asset_ids={a['id'] for a in manifest['assets']};assert len(asset_ids)==17
assert manifest['totalBytes']==sum((BASE/a['file']).stat().st_size for a in manifest['assets'])
for a in manifest['assets']:
    assert (BASE/a['file']).stat().st_size==a['bytes'],a['id']
    assert sha(BASE/a['file'])==a['sha256'],a['id']
    assert sha(BASE/a['source'])==a['sourceBlendSha256'],a['id']
    packaging=a['sourcePackaging']
    assert packaging['sha256']==a['sourceBlendSha256'] and packaging['file']==a['source'],a['id']
    assert packaging['externalImagesRequired'] is False and packaging['geometryPreserved'] is True,a['id']
    assert packaging['imagesDecoded']==packaging['imagesPacked']>0,a['id']
    assert len(a['renders'])==4 and set(a['renders'])==set(a['evidenceHashes']),a['id']
    for image,digest in a['evidenceHashes'].items():assert sha(BASE/image)==digest,image
layout=read(BASE/'scene/assembly-layout.json')
scene=BASE/layout['optionalSceneGLB']['file'];assert sha(scene)==layout['optionalSceneGLB']['sha256']
conformance=read(V/'khronos-validation.json')
assert len(conformance['reports'])==18 and conformance['errors']==0
assert {r['file'] for r in conformance['reports']}=={a['file'] for a in manifest['assets']}|{layout['optionalSceneGLB']['file']}
assert all(r['report']['issues']['numErrors']==0 for r in conformance['reports'])
assert sum(r['report']['issues']['numWarnings'] for r in conformance['reports'])==0
for r in conformance['reports']:assert sha(BASE/r['file'])==r['sha256']
browser=read(V/'browser-verification.json')
assert len(browser['assets'])==17 and len(browser['seams'])==2 and browser['errors']==[]
assert {a['id'] for a in browser['assets']}==asset_ids and all(a['invalid']==[] for a in browser['assets'])
assert len(browser['assetHashes'])==17 and {a['id'] for a in browser['assetHashes']}==asset_ids
for a in browser['assetHashes']:assert sha(BASE/a['file'])==a['sha256'],a['id']
assert browser['scene']['sha256']==sha(scene) and browser['scene']['invalid']==[]
assert set(browser['scene']['rootExtraAssetIds'])==asset_ids
mcp=read(V/'mcp-scene-readback.json');assert mcp['status']=='ok'
assert mcp['result'].get('sceneBlendSha256')==sha(BASE/'scene/scene.blend'),'MCP receipt is stale or lacks sceneBlendSha256; rerun mcp_inspect_scene.py'
assert len(mcp['result']['asset_ids'])==17 and len(mcp['result']['cameras'])==5
assert set(mcp['result']['asset_ids'])==asset_ids
view_names=('entry','courtyard','sealed_corridor','shrine_detail','birdseye')
assert set(mcp['result']['cameras'])=={'camera_'+name for name in view_names}
assert mcp['result']['externalImagesRequired']==[]
clearance=read(V/'scene-clearance.json');assert clearance['passed'] and not clearance['conflicts']
assert clearance['routeMin']==[-1,-14,.03] and clearance['routeMax']==[1,22,3]
assert clearance['sceneGlbSha256']==sha(scene)
assert clearance['sceneBlendSha256']==sha(BASE/'scene/scene.blend')
views={}
for name in view_names:
    record=layout['renders'][name];p=BASE/record['file'];data=p.read_bytes()
    assert record['sceneBlendSha256']==sha(BASE/'scene/scene.blend')
    assert record['sceneSourceCommit']==layout['sourceCommit'] and record['camera']=='camera_'+name
    assert sha(p)==record['sha256']
    assert data[:8]==b'\x89PNG\r\n\x1a\n'
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
assert game['scope']=='candidate_not_applied' and game['approvalStatus']=='pending_user_review'
assert game['runtimeModified'] is False and game['mapModified'] is False and game['saveMigrationRequired'] is False
assert game['schemaVersion']==2 and game['presentationRevision']=='soil_surface_v2'
assert 'gltf_node_material_selection_v1' in game['requiredCapabilities']
assert game['consumerContract']['implicitFullAssetFallback'] is False
profiles=game['floorRenderProfiles']
assert game['fullRootsoilTileWhitelist']==[]
for profile in profiles.values():
    assert profile['sourceSha256']==next(a['sha256'] for a in manifest['assets'] if a['id']==profile['sourceAssetId'])
    assert profile['onMismatch']=='reject_candidate'
for floor in game['floorPlacements']:
    assert floor['renderProfile'] in profiles
    if floor['assetId']=='mod_root_soil_floor_4m':assert floor['renderProfile']=='soil_surface_only'
for source in game['expectedSourceBaseline']['sourceFiles']:
    assert source['baselineMatch'] is True and sha(ROOT/source['file'])==source['sha256']==source['expectedBaselineSha256'],source['file']
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
