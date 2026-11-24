import sys,json
from pathlib import Path
from PIL import Image,ImageFilter
from advanced_art_review import packet,VIEWS
from advanced_local_vision import LocalVision
def main():
    model,folder,out=map(Path,sys.argv[1:])
    out.mkdir(parents=True,exist_ok=False)
    bad=out/"degraded"/"reimport";bad.mkdir(parents=True)
    for v in VIEWS:
        with Image.open(folder/"reimport"/(v+".png")) as im:
            im.convert("RGBA").filter(ImageFilter.GaussianBlur(12)).save(bad/(v+".png"))
    ai=LocalVision(model)
    def review(p):return ai.review({"path":str(p),"art_review_packet":packet(p/"reimport")})
    a,b=review(folder),review(bad.parent)
    result={"original":a,"degraded":b,"blur_preference_pass":a["summary"]["mean"]>b["summary"]["mean"],"approval":"NOT_APPROVED","scope":"single controlled blur test, not human aesthetic accuracy"}
    (out/"benchmark.json").write_text(json.dumps(result,indent=2))
    if not result["blur_preference_pass"]:raise SystemExit("CLIP did not prefer original")
if __name__=="__main__":main()
