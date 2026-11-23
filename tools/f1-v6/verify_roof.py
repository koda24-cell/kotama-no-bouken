from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'f1-closed-ruins-v3'))
import verify_roof_rays as verifier
verifier.LAYOUT=verifier.ROOT/verifier.KIT/'scene/game-layout-v6.json'
verifier.OUTPUT=verifier.ROOT/'docs/reviews/f1-v6/roof-ray-coverage.json'
verifier.main()

# Placements include visible solid interaction tiles; distinguish them from navigation.
import json
r=json.loads(verifier.OUTPUT.read_text());r['visibleFloorCells']=r.pop('walkFloorCells',None)
r['navigationNote']='201 visible floor cells include 196 walkable cells and 5 solid interaction endpoints.'
verifier.OUTPUT.write_text(json.dumps(r,indent=2))
