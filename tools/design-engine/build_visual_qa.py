"""Fixed-camera visual QA; image statistics are proxies, not artistic approval."""
import bpy, sys, json, math, copy
from pathlib import Path
from mathutils import Vector
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parent))
import build_blueprint as b
from build_iterative_qa import accept
VIEWS={'front':(0,-1,0),'back':(0,1,0),'side':(1,0,0),'top':(0,0,1),'angle':(1,-2,1)}

def render(plan,folder):
    folder.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats={}
    for name,p in plan['materials'].items():
        m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
        for k,v in [('Base Color',p['rgba']),('Roughness',p.get('roughness',.5)),('Metallic',p.get('metallic',0))]:n.inputs[k].default_value=v
        mats[name]=m
    objs={}
    for p in plan['parts']:
        o=b.build(p,mats);objs[p['id']]=o
        o.data.materials.clear();o.data.materials.append(mats[p['material']])
        for face in o.data.polygons:face.material_index=0
    bpy.context.view_layer.update()
    parts={}
    for k,o in objs.items():
        v=np.array([list(x.co) for x in o.data.vertices])*1000
        d=np.ptp(v,axis=0)
        parts[k]={'dimensions_mm':d.tolist(),'ratios':(d/max(d)).tolist(),'position_mm':list(o.location*1000),'rotation_deg':[math.degrees(x) for x in o.rotation_euler],'material':o.data.materials[0].name}
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=8;s.cycles.seed=7;s.render.resolution_x=s.render.resolution_y=256;s.render.resolution_percentage=100;s.render.film_transparent=True
    s.render.image_settings.color_mode='RGBA';s.world=bpy.data.worlds.new('QA');s.world.use_nodes=True
    center=Vector((0,0,.2))
    for d in [(1,-1,1),(-1,1,1)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(d));l=bpy.context.object;l.data.energy=200;l.data.size=1;l.rotation_euler=(center-l.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.9
    for name,d in VIEWS.items():
        cam.location=center+Vector(d).normalized()*3;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(folder/(name+'.png'));bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/'model.blend'))
    return parts

def pixels(path):
    im=bpy.data.images.load(str(path),check_existing=False);w,h=im.size
    a=np.array(im.pixels[:],dtype=np.float32).reshape(h,w,4);bpy.data.images.remove(im);return a
def save(path,a):
    h,w,_=a.shape;im=bpy.data.images.new('diff',width=w,height=h,alpha=True);im.pixels=a.astype(np.float32).ravel();im.filepath_raw=str(path);im.file_format='PNG';im.save();bpy.data.images.remove(im)
def stats(a,m):
    rgb=a[:,:,:3];v=rgb[m];lum=rgb@np.array([.2126,.7152,.0722]);sat=(v.max(1)-v.min(1))/np.maximum(v.max(1),1e-6)
    hist=[(np.histogram(v[:,i],bins=16,range=(0,1))[0]/len(v)).tolist() for i in range(3)]
    valid=m[:,1:]&m[:,:-1];edge=np.abs(np.diff(lum,axis=1))[valid]
    return {'rgb_mean':v.mean(0).tolist(),'rgb_histograms':hist,'luminance':float(lum[m].mean()),'shadow_contrast':float(lum[m].std()),'saturation':float(sat.mean()),'surface_gradient_proxy':float(edge.mean()) if edge.size else 0}
def compare(ref,cur,rparts,cparts,rplan,cplan):
    views={}
    for name in VIEWS:
        a,z=pixels(ref/(name+'.png')),pixels(cur/(name+'.png'));m,n=a[:,:,3]>.5,z[:,:,3]>.5
        if not m.any() or not n.any():raise ValueError('empty silhouette')
        iou=float((m&n).sum()/(m|n).sum())
        heat=np.zeros_like(a);heat[:,:,3]=1;heat[m&n,:3]=.25;heat[m&~n,0]=1;heat[n&~m,2]=1
        save(cur/(name+'-heat.png'),heat);save(cur/(name+'-comparison.png'),np.concatenate([a,z,heat],axis=1))
        views[name]={'iou':iou,'reference':stats(a,m),'candidate':stats(z,n)}
    parts={k:{field:float(np.max(np.abs(np.array(v[field])-np.array(cparts[k][field])))) for field in ('dimensions_mm','ratios','position_mm','rotation_deg')} for k,v in rparts.items()}
    materials={k:{f:float(abs(v.get(f,default)-cplan['materials'][k].get(f,default))) for f,default in [('roughness',.5),('metallic',0)]} for k,v in rplan['materials'].items()}
    color=float(np.mean([np.mean(np.abs(np.array(v['reference']['rgb_mean'])-v['candidate']['rgb_mean'])) for v in views.values()]))
    score=float(np.mean([1-v['iou'] for v in views.values()]))+color+sum(sum(v.values()) for v in materials.values())+sum(v['dimensions_mm']/1000+v['position_mm']/1000+v['rotation_deg']/360+v['ratios'] for v in parts.values())
    return {'views':views,'parts':parts,'materials':materials,'color_error':color,'score':score}
def main():
    out=Path(sys.argv[sys.argv.index('--')+1]).resolve();out.mkdir(parents=True,exist_ok=True)
    # Explicit paired fixture, not an arbitrary GLB reverse-engineering claim.
    ref=json.loads(Path(__file__).with_name('build-demo.json').read_text())
    cur=copy.deepcopy(ref);p=cur['parts'][0];p['size_mm'][0]*=.8;p['position_mm'][0]+=30;p['rotation_deg']=[0,0,12]
    mat=cur['materials'][p['material']];mat['rgba']=[.8,.1,.1,1];mat['roughness']=.1;mat['metallic']=.8
    rp=render(ref,out/'reference');history=[];best=None
    for i in range(3):
        folder=out/f'iteration-{i}';cp=render(cur,folder);r=compare(out/'reference',folder,rp,cp,ref,cur);r['iteration']=i;history.append(r)
        if not accept(best,r['score']):break
        best=r
        if r['score']<.001:break
        for p,t in zip(cur['parts'],ref['parts']):
            e=r['parts'][p['id']]
            for field,key in [('dimensions_mm','size_mm'),('position_mm','position_mm'),('rotation_deg','rotation_deg')]:
                if e[field]>.01 and key in t:p[key]=copy.deepcopy(t[key])
            if e['rotation_deg']>.01:p['rotation_deg']=t.get('rotation_deg',[0,0,0])
        for k,v in r['materials'].items():
            if any(x>.001 for x in v.values()) or r['color_error']>.001:cur['materials'][k]=copy.deepcopy(ref['materials'][k])
    report={'approval_state':'NOT_APPROVED','fixture_only':True,'history':history,'selected_iteration':best['iteration'],'pass':len(history)>1 and best['score']<history[0]['score'] and min(v['iou'] for v in best['views'].values())>.99}
    (out/'visual-qa.json').write_text(json.dumps(report,indent=2))
    if not report['pass']:raise RuntimeError('visual fixture did not converge')
if __name__=='__main__':main()
