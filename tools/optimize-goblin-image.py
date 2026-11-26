from pathlib import Path
from PIL import Image
import hashlib,json,subprocess

src=Path('assets/monsters/goburinn.png')
dst=src.with_suffix('.webp')
before=hashlib.sha256(src.read_bytes()).hexdigest()
with Image.open(src) as im:
    if im.n_frames != 1 or im.mode not in ('RGB','RGBA','P','LA'):
        raise RuntimeError(f'Unsupported mode: {im.mode}')
    profile=im.info.get('icc_profile')
    if not profile and 'gamma' in im.info and abs(im.info['gamma']-0.45455)>0.0001:
        raise RuntimeError('Non-sRGB gamma requires review')
    rgba=im.convert('RGBA')
    options=dict(lossless=True,quality=100,method=6,exact=True)
    if profile: options['icc_profile']=profile
    rgba.save(dst,'WEBP',**options)
    with Image.open(dst) as result:
        assert result.size==im.size
        assert result.convert('RGBA').tobytes()==rgba.tobytes()
        assert result.info.get('icc_profile')==profile
    width,height=im.size
a,b=src.stat().st_size,dst.stat().st_size
selected=b<a
# Change only exact live asset references in tracked runtime source files.
changes=[]
for name in subprocess.check_output(['git','ls-files','-z']).decode().split('\0'):
    if not name or not name.endswith(('.js','.css','.html')): continue
    p=Path(name)
    if len(p.parts)>1 and p.parts[0] not in ('data','field','css'): continue
    text=p.read_text(encoding='utf-8')
    if selected and 'assets/monsters/goburinn.png' in text:
        count=text.count('assets/monsters/goburinn.png')
        p.write_text(text.replace('assets/monsters/goburinn.png','assets/monsters/goburinn.webp'),encoding='utf-8')
        changes.append(dict(path=name,count=count))
if not selected:
    dst.unlink()
assert hashlib.sha256(src.read_bytes()).hexdigest()==before
report=dict(width=width,height=height,png_bytes=a,webp_bytes=b,selected=selected,rgba_exact=True,icc_exact=True,original_sha256=before,webp_sha256=hashlib.sha256(dst.read_bytes()).hexdigest() if selected else None,changed_references=changes)
Path('assets/monsters/goburinn-lossless-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
