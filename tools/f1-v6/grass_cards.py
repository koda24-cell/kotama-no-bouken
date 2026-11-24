"""Bake the original authored grass GLB to a single cutout atlas and 3 cards.
Self-authored texture, no third-party picture. Original GLB/Blend kept unchanged.
"""
def build_cards(source,id,out,c):
    import bpy,math,json
    import numpy as np
    from mathutils import Vector
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    obs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    points=[o.matrix_world@Vector(v) for o in obs for v in o.bound_box]
    ground_points=[o.matrix_world@v.co for o in obs for v in o.data.vertices if (o.matrix_world@v.co).z<.015]
    lo=Vector([min(v[i] for v in points) for i in range(3)])
    hi=Vector([max(v[i] for v in points) for i in range(3)])
    center=(lo+hi)*.5;width=max(hi.x-lo.x,hi.y-lo.y,hi.z-lo.z)*1.12
    # Pure basecolor bake: no duplicated sunlight or studio shadows in the game.
    for ob in obs:
        for mat in ob.data.materials:
            if not mat:continue
            nt=mat.node_tree;p=nt.nodes.get('Principled BSDF');output=next(n for n in nt.nodes if n.type=='OUTPUT_MATERIAL')
            emission=nt.nodes.new('ShaderNodeEmission')
            if p.inputs['Base Color'].is_linked:nt.links.new(p.inputs['Base Color'].links[0].from_socket,emission.inputs['Color'])
            else:emission.inputs['Color'].default_value=p.inputs['Base Color'].default_value
            nt.links.new(emission.outputs[0],output.inputs['Surface'])
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=8
    scene.render.film_transparent=True;scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.view_settings.view_transform='Standard'
    data=bpy.data.cameras.new('albedo_bake');camera=bpy.data.objects.new('albedo_bake',data);scene.collection.objects.link(camera);scene.camera=camera;data.type='ORTHO';data.ortho_scale=width
    texture_dir=out/'sources/generated_materials';texture_dir.mkdir(parents=True,exist_ok=True)
    atlas=np.zeros((512,1536,4),dtype=np.float32)
    centers=[]
    elevation=math.tan(math.radians(25 if 'trifoliate' in id else 15 if 'fern' in id else 0))
    for i in range(3):
        a=i*math.pi/3;camera.location=center+Vector((math.sin(a),-math.cos(a),elevation))*width*3;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
        up=camera.rotation_euler.to_matrix()@Vector((0,1,0))
        embed=max(p.dot(up) for p in ground_points)+.005 if elevation else 0
        centers.append(center.dot(up)-embed)
        scene.render.filepath=str(texture_dir/f'{id}_cutout_{i}.png');bpy.ops.render.render(write_still=True)
        # Blender Render Result alpha can be associated. Reopen saved straight-alpha PNG.
        im=bpy.data.images.load(scene.render.filepath);pixels=np.empty(512*512*4,dtype=np.float32);im.pixels.foreach_get(pixels);atlas[:,i*512:(i+1)*512,:]=pixels.reshape(512,512,4);bpy.data.images.remove(im)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    image=bpy.data.images.new(id+'_cutout_atlas',width=1536,height=512,alpha=True);image.alpha_mode='STRAIGHT';image.pixels.foreach_set(atlas.ravel());image.filepath_raw=str(texture_dir/f'{id}_cutout_atlas.png');image.file_format='PNG';image.save();image.pack()
    material=bpy.data.materials.new(id+'_cutout');material.use_nodes=True;material.surface_render_method='DITHERED';material.use_backface_culling=False
    p=material.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.83
    tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    material.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color']);material.node_tree.links.new(tex.outputs['Alpha'],p.inputs['Alpha'])
    # Exporter reads these custom glTF properties for binary cutout rather than sorted blend.
    material['alphaMode']='MASK';material['alphaCutoff']=.35
    verts=[];faces=[];uvs=[]
    for i in range(3):
        a=i*math.pi/3;v=Vector((math.cos(a),math.sin(a),0))*width*.5;base=len(verts)
        bottom=centers[i]-width*.5;top=centers[i]+width*.5
        verts.extend([(-v.x,-v.y,bottom),(v.x,v.y,bottom),(v.x,v.y,top),(-v.x,-v.y,top)])
        faces.append((base,base+1,base+2,base+3));uvs.extend([(i/3,0),((i+1)/3,0),((i+1)/3,1),(i/3,1)])
    obj=c.mesh(id+'_cross_cards',verts,faces,material);layer=obj.data.uv_layers.new(name='UVMap')
    for poly in obj.data.polygons:
        for li in poly.loop_indices:layer.data[li].uv=uvs[obj.data.loops[li].vertex_index]
    # Bend lighting normals upward so intersecting cutouts do not look like dark sheets.
    obj.data.normals_split_custom_set_from_vertices([(0,0,1)]*len(verts))
    result=c.finish(id+'_cards','props','3 crossed cutout cards, 6 triangles, self-authored albedo atlas baked from preserved original GLB; NOT_APPROVED.',render=False)
    # Enforce glTF MASK explicitly: Blender versions differ in material export properties.
    import struct
    path=out/'props'/(id+'_cards.glb');raw=path.read_bytes();jlen=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jlen]);binary=raw[20+jlen:]
    for mat in doc.get('materials',[]):mat['alphaMode']='MASK';mat['alphaCutoff']=.35;mat['doubleSided']=True
    encoded=json.dumps(doc,separators=(',',':')).encode();encoded+=b' '*((-len(encoded))%4)
    path.write_bytes(struct.pack('<III',0x46546c67,2,20+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+binary)
    # Actual PNG proof must come from the final MASK GLB, after the patch.
    result.update(c._gltf_metrics(path));result['renders']=c.render_imported_glb(path,id+'_cards');result['approvalStatus']='NOT_APPROVED';result['originalFile']=str(source.relative_to(out));result['albedoOnlyBake']=True
    (out/'metrics'/(id+'_cards.json')).write_text(json.dumps(result,indent=2))
    return result
