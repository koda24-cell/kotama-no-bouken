"""Validate five-domain Blender quality reports and produce a human-readable QA summary.
Usage: python3 assess_character_quality.py output/character-mesh-research
Flags are diagnostic, NOT proof of defects or artistic quality.
"""
import pathlib,json,sys,csv,collections
root=pathlib.Path(sys.argv[1])
reports=sorted(root.glob('*.quality.json'))
if not reports:raise SystemExit('No quality reports found')
rows=[];warnings=[]
for p in reports:
 d=json.loads(p.read_text(encoding='utf-8'))
 meshes=d.get('geometry',[])
 if not meshes:raise SystemExit(f'Empty geometry: {p}')
 heads=[m for m in meshes if m.get('role_guess') in ('head','ear')]
 hair=[m for m in meshes if m.get('role_guess')=='hair']
 shapes=sum(len(m.get('shape_keys',[])) for m in meshes)
 rigbones=sum(r.get('bone_count',0) for r in d.get('armatures',[]))
 bound=sum(m.get('boundary_edges',0) for m in heads)
 openparts=sum(not x.get('closed_cycle',False) for m in heads for x in m.get('boundary_components',[]))
 material_count=len(d.get('materials',[]))
 row={'model':p.name.removesuffix('.quality.json'),'meshes':len(meshes),'head_meshes':len(heads),'hair_meshes':len(hair),'head_boundary_edges':bound,'head_noncycle_boundary_components':openparts,'materials':material_count,'shape_keys':shapes,'rig_bones':rigbones,'head_coverage':'NAME_HEURISTIC_ONLY' if heads else 'NO_NAMED_HEAD'}
 rows.append(row)
 if not heads:warnings.append((row['model'],'No head/face/ear mesh found by name; inspect mesh organization'))
 if openparts:warnings.append((row['model'],f'{openparts} boundary components are not simple cycles; inspect topology manually'))
 if not hair:warnings.append((row['model'],'No hair-named mesh; hair segmentation may be embedded in another mesh'))
 if not rigbones:warnings.append((row['model'],'No armature detected; verify importer and source format'))
 for m in meshes:
  for b in m.get('boundary_components',[]):
   if b.get('branched'):warnings.append((row['model'],f'Branched boundary in {m["name"]}'))
out=root/'quality_comparison.csv'
with out.open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
lines=['# Character quality extraction QA','',f'Reports inspected: {len(rows)}','',
       'Automated checks validate presence and consistency, not visual beauty, correct topology, or licensed use.','',
       '## Review flags']
lines += [f'- **{model}**: {msg}' for model,msg in warnings] if warnings else ['- No heuristic flags. Manual image inspection is still required.']
lines += ['','## Reproduction next steps','- Calibrate head forward axis and units for each model','- Confirm head/hair mesh identity by visual review','- Verify boundary loops and identify the posterior attachment loop','- Inspect front/side/back/three-quarter/back-upper renders','- Record independent V16 design values and render before approval','']
(root/'quality_review.md').write_text('\n'.join(lines),encoding='utf-8')
print('QUALITY_QA_WRITTEN',len(rows),'models',len(warnings),'flags')
