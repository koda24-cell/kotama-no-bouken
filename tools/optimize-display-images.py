"""Generate smaller display copies and rewrite only exact existing runtime references."""
from pathlib import Path
from PIL import Image, ImageOps
import re, json, io
ROOT=Path(__file__).resolve().parents[1]
def main():
    sources=[p for p in ROOT.iterdir() if p.suffix in ('.js','.html','.css')]
    for folder in ('data','css','field'):
        sources.extend(p for p in (ROOT/folder).rglob('*') if p.suffix in ('.js','.html','.css'))
    mapping={}
    report=[]
    for p in sorted((ROOT/'assets').rglob('*')):
        if p.suffix.lower() not in ('.png','.jpg','.jpeg','.webp') or p.stat().st_size<150000: continue
        rel=p.relative_to(ROOT).as_posix()
        if any(s in rel for s in ('/textures/','/3d/','/models/','/optimized/','/reviews/')): continue
        # Only optimize files actually referenced by a runtime source.
        if not any(rel in s.read_text(encoding='utf-8') for s in sources): continue
        try:
            with Image.open(p) as original:
                if getattr(original,'n_frames',1)!=1: continue
                im=ImageOps.exif_transpose(original).convert('RGBA')
                limit=1600 if 'background' in rel or '/title/' in rel else 1200
                im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
                buf=io.BytesIO()
                im.save(buf,format='WEBP',quality=86,method=6,alpha_quality=100)
                data=buf.getvalue()
                if len(data)>=p.stat().st_size*.85: continue
                with Image.open(io.BytesIO(data)) as check:
                    check.load()
                    assert check.size==im.size
                dest=ROOT/'assets'/'optimized'/Path(rel).relative_to('assets')
                dest=dest.with_suffix(dest.suffix+'.webp')
                dest.parent.mkdir(parents=True,exist_ok=True)
                dest.write_bytes(data)
                mapping[rel]=dest.relative_to(ROOT).as_posix()
                report.append(dict(source=rel,output=mapping[rel],before=p.stat().st_size,after=len(data),size=im.size))
        except (OSError,ValueError) as e:
            raise RuntimeError(f'Cannot optimize {rel}') from e
    for s in sources:
        old=s.read_text(encoding='utf-8')
        new=old
        for a,b in mapping.items():
            new=re.sub(re.escape(a)+r'(?![\w./-])',lambda _:b,new)
        if new!=old: s.write_text(new,encoding='utf-8')
    out=ROOT/'docs'/'image-optimization-report.json'
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'{len(report)} images: {sum(x["before"] for x in report)} -> {sum(x["after"] for x in report)} bytes')
    assert report, 'No images optimized'
if __name__=='__main__': main()
