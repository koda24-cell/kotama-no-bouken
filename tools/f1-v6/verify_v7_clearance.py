"""Reuse the established actual-GLB route check with V7 runtime evidence."""
from pathlib import Path
original=Path(__file__).with_name('verify_nature_bounds.py')
source=original.read_text().replace('docs/reviews/f1-v6-game/verification.json','docs/reviews/f1-v7/verification.json').replace('docs/reviews/f1-v6/additional-hard-asset-clearance.json','docs/reviews/f1-v7/body-clearance.json')
exec(compile(source,str(original),'exec'),{'__file__':str(original),'__name__':'__main__'})
