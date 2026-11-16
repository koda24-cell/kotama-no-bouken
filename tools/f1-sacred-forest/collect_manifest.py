"""Collect measured, individually verified assets; never invent missing output."""
import ast
import hashlib
import json
import struct
import subprocess
import zlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates'
NAMES={
 'mod_sacred_stone_floor_4m':'風化した参道の敷石',
 'mod_root_soil_floor_4m':'根と落葉の林床',
 'mod_sacred_wall_4m':'苔むした祭祀石壁',
 'mod_sacred_collapsed_wall_4m':'崩落した石壁',
 'mod_sacred_arch_4m':'封印回廊の石門',
 'weathered_torii_gate':'退色した木造鳥居',
 'broken_votive_stele':'肩の欠けた奉納石碑',
 'moss_stone_lantern':'苔と欠損の石灯籠',
 'ofuda_seal_cluster':'剥がれた封印の紙札',
 'sacred_cedar_tree':'根張りの古杉',
 'fallen_cedar_log':'朽ちた中空の倒木',
 'forest_fern_cluster':'羽状葉のシダ群落',
 'forest_shrub_cluster':'森の低木',
 'white_wildflower_patch':'白花と蕾の草叢',
 'hanging_forest_vines':'垂れつると巻きひげ',
 'mossy_granite_boulder':'欠損した苔の花崗岩',
 'sacred_hokora_shrine':'朽ちた鎮守の小祠',
}

def png_evidence(path):
    data=path.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n'
    width,height=struct.unpack_from('>II',data,16);offset=8;metadata={}
    while offset+12<=len(data):
        length=struct.unpack_from('>I',data,offset)[0]
        kind=data[offset+4:offset+8];chunk=data[offset+8:offset+8+length]
        if kind in (b'tEXt',b'zTXt'):
            key,value=chunk.split(b'\0',1)
            if kind==b'zTXt':value=zlib.decompress(value[1:])
            metadata[key.decode('latin1')]=value.decode('latin1')
        offset+=length+12
    return {'width':width,'height':height,
            'samples':int(metadata.get('cycles.ViewLayer.samples','0')),
            'camera':metadata.get('Camera'),'engine':'Cycles CPU',
            'blenderDateMetadata':metadata.get('Date'),'renderTime':metadata.get('RenderTime')}

