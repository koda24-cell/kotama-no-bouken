/* B5 throne hall: ruined hooded guardian statue.
 * FRONT = -Z; geometry-only, no collision or gameplay changes.
 */
export function createB5HoodedStatue(THREE, options={}) {
 const group=new THREE.Group();group.name='b5:throne:hoodedGuardian';
 group.userData.visualOnly=true;group.userData.frontDirection=[0,0,-1];
 const gs=[],ms=[],G=g=>(gs.push(g),g),M=m=>(ms.push(m),m);
 const stone=M(new THREE.MeshStandardMaterial({color:0x77737b,roughness:.98,flatShading:true,side:THREE.DoubleSide}));
 const pale=M(new THREE.MeshStandardMaterial({color:0x99939a,roughness:.96,flatShading:true,side:THREE.DoubleSide}));
 const dark=M(new THREE.MeshStandardMaterial({color:0x27242e,roughness:1,side:THREE.DoubleSide}));
 const add=(geo,mat,x=0,y=0,z=0)=>{const o=new THREE.Mesh(G(geo),mat);o.position.set(x,y,z);group.add(o);return o;};
 const box=(x,y,z,w,h,d,mat=stone)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
 const rock=(x,y,z,sx,sy,sz,seed=0,mat=stone)=>{
  const o=add(new THREE.DodecahedronGeometry(1,1),mat,x,y,z);
  o.scale.set(sx,sy,sz);o.rotation.set(seed*.19,seed*.31,seed*.23);return o;
 };
 const rod=(pts,r,mat=stone)=>{
  const path=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
  return add(new THREE.TubeGeometry(path,Math.max(12,pts.length*6),r,7,false),mat);
 };
 // Broad worn pedestal and damaged plinth.
 box(0,.32,0,3.2,.64,2.45);box(0,.77,0,2.85,.26,2.15,pale);
 box(0,1.0,0,2.52,.22,1.93);
 for(let i=0;i<14;i++){
  const a=i*2.3999,r=1.3+(i%4)*.19;
  rock(Math.cos(a)*r,.15,Math.sin(a)*r, .20+(i%3)*.10,.15,.22,i);
 }
 // Robed body: tapered irregular silhouette, more sculptural than boxes.
 const pts=[
  [0,1.05],[1.02,1.05],[.97,1.65],[.81,2.5],[.67,3.30],
  [.78,4.05],[.71,4.65],[.48,5.20],[.34,5.56],[0,5.65]
 ].map(([r,y])=>new THREE.Vector2(r,y));
 const robe=add(new THREE.LatheGeometry(pts,15,0,Math.PI*2),stone);
 robe.scale.z=.77;
 // Overlapping folds and curved drapery ridges.
 for(let i=0;i<11;i++){
  const a=i*Math.PI*2/11;
  const rad=(y)=>.88-.10*(y-1.1);
  rod([[rad(1.25)*Math.cos(a),1.25,rad(1.25)*Math.sin(a)*.77],
       [rad(2.4)*Math.cos(a+.10),2.4,rad(2.4)*Math.sin(a+.10)*.77],
       [rad(3.6)*Math.cos(a-.05),3.6,rad(3.6)*Math.sin(a-.05)*.77],
       [.52*Math.cos(a+.09),4.65,.42*Math.sin(a+.09)]],.045,i%3===0?pale:stone);
 }
 // Hood is a true deep, thick sculpted cowl. The front opening lies
 // behind its heavy rolled stone lip, with a curved back silhouette.
 const hoodGeo=(()=>{
  const segments=32,levels=13,verts=[],idx=[];
  for(let j=0;j<=levels;j++){
   const t=j/levels,theta=t*Math.PI;
   const ry=.83*(1-.08*Math.sin(theta*3)),rx=.70*(1+.075*Math.sin(theta*2));
   for(let k=0;k<segments;k++){
    const a=k*2*Math.PI/segments;
    const x=Math.sin(theta)*Math.cos(a)*rx;
    const y=5.36+Math.cos(theta)*ry;
    const z=-.08+.66*Math.sin(theta)*Math.sin(a);
    verts.push(x,y,z);
   }
  }
  for(let j=0;j<levels;j++)for(let k=0;k<segments;k++){
   const a=j*segments+k,b=j*segments+(k+1)%segments,c=(j+1)*segments+k,d=(j+1)*segments+(k+1)%segments;
   idx.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setIndex(idx);g.computeVertexNormals();return g;
 })();
 add(hoodGeo,stone);
 const opening=add(new THREE.SphereGeometry(.49,20,14),dark,0,5.34,-.685);
 opening.scale.set(.80,1.04,.19);
 // A profiled continuous rim gives real cowl thickness and curved corners.
 for(const side of [-1,1]){
  rod([[side*.21,6.02,-.45],[side*.48,5.90,-.55],[side*.59,5.63,-.63],[side*.53,5.29,-.73],[side*.36,5.02,-.77],[side*.22,4.94,-.66]],.15,pale);
  rod([[side*.52,5.84,-.39],[side*.70,5.61,-.34],[side*.66,5.27,-.31],[side*.52,5.03,-.40]],.09,stone);
 }
 rod([[-.27,6.03,-.48],[0,6.13,-.51],[.27,6.03,-.48]],.15,pale);
 // Overlapping chiseled fabric surfaces emerge from the hood and settle
 // into the robe. These are continuous curved sheets, not floating bands.
 for(const side of [-1,1]){
  const points=[],faces=[],rows=13,cols=6;
  for(let j=0;j<=rows;j++){
   const t=j/rows,y=5.03-t*3.15;
   for(let k=0;k<=cols;k++){
    const u=k/cols;
    const x=side*(.30+.64*u+.08*Math.sin(t*8+u*3));
    const z=-.39-.24*Math.sin(t*Math.PI)*Math.sin(u*Math.PI)+.10*u;
    points.push(x,y,z+.026*Math.sin(t*25+u*8));
   }
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
   const a=j*(cols+1)+k,b=a+1,c=a+(cols+1),d=c+1;
   faces.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  g.setIndex(faces);g.computeVertexNormals();
  add(g,stone);
 }
 // Sculpted arms and shoulders: avoid visible sphere/cylinder seams.
 // Build each surviving cloth sleeve as a smoothly lofted, elliptical
 // continuous mesh with an irregular hanging silhouette.
 const sleeve=(sections,mat=stone,radial=18)=>{
  const vertices=[],indices=[];
  for(let j=0;j<sections.length;j++){
   const [cx,cy,cz,rx,rz,turn]=sections[j];
   for(let i=0;i<radial;i++){
    const a=i*2*Math.PI/radial;
    const flap=1+.055*Math.sin(a*5+j*.81)+.035*Math.sin(a*9-j*1.7);
    const x=rx*Math.cos(a)*flap,z=rz*Math.sin(a)*flap;
    vertices.push(cx+x*Math.cos(turn)-z*Math.sin(turn),cy,cz+x*Math.sin(turn)+z*Math.cos(turn));
   }
  }
  for(let j=0;j<sections.length-1;j++)for(let i=0;i<radial;i++){
   const p=j*radial+i,q=j*radial+(i+1)%radial,r=(j+1)*radial+i,t=(j+1)*radial+(i+1)%radial;
   indices.push(p,r,q,q,r,t);
  }
  for(let i=1;i<radial-1;i++){
   indices.push(0,i,i+1);
   const base=(sections.length-1)*radial;
   indices.push(base,base+i+1,base+i);
  }
  const mesh=new THREE.BufferGeometry();
  mesh.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  mesh.setIndex(indices);mesh.computeVertexNormals();
  return add(mesh,mat);
 };
 // Mantle overlaps the shoulders and runs into the robe, following drapery.
 // Asymmetric cloth contours create the sloped human shoulder line.
 const mantleSections=[
  [0,5.04,-.02,.47,.48,0],
  [0,4.89,-.02,.67,.59,0],
  [0,4.67,-.03,.84,.63,0],
  [0,4.47,.01,.77,.59,0],
  [0,4.26,.03,.66,.56,0]
 ];
 sleeve(mantleSections,stone,32);
 // Left arm: single connected, folded sleeve that tapers and bends inwards.
 sleeve([
  [-.61,4.67,-.13,.39,.39,-.04],
  [-.88,4.46,-.15,.37,.35,-.10],
  [-1.01,4.18,-.19,.33,.32,-.14],
  [-1.04,3.86,-.25,.29,.29,-.23],
  [-.96,3.57,-.34,.26,.27,-.28],
  [-.84,3.30,-.44,.25,.24,-.32],
  [-.70,3.04,-.50,.23,.22,-.37],
  [-.54,2.88,-.57,.21,.19,-.39]
 ],stone,24);
 // Sleeve folds start at the mantle and flow along the bent elbow.
 for(const pts of [
  [[-.72,4.63,-.51],[-.92,4.29,-.49],[-1.03,3.95,-.54],[-.88,3.45,-.56]],
  [[-.64,4.61,.27],[-.94,4.21,.18],[-.98,3.71,-.03],[-.75,3.13,-.24]],
  [[-.79,4.53,-.43],[-1.12,4.14,-.40],[-1.13,3.85,-.38]]
 ])rod(pts,.035,pale);
 // The opposite shoulder is missing: an inset fracture cap follows the
 // curved shoulder profile, with an uneven but non-spiky eroded boundary.
 const rim=[
  [.42,4.93,-.35],[.61,5.02,-.32],[.84,4.98,-.21],
  [1.00,4.78,-.15],[.98,4.54,-.12],[.83,4.35,-.20],
  [.63,4.32,-.29],[.46,4.50,-.42]
 ];
 const fractureVertices=[];
 for(const point of rim)fractureVertices.push(...point);
 fractureVertices.push(.67,4.67,-.14);
 const fractureFaces=[];
 for(let i=0;i<rim.length;i++)fractureFaces.push(i,(i+1)%rim.length,rim.length);
 const fractureGeo=new THREE.BufferGeometry();
 fractureGeo.setAttribute('position',new THREE.Float32BufferAttribute(fractureVertices,3));
 fractureGeo.setIndex(fractureFaces);fractureGeo.computeVertexNormals();
 add(fractureGeo,pale);
 // Draped damaged shoulder lip, integrated with the upper cloak.
 rod([[.43,4.92,-.37],[.59,5.02,-.34],[.84,4.97,-.23],[.99,4.76,-.18]],.062,stone);
 // Fallen limb: its two broken pieces are grounded and partly obscured
 // by rubble. No separate spherical joints remain on the figure.
 const forearm=rock(1.17,.25,-1.07,.52,.19,.24,11);
 forearm.rotation.z=-.18;
 rock(1.48,.17,-1.20,.30,.14,.22,13);
 // PASS 3 — additive sculpting. The approved hood, arm pose and
 // broad body remain unchanged. Details sit close to their parent fabric.
 // Flowing layered stole in a continuous, lightly rippled stone sheet.
 const drapeSheet=(side,seed=0)=>{
  const rows=26,cols=9,positions=[],indices=[];
  for(let j=0;j<=rows;j++){
   const t=j/rows,yy=4.79-2.65*t;
   const width=.17+.12*Math.sin(Math.PI*t)+.055*t;
   const cx=side*(.35+.16*Math.sin(t*3.8+seed)+.12*t);
   const cz=-.61-.12*Math.sin(t*Math.PI);
   for(let k=0;k<=cols;k++){
    const u=k/cols*2-1;
    const edgeFold=.065*Math.sin(t*15+u*3+seed);
    positions.push(cx+width*u, yy+.075*Math.sin(t*8+u*2+seed)*u,
      cz+.075*(1-u*u)*Math.sin(t*11+seed)+edgeFold);
   }
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
   const a=j*(cols+1)+k,b=a+1,c=a+cols+1,d=c+1;
   indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices);g.computeVertexNormals();
  add(g,stone);
  rod([[side*.26,4.80,-.62],[side*.46,4.32,-.71],
    [side*.53,3.72,-.67],[side*.52,3.08,-.68],
    [side*.58,2.20,-.64]],.025,pale);
 };
 drapeSheet(-1,.4);drapeSheet(1,1.7);
 // Layered neck folds support the fabric around the shoulders without
 // creating a padded, fur-like rim around the face.
 for(const side of [-1,1]){
  rod([[side*.47,4.93,-.39],[side*.64,4.78,-.46],
    [side*.73,4.52,-.44],[side*.63,4.28,-.47]],.055,stone);
 }
 // Engraved devotional motif below the hood: restrained geometric stone
 // carving, kept shallow enough to avoid looking like applied armor.
 const medallion=add(new THREE.CylinderGeometry(.22,.22,.075,32),stone,0,4.35,-.70);
 medallion.rotation.x=Math.PI/2;
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
  rod([[.15*Math.cos(a),4.35+.15*Math.sin(a),-.75],
    [.15*Math.cos(b),4.35+.15*Math.sin(b),-.75]],.018,pale);
 }
 rod([[0,4.46,-.76],[.06,4.38,-.76],[0,4.28,-.76],
   [-.06,4.38,-.76],[0,4.46,-.76]],.022,pale);
 // Fine, gravity-led chiseled folds traveling down the robe, varying
 // length and curvature rather than evenly spaced straight ridges.
 for(const [x,y,z,lean] of [
  [-.43,3.95,-.56,-.14],[-.10,3.56,-.61,.12],
  [.28,3.78,-.58,-.11],[-.55,2.73,-.59,.16],[.42,2.62,-.58,-.12]
 ]){
  rod([[x,y,z],[x+lean*.5,y-.36,z-.045],
    [x+lean,y-.87,z-.025],[x+lean*.76,y-1.29,z+.04]],.023,stone);
 }
 // Fracture surface weathering: small inset seams and shallow chipped
 // edges on the pre-existing missing shoulder, no protruding rubble balls.
 for(const line of [
  [[.56,4.94,-.34],[.70,4.78,-.25],[.78,4.64,-.17]],
  [[.80,4.93,-.25],[.84,4.73,-.18],[.93,4.63,-.13]],
  [[.60,4.48,-.32],[.75,4.55,-.21],[.83,4.41,-.18]]
 ])rod(line,.013,dark);
 // Sculpted pedestal inscription bands, restrained and partly weathered.
 for(const side of [-1,1]){
  for(let i=0;i<5;i++){
   const x=side*(.35+i*.24);
   if(i===3&&side>0)continue; // lost carving
   rod([[x-.07,.77,-1.091],[x,.87,-1.092],
     [x+.07,.77,-1.091]],.016,pale);
  }
 }
 // PASS 4: broader overlapping cloak folds, built ON TOP of the approved
 // narrow drapes. Contoured surfaces grow from the mantle and settle into
 // the robe instead of reading as independent straight ribbon strips.
 const broadFold=(side,seed)=>{
  const rows=37,cols=18,vertices=[],triangles=[];
  for(let j=0;j<=rows;j++){
   const t=j/rows,y=4.78-t*2.75;
   const breadth=.23+.20*Math.sin(Math.PI*t)+.085*t;
   const cx=side*(.52+.065*Math.sin(t*5+seed)+.07*t);
   for(let k=0;k<=cols;k++){
    const u=k/cols*2-1;
    // Rolled edge and two broad gravity-led creases, naturally tapered.
    const roll=.11*Math.pow(Math.abs(u),5);
    const fold=.14*Math.sin((u+.12)*Math.PI*1.6+t*5.2+seed)
      *Math.sin(Math.PI*(.12+.84*t));
    const z=-.66-.14*Math.sin(Math.PI*t)+fold+roll;
    const hemDrop=.10*Math.sin(t*13+seed)*u*u;
    vertices.push(cx+breadth*u,y+hemDrop,z);
   }
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
   const a=j*(cols+1)+k,b=a+1,c=a+cols+1,d=c+1;
   triangles.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setIndex(triangles);g.computeVertexNormals();
  const surface=add(g,stone);
  surface.name=side<0?'left-broad-cloak-fold':'right-broad-cloak-fold';
  // Embossed long seam follows the lateral fold, not the face opening.
  rod([[side*.68,4.67,-.59],[side*.75,4.23,-.67],
    [side*.82,3.62,-.74],[side*.78,2.89,-.69],
    [side*.79,2.11,-.59]],.035,pale);
 };
 broadFold(-1,.35);
 broadFold(1,1.62);
 // Sculpted inset cuff edge on the surviving sleeve.
 rod([[-.47,2.99,-.73],[-.62,2.91,-.77],[-.81,2.98,-.69],
      [-.90,3.10,-.58]],.060,stone);
 rod([[-.50,3.12,-.68],[-.69,3.02,-.71],[-.84,3.08,-.61]],.025,pale);
 // Uneven lower-robe scallops and shallow falling folds, asymmetric.
 for(const [x,z,dy] of [[-.61,-.56,.08],[-.29,-.72,-.09],[.18,-.74,.12],[.58,-.49,-.04]]){
  rod([[x,2.48,z],[x*.94,2.12,z-.035],[x*1.04,1.62+dy,z+.03]],.033,stone);
 }
 // Additional light engraving on the existing broken right shoulder.
 for(const points of [
  [[.65,4.91,-.29],[.77,4.81,-.23],[.81,4.70,-.20]],
  [[.53,4.64,-.35],[.65,4.53,-.26],[.72,4.47,-.24]]
 ])rod(points,.016,stone);
 // PASS 5: the cathedral statue's ceremonial stole folds diagonally
 // from the intact left shoulder across the chest. Additive geometry only.
 // Both faces are sculpted in the same grey stone and keep the face clear.
 const sweepingDrape=(rear=false)=>{
  const rows=38,cols=16,positions=[],indices=[];
  for(let i=0;i<=rows;i++){
   const t=i/rows;
   const x=rear?-.58+1.10*t:-.73+1.24*t;
   const y=rear?4.84-2.20*t:4.82-1.62*t;
   const centerZ=rear?.46:-.88;
   const half=.18+.24*Math.sin(Math.PI*t)+.08*t;
   for(let j=0;j<=cols;j++){
    const u=2*j/cols-1;
    const ripple=.12*Math.sin(u*3.4+t*10.5)*(1-.3*t);
    const rolled=.045*Math.pow(Math.abs(u),6);
    positions.push(
     x+u*half*.63,
     y+u*half*.66-.07*t*t+.045*Math.sin(u*3+t*9),
     centerZ+(rear?1:-1)*(ripple+rolled+.04*Math.sin(t*16+u*2.5))
    );
   }
  }
  for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){
   const a=i*(cols+1)+j,b=a+1,c=a+cols+1,d=c+1;
   indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices);g.computeVertexNormals();
  const m=add(g,stone);m.name=rear?'back-diagonal-stole':'front-diagonal-stole';
  // Cloth border follows the visible lower edge of the continuous sheet.
  const border=[];
  for(let i=0;i<=24;i++){
   const t=i/24,u=.88;
   const half=.18+.24*Math.sin(Math.PI*t)+.08*t;
   const x=(rear?-.58+1.10*t:-.73+1.24*t)+u*half*.63;
   const y=(rear?4.84-2.20*t:4.82-1.62*t)+u*half*.66-.07*t*t+.045*Math.sin(u*3+t*9);
   const z=(rear?.46:-.88)+(rear?1:-1)*(.12*Math.sin(u*3.4+t*10.5)*(1-.3*t)+.045*Math.pow(Math.abs(u),6)+.04*Math.sin(t*16+u*2.5));
   border.push([x,y,z+(rear?.018:-.018)]);
  }
  rod(border,.020,pale);
 };
 sweepingDrape(false);sweepingDrape(true);
 // Chipped embroidered band around the stone robe hem, deliberately
 // discontinuous where the original sculpture has lost material.
 const hemBand=(front=true)=>{
  const z=front?-.78:.75;
  for(let i=0;i<16;i++){
   if(i===5||i===6||i===12)continue;
   const x=-.75+i*.10;
   rod([[x,1.27,z],[x+.04,1.34,z],[x+.08,1.27,z]],.019,pale);
  }
 };
 hemBand(true);hemBand(false);
 // Shallow gothic tracery on pedestal, avoiding raised spherical ornaments.
 for(const z of [-1.238,1.238]){
  for(let i=0;i<5;i++){
   const x=(i-2)*.46;
   rod([[x-.16,.22,z],[x-.12,.41,z],[x,.51,z],
        [x+.12,.41,z],[x+.16,.22,z]],.022,pale);
  }
 }
 // Tiny worn stone seams at the foot of the surviving sleeve.
 for(const curve of [
  [[-.76,3.07,-.73],[-.68,3.00,-.74],[-.56,2.96,-.71]],
  [[-.83,3.18,-.67],[-.75,3.10,-.74],[-.62,3.07,-.74]]
 ])rod(curve,.020,stone);
 // PASS 6 — additive sculptural details. None of the accepted silhouettes
 // is replaced: the new stonework rides on the garment and mantle.
 // Draped mantle panels spring from shoulder and arc down the torso.
 const mantlePanel=(side,back=false)=>{
  const rows=30,cols=13,positions=[],triangles=[];
  for(let j=0;j<=rows;j++){
   const t=j/rows,y=4.93-1.83*t;
   const centerX=side*(.58+.18*Math.sin(t*2.6)+.10*t);
   const width=.16+.17*Math.sin(Math.PI*t)+.035*t;
   for(let k=0;k<=cols;k++){
    const u=2*k/cols-1;
    const x=centerX+side*width*u*.92;
    const dy=.09*u*u*Math.sin(t*9+side*.5);
    const z=(back?.38:-.58)+(back?1:-1)*
      (.13*Math.sin(t*Math.PI)*Math.cos(u*2.5)+.07*(1-u*u)*Math.sin(t*15+u*4));
    positions.push(x,y+dy,z);
   }
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){
   const a=j*(cols+1)+k,b=a+1,c=a+cols+1,d=c+1;
   triangles.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(triangles);g.computeVertexNormals();
  const item=add(g,stone);
  item.name=(back?'rear':'front')+(side<0?'-left':'-right')+'-mantle-layer';
 };
 mantlePanel(-1,false);mantlePanel(1,false);
 mantlePanel(-1,true);mantlePanel(1,true);
 // Broad crescent folds connect hood base into shoulders. Keep face opening
 // untouched and avoid fur-like repeated tubes around the face.
 for(const side of [-1,1]){
  rod([[side*.27,5.01,-.47],[side*.45,4.91,-.51],
    [side*.64,4.77,-.53],[side*.78,4.54,-.49]],.070,stone);
  rod([[side*.36,4.87,-.53],[side*.53,4.76,-.57],
    [side*.70,4.60,-.52]],.028,pale);
 }
 // Two chiseled ceremonial clasps on intact mantle, kept shallow and
 // embedded in drapery so they are not floating stones.
 const clasp=(x,y,z)=>{
  const ring=add(new THREE.TorusGeometry(.12,.022,7,20),pale,x,y,z);
  ring.name='carved-mantle-clasp';
  rod([[x,y+.09,z-.025],[x+.065,y,z-.025],[x,y-.095,z-.025],
    [x-.065,y,z-.025],[x,y+.09,z-.025]],.015,stone);
 };
 clasp(-.64,4.69,-.63);
 clasp(.53,4.68,-.60);
 // A chipped rectangular bas-relief plate on the front of the base.
 // Shallow inlay with one missing corner rather than a stuck-on block.
 const reliefOutline=[
  [-.48,.42],[-.39,.52],[.27,.52],[.48,.36],[.48,.21],
  [.35,.17],[-.42,.17],[-.50,.25]
 ];
 for(let i=0;i<reliefOutline.length;i++){
  const a=reliefOutline[i],b=reliefOutline[(i+1)%reliefOutline.length];
  rod([[a[0],a[1],-1.247],[b[0],b[1],-1.247]],.019,pale);
 }
 rod([[-.24,.26,-1.258],[0,.42,-1.258],[.24,.26,-1.258]],.024,pale);
 // Weathering on the grounded shoulder fragments, without new airborne debris.
 for(const [x,y,z] of [[1.12,.20,-1.19],[1.38,.16,-1.02]]){
  const fragment=rock(x,y,z,.14,.09,.16,29,stone);
  fragment.rotation.z=.17;
 }
 // Sculpted chips on the robe hem and damaged pedestal.
 for(let i=0;i<9;i++){
  const a=i*2.3999;
  rock(Math.cos(a)*.91,1.17,Math.sin(a)*.72,.16,.20,.17,i+20);
 }
 const scale=Number.isFinite(options.scale)?Math.max(.1,Math.min(3,options.scale)):1;
 group.scale.setScalar(scale);
 let disposed=false;
 return {group,dispose(){if(disposed)return;disposed=true;group.parent?.remove(group);group.clear();gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());}};
}
