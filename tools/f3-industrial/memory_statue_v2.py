"""Original CC0 weathered sculpture on a new chipped city plinth; NPC identity retained."""
def build(e):
 import json
 from mathutils import Vector,Matrix
 c,bpy,box,scar,scan=[e[k]for k in ['c','bpy','box','scar','scan']]
 from licensed_gltf_v2 import load
 objects,raw=load(c,bpy,scan,'gothic_statue',resolution='2k');meshes=[o for o in objects if o.type=='MESH'];assert meshes
 original_vertices=sum(len(o.data.vertices)for o in meshes)
 corners=[o.matrix_world@Vector(p)for o in meshes for p in o.bound_box]
 lo=Vector([min(p[k]for p in corners)for k in range(3)]);hi=Vector([max(p[k]for p in corners)for k in range(3)]);size=hi-lo
 scale=min(1.78/size.z,1.45/size.x,1.35/size.y);center=(hi+lo)*.5
 transform=Matrix.Translation((-center.x*scale,-center.y*scale,.24-lo.z*scale))@Matrix.Diagonal((scale,scale,scale,1))
 original_matrices={o:o.matrix_world.copy()for o in meshes}
 for o in meshes:o.parent=None;o.matrix_world=transform@original_matrices[o]
 assert sum(len(o.data.vertices)for o in meshes)==original_vertices
 # The original sculpt's carved detail, chips, moss and PBR remain untouched.
 base=box('weathered memory monument plinth',(0,0,.115),(1.53,1.43,.23),e['moss'],.045)
 scar(base,(-.72,-.65,.20),(.28,.24,.18),(.1,.25,.2))
 scar(base,(.72,.52,.12),(.23,.20,.20),(.2,.1,-.2))
 box('remnant of corroded identification plate',(0,-.719,.13),(.30,.018,.095),e['rust'],.006)
 (c.OUT/'sources/memory-statue-provenance.json').write_text(json.dumps(dict(status='NOT_APPROVED',author='Benny Weimer',asset='gothic_statue',assetURL='https://polyhaven.com/a/gothic_statue',license='CC0',licenseURL='https://polyhaven.com/license',originalVertices=original_vertices,verticesRemoved=0,uvPreserved=True,scale=scale,gameRole='Existing area3 statue NPC; same tile/dialogue/gate flag; opt-in visual replacement only',sourceSculptUnchanged=True),indent=2))
