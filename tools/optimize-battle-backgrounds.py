from pathlib import Path
from PIL import Image, ImageCms
import hashlib, json, re, io

root = Path('assets/battle-backgrounds')
names = ('floor-02-water', 'floor-03-ruins', 'floor-04-volcano', 'floor-05-castle')
css = Path('css/15-battle-ui-refresh.css')
source = css.read_text(encoding='utf-8')
report = []
for name in names:
    original = root / (name + '.png')
    output = root / (name + '.webp')
    with Image.open(original) as im:
        if im.n_frames != 1 or im.mode not in ('RGB', 'RGBA'):
            raise RuntimeError(f'Unsupported source mode: {original}: {im.mode}')
        im.load()
        # Preserve embedded ICC profile. Untagged RGB defaults to sRGB.
        profile = im.info.get('icc_profile')
        if not profile and 'gamma' in im.info and abs(im.info['gamma'] - 0.45455) > 0.0001:
            raise RuntimeError(f'Non-sRGB gamma requires review: {original}')
        pixels = im.convert('RGBA').tobytes()
        options = dict(lossless=True, quality=100, method=6, exact=True)
        if profile:
            options['icc_profile'] = profile
        im.save(output, 'WEBP', **options)
        with Image.open(output) as result:
            assert result.size == im.size, name
            assert result.convert('RGBA').tobytes() == pixels, name
            assert result.info.get('icc_profile') == profile, name
        before, after = original.stat().st_size, output.stat().st_size
        chosen = after < before
        if not chosen:
            output.unlink()
        # Keep PNG fallback and use WebP only if verified and smaller.
        pattern = r'(--battle-floor-art:)url\("\.\./assets/battle-backgrounds/' + re.escape(name) + r'\.png"\)(?:;--battle-floor-art:image-set\([^;{}]*\))?'
        png = f'url("../assets/battle-backgrounds/{name}.png")'
        webp = f'url("../assets/battle-backgrounds/{name}.webp")'
        replacement = '--battle-floor-art:' + png
        if chosen:
            replacement += f';--battle-floor-art:image-set({webp} type("image/webp"),{png} type("image/png"))'
        source, count = re.subn(pattern, lambda m: replacement, source)
        if count != 1:
            raise RuntimeError(f'Unexpected CSS mapping count: {name}: {count}')
        report.append(dict(name=name, width=im.width, height=im.height, png_bytes=before, webp_bytes=after, selected=chosen, rgba_exact=True, icc_exact=True, original_sha256=hashlib.sha256(original.read_bytes()).hexdigest(), webp_sha256=hashlib.sha256(output.read_bytes()).hexdigest() if chosen else None))
css.write_text(source, encoding='utf-8')
Path('assets/battle-backgrounds/lossless-report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
print(json.dumps(report, indent=2))
