/* B5 Demon King's hall: geometry-first Gothic sanctuary prop kit.
 * Visual-only, no collision or game-state mutations.
 * createB5HallProp(THREE, kind, { seed, scale }) -> { group, dispose }.
 * Only place inside the Demon King's hall; NOT the abyss labyrinth.
 */
export const B5_HALL_PROP_KINDS = Object.freeze([
  'grandChandelier','tornBanners','fracturedAltar','ruinedPillars',
  'candleProcession','fallenRoseWindow','brokenPews','throneCanopy'
]);
export function createB5HallProp(THREE, kind, options = {}) {
  if (!B5_HALL_PROP_KINDS.includes(kind)) throw new Error('Unknown B5 hall prop: '+kind);
  const group = new THREE.Group();
  group.name = 'b5:demon-hall:'+kind;
  group.userData.visualOnly = true;
  const geometries=[], materials=[];
  const geo=g=>(geometries.push(g),g);
  const mat=m=>(materials.push(m),m);
  const stone=mat(new THREE.MeshStandardMaterial({color:0x393b45,roughness:0.95,flatShading:true}));
  const iron=mat(new THREE.MeshStandardMaterial({color:0x474249,metalness:0.65,roughness:0.55}));
  const fabric=mat(new THREE.MeshStandardMaterial({color:0x4d283b,roughness:0.9,side:THREE.DoubleSide}));
  const fire=mat(new THREE.MeshBasicMaterial({color:0xeab36d}));
  const glass=mat(new THREE.MeshStandardMaterial({color:0x537c82,emissive:0x17414a,emissiveIntensity:0.4,side:THREE.DoubleSide}));
  const box=geo(new THREE.BoxGeometry(1,1,1));
  const column=geo(new THREE.CylinderGeometry(0.6,0.75,1,9));
  const rod=geo(new THREE.CylinderGeometry(0.07,0.08,1,6));
  const rubble=geo(new THREE.IcosahedronGeometry(1,0));
  const flame=geo(new THREE.ConeGeometry(0.12,0.36,5));
  const hoop=geo(new THREE.TorusGeometry(1,0.06,6,32));
  const shard=geo(new THREE.ConeGeometry(0.6,1.4,5));
  let state=(options.seed??1105)>>>0;
  const rand=()=>((state=(Math.imul(1664525,state)+1013904223)>>>0)/4294967296);
  const add=(parent,shape,material,x,y,z,sx=1,sy=1,sz=1)=>{
    const m=new THREE.Mesh(shape,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;
  };
  const block=(parent,x,y,z,sx,sy,sz,material=stone)=>add(parent,box,material,x,y,z,sx,sy,sz);
  const fragments=(parent,count,spread)=>{
    for(let i=0;i<count;i++){
      const m=add(parent,rubble,stone,(rand()-0.5)*spread,rand()*0.55,(rand()-0.5)*spread,
        0.2+rand()*0.6,0.12+rand()*0.4,0.2+rand()*0.7);
      m.rotation.set(rand()*2,rand()*3,rand()*2);
    }
  };
  if(kind==='grandChandelier'){
    // Three concentric tiers, 24 hanging spikes and 16 suspended candle flames.
    for(const [radius,y,scale] of [[3.4,0,3.4],[2.5,-1.2,2.5],[1.5,-2.3,1.5]]){
      const ring=add(group,hoop,iron,0,y,0,scale,scale,scale);ring.rotation.x=Math.PI/2;
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,x=Math.cos(a)*radius,z=Math.sin(a)*radius;
        add(group,rod,iron,x,y+1.4,z,0.9,2.8,0.9);
        add(group,shard,iron,x,y-0.65,z,0.35,0.9,0.35).rotation.z=Math.PI;
      }
    }
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8,x=Math.cos(a)*3.4,z=Math.sin(a)*3.4;
      add(group,rod,iron,x,0.25,z,1.1,0.7,1.1);
      add(group,flame,fire,x,0.82,z);
    }
    for(let i=0;i<4;i++)add(group,rod,iron,0,2+i*1.4,0,1,1.5,1);
  }
  if(kind==='tornBanners'){
    for(let b=0;b<5;b++){
      const x=(b-2)*2.1, len=5+rand()*4;
      add(group,rod,iron,x,9.3,0,1.4,1.6,1.4).rotation.z=Math.PI/2;
      const points=[-0.65,0,0, 0.65,0,0, 0.55,-len*0.7,0.15, 0.15,-len,0.2, -0.15,-len*0.72,0.1, -0.65,-len*0.9,0];
      const g=geo(new THREE.BufferGeometry());
      g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
      g.setIndex([0,1,2,0,2,5,5,2,3,5,3,4]);g.computeVertexNormals();
      add(group,g,fabric,x,9,0);
    }
  }
  if(kind==='fracturedAltar'){
    block(group,0,0.45,0,8,0.9,4.2);
    block(group,-1.4,1.3,-0.5,4.1,1,3.1).rotation.z=-0.11;
    block(group,2.3,0.85,0.5,2.6,0.75,2.9).rotation.z=0.28;
    block(group,0,2.3,-1.4,1.4,3.1,0.75).rotation.z=-0.18;
    fragments(group,24,11);
  }
  if(kind==='ruinedPillars'){
    for(let i=0;i<6;i++){
      const x=(i%3-1)*5.5,z=(Math.floor(i/3)-0.5)*7;
      const h=4.5+rand()*7;
      block(group,x,0.4,z,2.5,0.8,2.5);
      add(group,column,stone,x,h/2+0.7,z,1.4,h,1.4).rotation.z=(rand()-0.5)*0.15;
      block(group,x,h+0.7,z,2.5,0.6,2.5).rotation.z=(rand()-0.5)*0.24;
      if(i%2===0)block(group,x+2.1,0.5,z+1.5,3.3,1.4,1.4).rotation.z=0.4;
    }
    fragments(group,26,18);
  }
  if(kind==='candleProcession'){
    for(let i=0;i<38;i++){
      const a=rand()*Math.PI*2,r=Math.sqrt(rand())*6;
      const x=Math.cos(a)*r,z=Math.sin(a)*r,h=0.25+rand()*0.85;
      add(group,rod,stone,x,h/2,z,1.4,h,1.4);
      add(group,flame,fire,x,h+0.17,z,0.8,0.9,0.8);
    }
  }
  if(kind==='fallenRoseWindow'){
    const ring=add(group,hoop,stone,0,3,0,5,5,5);ring.rotation.z=0.35;
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const bar=add(group,rod,iron,Math.cos(a)*2.4,3+Math.sin(a)*2.4,0,1,4.8,1);
      bar.rotation.z=a-Math.PI/2;
    }
    for(let i=0;i<14;i++){
      const a=rand()*Math.PI*2,r=rand()*3.8;
      const m=add(group,shard,glass,Math.cos(a)*r,3+Math.sin(a)*r,0,0.45,0.8,0.2);
      m.rotation.z=a;
    }
    fragments(group,14,9);
  }
  if(kind==='brokenPews'){
    for(let i=0;i<8;i++){
      const x=(i%4-1.5)*2.7,z=(Math.floor(i/4)-0.5)*4.2;
      block(group,x,0.85,z,2.3,0.24,0.8,darkMaterial());
      block(group,x,1.45,z-0.35,2.3,1.3,0.22,darkMaterial()).rotation.z=(rand()-0.5)*0.24;
      if(i%3===0)block(group,x+0.6,0.2,z+0.7,1.5,0.2,0.4,iron).rotation.y=0.6;
    }
    fragments(group,12,12);
  }
  if(kind==='throneCanopy'){
    block(group,0,0.7,0,5.6,1.4,4.5);
    for(const x of [-2.2,2.2])for(const z of [-1.6,1.6]){
      add(group,column,stone,x,5.2,z,0.7,9,0.7);
      add(group,shard,iron,x,10.3,z,1.2,2,1.2);
    }
    block(group,0,9.7,0,6.6,0.6,5.5);
    block(group,0,3,-1.7,3.2,4.8,0.5);
    block(group,0,1.3,-0.8,2.5,0.4,2.1,iron);
    for(let i=0;i<3;i++)block(group,0,0.2-i*0.2,2.6+i*0.7,5.5+i*0.5,0.4,0.8);
  }
  function darkMaterial(){return iron;}
  const scale=Number.isFinite(options.scale)?Math.max(0.1,Math.min(5,options.scale)):1;
  group.scale.setScalar(scale);
  let disposed=false;
  return {group,dispose(){
    if(disposed)return;disposed=true;
    if(group.parent)group.parent.remove(group);
    group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
  }};
}
