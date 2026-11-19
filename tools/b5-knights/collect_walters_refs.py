#!/usr/bin/env python3
"""Collect CC0 museum reference photos of ONE real sallet, Walters 51.470.
Documentation research only; NOT production textures. Originals and hashes in temporary Artifact.
"""
from pathlib import Path
from urllib.request import Request,urlopen
from urllib.error import HTTPError,URLError
from PIL import Image,ImageOps,ImageDraw,ImageFont
import json,hashlib,io,time
base="https://art.thewalters.org/images/art/"
photos={
 "01_front":"PS4_51.470_Fnt_DD_AT19_7-tms.jpg",
 "02_visor_raised":"PS4_51.470_Opn_DD_AT19_2575-tms.jpg",
 "03_left":"PS4_51.470_Lft_DD_AT19_1905-tms.jpg",
 "04_back":"PS4_51.470_Back_DD_AT19_5-tms.jpg",
 "05_rear_three_quarter":"PS4_51.470_3QtrBack_DD_AT19_1-tms.jpg",
 "06_right":"PS4_51.470_Rt_DD_AT19_1900-tms.jpg",
 "07_front_three_quarter":"PS4_51.470_3QtrFnt_DD_AT19_2001-tms.jpg",
 "08_visor_closed":"PS4_51.470_Clsd_DD_AT19_2576-tms.jpg",
 "09_top":"PS4_51.470_Top_DD_AT19-tms.jpg",
 "10_interior":"PS4_51.470_Int_DD_AT19-tms.jpg",
 "11_side_historical":"PL1_51.470_Prof_TR_T97.jpg"
}
out=Path("render-output/b5-knights/walters_51_470_reference");out.mkdir(parents=True,exist_ok=True)
manifest={"museum":"The Walters Art Museum","object_id":"51.470",
"source":"https://art.thewalters.org/object/51.470/","license":"CC0 shown on official museum photo gallery",
"not_game_texture":True,"downloaded":[],"failed":[]}
for name,file in photos.items():
 url=base+file
 try:
  req=Request(url,headers={"User-Agent":"Mozilla/5.0 KotamaResearch/1.0 (image reference archival)"})
  with urlopen(req,timeout=25) as r: data=r.read()
  with Image.open(io.BytesIO(data)) as im:
   im.load();assert im.width>=250 and im.height>=250
   RGB=im.convert("RGB")
   dest=out/(name+".jpg");RGB.save(dest,quality=90)
   manifest["downloaded"].append({"view":name,"url":url,"size":[im.width,im.height],
   "sha256":hashlib.sha256(dest.read_bytes()).hexdigest()})
 except Exception as e:
  manifest["failed"].append({"view":name,"url":url,"error":str(e)[:200]})
# Build multi-view matrix using only actual successfully downloaded museum images.
W,H=310,340;cols=4;rows=(len(manifest["downloaded"])+cols-1)//cols
sheet=Image.new("RGB",(cols*W,rows*H),(27,34,47));d=ImageDraw.Draw(sheet)
for idx,entry in enumerate(manifest["downloaded"]):
 im=Image.open(out/(entry["view"]+".jpg"))
 im.thumbnail((W-16,H-51))
 x=(idx%cols)*W+(W-im.width)//2;y=(idx//cols)*H+10
 sheet.paste(im,(x,y))
 d.text(((idx%cols)*W+10,(idx//cols)*H+H-33),entry["view"],fill=(245,245,245))
sheet.save(out/"real_object_multiview_contact.jpg",quality=92)
manifest["contact_sha256"]=hashlib.sha256((out/"real_object_multiview_contact.jpg").read_bytes()).hexdigest()
(out/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf8")
print("WALTERS_IMAGES",len(manifest["downloaded"]),"FAILED",manifest["failed"])
assert len(manifest["downloaded"])>=7, "Not enough authentic same-object photos to assess all directions"
