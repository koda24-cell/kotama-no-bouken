/* B5 war-ruins shape library. Geometry-first, no collision or gameplay changes.
 * Create one or more assets with createB5WarProp(THREE, kind, opts).
 * Each return owns its geometries/materials and has dispose().
 * Shapes: swordField, spearBarricade, brokenWarMachine, shatteredObelisk,
 *         brokenBridge, debrisHeap, battleStandard, barrelCache.
 */
export const B5_WAR_PROP_KINDS = Object.freeze([
  'swordField','spearBarricade','brokenWarMachine','shatteredObelisk',
  'brokenBridge','debrisHeap','battleStandard','barrelCache'
]);
export function createB5WarProp(THREE, kind, options = {}) {
  if (!B5_WAR_PROP_KINDS.includes(kind)) throw new Error('Unknown B5 prop: ' + kind);
  const group = new THREE.Group();
  group.name = 'b5:war-prop:' + kind;
  group.userData.visualOnly = true;
  const geometries = [], materials = [];
  const geo = g => (geometries.push(g), g);
  const mat = m => (materials.push(m), m);
  const iron = mat(new THREE.MeshStandardMaterial({color:0x434c5c,metalness:0.55,roughness:0.7,flatShading:true}));
  const dark = mat(new THREE.MeshStandardMaterial({color:0x292d39,roughness:0.93,flatShading:true}));
  const stone = mat(new THREE.MeshStandardMaterial({color:0x4c4854,roughness:0.95,flatShading:true}));
  const cloth = mat(new THREE.MeshStandardMaterial({color:0x40344c,roughness:0.9,side:THREE.DoubleSide}));
  const ember = mat(new THREE.MeshStandardMaterial({color:0x797eaa,emissive:0x292a6c,emissiveIntensity:0.4}));
  let state = (options.seed ?? 555) >>> 0;
  const rand = () => ((state = (Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
  const add = (parent, shape, material, x,y,z, sx=1,sy=1,sz=1) => {
    const mesh = new THREE.Mesh(shape,material);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); parent.add(mesh); return mesh;
  };
  const box = geo(new THREE.BoxGeometry(1,1,1));
  const rod = geo(new THREE.CylinderGeometry(0.09,0.12,1,6));
  const spike = geo(new THREE.ConeGeometry(0.18,1,5));
  const rubble = geo(new THREE.IcosahedronGeometry(1,0));
  const barrel = geo(new THREE.CylinderGeometry(0.48,0.54,1.05,9));
  const blade = geo(new THREE.ConeGeometry(0.16,1.7,4));
  const ring = geo(new THREE.TorusGeometry(0.65,0.12,6,12));
  function sword(parent,x,z,height=1) {
    const bladeMesh=add(parent,blade,iron,x,0.9*height,z,1,height,0.8);
    bladeMesh.rotation.z=(rand()-0.5)*0.5;
    add(parent,box,dark,x,0.22*height,z,0.52,0.1,0.12);
    add(parent,rod,dark,x,-0.03*height,z,1,0.42*height,1);
  }
  function spear(parent,x,z,height=1) {
    const shaft=add(parent,rod,dark,x,1.05*height,z,0.75,2.1*height,0.75);
    shaft.rotation.z=(rand()-0.5)*0.5;
    const head=add(parent,spike,iron,x,2.24*height,z,1,0.65*height,1);
    head.rotation.z=shaft.rotation.z;
  }
  function chunk(parent,x,y,z,s=1) {
    const mesh=add(parent,rubble,stone,x,y,z,s*(0.7+rand()),s*(0.4+rand()),s*(0.8+rand()));
    mesh.rotation.set(rand()*2,rand()*3,rand()*2); return mesh;
  }
  if(kind==='swordField') {
    for(let i=0;i<21;i++) {
      const a=rand()*Math.PI*2, r=Math.sqrt(rand())*4.6;
      sword(group,Math.cos(a)*r,Math.sin(a)*r,0.55+rand()*1.45);
    }
    for(let i=0;i<11;i++) chunk(group,(rand()-0.5)*8,-0.25,(rand()-0.5)*8,0.25+rand()*0.6);
  }
  if(kind==='spearBarricade') {
    for(let i=0;i<17;i++) spear(group,(i-8)*0.44+(rand()-0.5)*0.4,(rand()-0.5)*1.4,0.65+rand()*0.7);
    for(let i=0;i<6;i++) chunk(group,(i-3)*1.2,-0.2,rand()*1.8,0.6+rand()*0.5);
  }
  if(kind==='brokenWarMachine') {
    add(group,box,dark,0,0.55,0,5.8,1.15,2.9);
    add(group,box,iron,-1.5,1.35,0,2.4,1.2,2.4).rotation.z=-0.24;
    add(group,box,iron,1.5,1.15,0,1.7,0.75,2.2).rotation.z=0.32;
    for(const side of [-1,1]) {
      const wheel=add(group,ring,iron,-1.6,0.65,side*1.55,1.25,1.25,1.25);
      wheel.rotation.y=Math.PI/2;
    }
    for(let i=0;i<9;i++) chunk(group,(rand()-0.5)*9,rand()*0.7,(rand()-0.5)*5,0.4+rand()*0.7);
    add(group,box,iron,2.8,1.65,0,3.8,0.35,0.55).rotation.z=0.34;
  }
  if(kind==='shatteredObelisk') {
    add(group,box,stone,0,0.4,0,3.3,0.8,3.3);
    const body=add(group,box,stone,-0.3,3.4,0,1.8,5.6,1.8);body.rotation.z=-0.14;
    const top=add(group,box,stone,2.1,1.0,0.5,1.75,3.3,1.7);top.rotation.z=1.12;
    add(group,spike,ember,-0.72,6.5,0,3.2,2.8,3.2).rotation.z=-0.18;
    for(let i=0;i<14;i++)chunk(group,(rand()-0.5)*7,rand()*0.6,(rand()-0.5)*6,0.35+rand()*0.8);
  }
  if(kind==='brokenBridge') {
    for(let i=0;i<5;i++){
      const x=(i-2)*2.1;
      const slab=add(group,box,stone,x,(i===4?-1.6:0)+(rand()-0.5)*0.3,0,2,0.55,3.4);
      slab.rotation.z=(i===4?0.6:(rand()-0.5)*0.12);
      if(i!==2) {
        const parapet=add(group,box,stone,x,0.75,1.55,1.85,1.5,0.3);
        parapet.rotation.z=(rand()-0.5)*0.18;
      }
    }
    for(let i=0;i<12;i++)chunk(group,(rand()-0.5)*11,-1.3-rand()*2,(rand()-0.5)*5,0.3+rand()*0.65);
  }
  if(kind==='debrisHeap') {
    for(let i=0;i<45;i++){
      const a=rand()*Math.PI*2,r=Math.sqrt(rand())*4;
      chunk(group,Math.cos(a)*r,0.1+(1-r/4)*2.6*rand(),Math.sin(a)*r,0.2+rand()*1.25);
    }
    for(let i=0;i<7;i++) {
      const beam=add(group,box,iron,(rand()-0.5)*5,0.4+rand()*2,(rand()-0.5)*5,0.25,0.3,2+rand()*3);
      beam.rotation.set(rand(),rand()*3,rand());
    }
  }
  if(kind==='battleStandard') {
    add(group,rod,iron,0,4,0,2.5,8,2.5);
    add(group,spike,iron,0,8.4,0,1.7,1.5,1.7);
    const flagGeo=geo(new THREE.BufferGeometry());
    const positions=new Float32Array([0,7.4,0,3.1,7.1,0.2,2.5,5.2,0.5,0,4.8,0]);
    flagGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    flagGeo.setIndex([0,1,2,0,2,3]);flagGeo.computeVertexNormals();
    add(group,flagGeo,cloth,0,0,0);
    for(let i=0;i<5;i++)chunk(group,(rand()-0.5)*2,-0.15,(rand()-0.5)*2,0.25+rand()*0.4);
  }
  if(kind==='barrelCache') {
    for(let i=0;i<13;i++) {
      const a=rand()*Math.PI*2,r=Math.sqrt(rand())*2.5;
      const b=add(group,barrel,dark,Math.cos(a)*r,0.55,Math.sin(a)*r);
      b.rotation.z=rand()>0.7?Math.PI/2:0;
      add(group,ring,iron,b.position.x,0.65,b.position.z,0.58,0.58,0.58).rotation.x=Math.PI/2;
    }
    for(let i=0;i<6;i++)chunk(group,(rand()-0.5)*6,0,(rand()-0.5)*6,0.2+rand()*0.4);
  }
  const scale=Number.isFinite(options.scale)?Math.max(0.1,Math.min(5,options.scale)):1;
  group.scale.setScalar(scale);
  let disposed=false;
  return {group,dispose(){
    if(disposed)return;disposed=true;
    if(group.parent)group.parent.remove(group);
    group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }};
}
