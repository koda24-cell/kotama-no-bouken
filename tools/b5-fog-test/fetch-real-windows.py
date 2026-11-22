"""Fetch ambientCG CC0 emission maps with fail-closed ClamAV gates.

Every downloaded ZIP is scanned BEFORE archive parsing. The selected image is
scanned again AFTER extraction but BEFORE Pillow decodes any image pixels.
No downloaded archive is trusted as a source of executable code.
"""
from pathlib import Path
import hashlib
import io
import subprocess
import tempfile
import urllib.request
import zipfile
from PIL import Image

out=Path("field/assets/b5-distant")
out.mkdir(parents=True,exist_ok=True)
Path("qa/security").mkdir(parents=True,exist_ok=True)
sources=["Facade020C","Facade010","Facade009"]
results=[]
Image.MAX_IMAGE_PIXELS=16_000_000

def scan(path,log):
    # Called synchronously immediately after each download/extraction.
    # Scanner failure, unavailable signatures or malware is fatal, not a fallback.
    subprocess.run(
        ["bash","tools/security/clamav_scan_gate.sh","scan",str(path),str(log)],
        check=True,
    )

for name in sources:
    url=f"https://ambientcg.com/get?file={name}_1K-PNG.zip"
    try:
        request=urllib.request.Request(url,headers={"User-Agent":"KotamaAssetResearch/1.0"})
        with urllib.request.urlopen(request,timeout=45) as response:
            data=response.read(35_000_001)
        if len(data)>35_000_000:
            raise ValueError("ZIP exceeds the 35 MB input cap")
        with tempfile.TemporaryDirectory(prefix="kotama-b5-fog-") as tmp:
            archive=Path(tmp)/(name+".zip")
            archive.write_bytes(data)
            scan(archive,Path("qa/security")/(name+"-zip.log"))
            with zipfile.ZipFile(archive) as z:
                infos=z.infolist()
                if len(infos)>500:
                    raise ValueError("ZIP contains too many entries")
                emission=[i for i in infos if not i.is_dir()
                          and i.filename.lower().endswith((".png",".jpg"))
                          and "emission" in i.filename.lower()]
                if not emission:
                    print(f"{name}: no emission map; skipped")
                    continue
                info=emission[0]
                if info.file_size>40_000_000 or info.file_size>250*max(1,info.compress_size):
                    raise ValueError("Oversized or suspicious compression ratio")
                extracted=Path(tmp)/("emission"+Path(info.filename).suffix.lower())
                extracted.write_bytes(z.read(info))
            scan(extracted,Path("qa/security")/(name+"-emission.log"))
            with Image.open(extracted) as image:
                source=image.convert("RGB")
            source.thumbnail((1024,1024))
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
            results.append((name,url,str(path),hashlib.sha256(data).hexdigest()))
            print("OK",name,info.filename,path,flush=True)
    except subprocess.CalledProcessError:
        # Never treat malware or scanner errors as optional texture fallback.
        raise
    except Exception as exc:
        print("FAILED",name,type(exc).__name__,str(exc)[:250],flush=True)

if not results:
    raise SystemExit("No verified source emission maps could be downloaded")
(out/"SOURCES.txt").write_text(
    "\n".join(f"{name} | {url} | {path} | CC0 ambientCG | zip-sha256:{sha}"
              for name,url,path,sha in results)+"\n",
    encoding="utf-8",
)
