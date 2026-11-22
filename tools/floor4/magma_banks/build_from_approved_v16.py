"""Render three additive variations directly from the approved V16 Blender source.

This wrapper does NOT modify or replace the V16 source or mesh. It inserts
variant_additions.py at the final pre-render hook, then runs the exact V16
material/mesh/lighting/export pipeline. Candidates are NOT_APPROVED.
"""
from pathlib import Path
import sys
base=Path('tools/floor4/magma_river/build_magma_river.py')
src=base.read_text(encoding='utf-8')
marker='# The modeling convention above uses Y-up (as in Three.js).'
assert src.count(marker)==1, 'Approved V16 hook changed; review manually before reuse'
hook="exec(compile(Path('tools/floor4/magma_banks/variant_additions.py').read_text(encoding='utf-8'), 'variant_additions.py', 'exec'))\n\n"
src=src.replace(marker,hook+marker)
assert 'V16: irregular cell-boundary fractures' in src
assert 'V15_THICK_CASCADE_COOLING_SIDEWALL' in src
globals_dict={'__name__':'__main__','__file__':str(base),'Path':Path}
exec(compile(src,str(base),'exec'),globals_dict)
