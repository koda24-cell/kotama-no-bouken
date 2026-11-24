"""Run the shared opaque-rigid review on exactly one preserved source model."""
import os,sys,json,hashlib,subprocess,runpy,traceback
from pathlib import Path
root=Path(__file__).resolve().parents[2];out=root/os.environ['OUTPUT_DIR'];out.mkdir(parents=True,exist_ok=True)
try:
 subprocess.run(['git','config','--global','--add','safe.directory',str(root)],check=True)
 asset=out.name.removeprefix('f3-industrial-lod-');folder=root/'assets/3d/dungeons/b3_industrial_candidates'/asset
 doc=json.loads((folder/'manifest.json').read_text());source=folder/doc['asset']['file'];original=hashlib.sha256(source.read_bytes()).hexdigest();assert original==doc['asset']['sha256']
 for target,label in [(root/'tools/3d-performance','shared-scripts'),(source,'source')]:
  subprocess.run(['bash',str(root/'tools/security/clamav_scan_gate.sh'),'scan',str(target),str(out/'security'/(label+'.log'))],check=True)
 sys.argv=['blender','--','--source',str(source),'--out',str(out/'comparison')]
 runpy.run_path(str(root/'tools/3d-performance/build_rigid_lod_review.py'),run_name='__main__')
 assert hashlib.sha256(source.read_bytes()).hexdigest()==original
 receipt=json.loads((out/'comparison/manifest.json').read_text());receipt.update(sourceSha256=original,sourceCommit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),workflowRun=os.environ['GITHUB_RUN_ID'],assetId=asset,blender='5.3.0',artisticStatus='NOT_APPROVED')
 (out/'comparison/manifest.json').write_text(json.dumps(receipt,indent=2))
 subprocess.run(['python3',str(root/'tools/3d-performance/audit_glb.py'),str(out/'comparison/*.glb'),'--output',str(out/'structural-audit.json')],check=True)
except BaseException:
 (out/'failure.txt').write_text(traceback.format_exc());traceback.print_exc();os._exit(1)
