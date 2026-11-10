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
      const chip=add(g,cube,shadow,.06,.32+h,0,.54,.10,.48);
      chip.rotation.z=.18;
    }
    return g;
  }
  function arch(width=3.4,height=3.6) {
    const g=group('arch');
    for(const s of [-1,1]) {
      add(g,cube,stone,s*width*.5,height*.44,0,.68,height*.88,.76);
      add(g,cube,stone,s*width*.5,.18,0,.95,.36,.95);
    }
    add(g,cube,stone,0,height-.22,0,width+.9,.44,.86);
    for(let i=0;i<5;i++) add(g,cube,gold,(i-2)*width/5,height-.5,.46,width/5-.07,.10,.05);
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
    add(g,cube,stone,0,.25,0,7,.5,5);
    add(g,cube,stone,0,.55,-.45,6.5,.18,3.8);
    for(const z of [-1.8,1.8]) for(const x of [-2.5,-.85,.85,2.5]) {
      const c=column(3.0, x===2.5&&z===1.8); c.position.set(x,.65,z); g.add(c);
    }
    add(g,cube,stone,0,3.8,0,7.2,.48,4.8);
    add(g,cube,stone,0,4.25,0,7.8,.35,5.2);
    add(g,cube,gold,0,4.28,2.63,2.3,.12,.08);
    return g;
  }
  function tower() {
    const g=group('tower');
    for(let y=0;y<5;y++) {
      const w=y>3?2.4:2.8;
      add(g,cube,stone,0,y+.5,0,w,.96,w);
      add(g,cube,shadow,0,y+.5, w/2+.014,.24,.38,.025);
      if(y<4) add(g,cube,stone,0,y+.96,0,w+.2,.10,w+.2);
    }
    for(const x of [-1.05,1.05]) add(g,cube,stone,x,5.3,0,.6,.6,2.8);
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
  function dispose() {
    geometries.forEach(g=>g.dispose());
    [stone,shadow,moss,gold].forEach(m=>m.dispose());
  }
  return { column, arch, facade, temple, tower, rubble, statue, vines, dispose };
}
