from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'f1-closed-ruins-v3'))
import verify_roof_rays as verifier
verifier.LAYOUT=verifier.ROOT/verifier.KIT/'scene/game-layout-v5.json'
verifier.OUTPUT=verifier.ROOT/'docs/reviews/f1-v5/roof-ray-coverage.json'
verifier.main()
