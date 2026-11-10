/* B4 abandoned mine supplementary props: pulley gantry, hanging bucket, collapsed timber, dead roots.
 * Standalone scenery module; integration is left to the B4 scene owner to avoid concurrent edits.
 */
import * as THREE from 'three';
export function createB4MineRigProps({ detail = 'high' } = {}) {
  const root=new THREE.Group();root.name='b4:mine-rig-props';
  const wood=new THREE.MeshStandardMaterial({color:0x493329,roughness:1,flatShading:true});
  const iron=new THREE.MeshStandardMaterial({color:0x4a4547,roughness:0.78,metalness:0.25});
  const ash=new THREE.MeshStandardMaterial({color:0x302824,roughness:1,flatShading:true});
  const rope=new THREE.MeshStandardMaterial({color:0x79604b,roughness:1});
  const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,8);
  const branch=new THREE.CylinderGeometry(.05,.16,1,5);
  const rim=new THREE.TorusGeometry(.5,.1,6,12);
  const shard=new THREE.ConeGeometry(.48,1.4,5),rock=new THREE.DodecahedronGeometry(1,0);
  const fractured=new THREE.IcosahedronGeometry(1,0), spike=new THREE.ConeGeometry(.22,1,4);
  const geometries=[box,cylinder,branch,rim,shard,rock,fractured,spike],materials=[wood,iron,ash,rope];
  const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1,rz=0,rx=0)=>{
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,0,rz);root.add(o);return o;
  };
  // Distorted A-frame gantry with diagonal braces, pulley and dangling ore bucket.
  for(const side of [-1,1]){
    add(box,wood,side*1.45,2.2,0,.24,4.4,.28,side*.16);
    add(box,wood,side*.95,2.5,0,.18,2.8,.2,-side*.47);
    add(box,iron,side*1.5,.18,0,.55,.12,.55);
  }
  add(box,wood,0,4.36,0,3.4,.3,.36,.05);
  add(cylinder,iron,0,4.0,.16,.56,.23,.56,0,Math.PI/2);
  add(rim,iron,0,4.0,.3,.65,.65,.65);
  add(box,rope,0,2.6,.32,.06,2.55,.06);
  add(cylinder,iron,0,1.2,.32,.5,.8,.5);
  add(rim,iron,0,1.63,.32,.52,.52,.52,0,Math.PI/2);
  // Split and fallen beams: exaggerated break, not a clean rectangular timber.
  add(box,wood,-2.2,.28,.65,2.3,.35,.35,-.18);
  add(box,wood,-2.95,.55,.65,.7,.22,.38,.48);
  add(box,wood,2.15,.24,-.8,1.9,.3,.3,.32);
  // Dead scorched roots and splintered branches, visibly larger than pebbles.
  for(let i=0;i<7;i++){
    const angle=i*2.39996,r=1.8+(i%3)*.42;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    add(branch,ash,x,.65,z,.7,1.2+(i%3)*.45,.7,Math.sin(angle)*.6,Math.cos(angle)*.5);
    add(branch,ash,x*.94,1.18,z*.94,.38,.8,.38,-.4,angle*.2);
  }
  // Pickaxe rack: two distinctly angled tools (separate from minecart props in PR #198).
  for(const side of [-1,1]){
    add(box,wood,side*2.25,.85,1.2,.09,1.7,.1,side*.18);
    add(box,iron,side*2.1,1.66,1.2,.85,.13,.14,side*.12);
  }
  // Second-pass sculpting: add large fractured rock masses and angular shards around old supports.
  // The dominant silhouette now combines the previous gantry with its surrounding collapse.
  for(let i=0;i<9;i++){
    const a=i*2.399963,r=2.35+(i%4)*.31;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const scale=.5+(i%3)*.38;
    add(rock,ash,x,.12+scale*.24,z,scale*1.35,scale*.58,scale*.92,a*.12,a*.2);
    if(i%2===0)add(shard,ash,x*.91,.6+scale*.35,z*.91,scale*.55,scale*1.4,scale*.7,a*.28,a*.17);
  }
  // Splintered beam ends and fallen cross braces, with exaggerated breaks.
  for(let i=0;i<6;i++){
    const side=i%2?1:-1;
    add(shard,wood,side*(1.2+i*.22),.45+(i%3)*.22,-.15+i*.18,.16,.5+(i%3)*.25,.22,side*.8);
  }
  add(box,wood,-.8,2.7,-.5,2.2,.13,.14,-.63);
  add(box,wood,1.05,1.55,-.55,1.7,.12,.14,.42);
  // Jagged ore pile on the ground: one large crystal dominates the smaller cluster.
  for(let i=0;i<11;i++){
    const a=i*2.399963,r=.18+Math.sqrt(i)*.19;
    const size=i===0?1.9:(.35+(i%4)*.2);
    add(shard,iron,2.2+Math.cos(a)*r,.15+size*.42,-1.25+Math.sin(a)*r,size*.45,size,size*.45,Math.sin(a)*.3,Math.cos(a)*.22);
  }
  // Additional rope tension lines and a broken hanging bucket rim.
  for(const side of [-1,1])add(box,rope,side*.57,3.1,.19,.035,1.9,.035,side*.3);
  add(rim,iron,.15,1.52,.38,.55,.55,.55,.23,Math.PI/2);
  // Reinforcement hoops around the leaning upright legs.
  for(const side of [-1,1])for(let y=1;y<=3;y++){
    add(box,iron,side*(1.45+(y-2)*.1),y,0,.35,.1,.4,side*.16);
  }
  // Third-pass silhouette upgrade: giant roof collapse encroaching from behind the rig.
  // Rock clusters have asymmetrical overhangs and vertical fractures, not uniform cubes.
  const archCenters=[[-3.0,3.3,-1.55,1.5,2.6,1.1],[-2.0,4.35,-1.8,1.7,1.45,1.3],
    [1.85,4.1,-1.7,1.6,1.6,1.2],[3.0,3.15,-1.4,1.6,2.5,1.2]];
  archCenters.forEach(([x,y,z,sx,sy,sz],i)=>add(fractured,ash,x,y,z,sx,sy,sz,(i-1.5)*.23,i*.19));
  // Massive broken roof slab and protruding hanging teeth.
  add(fractured,ash,0,5.65,-2.15,2.55,.72,1.45,.09,.1);
  for(let i=0;i<7;i++){
    const x=-2.7+i*.88;
    const h=.7+(i%3)*.42;
    add(spike,ash,x,4.95-h*.42,-1.35,.75,h,.9,Math.sin(i*2.1)*.2);
  }
  // Deliberately broken track segment buried by the rockfall, ending abruptly.
  for(const side of [-1,1]){
    add(box,iron,side*.57,.14,2.05,.1,.12,2.25,side*.09);
    for(let i=0;i<4;i++)add(box,wood,0,.075,1.05+i*.65,1.65,.13,.16,(i-2)*.06);
  }
  add(box,iron,-.62,.27,3.1,.11,.11,.78,-.44);
  add(box,iron,.69,.2,3.3,.11,.11,.45,.62);
  // Enlarged crystal outcrop: staggered tall and short spires growing through the fallen rock.
  for(let i=0;i<15;i++){
    const angle=i*2.399963,r=.22+Math.sqrt(i)*.22;
    const h=i%5===0?2.2:(.4+(i%4)*.36);
    add(shard,iron,-2.6+Math.cos(angle)*r,.25+h*.35,-1.65+Math.sin(angle)*r,.28+h*.12,h,.28+h*.12,
      Math.sin(angle)*.4,Math.cos(angle)*.34);
  }
  // Large exposed fractures, crossing the central collapsed rock face.
  for(let i=0;i<5;i++){
    const x=-1.3+i*.67;
    add(box,ash,x,5.9+(i%2)*.16,-.85,.12,.65+(i%3)*.3,.15,(i-2)*.26);
  }
  // Fourth pass: a half-buried, tipped ore cart grows directly out of the existing rail collapse.
  // Wheels are not just dots: they have hubs, rims and visible spokes.
  const cart=new THREE.Group();cart.name='b4:buried-ore-cart';cart.position.set(.65,.55,2.25);
  cart.rotation.set(-.2,.34,-.24);root.add(cart);
  const cartAdd=(geo,mat,x,y,z,sx=1,sy=1,sz=1,rz=0,rx=0)=>{
    const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.rotation.set(rx,0,rz);cart.add(o);
  };
  cartAdd(box,iron,0,.25,0,1.55,.22,1.35);
  for(const side of [-1,1]){
    cartAdd(box,iron,side*.69,.69,0,.16,.8,1.43,side*.19);
    cartAdd(box,iron,0,.68,side*.6,1.45,.7,.14,side*.12);
    for(const z of [-.43,.43]){
      cartAdd(cylinder,iron,side*.85,-.1,z,.37,.16,.37,0,Math.PI/2);
      cartAdd(rim,iron,side*.95,-.1,z,.36,.36,.36,0,Math.PI/2);
      for(let j=0;j<5;j++){
        const a=j*Math.PI*2/5;
        cartAdd(box,iron,side*.98,-.1+Math.sin(a)*.17,z+Math.cos(a)*.17,.035,.31,.035,a);
      }
    }
  }
  // Ore heap spills out of the damaged cart, with one exaggerated protruding boulder.
  for(let i=0;i<13;i++){
    const a=i*2.399963,r=.2+Math.sqrt(i)*.22;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const size=i===0?1.05:.2+(i%4)*.12;
    cartAdd(fractured,ash,x,.95+size*.25,z,size,size*.8,size*.7,a*.17,a*.13);
  }
  for(let i=0;i<6;i++){
    const a=i*2.399963;
    add(fractured,ash,1.45+Math.cos(a)*(1.1+i*.1),.18,-.2+Math.sin(a)*(.65+i*.1),
      .35+(i%3)*.16,.3+(i%2)*.13,.35+(i%3)*.16,a*.1);
  }
  // A snapped overhead catwalk, with uneven surviving planks and a hanging rail.
  for(let i=0;i<6;i++){
    const x=-2.3+i*.75;
    if(i===3)continue; // a clear, oversized missing section
    add(box,wood,x,3.45,-2.75,.62,.16,1.2,(i-2)*.08);
    if(i%2===0)add(box,iron,x,4.0,-3.15,.08,1.15,.08,(i-2)*.11);
  }
  add(box,iron,2.1,2.4,-3.12,.08,2.7,.08,.55);
  add(box,wood,2.35,1.85,-3.0,.28,2.8,.26,-.5);
  // Rope and timber dangling from the destroyed catwalk.
  for(let i=0;i<3;i++){
    const x=-1.6+i*1.55;
    add(box,rope,x,2.6,-3.0,.035,1.6+(i%2)*.5,.035,(i-1)*.12);
    add(shard,wood,x,1.7-(i%2)*.25,-3.0,.18,.52,.18,(i-1)*.38);
  }
  // Fifth pass: a broken ventilation shaft and mine cage emerging from the same cave-in.
  // The segmented duct is kinked and partly crushed, rather than a smooth cylinder.
  const duct=new THREE.Group();duct.name='b4:crushed-ventilation';duct.position.set(-3.25,1.1,-2.8);
  duct.rotation.z=-.28;root.add(duct);
  const ductAdd=(geo,mat,x,y,z,sx,sy,sz,rz=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;duct.add(m);
  };
  for(let i=0;i<6;i++){
    const y=i*.58;
    const bend=i>=3?(i-2)*.17:0;
    ductAdd(cylinder,iron,bend,y,0,.58-(i===4?.17:0),.52,.58-(i===4?.12:0),(i-2)*.11);
    ductAdd(rim,iron,bend,y+.26,0,.64-(i===4?.15:0),.64,.64-(i===4?.15:0),(i-2)*.12);
  }
  // Jagged lip around the torn duct opening.
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9;
    ductAdd(spike,iron,.5+Math.cos(a)*.43,3.15,Math.sin(a)*.43,.25,.48+(i%3)*.2,.25,(i-4)*.2);
  }
  // Half-fallen iron cage and protective bars, leaning against the collapsed mine.
  const cage=new THREE.Group();cage.name='b4:broken-mine-cage';
  cage.position.set(3.4,.65,-2.35);cage.rotation.set(.15,-.3,.32);root.add(cage);
  const cageAdd=(geo,mat,x,y,z,sx,sy,sz,rz=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.z=rz;cage.add(m);
  };
  cageAdd(box,iron,0,0,0,1.6,.18,1.5);
  for(const x of [-.7,.7])for(const z of [-.65,.65]){
    cageAdd(box,iron,x,1.2,z,.11,2.4,.11,(x+z)*.07);
  }
  for(const y of [.8,1.7,2.4]){
    for(const z of [-.65,.65])cageAdd(box,iron,0,y,z,1.6,.09,.11,(y-1.5)*.08);
    if(y!==1.7)for(const x of [-.7,.7])cageAdd(box,iron,x,y,0,.11,.09,1.5);
  }
  // One side has been torn open: bars splay outward, leaving a conspicuous gap.
  for(let i=0;i<3;i++){
    cageAdd(box,iron,.8+i*.2,1.35-i*.28,.4+i*.18,.08,1.25,.08,-.48-i*.13);
  }
  // Fallen rock wedged into the cage, emphasizing scale and structural damage.
  for(let i=0;i<5;i++){
    const a=i*2.4;
    cageAdd(fractured,ash,Math.cos(a)*.4,.3+(i%2)*.28,Math.sin(a)*.4,
      .45+(i%2)*.15,.35+(i%3)*.14,.38+(i%2)*.13,a*.16);
  }
  // Large fractured cave lip encloses the new wreckage into a single silhouette.
  for(let i=0;i<8;i++){
    const a=i*2.399963;
    const x=Math.cos(a)*4.1,z=-1.5+Math.sin(a)*2.4;
    const height=1.2+(i%3)*.75;
    add(fractured,ash,x,height*.35,z,.85+(i%2)*.5,height,.75+(i%3)*.18,a*.2,a*.13);
  }
  // Sixth pass: collapsed chain hoist, suspended dragon-era mining drill and fractured platform.
  // Place behind the gantry to preserve the previous silhouette while creating a new high focal point.
  const hoist=new THREE.Group();hoist.name='b4:collapsed-chain-hoist';
  hoist.position.set(-1.9,4.35,-2.55);hoist.rotation.z=-.18;root.add(hoist);
  const hoistAdd=(geo,mat,x,y,z,sx,sy,sz,rz=0,rx=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,0,rz);hoist.add(m);return m;
  };
  hoistAdd(cylinder,iron,0,0,0,.75,.3,.75,0,Math.PI/2);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    hoistAdd(box,iron,Math.cos(a)*.65,Math.sin(a)*.65,0,.28,.22,.3,a);
  }
  // Bent hanging chain, visible individual links rather than a single straight line.
  for(let i=0;i<13;i++){
    const y=-.28-i*.22,x=Math.sin(i*.38)*.18;
    hoistAdd(rim,iron,x,y,.12,.13,.24,.13,i%2?Math.PI/2:0,i%2?0:Math.PI/2);
  }
  // Large multi-stage broken drill bit with fins and an irregular snapped tip.
  const drill=new THREE.Group();drill.name='b4:snapped-drill';drill.position.set(-1.65,.75,-3.1);
  drill.rotation.set(.32,.2,-.65);root.add(drill);
  const drillAdd=(geo,mat,x,y,z,sx,sy,sz,rz=0,rx=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,0,rz);drill.add(m);
  };
  drillAdd(cylinder,iron,0,.85,0,.4,1.7,.4);
  for(let i=0;i<5;i++){
    const y=.2+i*.38;
    drillAdd(rim,iron,0,y,0,.55-(i*.03),.55-(i*.03),.55-(i*.03),i*.23,Math.PI/2);
  }
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    drillAdd(spike,iron,Math.cos(a)*.4,1.1,Math.sin(a)*.4,.35,.9,.35,a);
  }
  drillAdd(shard,iron,.08,-.15,0,.65,.8,.65,.28);
  // Partially collapsed platform with missing central boards and dangling diagonal support.
  for(let i=0;i<8;i++){
    if(i===3||i===4)continue;
    const x=1.35+i*.43;
    add(box,wood,x,2.25,-3.55,.37,.14,1.45,(i-4)*.065);
  }
  for(const x of [1.55,4.25]){
    add(box,wood,x,1.25,-3.7,.18,2.6,.18,(x-2.8)*.2);
    add(box,iron,x,2.75,-4.08,.12,.95,.12,(x-2.8)*.09);
  }
  add(box,wood,3.15,1.3,-3.9,.16,2.4,.18,.68);
  // Strongly silhouetted volcanic shards break through the platform's edge.
  for(let i=0;i<9;i++){
    const a=i*2.399963;
    const h=.65+(i%4)*.38;
    add(spike,ash,3.4+Math.cos(a)*1.4,.3+h*.42,-4.1+Math.sin(a)*.65,
      .45+(i%3)*.16,h,.45+(i%3)*.12,Math.sin(a)*.3);
  }
  // Seventh pass: sculpt a ruined stone furnace behind the abandoned equipment.
  // Broken arch opening is kept empty, giving the dense silhouette a readable negative space.
  const furnace=new THREE.Group();furnace.name='b4:ruined-smelting-furnace';
  furnace.position.set(0,0,-5.5);root.add(furnace);
  const furnaceAdd=(geo,mat,x,y,z,sx,sy,sz,rz=0,rx=0)=>{
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.set(rx,0,rz);furnace.add(m);return m;
  };
  // Uneven stone piers, intentionally avoiding a solid wall across the furnace mouth.
  for(const side of [-1,1]){
    for(let i=0;i<4;i++){
      const x=side*(1.2+(i%2)*.13),y=.55+i*.9;
      furnaceAdd(fractured,ash,x,y,0,.65,.65,.8,side*(i*.07));
    }
    furnaceAdd(fractured,ash,side*.95,4.15,0,.85,.6,.8,side*.43);
    furnaceAdd(spike,ash,side*1.6,4.95,-.15,.65,1.8,.65,side*.22);
  }
  furnaceAdd(fractured,ash,0,4.75,0,1.35,.6,.8,.12);
  // Cracked chimney rises above the mine gantry and loses its upper-right segment.
  for(let i=0;i<5;i++){
    if(i===4)continue;
    const x=.35-i*.08,y=5.45+i*.67;
    furnaceAdd(fractured,ash,x,y,-.3,.7-(i*.045),.5,.65,(i-2)*.11);
  }
  for(let i=0;i<6;i++){
    const a=i*2.399963;
    furnaceAdd(shard,ash,.2+Math.cos(a)*.65,8.2+(i%2)*.2,-.4+Math.sin(a)*.42,
      .25,.65+(i%3)*.3,.3,a*.16);
  }
  // Lava runoff trough and broken crucible: pure geometry, not a lighting effect.
  furnaceAdd(box,iron,0,.18,1.05,1.9,.18,.55,.09);
  for(const side of [-1,1])furnaceAdd(box,iron,side*.92,.38,1.05,.14,.45,.68,side*.18);
  furnaceAdd(cylinder,iron,-1.95,.55,1.2,.8,.9,.8,0,Math.PI/2);
  furnaceAdd(rim,iron,-1.95,1.05,1.2,.82,.82,.82,0,Math.PI/2);
  // Separate low-detail props from major structures for future FPS tuning.
  // Geometry remains authored once; low detail omits small loose fragments by visibility.
  if(detail==='low'){
    root.traverse(obj=>{
      if(obj.isMesh && obj.geometry===spike && obj.scale.y<.9)obj.visible=false;
    });
  }
  root.userData.detail=detail;
  root.userData.majorGroups=['b4:mine-rig-props','b4:buried-ore-cart','b4:ruined-smelting-furnace'];
  root.userData.disposeB4MineRig=()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
  return root;
}
