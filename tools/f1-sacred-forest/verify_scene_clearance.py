"""Conservative triangle-level check of the curated scene's central route."""
import hashlib,json
from pathlib import Path
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates'

def verify():
    source=OUT/'scene/scene.blend'
    if bpy.data.filepath!=str(source):bpy.ops.wm.open_mainfile(filepath=str(source))
    bpy.context.view_layer.update()
    lo=(-1,-14,.03);hi=(1,18,3);epsilon=.001
    def overlaps(points):
        for axis in range(3):
            if max(p[axis] for p in points)<=lo[axis]+epsilon:return False
            if min(p[axis] for p in points)>=hi[axis]-epsilon:return False
        return True
    candidates=0;triangles=0;conflicts=[]
    for obj in bpy.context.scene.objects:
        if obj.type!='MESH':continue
        matrix=obj.matrix_world
        if not overlaps([matrix@Vector(v) for v in obj.bound_box]):continue
        candidates+=1;obj.data.calc_loop_triangles();bad=0
        for triangle in obj.data.loop_triangles:
            points=[matrix@obj.data.vertices[i].co for i in triangle.vertices]
            triangles+=1
            if overlaps(points):bad+=1
        if bad:conflicts.append({'object':obj.name,'triangles':bad})
    result={'method':'conservative triangle AABB against central two-metre route; no game physics changes',
      'authoringAxes':'Blender X/Y ground, Z up','routeMin':lo,'routeMax':hi,
      'objectsChecked':candidates,'trianglesChecked':triangles,'conflicts':conflicts,
      'sceneBlendSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
      'sceneGlbSha256':hashlib.sha256((OUT/'scene/sacred_forest_scene.glb').read_bytes()).hexdigest(),
      'passed':not conflicts}
    folder=OUT/'verification';folder.mkdir(exist_ok=True)
    (folder/'scene-clearance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
    return result

if __name__=='__main__':
    if not verify()['passed']:raise RuntimeError('Central walk route obstructed')
