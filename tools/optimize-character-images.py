from pathlib import Path
from PIL import Image
import hashlib, json, subprocess

sources = sorted(Path('assets/characters').glob('*.png'))
report = []
replacements = {}
for src in sources:
    dst = src.with_suffix('.webp')
    original = src.read_bytes()
    row = dict(path=src.as_posix(), png_bytes=len(original),
               original_sha256=hashlib.sha256(original).hexdigest(), selected=False)
    try:
        with Image.open(src) as im:
            if im.n_frames != 1 or im.mode not in ('RGB','RGBA','P','LA','L') or original[24] > 8:
                raise ValueError('Unsupported source format')
            profile = im.info.get('icc_profile')
            if not profile and 'gamma' in im.info and abs(im.info['gamma']-0.45455)>0.0001:
                raise ValueError('Non-sRGB gamma requires review')
            rgba = im.convert('RGBA')
            options = dict(lossless=True, quality=100, method=6, exact=True)
            if profile:
                options['icc_profile'] = profile
            rgba.save(dst, 'WEBP', **options)
            with Image.open(dst) as check:
                if check.size != im.size or check.convert('RGBA').tobytes() != rgba.tobytes():
                    raise ValueError('RGBA or resolution mismatch')
                if check.info.get('icc_profile') != profile:
                    raise ValueError('ICC mismatch')
            row.update(width=im.width, height=im.height, rgba_exact=True, icc_exact=True,
                       webp_bytes=dst.stat().st_size, selected=dst.stat().st_size<len(original))
            if row['selected']:
                row['webp_sha256']=hashlib.sha256(dst.read_bytes()).hexdigest()
            else:
                row['reason']='Not smaller than original'
    except (ValueError, OSError) as e:
        row.update(selected=False, reason=str(e))
    if not row['selected']:
        dst.unlink(missing_ok=True)
    assert src.read_bytes()==original
    replacements[src.as_posix()]=(dst.as_posix() if row['selected'] else src.as_posix())
    report.append(row)

# Update exact full paths; handle the existing basename-only union portrait table separately.
changes=[]
for name in subprocess.check_output(['git','ls-files','-z']).decode().split('\0'):
    if not name or not name.endswith(('.js','.css','.html')): continue
    p=Path(name)
    if len(p.parts)>1 and p.parts[0] not in ('data','field','css'): continue
    before=p.read_text(encoding='utf-8')
    after=before
    for png, chosen in replacements.items():
        webp=str(Path(png).with_suffix('.webp'))
        after=after.replace(webp,png).replace(png,chosen)
        if name=='script.js' and png.startswith('assets/characters/'):
            old_name=Path(png).name
            new_name=Path(chosen).name
            old_webp=Path(webp).name
            after=after.replace('"'+old_webp+'"','"'+old_name+'"').replace('"'+old_name+'"','"'+new_name+'"')
    if after!=before:
        p.write_text(after,encoding='utf-8')
        changes.append(name)
result=dict(images=report, changed_files=changes, total_png_bytes=sum(x['png_bytes'] for x in report),
            total_display_bytes=sum(x['webp_bytes'] if x['selected'] else x['png_bytes'] for x in report))
Path('assets/characters/lossless-report.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2,ensure_ascii=False))
