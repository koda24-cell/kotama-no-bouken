"""Summarize Blender mesh JSON into head-focused comparison without exporting raw geometry."""
import json,sys,pathlib,csv
folder=pathlib.Path(sys.argv[1]);out=folder/'head_comparison.csv'
rows=[]
for path in sorted(folder.glob('*.json')):
    data=json.loads(path.read_text())
    for m in data.get('meshes',[]):
        n=m['object'].lower()
        if not any(x in n for x in ('head','face','ear','skin')) or any(x in n for x in ('hair','eye','brow','lash','mouth','teeth')):
            continue
        lo=m['bounds_min'];hi=m['bounds_max']
        rows.append({'model':path.stem,'mesh':m['object'],'vertices':m['vertices'],'triangles':m['triangles'],'boundary_edges':m['boundary_edges'],'nonmanifold_edges':m['nonmanifold_edges'],'connected_components':m['connected_components'],'width_x':round(hi[0]-lo[0],5),'depth_y':round(hi[1]-lo[1],5),'height_z':round(hi[2]-lo[2],5),'uv_layers':m['uv_layers'],'shape_keys':m['shape_keys']})
if not rows:raise SystemExit('No head-like meshes found; inspect source JSON names')
with out.open('w',newline='',encoding='utf-8') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print('HEAD_COMPARISON',len(rows),out)
