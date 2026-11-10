/* B3 Ancient Ruined City: reusable procedural architectural assets.
 * Visual-only library. No map, collision, event, enemy or save mutations.
 * Usage: import { createRuinedCityKit } from './b3-ruined-city-kit.js';
 * const kit = createRuinedCityKit(THREE); scene.add(kit.temple());
 * Dispose kit geometries/materials when the scene is destroyed.
 */
export function createRuinedCityKit(THREE) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x898779, roughness: 0.96, flatShading: true });
  const shadow = new THREE.MeshStandardMaterial({ color: 0x373b38, roughness: 1 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x445b43, roughness: 1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0x9b8053, metalness: 0.35, roughness: 0.72 });
  const geometries = [];
  const box = (w,h,d) => { const g = new THREE.BoxGeometry(w,h,d); geometries.push(g); return g; };
  const cylinder = (r1,r2,h,n=9) => { const g = new THREE.CylinderGeometry(r1,r2,h,n); geometries.push(g); return g; };
  const cube = box(1,1,1), shaft = cylinder(.31,.38,1), cap = cylinder(.49,.49,.15,10);
  const add = (group,geo,mat,x,y,z,sx=1,sy=1,sz=1,ry=0) => {
    const m = new THREE.Mesh(geo,mat); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.rotation.y=ry;
    m.castShadow=true; m.receiveShadow=true; group.add(m); return m;
  };
  const group = name => { const g=new THREE.Group(); g.name='b3_'+name; return g; };
  function column(height=3,broken=false) {
    const g=group('column'), h=broken?height*.63:height;
    add(g,cube,stone,0,.16,0,.98,.32,.98);
    add(g,shaft,stone,0,.32+h/2,0,1,h,1);
    if(!broken) add(g,cap,stone,0,.32+h+.08,0);
    else {
      // Irregular tilted stump and displaced chunks instead of a flat cut.
      const jagged=cylinder(.26,.37,.22,5);
      const tip=add(g,jagged,stone,.06,.32+h,0,1,1,1);
      tip.rotation.z=.31;
      const chip=add(g,cube,stone,.36,.18,-.18,.42,.29,.37);
      chip.rotation.set(.16,.42,.55);
      const chip2=add(g,cube,stone,-.26,.13,.24,.24,.19,.35);
      chip2.rotation.z=-.45;
    }
    return g;
  }
  function arch(width=3.4,height=3.6) {
    const g=group('arch');
    const spring=height*.56, rise=height-spring, radius=width*.5;
    // Voussoirs follow a semicircular arc; the opening stays clear.
    for(const side of [-1,1]) {
      add(g,cube,stone,side*radius,spring*.5,0,.52,spring,.76);
      add(g,cube,stone,side*radius,.18,0,.86,.36,.94);
    }
    const n=11;
    for(let i=0;i<n;i++) {
      const a=Math.PI*i/(n-1);
      const x=Math.cos(a)*radius, y=spring+Math.sin(a)*rise;
      const m=add(g,cube,i===5?gold:stone,x,y,0,.42,.49,.78);
      m.rotation.z=a-Math.PI/2;
    }
    for(const side of [-1,1]) add(g,cube,stone,side*(radius+.31),height-.1,0,.64,.22,.88);
    return g;
  }
  function facade(width=5,height=3.8) {
    const g=group('facade');
    add(g,cube,stone,0,height/2,0,width,height,.62);
    for(let i=0;i<Math.floor(width);i++){
      const x=-width/2+i+.5;
      add(g,cube,shadow,x,1.9,.34,.55,1.1,.035);
      add(g,cube,stone,x,2.53,.38,.75,.17,.23);
      add(g,cube,stone,x,1.27,.38,.75,.15,.22);
      add(g,cube,stone,x-.36,1.9,.38,.12,1.2,.22);
      add(g,cube,stone,x+.36,1.9,.38,.12,1.2,.22);
    }
    add(g,cube,stone,0,height-.18,.36,width+.3,.24,.32);
    return g;
  }
  function temple() {
    const g=group('temple');
    // Three-level podium, fractured stairs, and an intentionally absent roof quadrant.
    add(g,cube,stone,0,.22,0,7.6,.44,5.6);
    add(g,cube,stone,0,.51,-.35,6.8,.16,4.5);
    for(let step=0;step<4;step++) {
      const m=add(g,cube,stone,0,.12+step*.16,2.95-step*.45,5.6-step*.38,.24+step*.12,.55);
      if(step===0) m.rotation.y=.06;
    }
    // Asymmetric surviving columns; conspicuous missing supports reveal destruction.
    for(const z of [-1.95,1.7]) for(const x of [-2.65,-.88,.88,2.65]) {
      if(x===.88&&z===1.7) continue;
      const broken=(x===2.65&&z===1.7)||(x===-2.65&&z===-1.95);
      const c=column(3.05,broken);c.position.set(x,.64,z);g.add(c);
      if(broken) {
        const fallen=column(1.6,true);
        fallen.rotation.z=Math.PI*.46;
        fallen.position.set(x+(x>0?.45:-.45),.65,z+.35);g.add(fallen);
      }
    }
    // Huge readable roof gap: left and back slabs survive, front-right quadrant gone.
    add(g,cube,stone,-1.83,3.78,0,3.7,.5,5.0);
    add(g,cube,stone,1.72,3.78,-1.32,3.25,.5,2.4);
    add(g,cube,stone,-1.65,4.16,0,4.1,.22,5.25);
    add(g,cube,stone,1.67,4.16,-1.4,3.45,.22,2.65);
    // Oversized detached roof blocks: destruction remains legible from a distance.
    const slab=add(g,cube,stone,2.6,.58,2.45,2.1,.46,1.15);
    slab.rotation.z=.27;slab.rotation.y=-.22;
    const fallenStone=add(g,cube,stone,1.1,.32,3.0,1.4,.44,.9);
    fallenStone.rotation.z=-.34;
    return g;
  }
  function tower() {
    const g=group('tower');
    // Stepped octagonal masonry core, distinct floors and open parapet.
    const coreGeo=cylinder(1.34,1.55,1,8);
    const corniceGeo=cylinder(1.55,1.55,.16,8);
    for(let level=0;level<4;level++) {
      const radius=1.48-level*.08;
      add(g,coreGeo,stone,0,.55+level*1.08,0,radius/1.55,1.04,radius/1.55,Math.PI/8);
      add(g,corniceGeo,stone,0,1.08+level*1.08,0,(radius+.13)/1.55,1,(radius+.13)/1.55,Math.PI/8);
      for(let side=0;side<8;side++) {
        const a=(side+.5)*Math.PI/4, rr=radius*.89;
        const recess=add(g,cube,shadow,Math.sin(a)*rr,.56+level*1.08,Math.cos(a)*rr,.32,.56,.06,a);
        recess.rotation.y=a;
        add(g,cube,stone,Math.sin(a)*rr,.91+level*1.08,Math.cos(a)*rr,.44,.12,.14,a);
      }
    }
    // Jagged, interrupted crenellations produce a broken skyline.
    for(let side=0;side<8;side++) {
      if(side===2||side===5) continue;
      const a=side*Math.PI/4;
      add(g,cube,stone,Math.sin(a)*1.25,4.7,Math.cos(a)*1.25,.55,.6,.4,a);
    }
    add(g,cube,shadow,0,4.4,0,1.45,.08,1.45);
    return g;
  }
  function rubble(seed=1) {
    const g=group('rubble');
    let n=seed>>>0;
    const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<14;i++) {
      const x=(rnd()-.5)*3.5,z=(rnd()-.5)*2.4,s=.22+rnd()*.55;
      const m=add(g,cube,i%5===0?moss:stone,x,s*.35,z,s,s*.7,s*.8);
      m.rotation.y=rnd()*Math.PI; m.rotation.z=(rnd()-.5)*.24;
    }
    return g;
  }
  function statue() {
    const g=group('statue');
    add(g,cube,stone,0,.25,0,1.3,.5,1.2);
    add(g,cube,stone,0,.95,0,.8,1.05,.55);
    add(g,cube,stone,0,1.73,0,.56,.52,.48);
    for(const s of [-1,1]) add(g,cube,stone,s*.58,1.05,0,.28,1.05,.35);
    add(g,cube,gold,0,.9,.29,.27,.35,.045);
    return g;
  }
  function vines() {
    const g=group('vines');
    for(let i=0;i<8;i++) {
      const x=(i%4)*.28-.42,y=1.5-Math.floor(i/4)*.6;
      const m=add(g,cube,moss,x,y,0,.08,.7,.10);m.rotation.z=(i%2?1:-1)*.28;
    }
    return g;
  }
  // Compact wall-side ruin details. These are decorative, not interactive stairs.
  function stairFragment() {
    const g=group('stair_fragment');
    for(let i=0;i<4;i++) {
      const w=2.3-i*.22, d=.65;
      add(g,cube,stone,0,.12+i*.18,-.9+i*.52,w,.24+i*.12,d);
    }
    add(g,cube,moss,-.73,.42,.08,.25,.06,.34);
    return g;
  }
  function stele() {
    const g=group('stele');
    add(g,cube,stone,0,.18,0,1.35,.36,.78);
    add(g,cube,stone,0,1.15,0,.93,1.68,.32);
    add(g,cube,shadow,0,1.2,.174,.62,.86,.025);
    for(let i=0;i<3;i++) add(g,cube,gold,0,1.5-i*.28,.195,.38,.045,.026);
    add(g,cube,stone,0,2.03,0,1.12,.16,.48);
    return g;
  }
  function altar() {
    const g=group('altar');
    add(g,cube,stone,0,.15,0,2.8,.3,1.7);
    add(g,cube,stone,0,.48,0,2.15,.36,1.35);
    add(g,cube,stone,0,.81,0,1.65,.3,1.0);
    add(g,cube,gold,0,.98,0,.85,.05,.62);
    for(const x of [-1.15,1.15]) add(g,cube,stone,x,.7,-.5,.2,.8,.2);
    return g;
  }
  function collapsedWall(seed=1) {
    const g=group('collapsed_wall');
    let n=seed>>>0;
    const rnd=()=>{n=(Math.imul(n,1103515245)+12345)>>>0;return n/4294967296;};
    for(let row=0;row<4;row++) for(let col=0;col<5;col++) {
      if(row>1 && rnd()<.43) continue;
      const x=(col-2)*.58+(row%2)*.16;
      const m=add(g,cube,row===3?moss:stone,x,.22+row*.43,0,.56,.41,.42);
      m.rotation.z=(rnd()-.5)*.13;
    }
    return g;
  }
  // Angular, asymmetric rock mesh: actual silhouette deformation, not a cube texture.
  function jaggedRock(seed=1, radius=1) {
    let n=seed>>>0;
    const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    const g=new THREE.IcosahedronGeometry(radius,1);
    const p=g.getAttribute('position');
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      const a=.62+rnd()*.85;
      p.setXYZ(i,x*a*(.8+rnd()*.5),y*a*(.65+rnd()*.8),z*a*(.75+rnd()*.6));
    }
    g.toNonIndexed?.();
    g.computeVertexNormals();geometries.push(g);
    return g;
  }
  function boulderCluster(seed=1) {
    const g=group('boulder_cluster');
    let n=seed>>>0;
    const rnd=()=>{n=(Math.imul(n,1103515245)+12345)>>>0;return n/4294967296;};
    for(let i=0;i<9;i++) {
      const size=i===0?1.75:i<3?1.05:.25+rnd()*.55;
      const rock=jaggedRock(seed*31+i,size);
      const x=i===0?0:(rnd()-.5)*3.6,z=i===0?0:(rnd()-.5)*2.6;
      const m=add(g,rock,stone,x,size*.38,z);
      m.rotation.set(rnd()*.5,rnd()*6.28,rnd()*.55);
    }
    return g;
  }
  function crystalCluster(seed=1) {
    const g=group('crystal_cluster');
    let n=seed>>>0;
    const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<12;i++) {
      const height=i===0?3.6:i<4?1.7+rnd()*1.1:.35+rnd()*1.1;
      const radius=height*(i===0?.24:.17+rnd()*.07);
      const geo=cylinder(0,radius,height,5);
      const x=i===0?0:(rnd()-.5)*2.8,z=i===0?0:(rnd()-.5)*2.8;
      const m=add(g,geo,i%4===0?gold:stone,x,height*.46,z);
      m.rotation.z=(rnd()-.5)*.65;m.rotation.x=(rnd()-.5)*.65;
    }
    return g;
  }
  function dispose() {
    geometries.forEach(g=>g.dispose());
    [stone,shadow,moss,gold].forEach(m=>m.dispose());
  }
  return { column, arch, facade, temple, tower, rubble, statue, vines, stairFragment, stele, altar, collapsedWall, boulderCluster, crystalCluster, dispose };
}
