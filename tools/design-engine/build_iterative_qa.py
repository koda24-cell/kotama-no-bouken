"""Fixture-driven dimension and curved surface QA; candidates never promoted."""
import bpy,sys,json,math,copy
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_blueprint as b

def inspect(folder, target):
    bpy.ops.wm.open_mainfile(filepath=str(folder/'model.blend'))
    rows=[]
    for p in target['parts']:
        o=bpy.data.objects.get(p['id'])
        if o is None: raise ValueError('missing '+p['id'])
        pos=(o.location-Vector(b.mm(p.get('position_mm',[0,0,0])))).length*1000
        row={'id':p['id'],'position_error_mm':pos,'issues':[]}
        if pos>0.1:row['issues'].append('position')
        if p['shape']=='box' and not p.get('features'):
            err=max(abs(o.dimensions[i]*1000-p['size_mm'][i]) for i in range(3))
            row['dimension_error_mm']=err
            if err>.1:row['issues'].append('dimensions')
        if p['shape']=='revolve':
            # Circumferential polygon sagitta bound, measured from bottom ring.
            z=min(v.co.z for v in o.data.vertices)
            ring=[v.co for v in o.data.vertices if abs(v.co.z-z)<1e-7]
            angles=sorted(math.atan2(v.y,v.x) for v in ring)
            gaps=[(angles[(i+1)%len(angles)]-a)%(2*math.pi) for i,a in enumerate(angles)]
            sag=max(v.xy.length for v in ring)*1000*(1-math.cos(max(gaps)/2))
            row['sagitta_mm']=sag
            if sag>.05:row['issues'].append('circumferential_resolution')
        rows.append(row)
    return rows

def main():
    out=Path(sys.argv[sys.argv.index('--')+1]).resolve();out.mkdir(parents=True,exist_ok=True)
    target=json.loads(Path(__file__).with_name('build-demo.json').read_text())
    candidate=copy.deepcopy(target)
    # Deliberate fixture defect to prove repair.
    next(p for p in candidate['parts'] if p['id']=='pillar')['position_mm'][0]+=5
    next(p for p in candidate['parts'] if p['id']=='pillar')['segments']=24
    history=[];best=None
    for i in range(4):
        folder=out/f'iteration-{i}';folder.mkdir()
        src=folder/'candidate.json';src.write_text(json.dumps(candidate))
        old=sys.argv[:]
        try:
            sys.argv=['blender','--',str(src),str(folder)]
            b.main()
        finally:sys.argv=old
        rows=inspect(folder,target)
        score=sum(len(r['issues']) for r in rows)
        history.append({'iteration':i,'score':score,'parts':rows})
        if best is not None and score>=best['score']:break
        best=history[-1]
        if score==0:break
        for r in rows:
            p=next(p for p in candidate['parts'] if p['id']==r['id'])
            t=next(p for p in target['parts'] if p['id']==r['id'])
            if 'position' in r['issues']:p['position_mm']=t['position_mm'][:]
            if 'dimensions' in r['issues']:p['size_mm']=t['size_mm'][:]
            if 'circumferential_resolution' in r['issues']:p['segments']=min(128,p.get('segments',48)*2)
    report={'approval_state':'NOT_APPROVED','history':history,'selected_iteration':best['iteration'],'pass':best['score']==0 and history[0]['score']>0}
    (out/'qa-report.json').write_text(json.dumps(report,indent=2))
    if not report['pass']:raise RuntimeError('fixture did not converge')
if __name__=='__main__':main()
