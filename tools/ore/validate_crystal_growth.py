"""Deterministic geometry checks; NOT a substitute for image-based aesthetic review."""
import json,sys,statistics,pathlib
p=pathlib.Path(sys.argv[1]);m=json.loads(p.read_text())
g=m["growth"];lengths=sorted(x["length"] for x in g)
small=sum(x<.075 for x in lengths)/len(lengths)
large=sum(x>.15 for x in lengths)/len(lengths)
pockets={x["pocket"] for x in g}
z=[x["direction"][2] for x in g]
issues=[]
if len(g)<100:issues.append("too few crystals")
if small<.55:issues.append("not enough fine crystals")
if large>.12:issues.append("too many oversized crystals")
if len(pockets)<4:issues.append("too few growth pockets")
if statistics.pstdev(z)<.09:issues.append("growth directions too uniform")
report={"status":"PASS" if not issues else "FAIL","crystal_count":len(g),"small_fraction":round(small,3),"large_fraction":round(large,3),"vertical_direction_std":round(statistics.pstdev(z),3),"growth_pockets":len(pockets),"missing_texture_images":m["missing_texture_images"],"issues":issues,"visual_review":"REQUIRED","approval":"NOT_APPROVED"}
(p.parent/"growth_qa.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2))
if issues:sys.exit(1)
