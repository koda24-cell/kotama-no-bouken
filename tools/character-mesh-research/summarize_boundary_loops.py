"""Summarize measured boundary components without copying mesh coordinates.
Usage: python3 summarize_boundary_loops.py output/character-mesh-research
Output is diagnostic only; it does not identify anatomical seams automatically.
"""
import json,csv,pathlib,sys,collections
root=pathlib.Path(sys.argv[1]);files=sorted(root.glob('*.boundary-loops.json'))
if not files:raise SystemExit('No boundary-loop JSON reports found')
rows=[]
for file in files:
 data=json.loads(file.read_text(encoding='utf-8'))
 if not data.get('objects'):raise SystemExit('No face/head objects in '+file.name)
 for obj in data['objects']:
  for index,c in enumerate(obj['components']):
   mn=c['bounds_m']['min'];mx=c['bounds_m']['max']
   rows.append({'model':file.name.replace('.boundary-loops.json',''),'object':obj['name'],'component_index':index,
    'vertices':c['vertex_count'],'edges':c['edge_count'],'simple_cycle':c['simple_cycle'],
    'branch_or_endpoint_vertices':sum(int(n)*int(k!=2) for k,n in c['degree_histogram'].items()),
    'width_x_m':round(mx[0]-mn[0],6),'depth_y_m':round(mx[1]-mn[1],6),'height_z_m':round(mx[2]-mn[2],6),
    'center_y_m':round(c['mean_y_m'],6),'paths':len(c['paths']),
    'closed_paths':sum(p['closed'] for p in c['paths'])})
if not rows:raise SystemExit('No boundary components found')
with (root/'boundary_component_comparison.csv').open('w',encoding='utf-8',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
lines=['# Boundary component review (diagnostic)','',f'Models: {len(files)}, components: {len(rows)}','',
 '## Caveats','- Front axis +Y is only an assumption for these VRoid samples.',
 '- Component index is sorted by descending edge count; it is NOT a semantic seam ID.',
 '- A boundary component with branches may contain multiple openings; paths are diagnostic.',
 '- Width, depth, height are in imported Blender scene units, treated as meters; confirm import scale.',
 '- Do not bridge to a component without reviewing front/back/side overlays.','',
 '## Largest boundary components by model','']
for name in sorted(set(r['model'] for r in rows)):
 items=sorted((r for r in rows if r['model']==name),key=lambda r:-r['edges'])[:4]
 lines.append('### '+name)
 for r in items:
  lines.append(f"- {r['object']} component {r['component_index']}: {r['edges']} edges, {r['vertices']} vertices, cycle={r['simple_cycle']}, branches/endpoints={r['branch_or_endpoint_vertices']}, width={r['width_x_m']}m, height={r['height_z_m']}m, depth={r['depth_y_m']}m")
 lines.append('')
(root/'boundary_component_review.md').write_text('\n'.join(lines),encoding='utf-8')
print('BOUNDARY_REVIEW',len(files),'models',len(rows),'components')
