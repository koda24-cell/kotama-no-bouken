from pathlib import Path
import io,zipfile,urllib.request
from PIL import Image,ImageEnhance
out=Path("field/assets/b5-distant")
out.mkdir(parents=True,exist_ok=True)
sources=["Facade020C","Facade010","Facade009"]
results=[]
for name in sources:
    url=f"https://ambientcg.com/get?file={name}_1K-PNG.zip"
    try:
        request=urllib.request.Request(url,headers={"User-Agent":"KotamaAssetResearch/1.0"})
        with urllib.request.urlopen(request,timeout=45) as response:
            data=response.read(35_000_000)
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            files=[n for n in z.namelist() if n.lower().endswith((".png",".jpg"))]
            emission=[n for n in files if "emission" in n.lower()]
            if not emission:
                print(f"{name}: no emission map; skipped")
                continue
            source=Image.open(io.BytesIO(z.read(emission[0]))).convert("RGB")
            source.thumbnail((1024,1024))
            # Only emission-map pixels survive. Original window variation is preserved.
            pixels=source.load()
            for y in range(source.height):
                for x in range(source.width):
                    r,g,b=pixels[x,y]
                    lum=max(r,g,b)
                    if lum<36:
                        pixels[x,y]=(0,0,0)
                    else:
                        factor=min(1.0,(lum-24)/170)
                        pixels[x,y]=(int(r*factor),int(g*factor),int(b*factor))
            path=out/f"{name.lower()}-windows.png"
            source.save(path,optimize=True)
            results.append((name,url,str(path)))
            print("OK",name,emission[0],path)
    except Exception as exc:
        print("FAILED",name,type(exc).__name__,str(exc)[:250])
if not results:
    raise SystemExit("No verified source emission maps could be downloaded")
(out/"SOURCES.txt").write_text("\n".join(f"{name} | {url} | {path} | CC0 ambientCG" for name,url,path in results)+"\n")
