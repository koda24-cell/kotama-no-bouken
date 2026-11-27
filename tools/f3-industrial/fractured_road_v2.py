"""One irregular, settled road surface. Voronoi fractures replace square tile seams."""
def build(e):
 import math,hashlib,random
 c,bpy,rng,asphalt,fracture,moss=[e[k]for k in ['c','bpy','rng','asphalt','fracture','moss']]
 # Deterministic half-plane clipping needs no third-party geometry package.
 cut=c.material('f3_porous_asphalt_fracture',(.045,.050,.046,1),.99)
 seeds=[(rng.uniform(-1.95,1.95),rng.uniform(-1.95,1.95))for _ in range(15)]
 def clip(poly,nx,ny,k):
  result=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   da=a[0]*nx+a[1]*ny-k;db=b[0]*nx+b[1]*ny-k
   if da<=0:result.append(a)
   if (da<=0)!=(db<=0):
    t=da/(da-db);result.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
  return result
 for i,(sx,sy)in enumerate(seeds):
  poly=[(-2,-2),(2,-2),(2,2),(-2,2)]
  for j,(tx,ty)in enumerate(seeds):
   if i!=j:poly=clip(poly,tx-sx,ty-sy,(tx*tx+ty*ty-sx*sx-sy*sy)/2)
  if len(poly)<3:continue
  cx=sum(x for x,y in poly)/len(poly);cy=sum(y for x,y in poly)/len(poly)
  jagged=[]
  for a,b in zip(poly,poly[1:]+poly[:1]):
   start,end=sorted([a,b]);dx=end[0]-start[0];dy=end[1]-start[1];length=math.hypot(dx,dy)
   seed=hashlib.sha256(repr(tuple(round(v,5)for p in[start,end]for v in p)).encode()).digest();edge_rng=random.Random(int.from_bytes(seed[:8],'big'))
   points=[start]
   boundary=(abs(a[0]-b[0])<1e-7 and abs(abs(a[0])-2)<1e-7)or(abs(a[1]-b[1])<1e-7 and abs(abs(a[1])-2)<1e-7)
   if length>.20 and not boundary:
    for t in [.23,.49,.76]:
     d=edge_rng.uniform(-1,1)*min(.032,length*.06)*math.sin(t*math.pi)
     points.append((start[0]+dx*t-dy/max(length,.001)*d,start[1]+dy*t+dx/max(length,.001)*d))
   points.append(end)
   if a!=start:points.reverse()
   jagged.extend(points[:-1])
  poly=[(x if abs(abs(x)-2)<1e-6 else cx+(x-cx)*.997,y if abs(abs(y)-2)<1e-6 else cy+(y-cy)*.997)for x,y in jagged]
  # Settled pieces have centimetres of relief, no raised traversable obstruction.
  lift=rng.uniform(-.008,.018);tiltx=rng.uniform(-.008,.008);tilty=rng.uniform(-.008,.008)
  n=len(poly);verts=[(x,y,-.10)for x,y in poly]+[(x,y,(lift+x*tiltx+y*tilty)*max(0,min(1,(2-abs(x))*4,(2-abs(y))*4)))for x,y in poly]
  faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(k,(k+1)%n,n+(k+1)%n,n+k)for k in range(n)]
  o=c.mesh('irregular weathered road plate',verts,faces,asphalt);o.data.materials.append(cut)
  for p in list(o.data.polygons)[2:]:p.material_index=1
  c.uv_world(o)
 # The photo already carries aggregate. Keep geometry debris in actual runtime
 # wall margins, so rotated road modules never create pebble rows across a lane.
