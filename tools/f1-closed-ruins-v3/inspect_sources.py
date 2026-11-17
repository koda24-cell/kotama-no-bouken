"""Read-only portable-source verification. Does not regenerate assets."""
from pathlib import Path
import bpy,json,hashlib
ROOT=Path(__file__).resolve().parents[2];base=ROOT/'assets/3d/dungeons/b1_closed_ruins_v3';records=[]
for p in sorted((base/'sources').glob('v3_*.blend')):
    bpy.ops.wm.open_mainfile(filepath=str(p));images=[]
    for im in bpy.data.images:
        if im.source!='FILE':continue
        assert im.packed_file or im.packed_files, 'Unpacked '+im.name
        assert im.size[0]>0 and im.size[1]>0
        _=im.pixels[0];assert im.has_data
        images.append({'name':im.name,'size':list(im.size),'packed':True})
    assert images,'No embedded images'
    records.append({'file':str(p.relative_to(base)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'images':images})
assert len(records)==5
out=base/'verification/source-portability.json';out.parent.mkdir(exist_ok=True);out.write_text(json.dumps({'scope':'Read-only reopen of five sources and packed image decode, not art approval','passed':True,'blender':bpy.app.version_string,'sources':records},indent=2))
print('F1_V3_SOURCE_PORTABLE',len(records))
