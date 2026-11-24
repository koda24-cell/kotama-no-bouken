"""Preserve existing AO metadata while letting Blender create its full glTF group."""
def import_gltf(bpy,path):
    legacy=bpy.data.node_groups.get('glTF Material Output')
    migrate=legacy is not None and 'Iridescence Factor' not in {
        item.name for item in legacy.interface.items_tree if item.item_type=='SOCKET'
    }
    consumers=[]
    if migrate:
        for material in bpy.data.materials:
            if not material.use_nodes:continue
            for node in material.node_tree.nodes:
                if node.type=='GROUP' and node.node_tree is legacy:
                    inputs={socket.name:socket.default_value for socket in node.inputs if hasattr(socket,'default_value')}
                    links=[(link.from_socket,link.to_socket.name)for link in material.node_tree.links if link.to_node is node]
                    consumers.append((material.node_tree,node,inputs,links))
        legacy.name='Kotama preserved source AO metadata'
    try:
        bpy.ops.import_scene.gltf(filepath=str(path))
    finally:
        if migrate:
            standard=bpy.data.node_groups.get('glTF Material Output')
            if standard is None:legacy.name='glTF Material Output'
            else:
                for tree,node,inputs,links in consumers:
                    node.node_tree=standard
                    for name,value in inputs.items():
                        if name in node.inputs:node.inputs[name].default_value=value
                    for source,name in links:
                        assert name in node.inputs;tree.links.new(source,node.inputs[name])
                if legacy.users==0:bpy.data.node_groups.remove(legacy)
