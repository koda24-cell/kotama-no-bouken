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
    // Add heavy base plates, cable clamps, and visible torn wire bundles.
    add(g,cube,concrete,0,.16,0,.72,.32,.72);
    for(let j=0;j<3;j++) {
      const y=.65+j*.5;
      add(g,cylinder,metal,0,y,0,.28,.08,.28);
    }
    for(const x of [-.5,.5]) {
      beam(g,[x,3.7,.1],[x*1.3,3.1,.35],.065,dark);
      beam(g,[x*1.3,3.1,.35],[x*1.65,2.65,.5],.05,dark);
    }
    if(v===2) {
      beam(g,[.7,2.7,0],[1.8,1.4,.35],.12);
      add(g,cube,metal,1.85,1.25,.35,.65,.16,.3).rotation.z=.48;
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
    // Antenna frames, maintenance ladder and asymmetric dish silhouettes.
    for(let j=0;j<levels-1;j++) {
      beam(g,[-.7,j*1.3+.3,1],[-.7,j*1.3+1.1,1],.035);
      for(const dy of [.4,.75,1.1]) beam(g,[-.83,j*1.3+dy,1],[-.57,j*1.3+dy,1],.025);
    }
    if(v!==1) {
      const dish=add(g,cylinder,metal,1.05,height-.65,0,.95,.13,.95);
      dish.rotation.z=Math.PI/2.6;
      beam(g,[.55,height-1.1,0],[1.1,height-.65,0],.07);
    } else {
      beam(g,[-.9,height-.3,0],[-1.9,height-1.9,.7],.12);
      add(g,cube,metal,-1.9,height-1.85,.7,.65,.12,.4).rotation.z=.6;
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
    // Broken concrete floor slab and protruding rebar make this a wreckage pile.
    const slab=add(g,cube,concrete,0,.42,.05,2.6,.28,1.8);
    slab.rotation.z=v===1?.28:-.16;
    for(let i=0;i<6;i++) {
      const x=-1.15+i*.42;
      beam(g,[x,.35,-.7],[x+(i%2?.35:-.2),1.15+i*.12,-.95],.04);
    }
    for(const x of [-1.25,1.15]) {
      add(g,cube,concrete,x,.19,.85,.65,.4,.55).rotation.y=x>0?.4:-.35;
    }
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
    // Thick frame, bolt heads, bent supporting bracket and dangling plate.
    for(const y of [1.91,2.59]) beam(g,[-.7,y,.08],[.7,y,.08],.04);
    for(const x of [-.5,.5]) {
      add(g,cylinder,dark,x,2.25,.095,.09,.035,.09).rotation.x=Math.PI/2;
    }
    beam(g,[0,1.8,0],[.8,1.65,.15],.07);
    if(variant%3===1) {
      beam(g,[.7,2.15,.1],[1.2,1.35,.2],.045);
      add(g,cube,metal,1.25,1.1,.2,.45,.6,.08).rotation.z=.4;
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
    // Raised slab edges, deep gaps, thick roots and clusters of sprouting blades.
    for(let i=0;i<5;i++) {
      const x=(i-2)*.52;
      beam(g,[x-.35,.15,-1.25],[x,.45+(i%2)*.14,-.2],.12,growth);
      beam(g,[x,.45+(i%2)*.14,-.2],[x+.45,.12,.9],.09,growth);
    }
    for(let i=0;i<12;i++) {
      const x=(rnd()-.5)*2.5,z=(rnd()-.5)*2.5;
      beam(g,[x,.18,z],[x+(rnd()-.5)*.35,.4+rnd()*.45,z+(rnd()-.5)*.3],.025,growth);
    }
    for(let i=0;i<3;i++) {
      const rock=add(g,cube,concrete,(rnd()-.5)*2.4,.23,(rnd()-.5)*2.4,.42,.35,.48);
      rock.rotation.set(rnd()*.4,rnd()*3,rnd()*.6);
    }
    return g;
  }
  // Three distinct city-block silhouettes, with deliberately missing floors and exposed frames.
  function ruinedBuilding(variant=0) {
    const v=((variant%3)+3)%3, g=group('ruined_building_'+v);
    const floors=v===0?4:v===1?3:5, width=v===1?3.6:4.5, depth=v===2?2.7:3.4;
    for(let f=0;f<floors;f++) {
      const y=f*1.5, broken=v===0?(f>=2):v===1?(f===1||f===2):(f>=3);
      // Floor slabs break away in large, visibly asymmetric sections.
      if(!broken) add(g,cube,concrete,0,y+.12,0,width,.24,depth);
      else {
        const left=add(g,cube,concrete,-width*.3,y+.12,-depth*.1,width*.38,.24,depth*.75);
        left.rotation.z=(f%2?-.09:.12);
        if(f%2===0) add(g,cube,concrete,width*.34,y+.02,depth*.24,width*.24,.2,depth*.28).rotation.x=.3;
      }
      // Exposed steel columns and broken transverse girders.
      for(const x of [-width*.43,width*.43]) for(const z of [-depth*.4,depth*.4]) {
        if(broken&&x>0&&z>0&&f>=floors-2)continue;
        beam(g,[x,y+.15,z],[x+(broken?.12:0),y+1.45-(broken&&x>0?.35:0),z],.13);
      }
      for(const z of [-depth*.4,depth*.4]) {
        if(!broken||z<0) beam(g,[-width*.43,y+1.4,z],[width*(broken?.02:.43),y+1.4,z],.095);
      }
      // Remaining wall chunks: empty openings, not solid box buildings.
      if(f===0||!broken) {
        for(const x of [-width*.38,width*.38]) {
          add(g,cube,concrete,x,y+.65,-depth*.43,width*.2,.9,.18);
        }
        add(g,cube,concrete,0,y+1.22,-depth*.43,width*.65,.2,.18);
      } else {
        add(g,cube,concrete,-width*.37,y+.6,-depth*.43,width*.23,.85,.18).rotation.z=.18;
      }
    }
    // Fallen slab, collapsed diagonal beams and rubble at the base.
    add(g,cube,concrete,width*.54,.38,-depth*.45,width*.7,.3,depth*.65).rotation.z=.37;
    beam(g,[width*.37,.3,depth*.28],[width*.86,2.4,depth*.6],.16);
    for(let i=0;i<8;i++) {
      const x=(i%4-1.5)*.55+width*.38,z=(Math.floor(i/4)-.5)*.75-depth*.22;
      const piece=add(g,cube,i%3===0?metal:concrete,x,.18+(i%3)*.12,z,.4+(i%3)*.19,.25,.38);
      piece.rotation.set(.12*i,.31*i,.16*i);
    }
    // Large torn facade slabs, projecting broken floor and exposed dangling steel.
    const ripped=add(g,cube,concrete,-width*.51,1.9,depth*.34,.34,2.5,depth*.65);
    ripped.rotation.z=.22; ripped.rotation.y=-.24;
    const hanging=add(g,cube,concrete,width*.45,2.85,-depth*.17,width*.55,.22,depth*.55);
    hanging.rotation.z=-.33; hanging.rotation.x=.14;
    for(let i=0;i<4;i++) {
      const x=width*.2+i*.27;
      beam(g,[x,2.7,-depth*.36],[x+.22,1.6-i*.12,-depth*.43],.052,metal);
    }
    // Pile of large broken floor fragments rather than evenly scattered cubes.
    for(let i=0;i<6;i++) {
      const x=width*.4+(i%3-1)*.6,z=depth*.5+Math.floor(i/3)*.56;
      const fragment=add(g,cube,concrete,x,.22+(i%3)*.17,z,.9+(i%2)*.4,.23,.6);
      fragment.rotation.set(i*.19,i*.31,i%2?.45:-.35);
    }
    // Structural tree roots wrap through the open building, not just painted vines.
    if(v!==1) {
      beam(g,[-width*.48,.1,depth*.3],[-width*.32,1.5,depth*.33],.17,growth);
      beam(g,[-width*.32,1.5,depth*.33],[-width*.1,2.8,depth*.35],.13,growth);
      for(const i of [-1,1]) beam(g,[-width*.1,2.8,depth*.35],[-width*.1+i*.8,3.6,depth*.35+i*.3],.08,growth);
    }
    return g;
  }
  function invasiveTree(variant=0) {
    const v=((variant%3)+3)%3,g=group('invasive_tree_'+v);
    const h=v===1?5.3:7.2;
    beam(g,[0,0,0],[.15,h*.42,0],.43,growth);
    beam(g,[.15,h*.42,0],[v===2?1.2:.4,h*.79,.15],.34,growth);
    for(let i=0;i<6;i++) {
      const angle=i*Math.PI/3;
      beam(g,[0,.35,0],[Math.cos(angle)*2,.06,Math.sin(angle)*1.7],.15,growth);
    }
    for(let i=0;i<7;i++) {
      const angle=i*2.4, y=h*(.56+(i%3)*.13);
      const a=[Math.sin(angle)*.45,y,Math.cos(angle)*.3];
      const b=[Math.sin(angle)*2.3,y+.5+(i%2)*.5,Math.cos(angle)*2.1];
      beam(g,a,b,.13,growth);
      for(let j=0;j<3;j++) {
        const leaf=add(g,cube,growth,b[0]+(j-1)*.3,b[1]+(j%2)*.3,b[2],.7,.4,.65);
        leaf.rotation.set(j*.25,angle,j*.32);
      }
    }
    return g;
  }
  // Large overgrown street-block composition, separate from walkable collision map.
  function ruinedBlock(variant=0) {
    const v=((variant%3)+3)%3,g=group('ruined_block_'+v);
    const a=ruinedBuilding(v),b=ruinedBuilding((v+1)%3);
    a.position.set(-4.3,0,-2.8);a.rotation.y=v*.18;g.add(a);
    b.position.set(4.2,0,2.3);b.rotation.y=-.35; b.scale.set(.82,.86,.82);g.add(b);
    const pole=utilityPole(v);pole.position.set(-.8,0,3.1);pole.rotation.z=v===1?.15:0;g.add(pole);
    const steel=steelWreck(v);steel.position.set(1.2,0,-.9);steel.rotation.y=.55;g.add(steel);
    for(let i=0;i<5;i++) {
      const tile=rootedPavement(v*100+i+1);
      tile.position.set((i%3-1)*2.7,0,(Math.floor(i/3)-.5)*2.5);
      tile.scale.set(.7,1,.7);g.add(tile);
    }
    const tree=invasiveTree(v);tree.position.set(-5.4,0,1.9);tree.scale.set(.9,.8,.9);g.add(tree);
    const tree2=invasiveTree((v+1)%3);tree2.position.set(4.9,0,3.1);tree2.scale.set(.65,.72,.65);g.add(tree2);
    // Massive root system bridges a street and visibly pushes into the buildings.
    beam(g,[-5,.15,1],[-3,1.1,1.7],.24,growth);
    beam(g,[-3,1.1,1.7],[-1.3,.55,2.4],.2,growth);
    beam(g,[-1.3,.55,2.4],[.8,.22,2.2],.14,growth);
    // Distant radio silhouette is optional, variants differ in skyline.
    if(v!==1) {
      const tower=radioTower(v);tower.position.set(6.2,0,-3.2);tower.scale.set(.55,.75,.55);g.add(tower);
    }
    return g;
  }
  // Broken elevated roadway: visible open gap, fallen spans, bent supports.
  function collapsedOverpass(variant=0) {
    const v=((variant%3)+3)%3,g=group('collapsed_overpass_'+v);
    for(const x of [-3.4,3.4]) {
      beam(g,[x,0,-1],[x+(v===1?.35:0),3.7,-1],.38,concrete);
      beam(g,[x,0,1],[x+(v===2?-.3:0),3.7,1],.38,concrete);
      add(g,cube,concrete,x,3.65,0,.85,.42,2.8);
    }
    const left=add(g,cube,concrete,-2.55,4.1,0,3.2,.32,3.2);
    left.rotation.z=v===1?-.13:.06;
    const right=add(g,cube,concrete,2.8,3.35,.1,2.75,.34,3.2);
    right.rotation.z=v===2?-.42:-.24;
    // Gap in bridge deck stays visibly open; rebar hangs between slabs.
    for(let i=0;i<5;i++) {
      const z=-1.1+i*.55;
      beam(g,[-.95,3.95,z],[.1,3.1-i*.08,z+.15],.045,metal);
      beam(g,[1.5,3.25,z],[.55,2.5+i*.06,z-.15],.045,metal);
    }
    for(const x of [-3.9,-2.8,2.5,3.6]) {
      beam(g,[x,4.3,-1.45],[x+(x>0?.25:0),4.8,-1.45],.065,metal);
      beam(g,[x,4.3,1.45],[x,4.8,1.45],.065,metal);
    }
    for(let i=0;i<7;i++) {
      const x=-1.3+(i%4)*.83,z=(Math.floor(i/4)-.5)*1.2;
      const chunk=add(g,cube,concrete,x,.25+(i%3)*.15,z,.8,.28,.65);
      chunk.rotation.set(i*.13,i*.34,(i%2?.34:-.24));
    }
    return g;
  }
  // Cratered paving: offset plates and uplifted margins, no physics collision.
  function sunkenStreet(seed=1) {
    const g=group('sunken_street_'+seed);
    let n=seed>>>0;const rnd=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
    for(let i=0;i<16;i++) {
      const x=(i%4-1.5)*.85,z=(Math.floor(i/4)-1.5)*.85;
      const dist=Math.hypot(x,z), y=dist<1.3?-.28:dist<1.9?-.09:.12;
      const slab=add(g,cube,concrete,x,y,.0+z,.77,.14,.77);
      slab.rotation.z=(rnd()-.5)*(dist<1.9?.24:.1);
      slab.rotation.x=(rnd()-.5)*.16;
    }
    for(let i=0;i<10;i++) {
      const angle=i*2.399,rad=.65+rnd()*1.5;
      const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;
      beam(g,[x,-.18,z],[x*1.27,.08+rnd()*.35,z*1.27],.07,growth);
    }
    for(let i=0;i<5;i++) {
      const angle=i*1.31,rad=1+rnd();
      const stone=add(g,cube,concrete,Math.cos(angle)*rad,.08,Math.sin(angle)*rad,.4,.24,.3);
      stone.rotation.set(i*.3,i*.2,i*.17);
    }
    return g;
  }
  // Street-scale collapsed skybridge: exaggerated silhouette with broken spans.
  function collapsedSkybridge(variant=0) {
    const v=((variant%3)+3)%3,g=group('collapsed_skybridge_'+v);
    const height=v===1?3.3:4.6,span=v===2?8.5:6.8;
    for(const x of [-span*.48,span*.48]) {
      beam(g,[x,0,-.9],[x,height-.2,-.9],.23);
      beam(g,[x,0,.9],[x,height-.2,.9],.23);
      beam(g,[x,height-.3,-.9],[x,height-.3,.9],.14);
    }
    // Bridge is not a solid beam: left section hangs, middle is absent.
    const left=add(g,cube,concrete,-span*.29,height-.1,0,span*.4,.32,2.2);
    left.rotation.z=v===0?-.24:-.12;
    const right=add(g,cube,concrete,span*.37,height-.55,0,span*.26,.3,2);
    right.rotation.z=v===1?.42:-.33;
    for(const z of [-.85,.85]) {
      beam(g,[-span*.46,height+.15,z],[-span*.13,height-.35,z],.095);
      beam(g,[span*.23,height-.8,z],[span*.49,height-.22,z],.1);
      for(let i=0;i<3;i++) {
        const x=-span*.12+i*.32;
        beam(g,[x,height-.1,z],[x+.17,height-.95-i*.18,z],.04);
      }
    }
    for(let i=0;i<7;i++) {
      const x=(i%4-1.5)*.8,z=(Math.floor(i/4)-.5)*1.5;
      const slab=add(g,cube,concrete,x,.16+(i%3)*.13,z,.75,.22,.65);
      slab.rotation.set(i*.14,i*.25,(i%2?.4:-.3));
    }
    // Vines climb surviving piers.
    for(const x of [-span*.48,span*.48]) {
      beam(g,[x-.4,.1,.95],[x-.2,1.6,.97],.11,growth);
      beam(g,[x-.2,1.6,.97],[x+.1,2.9,.95],.075,growth);
    }
    return g;
  }
  // Deliberately non-walkable landmark composition; caller controls placement.
  function ruinedPlaza(variant=0) {
    const v=((variant%3)+3)%3,g=group('ruined_plaza_'+v);
    for(let i=0;i<7;i++) {
      const tile=rootedPavement(1000+v*31+i);
      tile.position.set((i%3-1)*2.15,0,(Math.floor(i/3)-1)*2.1);
      tile.scale.set(.65,.85,.65);g.add(tile);
    }
    const bridge=collapsedSkybridge(v);bridge.position.set(0,0,-3.5);bridge.rotation.y=v*.22;g.add(bridge);
    const wreck=steelWreck(v);wreck.position.set(2.6,0,1.8);wreck.scale.set(1.15,1.2,1.15);g.add(wreck);
    const tree=invasiveTree(v);tree.position.set(-3,0,1.8);tree.scale.set(.85,.9,.85);g.add(tree);
    const sign=brokenSign(v);sign.position.set(3.8,0,-.4);g.add(sign);
    return g;
  }
  function dispose(){geos.forEach(x=>x.dispose());[concrete,metal,dark,growth].forEach(x=>x.dispose());}
  return {utilityPole,radioTower,steelWreck,brokenSign,rootedPavement,ruinedBuilding,invasiveTree,ruinedBlock,collapsedOverpass,sunkenStreet,collapsedSkybridge,ruinedPlaza,dispose};
}
