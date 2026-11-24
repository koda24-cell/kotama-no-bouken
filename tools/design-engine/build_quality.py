import bpy, sys, json, math
from pathlib import Path
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_blueprint as b

def tree(o):
    return BVHTree.FromPolygons([o.matrix_world@v.co for v in o.data.vertices],[tuple(p.vertices) for p in o.data.polygons])
def main():
    mode,out=sys.argv[sys.argv.index('--')+1:];out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    src=Path(__file__).with_name('build-demo.json');data=json.loads(src.read_text())
    if mode=='smooth':
        for p in data['parts']:
            if p['shape']=='revolve':p['segments']=96
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mats={n:bpy.data.materials.new(n) for n in data['materials']}
    objs={}
    for p in data['parts']:
        o=b.build(p,mats);objs[p['id']]=o
        if mode=='smooth' and p['shape'] in ('curve','revolve'):
            for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
        if 'mirror_axis' in p:
            q=o.copy();q.data=o.data.copy();bpy.context.collection.objects.link(q);q.location.x*=-1;q.scale.x*=-1;objs[p['id']+'-mirror']=q
    bpy.context.view_layer.update()
    report={'mode':mode,'approval_state':'NOT_APPROVED'}
    if mode=='hole':
        t=tree(objs['base'])
        rays=[{'x_mm':x,'y_mm':y,'clear':t.ray_cast(Vector((x/1000,y/1000,-.1)),Vector((0,0,1)),.3)[0] is None} for x in (-30,0,30,100) for y in (-30,0,30)]
        report['rays']=rays;report['pass']=all(r['clear']==(r['x_mm']!=100) for r in rays)
    elif mode=='contact':
        pairs=[('base','pillar'),('base','pillar-mirror'),('base','rib'),('pillar','cap'),('pillar-mirror','cap'),('pillar','arch'),('pillar-mirror','arch')]
        rows=[]
        for a,c in pairs:
            x,y=objs[a],objs[c];tx,ty=tree(x),tree(y)
            overlap=len(tx.overlap(ty));dist=[]
            for o,t in ((x,ty),(y,tx)):
                for v in o.data.vertices:
                    hit=t.find_nearest(o.matrix_world@v.co)
                    if hit[3] is not None:dist.append(hit[3]*1000)
            rows.append({'pair':[a,c],'intersecting_triangle_pairs':overlap,'sampled_vertex_surface_distance_mm':min(dist),'contact_candidate':bool(overlap or min(dist)<=1)})
        report['pairs']=rows;report['pass']=all(r['contact_candidate'] for r in rows)
    else:
        report['parts']=[{'id':n,'faces':len(objs[n].data.polygons),'smooth_faces':sum(p.use_smooth for p in objs[n].data.polygons)} for n in ('pillar','arch')]
        report['pass']=all(r['smooth_faces']>0 for r in report['parts'])
    (out/'quality.json').write_text(json.dumps(report,indent=2))
    # Isolated underside for hole, full assembly for contact and smoothness.
    if mode=='hole':
        for n,o in objs.items():o.hide_render=n!='base'
    s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=s.render.resolution_y=640;s.render.resolution_percentage=100
    s.world=bpy.data.worlds.new('Studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.5,.5,.5,1)
    center=Vector((0,0,.04 if mode=='hole' else .27))
    for d in [(1,-1,1),(-1,1,-1)]:
        bpy.ops.object.light_add(type='AREA',location=center+Vector(d));l=bpy.context.object;l.data.energy=400;l.data.size=1;l.rotation_euler=(center-l.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add();cam=bpy.context.object;s.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.85
    for name,d in [('front',(0,-1,0)),('angle',(1,-2,1)),('underside',(0,0,-1))]:
        cam.location=center+Vector(d).normalized()*2;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();s.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(out/'review.blend'))
if __name__=='__main__':main()
