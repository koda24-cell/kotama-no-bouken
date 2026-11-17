"""P3 V5: reuse exact V16 source, V4 basalt variants and additive V5 detail."""
from pathlib import Path
base=Path('tools/floor4/magma_river/build_magma_river.py')
s=base.read_text(encoding='utf-8')
marker='# The modeling convention above uses Y-up (as in Three.js).'
assert s.count(marker)==1 and 'V16: irregular cell-boundary fractures' in s
hook="""variant='p3-v4'
exec(compile(Path('tools/floor4/magma_banks/variant_additions.py').read_text(), 'variant_additions.py','exec'))
variant='p3-v5'
exec(compile(Path('tools/floor4/magma_banks/p3_v5_additions.py').read_text(), 'p3_v5_additions.py','exec'))

"""
s=s.replace(marker,hook+marker)
exec(compile(s,str(base),'exec'),{'__name__':'__main__','__file__':str(base),'Path':Path})
