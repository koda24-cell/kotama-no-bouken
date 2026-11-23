"""One authored asset per Blender process; review candidates, never promotion."""
import os,traceback

def main():
    from pathlib import Path
    import sys,json,subprocess,shutil,math,random
    ROOT=Path(__file__).resolve().parents[2]
    subprocess.run(['git','config','--global','--add','safe.directory',str(ROOT)],check=True)
    delivery=ROOT/os.environ['OUTPUT_DIR'];delivery.mkdir(parents=True,exist_ok=True)
    asset=delivery.name.removeprefix('f1-v6-')
    allowed=['sedge','trifoliate','fern','schist','fractured','riverstones','wall_a','wall_b','wall_c']
    assert asset in allowed,asset
    for path,label in [('tools/f1-v6','v6'),('tools/f1-sacred-forest','shared'),('tools/f1-layer-v4','renderer'),('assets/3d/dungeons/b1_sacred_forest_candidates/textures','textures')]:
        subprocess.run(['bash',str(ROOT/'tools/security/clamav_scan_gate.sh'),'scan',str(ROOT/path),str(delivery/'security'/f'{label}.log')],check=True)
    sys.path[:0]=[str(ROOT/'tools/f1-sacred-forest'),str(ROOT/'tools/f1-sacred-forest/assets'),str(ROOT/'tools/f1-layer-v4'),str(Path(__file__).parent)]
    import bpy
    import common as c,natural as n,architecture_details as d,render_asset
    from mathutils import Vector
    OUT=ROOT/'assets/3d/dungeons/b1_nature_v6_candidates'/asset
    c.OUT=OUT;n.OUT=OUT;d.OUT=ROOT/'assets/3d/dungeons/b1_sacred_forest_candidates';render_asset.OUT=OUT;c.render_imported_glb=render_asset.render_imported_glb
    c.reset_scene();bpy.context.preferences.filepaths.save_version=0
    rng=random.Random(62411+allowed.index(asset));category='props'
    if asset in allowed[:3]:
        m=n.botanical_materials()
        if asset=='sedge':
            for tuft in range(5):
                o=Vector((rng.uniform(-.17,.17),rng.uniform(-.17,.17),.005))
                for blade in range(24):
                    a=blade*math.tau/24+rng.uniform(-.3,.3);length=rng.uniform(.35,.65)
                    end=o+Vector((math.cos(a)*length*.46,math.sin(a)*length*.46,length*rng.uniform(.7,1)))
                    n.leaf('arched sedge blade',o,end,rng.uniform(.009,.018),m['leaf_old'] if blade%13==0 else m['leaf_light'] if blade%7==0 else m['leaf'],curve=.05)
        elif asset=='trifoliate':
            for shoot in range(17):
                o=Vector((rng.uniform(-.27,.27),rng.uniform(-.27,.27),0));top=o+Vector((rng.uniform(-.04,.04),rng.uniform(-.04,.04),rng.uniform(.16,.32)))
                n.stem('branching petiole',[o,(o+top)*.5,top],.003,m['stem'],5)
                for k in range(3):
                    a=k*math.tau/3+shoot*1.73;end=top+Vector((math.cos(a)*.12,math.sin(a)*.12,.025))
                    n.leaf('three lobed woodland leaflet',top,end,.055,m['leaf_light'] if shoot%5==0 else m['leaf'],curve=.014)
        else:
            for crown in range(2):
                o=Vector((crown*.16-.08,crown*.1-.05,0))
                for f in range(8):
                    a=f*math.tau/8+crown*.3;v=Vector((math.cos(a),math.sin(a),0));side=Vector((-v.y,v.x,0));length=rng.uniform(.33,.43)
                    def center(t):return o+v*length*t+Vector((0,0,.02+.52*math.sin(t*1.8)))
                    n.stem('curved spleenwort rachis',[center(j/12) for j in range(13)],.004,m['stem'],5)
                    for j in range(1,12):
                        t=j/13;ll=.11*math.sin(t*math.pi)
                        for sign in [-1,1]:n.leaf('rounded alternating pinna',center(t),center(t)+side*sign*ll+v*.025,.023,m['leaf'],curve=.008)
                n.stem('young coiled frond',[o,o+Vector((0,0,.2)),o+Vector((.025,0,.24)),o+Vector((.05,0,.21)),o+Vector((.025,0,.195))],.005,m['leaf_light'],5)
    elif asset in allowed[3:6]:
        stone,fracture,earth,moss,root=d.stone_materials()
        count={'schist':5,'fractured':3,'riverstones':7}[asset]
        for i in range(count):
            loc=(rng.uniform(-.25,.25),rng.uniform(-.24,.24),0)
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3 if asset!='schist' else 2,radius=1,location=loc)
            obj=bpy.context.object;obj.name=asset+'_weathered_stone_'+str(i)
            sx=rng.uniform(.16,.29);sy=rng.uniform(.13,.24);sz=rng.uniform(.08,.15) if asset=='schist' else rng.uniform(.12,.27)
            for v in obj.data.vertices:
                v.co*=rng.uniform(.89,1.09);v.co.x*=sx;v.co.y*=sy;v.co.z=max(.001,(v.co.z+1)*sz*.5)
                if asset=='fractured':v.co.x=min(v.co.x,sx*.53)
            obj.data.materials.append(stone);obj.data.materials.append(moss);obj.data.materials.append(fracture)
            for p in obj.data.polygons:
                p.material_index=1 if p.normal.z>.45 and rng.random()<.52 else 2 if asset=='fractured' and p.normal.x>.75 else 0
                p.use_smooth=asset=='riverstones'
            c.uv_world(obj,3)
            for k in range(3):d.moss_lobe('sheltered basal moss',(loc[0]+rng.uniform(-sx*.6,sx*.6),loc[1]+rng.uniform(-sy*.6,sy*.6),sz*.75),(.07,.06,.018),moss,100+i*3+k)
    else:
        category='modules';stone,fracture,earth,moss,root=d.stone_materials();index=allowed.index(asset)-6
        c.cube('continuous opaque mortar core',(0,.68,2),(4,.16,4),earth,0)
        heights=[.4,.5,.6666666667][index];rows=round(4/heights)
        for row in range(rows):
            za=row*4/rows+.012;zb=(row+1)*4/rows-.012
            width=[.8,1.0,1.3333333333][index];cuts=[-2];cursor=-2+width*(.45 if row%2 else 1)
            while cursor<1.95:cuts.append(cursor);cursor+=width*rng.uniform(.9,1.1)
            cuts.append(2)
            for col,(xa,xb) in enumerate(zip(cuts,cuts[1:])):
                if xb-xa<.08:continue
                d.wall_block('transition_course',xa+.008,xb-.008,za,zb,stone,row*37+col,front=.012,back=.65,damage=[.018,.03,.045][index])
                if (row+col)%3==0:d.moss_lobe('wet joint',(xa+.1,-.005,za),(.12,.025,.03),moss,row*17+col)
        for sign in [-1,1]:c.tube('wall hugging roots',[(sign*1.86,-.03,0),(sign*1.8,-.04,1),(sign*1.9,-.03,2),(sign*1.75,-.025,3.3)],[.025,.02,.013,.003],root,6)
        for obj in list(bpy.context.scene.objects):
            if obj.type=='MESH':c.uv_world(obj,3)
    for im in bpy.data.images:
        if im.source=='FILE':_=im.pixels[0];im.pack()
    id='v6_'+asset
    metrics=c.finish(id,category,'Individually authored V6 '+asset+'; first-stratum damp moss palette; review only.')
    assert len(metrics['renders'])==5
    assert all((OUT/p).is_file() for p in metrics['renders'])
    if asset in allowed[:3]:
        from grass_cards import build_cards
        cards=build_cards(OUT/category/(id+'.glb'),id,OUT,c)
        assert cards['tris']==6 and len(cards['renders'])==5
        subprocess.run(['python3',str(ROOT/'tools/3d-performance/audit_glb.py'),str(OUT/'props'/(id+'_cards.glb')),'--output',str(OUT/'metrics'/(id+'_cards-audit.json'))],check=True)
    metrics['approvalStatus']='NOT_APPROVED'
    (OUT/'metrics'/f'{id}.json').write_text(json.dumps(metrics,indent=2))
    for folder in ['props','modules','sources','renders','metrics']:
        if (OUT/folder).exists():shutil.copytree(OUT/folder,delivery/folder,dirs_exist_ok=True)
    (delivery/'manifest.json').write_text(json.dumps({'status':'NOT_APPROVED','asset':metrics,'cards':cards if asset in allowed[:3] else None,'assetName':asset,'sequential':True},indent=2))
    subprocess.run(['python3',str(ROOT/'tools/3d-performance/audit_glb.py'),str(OUT/category/(id+'.glb')),'--output',str(delivery/'structural-audit.json')],check=True)

if __name__=='__main__':
    try:main()
    except BaseException:
        from pathlib import Path
        p=Path(os.environ['OUTPUT_DIR']);p.mkdir(parents=True,exist_ok=True);(p/'asset-failure.log').write_text(traceback.format_exc());traceback.print_exc();os._exit(1)
