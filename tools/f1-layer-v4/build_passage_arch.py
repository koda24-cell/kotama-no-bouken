import os,traceback
def main():
    """One individual V4 asset: preserve original arch and construct its reverse."""
    from pathlib import Path
    import os,sys,runpy,subprocess,json,shutil
    ROOT=Path(__file__).resolve().parents[2]
    subprocess.run(['git','config','--global','--add','safe.directory',str(ROOT)],check=True)
    OUT=ROOT/'assets/3d/dungeons/b1_layer_v4_candidates';delivery=ROOT/os.environ['OUTPUT_DIR'];delivery.mkdir(parents=True,exist_ok=True)
    for target,label in [(ROOT/'tools/f1-sacred-forest','existing-tools'),(ROOT/'tools/f1-layer-v4','v4-tools'),(ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates/textures','existing-textures')]:
     subprocess.run(['bash',str(ROOT/'tools/security/clamav_scan_gate.sh'),'scan',str(target),str(delivery/'security'/f'{label}.log')],check=True)
    sys.path[:0]=[str(ROOT/'tools/f1-sacred-forest'),str(ROOT/'tools/f1-sacred-forest/assets'),str(Path(__file__).parent)]
    import bpy,bmesh
    import common as c
    import architecture_details as details
    import render_asset
    c.OUT=OUT;details.OUT=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates';render_asset.OUT=OUT;c.render_imported_glb=render_asset.render_imported_glb
    original_finish=c.finish
    
    def finish_arch(_id,category,desc,*args,**kwargs):
        original=[o for o in bpy.context.scene.objects if o.type=='MESH']
        for o in original:
            if any(m and m.name=='sacred_earth_mortar' for m in o.data.materials):continue
            # Mirror authored front stones/roots, not a blank backing plane.
            clone=o.copy();clone.data=o.data.copy();clone.name='reverse_'+o.name;bpy.context.collection.objects.link(clone)
            bpy.context.view_layer.update()
            for v in clone.data.vertices:
                w=clone.matrix_world@v.co;w.y=.84-w.y;v.co=clone.matrix_world.inverted()@w
            bm=bmesh.new();bm.from_mesh(clone.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(clone.data);bm.free()
            if any(m and m.name=='sacred_weathered_stone' for m in o.data.materials):
                # Unify matching closed stone volumes. No coplanar duplicate
                # top/inner faces may remain to blacken the arch from the side.
                bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
                bpy.context.view_layer.objects.active=o
                mod=o.modifiers.new('one solid weathered stone','BOOLEAN');mod.operation='UNION';mod.solver='EXACT';mod.object=clone
                bpy.ops.object.modifier_apply(modifier=mod.name)
                bpy.data.objects.remove(clone,do_unlink=True);c.uv_world(o,3.0)
        stone,fracture,earth,moss,root=details.stone_materials()
        for sign in [-1,1]:
            a,b=(2,2.4) if sign>0 else (-2.4,-2)
            for i in range(8):details.wall_block('attached_wall_pier',a,b,i*.5,(i+1)*.5-.015,stone,800+i+sign,front=-.12,back=.92,damage=.028)
        for im in bpy.data.images:
            if im.source=='FILE':_=im.pixels[0];im.pack()
        bpy.context.preferences.filepaths.save_version=0
        m=original_finish('v4_passage_arch','modules','既存アーチ正面を保持し、裏面にも実石組/目地/根を追加。左右は4m高の控え柱で壁体へ接続。開口2m×3mを保持。')
        assert len(m['renders'])==5 and all((OUT/r).is_file() for r in m['renders'])
        m['approvalStatus']='NOT_APPROVED';m['retainedSource']='mod_sacred_arch_4m original authored geometry';m['sourceScript']='tools/f1-layer-v4/build_passage_arch.py'
        (OUT/'metrics/v4_passage_arch.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
        for folder in ['modules','sources','renders','metrics']:
            shutil.copytree(OUT/folder,delivery/folder,dirs_exist_ok=True)
        (delivery/'manifest.json').write_text(json.dumps({'status':'NOT_APPROVED','count':1,'asset':m,'purpose':'One individually authored two-sided arch, not a dungeon batch'},ensure_ascii=False,indent=2))
        subprocess.run(['python3',str(ROOT/'tools/3d-performance/audit_glb.py'),str(OUT/'modules/v4_passage_arch.glb'),'--output',str(delivery/'structural-audit.json')],check=True)
        return m
    c.finish=finish_arch
    runpy.run_path(str(ROOT/'tools/f1-sacred-forest/assets/build_mod_sacred_arch_4m.py'),run_name='__main__')
    assert (delivery/'modules/v4_passage_arch.glb').is_file() and (delivery/'manifest.json').is_file()

if __name__=="__main__":
    try:main()
    except BaseException:
        from pathlib import Path
        p=Path(os.environ["OUTPUT_DIR"]);p.mkdir(parents=True,exist_ok=True)
        (p/"asset-failure.log").write_text(traceback.format_exc())
        traceback.print_exc()
        os._exit(1)