assets=[]
for asset_id,name in NAMES.items():
    metric_path=OUT/'metrics'/(asset_id+'.json')
    if not metric_path.exists():raise SystemExit('Not finished: '+asset_id)
    m=json.loads(metric_path.read_text());p=OUT/m['file']
    assert p.stat().st_size==m['bytes']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==m['sha256']
    assert m['valid'] and len(m['renders'])>=4
    assert all((OUT/r).is_file() and (OUT/r).stat().st_size>1000 for r in m['renders'])
    source_header=(OUT/m['source']).read_bytes()[:7]
    assert source_header==b'BLENDER' or source_header[:4]==b'\x28\xb5\x2f\xfd','Unknown Blender container'
    m['sourceContainer']='Zstandard-compressed blend' if source_header[:4]==b'\x28\xb5\x2f\xfd' else 'uncompressed blend'
    m.update(name_ja=name,approvalStatus='pending_user_review',
             origin='top attachment' if asset_id=='hanging_forest_vines' else 'surface top centre' if 'floor_4m' in asset_id else 'floor-centred',
             expectedByteBudget=4194304 if asset_id in ('sacred_cedar_tree','sacred_hokora_shrine') else 1048576)
    if asset_id in ('mod_sacred_wall_4m','mod_sacred_collapsed_wall_4m','mod_sacred_arch_4m'):
        m['origin']='inner-face lower centre; passage-facing +Z, thickness behind -Z'
    elif asset_id=='ofuda_seal_cluster':m['origin']='wall-contact lower centre; front +Z'
    m['budgetStatus']='within_target' if m['bytes']<=m['expectedByteBudget'] else 'above_target_review_required'
    source=ROOT/'tools/f1-sacred-forest/assets'/('build_'+asset_id+'.py')
    m['buildScript']='tools/f1-sacred-forest/assets/'+source.name
    m['buildScriptSha256']=hashlib.sha256(source.read_bytes()).hexdigest()
    # A successful old render must not silently stand in for a revised model.
    dependencies={source,ROOT/'tools/f1-sacred-forest/common.py'}
    pending=list(dependencies)
    while pending:
        dep=pending.pop()
        for node in ast.walk(ast.parse(dep.read_text())):
            if not isinstance(node,ast.ImportFrom) or not node.module:continue
            for directory in (source.parent,source.parent.parent):
                local=directory/(node.module.replace('.','/')+'.py')
                if local.is_file() and local not in dependencies:
                    dependencies.add(local);pending.append(local)
    m['buildDependencies']={}
    for dep in sorted(dependencies):
        rel=str(dep.relative_to(ROOT));now=dep.read_bytes()
        recorded=subprocess.check_output(['git','show',m['sourceCommit']+':'+rel],cwd=ROOT)
        assert recorded==now,f'{asset_id}: rebuild required after changing {rel}'
        m['buildDependencies'][rel]=hashlib.sha256(now).hexdigest()
    m['evidenceHashes']={r:hashlib.sha256((OUT/r).read_bytes()).hexdigest() for r in m['renders']}
    m['renderEvidence']={r:png_evidence(OUT/r) for r in m['renders']}
    m['sourceBlendSha256']=hashlib.sha256((OUT/m['source']).read_bytes()).hexdigest()
    packaging=m.get('sourcePackaging',{})
    assert packaging.get('externalImagesRequired') is False,f'{asset_id}: portable source packaging not verified'
    assert packaging.get('sha256')==m['sourceBlendSha256'],f'{asset_id}: source changed after packaging verification'
    assets.append(m)

manifest=dict(schemaVersion=1,count=len(assets),totalBytes=sum(a['bytes'] for a in assets),
 sourceBaseline='ae7995ae9ab7c36a547c6dbd7a5d601d3fc4bea5',approvalStatus='pending_user_review',
 conventions={'units':'metres','up':'+Y','front':'+Z','cellMeters':4,'eyeHeightMeters':1.6,
 'origin':'floor props bottom-centred; floors top centre; hanging vines top attachment'},
 gameIntegration='not integrated; candidate assets and standalone preview only',
 materials='embedded image metallic-roughness and OpenGL normal; no vertex colours or external decoder',
 verification='Each GLB reimported in Blender 5.3 for front/side/angle/top renders; browser report separate',
 assets=assets)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
rows=['# 鎮守の根庭：候補アセット一覧','',
 '未承認の制作候補。既存の一層、セーブ、ゲーム進行にはまだ統合していません。','',
 '| 素材 | GLB | 寸法 X/Y/Z (m) | 三角形 | 容量 KiB | 材質数 | 予算 |',
 '|---|---|---|---:|---:|---:|---|']
for a in assets:
    rows.append('| '+a['name_ja']+' | ['+a['id']+']('+a['file']+') | '+str(a['sizeMeters'])+' | '+str(a['tris'])+' | '+str(round(a['bytes']/1024,1))+' | '+str(len(a['materials']))+' | '+a['budgetStatus']+' |')
rows+=['',f"計{len(assets)}点 / {manifest['totalBytes']/1048576:.2f} MiB（個別GLB合計、全景・ソース・レンダ画像は別）。",'',
 'GLBの形式検証と品質の承認は別です。予算超過・実機性能・ゲームへの配置はレビュー対象です。',
 'CC0写真テクスチャの出典・変換・ハッシュは textures/texture-sources.json。Pinterest画像は同梱していません。']
(OUT/'ASSET_LIST.md').write_text('\n'.join(rows)+'\n')
print(json.dumps({'count':manifest['count'],'totalBytes':manifest['totalBytes'],
 'overBudget':[a['id'] for a in assets if a['budgetStatus']!='within_target']},indent=2))
