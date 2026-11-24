"""Freeze actual verified browser input bytes while independent model jobs continue."""
import json,hashlib,shutil,subprocess,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('catalog',type=Path);p.add_argument('output',type=Path);a=p.parse_args();root=Path(__file__).resolve().parents[2];base=root/'assets/3d/dungeons/b3_industrial_candidates';doc=json.loads(a.catalog.read_text());a.output.mkdir(parents=True,exist_ok=True);proof=[]
for row in doc['assets']+doc['sharedImages']:
 source=(base/row['file']).resolve();assert source.is_relative_to(root);data=source.read_bytes();assert hashlib.sha256(data).hexdigest()==row['sha256']
 if source.is_relative_to(base):
  target=a.output/source.relative_to(base);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
 proof.append({'file':row['file'],'sha256':row['sha256'],'bytes':len(data),'copied':source.is_relative_to(base)})
shutil.copyfile(a.catalog,a.output/'catalog.json');(a.output/'frozen-inputs.json').write_text(json.dumps({'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),'files':proof,'note':'Exact verified candidate bytes; no replacement geometry, image manipulation or placeholder assets.'},indent=2));print(a.output)
