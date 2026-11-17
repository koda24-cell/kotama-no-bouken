"""Select plausible posterior rim paths from measured face boundaries.
Produces ranked *candidates*, never an automatic approval or mesh replacement.
Usage: python3 rank_posterior_seams.py output/character-mesh-research
"""
import json,pathlib,sys,csv
root=pathlib.Path(sys.argv[1]);reports=sorted(root.glob('*.boundary-loops.json'))
if not reports:raise SystemExit('No boundary reports')
rows=[]
for file in reports:
 d=json.loads(file.read_text(encoding='utf-8'))
 for obj in d['objects']:
  for ci,c in enumerate(obj['components']):
   mn=c['bounds_m']['min'];mx=c['bounds_m']['max']
   width=mx[0]-mn[0];height=mx[2]-mn[2];depth=mx[1]-mn[1]
   for pi,p in enumerate(c['paths']):
    # Do not classify branched paths as watertight seams.
    # Rank only by physical span and topology; posterior location is unknown.
    closed=bool(p['closed'])
    length=p['length_m']
    rank=(3 if closed else 0)+(2 if width>height*.4 else 0)+(1 if p['vertex_count']>=12 else 0)
    rows.append({'model':file.name.replace('.boundary-loops.json',''),'object':obj['name'],
     'component':ci,'path':pi,'closed':closed,'vertices':p['vertex_count'],
     'length_m':length,'component_width_m':round(width,6),'component_height_m':round(height,6),
     'component_depth_m':round(depth,6),'topology_rank':rank,
     'needs_manual_review':True})
if not rows:raise SystemExit('No boundary paths')
rows.sort(key=lambda r:(r['model'],-r['topology_rank'],-r['length_m']))
with (root/'posterior_seam_candidates.csv').open('w',newline='',encoding='utf-8') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
review=['# Posterior seam candidates — manual review required','','This is a topology-only shortlist, not anatomical seam recognition.','',
 'No original vertex positions or third-party mesh data are redistributed in this summary.','',
 'Before V16 bridging: inspect overlay, exclude eyes/mouth/neck, confirm seam winding,',
 'check normals and manifoldness, and compare front/back/side renders.','']
for model in sorted({r['model'] for r in rows}):
 review.append('## '+model)
 for r in [x for x in rows if x['model']==model][:8]:
  review.append(f"- {r['object']} component {r['component']} path {r['path']}: rank {r['topology_rank']}, closed={r['closed']}, {r['vertices']} vertices, length {r['length_m']} m")
 review.append('')
(root/'posterior_seam_review.md').write_text('\n'.join(review),encoding='utf-8')
print('POSTERIOR_SEAM_CANDIDATES',len(rows))
