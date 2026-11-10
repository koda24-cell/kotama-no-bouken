/* B4 abandoned mine supplementary props: pulley gantry, hanging bucket, collapsed timber, dead roots.
 * Standalone scenery module; integration is left to the B4 scene owner to avoid concurrent edits.
 */
import * as THREE from 'three';
export function createB4MineRigProps() {
  const root=new THREE.Group();root.name='b4:mine-rig-props';
  const wood=new THREE.MeshStandardMaterial({color:0x493329,roughness:1,flatShading:true});
  const iron=new THREE.MeshStandardMaterial({color:0x4a4547,roughness:0.78,metalness:0.25});
  const ash=new THREE.MeshStandardMaterial({color:0x302824,roughness:1,flatShading:true});
  const rope=new THREE.MeshStandardMaterial({color:0x79604b,roughness:1});
  const box=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(.5,.5,1,8);
  const branch=new THREE.CylinderGeometry(.05,.16,1,5);
  const rim=new THREE.TorusGeometry(.5,.1,6,12);
  const shard=new THREE.ConeGeometry(.48,1.4,5),rock=new THREE.DodecahedronGeometry(1,0);
  const geometries=[box,cylinder,branch,rim,shard,rock],materials=[wood,iron,ash,rope];
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
  root.userData.disposeB4MineRig=()=>{geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());};
  return root;
}
