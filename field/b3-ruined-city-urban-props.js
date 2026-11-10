/* B3 ruined city urban props: shape-first, deterministic, visual-only.
 * Claude owns final material/texture work. No collision or game state mutations.
 * Usage: const kit=createB3UrbanProps(THREE); root.add(kit.utilityPole(1));
 */
export function createB3UrbanProps(THREE) {
  const concrete=new THREE.MeshStandardMaterial({color:0x77766f,roughness:1,flatShading:true});
  const metal=new THREE.MeshStandardMaterial({color:0x555a5b,metalness:.25,roughness:.85});
  const dark=new THREE.MeshStandardMaterial({color:0x343b3b,roughness:1});
  const growth=new THREE.MeshStandardMaterial({color:0x486144,roughness:1});
  const geos=[];
  const cube=new THREE.BoxGeometry(1,1,1), cylinder=new THREE.CylinderGeometry(.5,.5,1,8);
  geos.push(cube,cylinder);
  const group=n=>{const g=new THREE.Group();g.name='b3_prop_'+n;return g;};
  function add(g,geo,mat,x,y,z,sx=1,sy=1,sz=1) {
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);
    m.castShadow=true;m.receiveShadow=true;g.add(m);return m;
  }
  function beam(g,a,b,width=.12,mat=metal) {
    const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);
    const m=add(g,cylinder,mat,...p.clone().add(q).multiplyScalar(.5).toArray(),width,v.length(),width);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;
  }
  function utilityPole(variant=0) {
    const g=group('utility_pole_'+variant), v=((variant%3)+3)%3;
    const h=v===2?3.8:5.2;
    const pole=add(g,cylinder,v===0?concrete:metal,0,h/2,0,.22,h,.22);
    if(v===1) pole.rotation.z=.18;
    if(v===2) {pole.rotation.z=.24;beam(g,[-.5,3.6,0],[.8,2.8,.2],.13);}
    for(const y of v===2?[3.15]:[3.8,4.55]) {
      beam(g,[-1,y,0],[1,y,0],.11);
      for(const x of [-.82,.82]) {
        add(g,cylinder,dark,x,y+.16,0,.13,.32,.13);
        beam(g,[x,y+.25,0],[x+.22,y+.5,.18],.035,dark);
      }
    }
    // Severed cable loops, deliberately thick enough to be visible.
    for(let i=0;i<3;i++) {
      const x=-.8+i*.8;
      beam(g,[x,4.4,0],[x+.35,3.95,.35],.035,dark);
      beam(g,[x+.35,3.95,.35],[x+.7,3.65,.42],.035,dark);
    }
    return g;
  }
  function radioTower(variant=0) {
    const g=group('radio_tower_'+variant),v=((variant%3)+3)%3;
    const levels=v===1?3:5, height=levels*1.3;
    for(let side=0;side<4;side++) {
      const angle=side*Math.PI/2;
      const x=Math.cos(angle),z=Math.sin(angle);
      const top=v===1&&side===1?levels-1:levels;
      for(let j=0;j<top;j++) {
        const a=1.15-j*.14,b=1.15-(j+1)*.14;
        beam(g,[x*a,j*1.3,z*a],[x*b,(j+1)*1.3,z*b],.12);
      }
    }
    for(let j=0;j<levels;j++) {
      const a=1.15-j*.14,b=1.15-(j+1)*.14,y=j*1.3;
      for(let side=0;side<4;side++) {
        const t=side*Math.PI/2,u=(side+1)*Math.PI/2;
        beam(g,[Math.cos(t)*a,y,Math.sin(t)*a],[Math.cos(u)*b,y+1.3,Math.sin(u)*b],.065);
        beam(g,[Math.cos(u)*a,y,Math.sin(u)*a],[Math.cos(t)*b,y+1.3,Math.sin(t)*b],.065);
      }
    }
    if(v!==1) {
      beam(g,[0,height,0],[0,height+1.4,0],.08);
      for(const y of [height+.5,height+1.1])beam(g,[-.5,y,0],[.5,y,0],.045);
    } else {
      beam(g,[0,height-.3,0],[1.6,height-1.7,.4],.11);
    }
    if(v===2) {
      add(g,cube,dark,0,2.4,0,1.5,.16,1.5);
      add(g,cube,dark,0,4.2,0,1.1,.16,1.1);
    }
    return g;
  }
  function steelWreck(variant=0) {
    const g=group('steel_wreck_'+variant);
    const v=((variant%3)+3)%3;
    for(let i=0;i<5;i++) {
      const x=(i-2)*.48;
      const m=beam(g,[x,.16,(i%2)*.5],[x+(i%2?.9:-.6),1.7+i*.23,-.4],.10+i*.015);
      if(i%2===0)beam(g,[x,.3,.3],[x+.75,.9,-.5],.07);
    }
    if(v===1)beam(g,[-1.3,2.7,0],[1.2,2.1,.2],.17);
    if(v===2)for(let i=0;i<3;i++)beam(g,[-1.1,i*.45+.4,-.5],[1.1,i*.45+.4,.5],.07);
    return g;
  }
  function brokenSign(variant=0) {
    const g=group('broken_sign_'+variant);
    beam(g,[0,0,0],[0,2.4,0],.12);
    const board=add(g,cube,metal,0,2.25,0,variant%2?1.7:1.1,.68,.13);
    board.rotation.z=variant%2?.23:-.15;
    if(variant%3===2) {
      add(g,cube,dark,.45,1.94,.08,.38,.22,.12);
      beam(g,[.55,1.85,0],[.9,1.5,.1],.06);
    }
    return g;
  }
  function rootedPavement(seed=1) {
    const g=group('rooted_pavement');
    let n=seed>>>0;const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<9;i++) {
      const x=(i%3-1)*.9,z=(Math.floor(i/3)-1)*.9;
      const slab=add(g,cube,concrete,x,.06+rnd()*.16,z,.83,.15,.83);
      slab.rotation.y=(rnd()-.5)*.16;slab.rotation.z=(rnd()-.5)*.13;
    }
    for(let i=0;i<7;i++) {
      const x=(rnd()-.5)*2.4,z=(rnd()-.5)*2.4;
      beam(g,[x,.12,z],[x+(rnd()-.5)*.9,.25+rnd()*.25,z+(rnd()-.5)*.8],.07,growth);
    }
    return g;
  }
  function dispose(){geos.forEach(x=>x.dispose());[concrete,metal,dark,growth].forEach(x=>x.dispose());}
  return {utilityPole,radioTower,steelWreck,brokenSign,rootedPavement,dispose};
}
