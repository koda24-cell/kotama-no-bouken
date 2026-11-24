"""Compare matching game captures, not calibrated display luminance or FPS."""
from pathlib import Path
from PIL import Image,ImageStat,ImageDraw
import json,hashlib
root=Path(__file__).resolve().parents[2];out=root/'docs/reviews/f1-v7';report=json.loads((out/'verification.json').read_text());assert report['passed']
rows=[]
for p in sorted(out.glob('after-*.png')):
 b=p.with_name(p.name.replace('after-','before-'));a=Image.open(p);before=Image.open(b);assert a.size==before.size
 def measure(im):
  gray=im.convert('L');h=gray.histogram();n=sum(h);return {'meanGray8':ImageStat.Stat(gray).mean[0],'darkFractionUnder24':sum(h[:24])/n,'nearWhiteFractionOver245':sum(h[246:])/n}
 old,new=measure(before),measure(a);assert new['meanGray8']>old['meanGray8']*1.25
 rows.append({'after':p.name,'before':b.name,'beforeMetrics':old,'afterMetrics':new,'meanRatio':new['meanGray8']/old['meanGray8'],'afterSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'beforeSha256':hashlib.sha256(b.read_bytes()).hexdigest()})
assert len(rows)==7
(out/'brightness-comparison.json').write_text(json.dumps({'passed':True,'scope':'Matching framebuffer captures; mean 8-bit grayscale, not calibrated scene luminance or all-camera certification','comparisons':rows},indent=2))
canvas=Image.new('RGB',(1800,494),'#101814');draw=ImageDraw.Draw(canvas)
for row,version in enumerate(['before','after']):
 for i in range(5):
  im=Image.open(out/f'{version}-2f-{i}.png').convert('RGB');im.thumbnail((356,210));x=i*360;y=row*247+26;canvas.paste(im,(x,y));draw.text((x+6,row*247+6),f'{version.upper()} / 2F / route sample {i+1}',fill='#e1e9da')
canvas.save(out/'2f-before-after.jpg',quality=91)
print([(r['after'],round(r['meanRatio'],2)) for r in rows])
