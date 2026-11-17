"""Audit candidate face rim geometry without modifying source.
Usage: python3 audit_posterior_rim.py report_directory
Reports geometric plausibility; anatomical classification still needs renders.
"""
import pathlib,json,math,csv,sys
root=pathlib.Path(sys.argv[1]);out=[]
for f in sorted(root.glob('*.boundary-loops.json')):
 d=json.loads(f.read_text())
 for obj in d['objects']:
  for i,c in enumerate(obj['components']):
   mn=c['bounds_m']['min'];mx=c['bounds_m']['max']
   w=mx[0]-mn[0];h=mx[2]-mn[2];depth=mx[1]-mn[1]
   if not(c['simple_cycle'] and len(c['paths'])==1):continue
   p=c['paths'][0]
   # Anatomical-scale check: plausible broad oval around face, not eye/mouth.
   candidate=(p['closed'] and p['vertex_count']>=30 and h>=.12 and w>=.12 and .6<=h/w<=2.0)
   out.append(dict(model=f.stem.replace('.boundary-loops',''),object=obj['name'],component=i,
     vertices=p['vertex_count'],width_m=round(w,5),height_m=round(h,5),
     depth_m=round(depth,5),mean_y_m=round(c['mean_y_m'],5),
     height_width_ratio=round(h/w,3) if w else None,
     candidate=candidate,classification='geometry_only_not_anatomically_verified'))
if not out:raise SystemExit('No closed boundary loops found')
with (root/'posterior_rim_geometric_audit.csv').open('w',newline='') as f:
 writer=csv.DictWriter(f,fieldnames=list(out[0]));writer.writeheader();writer.writerows(out)
lines=['# Face rim geometric audit','','Candidates must be reviewed in renders; size alone does not prove anatomical location.','']
for model in sorted({x['model'] for x in out}):
 lines.append('## '+model)
 for x in [x for x in out if x['model']==model and x['candidate']]:
  lines.append(f"- component {x['component']}: {x['vertices']} vertices; width {x['width_m']}m, height {x['height_m']}m, depth {x['depth_m']}m, ratio {x['height_width_ratio']}")
 lines.append('')
(root/'posterior_rim_geometric_audit.md').write_text('\n'.join(lines))
print('RIM_AUDIT',len(out),'candidates',sum(x['candidate'] for x in out))
