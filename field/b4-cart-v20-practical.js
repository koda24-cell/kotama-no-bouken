import * as THREE from 'three';
// B4 V20/V21: preserve every existing mesh; reshape the silhouette by adding a
// longitudinal timber tub and relocating existing wheel objects in the candidate only.
export function enhanceB4CartPractical(root,variant=20) {
 const cart=root.getObjectByName('b4:buried-ore-cart');
 if(!cart)throw Error('missing source cart');
 const name='b4:cart-practical-v'+variant;
 if(cart.getObjectByName(name))return root;
 const long=variant>=21;
 const L=long?1.74:1.63, X=long?1.18:1.13;
 const lowL=long?1.20:1.16, lowX=long?.83:.80;
 const top=1.39, base=.31, axleZ=long?1.03:.96;
 const darkwood=new THREE.MeshStandardMaterial({color:0x4e3930,roughness:.97,metalness:.02,side:THREE.DoubleSide});
 const boards=[0x5b4638,0x624a37,0x564137,0x68513f].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.97,metalness:0,side:THREE.DoubleSide}));
 const iron=new THREE.MeshStandardMaterial({color:0x35383b,roughness:.75,metalness:.64});
 const worn=new THREE.MeshStandardMaterial({color:0x6d4b3d,roughness:.91,metalness:.27});
 darkwood.name='B4_WoodDark';boards.forEach((m,i)=>m.name='B4_WoodBoard'+i);iron.name='B4_BlackIron';worn.name='B4_RustedIron';
 const woodGrain=new THREE.MeshStandardMaterial({color:0x302c2a,roughness:1});
 woodGrain.name='B4_WoodGrain';
 const highlight=new THREE.MeshStandardMaterial({color:0x81644b,roughness:.95});
 const group=new THREE.Group();group.name=name;cart.add(group);
 const boxgeo=new THREE.BoxGeometry(1,1,1);
 function block(x,y,z,sx,sy,sz,m=iron) {
   const o=new THREE.Mesh(boxgeo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);group.add(o);return o;
 }
 function beam(a,b,w,d,material=iron){
   const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);
   const o=new THREE.Mesh(new THREE.BoxGeometry(w,d,v.length()),material);
   o.position.copy(p.clone().add(q).multiplyScalar(.5));
   o.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),v.normalize());group.add(o);return o;
 }
 function panel(a,b,c,d,t,mat){
   const v=[a,b,c,d].map(p=>new THREE.Vector3(...p));
   const n=v[1].clone().sub(v[0]).cross(v[3].clone().sub(v[0])).normalize().multiplyScalar(t/2);
   const p=[...v.map(w=>w.clone().add(n)),...v.map(w=>w.clone().sub(n))];
   const faces=[[0,1,2],[0,2,3],[4,6,5],[4,7,6],[0,4,5],[0,5,1],[1,5,6],[1,6,2],[2,6,7],[2,7,3],[3,7,4],[3,4,0]];
   const coords=[];for(const f of faces)for(const i of f)coords.push(...p[i].toArray());
   const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));geom.computeVertexNormals();
   const o=new THREE.Mesh(geom,mat);group.add(o);return o;
 }
 // Preserve the source wheel geometry and spokes, but move their existing
 // positions along the length rather than making another set of four wheels.
 function relocateChildren(parent){
  for(const ob of parent.children){
   if(ob===group)continue;
   if(ob.isMesh && Math.abs(ob.position.x)>.80 && Math.abs(ob.position.z)>.30 && Math.abs(ob.position.z)<.57 && ob.position.y<.18){
    ob.position.z+=Math.sign(ob.position.z)*(axleZ-.43);
    ob.position.x+=Math.sign(ob.position.x)*.12;
    if(variant>=26)ob.scale.multiplyScalar(1.12);
   } else if(ob.isGroup && /cart-detail-additions|cart-v14-quality/.test(ob.name))relocateChildren(ob);
  }
 }
 relocateChildren(cart);
 // Separate sloped boards with physically meaningful seams, not a solid box.
 const levels=[.015,.27,.53,.78,.985];
 const mix=(a,b,t)=>a+(b-a)*t;
 for(const side of [-1,1]){
   for(let j=0;j<4;j++){
     const t0=levels[j],t1=levels[j+1], y0=mix(base,top,t0),y1=mix(base,top,t1);
     const x0=mix(lowX,X,t0),x1=mix(lowX,X,t1), z0=mix(lowL,L,t0),z1=mix(lowL,L,t1);
     panel([side*x0,y0,-z0],[side*x0,y0,z0],[side*x1,y1,z1],[side*x1,y1,-z1],.066,boards[j]);
     // long wood checks, deliberately irregular and local, following the board direction
     for(const ratio of [0.19,0.59]){
       const y=mix(y0,y1,ratio), x=mix(x0,x1,ratio);
       const span=mix(z0,z1,ratio)*.76;
       beam([side*(x+.040),y,-span],[side*(x+.040),y,span*.85],.007,.011,j===2?highlight:woodGrain);
     }
   }
   beam([side*(lowX+.035),base,-lowL],[side*(X+.065),top,-L],.112,.105,iron);
   beam([side*(lowX+.035),base,lowL],[side*(X+.065),top,L],.115,.110,iron);
   beam([side*X,top,-L],[side*X,top,L],.105,.10,iron);
   for(const z of [-L*.63,L*.19]){
     beam([side*(lowX+.025),base,z*.76],[side*(X+.052),top,z],.081,.091,iron);
   }
   // continuous, load-bearing side sill at bottom and corner-mounted rivets
   block(side*(lowX-.09),.16,0,.16,.16,lowL*2.11,iron);
   for(const z of [-L*.82,0,L*.82]){
    const stud=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.023,10),worn);stud.rotation.z=Math.PI/2;stud.position.set(side*(X+.067),top-.11,z);group.add(stud);
   }
 }
 for(const end of [-1,1]){
  for(let j=0;j<4;j++){
   const t0=levels[j],t1=levels[j+1],y0=mix(base,top,t0),y1=mix(base,top,t1);
   const x0=mix(lowX,X,t0),x1=mix(lowX,X,t1),z0=mix(lowL,L,t0),z1=mix(lowL,L,t1);
   panel([-x0,y0,end*z0],[x0,y0,end*z0],[x1,y1,end*z1],[-x1,y1,end*z1],.07,boards[(j+1)%4]);
  }
  beam([-X,top,end*L],[X,top,end*L],.11,.10,iron);
  for(const x of [-.57,.57])beam([x*.81,base,end*(lowL+.045)],[x,top,end*(L+.035)],.105,.105,iron);
  block(0,.17,end*(lowL-.05),lowX*1.7,.13,.15,iron);
 }
 // Undercarriage cross members + two real continuous axles.
 for(const side of [-1,1])block(side*.78,.085,0,.15,.14,axleZ*2.36,iron);
 for(const z of [-axleZ,axleZ]){
   const axle=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,2.28,12),iron);
   axle.rotation.z=Math.PI/2;axle.position.set(0,-.1,z);group.add(axle);
   for(const side of [-1,1]){
     block(side*.70,-.015,z,.32,.15,.20,worn);
     block(side*.72,.17,z,.13,.34,.18,iron);
   }
 }
 // V22: functional end coupling and load-bearing gussets; not ornamental rings.
 if(variant>=22){
  const coupler=new THREE.Group();coupler.name='b4:load-coupler-v22';group.add(coupler);
  const addCoupler=(mesh,x,y,z)=>{mesh.position.set(x,y,z);coupler.add(mesh);return mesh;};
  for(const end of [-1,1]){
   if(variant>=25) {
     // Compact drawbar below the tub, fully attached to the end frame.
     const drawbar=new THREE.Mesh(new THREE.BoxGeometry(.24,.15,.48),iron);
     addCoupler(drawbar,0,.10,end*(lowL+.09));
     const endplate=new THREE.Mesh(new THREE.BoxGeometry(.42,.20,.13),worn);
     addCoupler(endplate,0,.10,end*(lowL+.30));
     const pin=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.19,12),iron);
     addCoupler(pin,0,.02,end*(lowL+.29));
     continue;
   }
   const plate=new THREE.Mesh(new THREE.BoxGeometry(.42,.17,.38),iron);
   addCoupler(plate,0,.06,end*(L+.10));
   const shank=new THREE.Mesh(new THREE.BoxGeometry(.20,.18,.40),worn);
   addCoupler(shank,0,.06,end*(L+.31));
   if(variant===22){
     const hook=new THREE.Mesh(new THREE.TorusGeometry(.17,.050,9,20,Math.PI*1.75),iron);
     hook.rotation.x=Math.PI/2;hook.rotation.z=end*.12;
     addCoupler(hook,0,.08,end*(L+.59));
   } else {
     // Solid U-shaped coupling clevis, mechanically seated on the shank.
     for(const side of [-1,1]){
       const jaw=new THREE.Mesh(new THREE.BoxGeometry(.075,.16,.35),iron);
       addCoupler(jaw,side*.12,.06,end*(L+.56));
     }
     const pin=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.38,14),worn);
     pin.rotation.z=Math.PI/2;addCoupler(pin,0,.08,end*(L+.61));
   }
  }
  for(const side of [-1,1])for(const z of [-axleZ,axleZ]){
   const gusset=new THREE.Mesh(new THREE.BoxGeometry(.12,.28,.28),iron);
   gusset.position.set(side*.71,.10,z);
   gusset.rotation.z=side*.16;group.add(gusset);
   const cap=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.07,16),worn);
   cap.rotation.z=Math.PI/2;cap.position.set(side*1.20,-.1,z);group.add(cap);
  }
 }
 // V23: structural lower cross ties and restrained chipped timber repairs.
 if(variant>=23){
   for(const side of [-1,1]){
     // The metal frame visually carries the load into the wheel bearings.
     for(const z of [-axleZ,axleZ]){
       beam([side*(lowX-.16),.24,z*.86],[side*.80,-.095,z],.14,.10,iron);
     }
     beam([side*(lowX-.14),.19,-axleZ*1.15],[side*(lowX-.14),.19,axleZ*1.15],.085,.085,worn);
   }
   // Irregular, localized edge splinters and patched boards only on one face.
   for(const [x,y,z,length] of [[X+.043,.79,-L*.39,.23],[X+.048,.99,L*.51,.31]]){
     beam([x,y,z],[x+.018,y+.035,z+length],.025,.035,highlight);
     beam([x+.023,y+.038,z+.020],[x+.006,y+.043,z+length*.8],.008,.012,woodGrain);
   }
 }
 // Repairs, splinters and scorch are local and subdued, not generic random pellets.
 for(const side of [-1,1]){
  beam([side*.98,.67,-L*.57],[side*1.025,.84,-L*.39],.028,.023,highlight);
  beam([side*1.07,1.06,L*.14],[side*1.081,1.19,L*.31],.016,.016,woodGrain);
 }
 // V27: non-destructive rock surface shells. The coarse source ore meshes remain
 // inside the overlay, not deleted or overwritten, and can be restored by not using V27.
 if(variant===27){
   const rockSurface=new THREE.MeshStandardMaterial({name:'B4_CaveOre',color:0x343536,metalness:0,roughness:.96});
   let index=0;
   for(const ore of [...cart.children]){
     if(!ore.isMesh || ore.geometry?.type!=='IcosahedronGeometry' || ore.scale.x<.41)continue;
     const geo=new THREE.SphereGeometry(1,40,28);
     const a=geo.getAttribute('position');
     for(let i=0;i<a.count;i++){
       const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
       const r=1.055+
        .035*Math.sin(x*9.3+z*3.1+index*2.4)*Math.cos(y*7.2-x*2.1)+
        .025*Math.sin(y*13.5+z*5.4+index*.7)+
        .018*Math.cos(z*17.2+x*9.6-index*1.9);
       a.setXYZ(i,x*r,y*r,z*r);
     }
     a.needsUpdate=true;geo.computeVertexNormals();
     const shell=new THREE.Mesh(geo,rockSurface);
     shell.name='B4_ORIGINAL_ORE_PRESERVED_SMOOTH_SURFACE_'+index;
     shell.position.copy(ore.position);shell.rotation.copy(ore.rotation);shell.scale.copy(ore.scale);
     group.add(shell);index++;
   }
 }
 // V28: retain original icosahedron rock SILHOUETTE, add dense per-face sculpted
 // geometry offset only 1–4% outwards. Avoid V27's giant spherical bulge.
 if(variant===28){
   const detailedOre=new THREE.MeshStandardMaterial({name:'B4_CaveOre',color:0x343536,metalness:0,roughness:.98,side:THREE.DoubleSide});
   let stoneIndex=0;
   for(const ore of [...cart.children]){
     if(!ore.isMesh || ore.geometry?.type!=='IcosahedronGeometry' || ore.scale.x<.41)continue;
     const src=ore.geometry.getAttribute('position');
     const divisions=9,coords=[],uvs=[],idx=[];
     function project(a,b,c,t,u,n,salt) {
       const p=new THREE.Vector3().copy(a).multiplyScalar(1-t-u)
         .addScaledVector(b,t).addScaledVector(c,u);
       const rough=Math.sin(p.x*26.1+p.z*13.8+salt*1.7)*Math.cos(p.y*18.3-p.z*5.8);
       const cracks=Math.sin(p.x*61.5+p.y*36.3+p.z*19.7+salt*1.8);
       const height=.027+.008*rough+.005*cracks;
       p.addScaledVector(n,height);
       return p;
     }
     for(let f=0;f<src.count;f+=3){
       const a=new THREE.Vector3().fromBufferAttribute(src,f);
       const b=new THREE.Vector3().fromBufferAttribute(src,f+1);
       const c=new THREE.Vector3().fromBufferAttribute(src,f+2);
       const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
       if(normal.dot(a.clone().add(b).add(c))<0)normal.negate();
       const baseIndex=coords.length/3;
       const lookup=[];
       for(let i=0;i<=divisions;i++){
         lookup[i]=[];
         for(let j=0;j<=divisions-i;j++){
           const t=i/divisions,u=j/divisions;
           const p=project(a,b,c,t,u,normal,f+stoneIndex);
           lookup[i][j]=coords.length/3;
           coords.push(p.x,p.y,p.z);
           uvs.push(p.x*.56+p.z*.18,p.y*.66+p.z*.22);
         }
       }
       for(let i=0;i<divisions;i++)for(let j=0;j<divisions-i;j++){
         // Original face winding is preserved in local coordinates.
         idx.push(lookup[i][j],lookup[i+1][j],lookup[i][j+1]);
         if(j<divisions-i-1)idx.push(lookup[i+1][j],lookup[i+1][j+1],lookup[i][j+1]);
       }
     }
     const geo=new THREE.BufferGeometry();
     geo.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
     geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
     geo.setIndex(idx);geo.computeVertexNormals();
     const layer=new THREE.Mesh(geo,detailedOre);
     layer.name='B4_ORE_FACE_SUBDIVISION_PRESERVES_ORIGINAL_'+stoneIndex;
     layer.position.copy(ore.position);layer.rotation.copy(ore.rotation);layer.scale.copy(ore.scale);
     group.add(layer);stoneIndex++;
   }
 }

 // V29: structural close-up pass. No substitute shells over the ore; preserve
 // V26 dark ore and all four running wheels.
 if(variant===29){
   const darkSteel = new THREE.MeshStandardMaterial({name:'B4_BlackIron',color:0x2f3235,metalness:.72,roughness:.70});
   const wearSteel = new THREE.MeshStandardMaterial({name:'B4_RustedIron',color:0x575048,metalness:.48,roughness:.85});
   const brownWood = new THREE.MeshStandardMaterial({name:'B4_WoodBoard2',color:0x554639,metalness:0,roughness:.98,side:THREE.DoubleSide});
   // Real diagonal braces linking the underframe to each bearing.
   for(const side of [-1,1])for(const z of [-axleZ,axleZ]){
     beam([side*.60,.22,z+Math.sign(z)*.18],[side*.89,-.065,z],.072,.080,darkSteel);
     const washer=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.025,12),wearSteel);
     washer.rotation.z=Math.PI/2;washer.position.set(side*1.13,-.10,z);group.add(washer);
     const pin=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.035,8),darkSteel);
     pin.rotation.z=Math.PI/2;pin.position.set(side*1.15,-.10,z);group.add(pin);
   }
   // Broken upper timber corners: irregular splinter pieces, not a solid
   // block-shaped patch or uniformly repeated damage.
   const fragments=[
     {side:1,z:-L*.88,y:top-.12,len:.22,ang:-.19},
     {side:-1,z:L*.71,y:top-.27,len:.31,ang:.16},
     {side:1,z:L*.32,y:top-.32,len:.18,ang:.08}
   ];
   for(const f of fragments){
     const x=f.side*(X-.035);
     beam([x,f.y,f.z],[x+f.side*.025,f.y+.042,f.z+f.len],.028,.031,brownWood);
     const chip=new THREE.Mesh(new THREE.TetrahedronGeometry(.065,0),brownWood);
     chip.position.set(x,f.y+.005,f.z+f.len*.54);chip.rotation.set(.27,.12,f.ang);group.add(chip);
   }
   // Rivets and narrow worn contact edges, coherent with actual braces.
   for(const side of [-1,1])for(const z of [-L*.71,-L*.03,L*.56]){
     const rivet=new THREE.Mesh(new THREE.CylinderGeometry(.027,.027,.034,10),wearSteel);
     rivet.rotation.z=Math.PI/2;rivet.position.set(side*(X+.058),top-.07,z);group.add(rivet);
   }
 }

 // V30: grounded repair-and-axle pass after actual V29 render review.
 // Scale and position are based on the existing four 0.3-radius running wheels,
 // not extra wheel bodies. The original V26 body and ore are untouched.
 if(variant>=30){
   const edgeIron=new THREE.MeshStandardMaterial({name:'B4_BlackIron',color:0x34373a,metalness:.62,roughness:.78});
   const sootSteel=new THREE.MeshStandardMaterial({name:'B4_RustedIron',color:0x524a42,metalness:.36,roughness:.90});
   const darkTimber=new THREE.MeshStandardMaterial({name:'B4_WoodBoard2',color:0x514639,roughness:.99,metalness:.01});
   // True visible bearing seat: vertical housing and diagonal underbody ties.
   for(const side of [-1,1])for(const z of [-axleZ,axleZ]){
     beam([side*.58,.28,z*.78],[side*.83,-.055,z],.095,.085,edgeIron);
     block(side*.81,-.010,z,.20,.14,.25,edgeIron);
     const hub=new THREE.Mesh(new THREE.CylinderGeometry(.108,.108,.028,14),sootSteel);
     hub.rotation.z=Math.PI/2;hub.position.set(side*1.14,-.10,z);group.add(hub);
     // Axle cap sits flush with the wheel, not a detached duplicate ring.
     const pin=new THREE.Mesh(new THREE.CylinderGeometry(.039,.039,.040,10),edgeIron);
     pin.rotation.z=Math.PI/2;pin.position.set(side*1.165,-.10,z);group.add(pin);
   }
   // Irregular, recessed plank checks. Only two sections, not a row of bright scratches.
   for(const [side,z0,z1,y] of [[1,-L*.56,-L*.36,.78],[-1,L*.23,L*.51,.98]]){
     const x=side*(X*.86);
     beam([x,y,z0],[x+side*.01,y+.015,z1],.012,.014,darkTimber);
   }
   // Compact repair plate located over a wood seam, bolted to the steel upright.
   for(const side of [-1,1]){
     const z=side===1?L*.34:-L*.21;
     const plate=block(side*(X+.033),.70,z,.037,.25,.20,sootSteel);
     for(const yy of [.61,.78]){
       const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.025,8),edgeIron);
       bolt.rotation.z=Math.PI/2;bolt.position.set(side*(X+.061),yy,z);group.add(bolt);
     }
   }
 }
 cart.userData={...cart.userData,practical:{variant,topWidth:X*2,topLength:L*2,wheelbase:axleZ*2,sourceGeometryPreserved:true}};
 return root;
}
