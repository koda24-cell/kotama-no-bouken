/* Shared low-cost VFX presets for floor 5 (V5, ported from PR #354); visual-only. */
import * as THREE from 'three';
export function createB5ArcaneSparks({count=42,seed=505}={}) {
  const n=Math.max(0,Math.min(96,count)), positions=new Float32Array(n*3);
  let state=seed>>>0;
  const random=()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};
  for(let i=0;i<n;i++){positions[i*3]=(random()-.5)*12;positions[i*3+1]=random()*4;positions[i*3+2]=(random()-.5)*12;}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const material=new THREE.PointsMaterial({color:0x9a64e9,size:.055,transparent:true,opacity:.48,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const points=new THREE.Points(geometry,material);points.name='b5:arcane-sparks';
  return {points,update(time,cameraPosition){
    if(cameraPosition)points.position.copy(cameraPosition).setY(0);
    material.opacity=.36+.12*Math.sin(time*.7);
    points.rotation.y=time*.025;
  },dispose(){geometry.dispose();material.dispose();}};
}

/** Camera-facing translucent mist: keep the center of the visible path clear.
 * This is an atmospheric overlay, never a modification of map geometry.
 * Physical dungeon geometry remains depth-tested in front of the mist.
 */
export function createB5PathEdgeMist(){
  const uniforms={uTime:{value:0}};
  const material=new THREE.ShaderMaterial({
    uniforms,transparent:true,depthWrite:false,depthTest:true,
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`precision highp float;
      varying vec2 vUv;uniform float uTime;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
      void main(){
        vec2 uv=vUv;
        // Replace the old screen-wide mist band with disconnected cloud lobes.
        // Each lobe has a different size, center, drift and broken radial edge.
        // No single horizontal/vertical threshold defines the silhouette.
        float alpha=0.;
        for(int i=0;i<18;i++){
          float fi=float(i);
          float side=mod(fi,2.)<.5?-1.:1.;
          float index=floor(fi*.5);
          float seed=h(vec2(index*3.17,side*5.23));
          float seed2=h(vec2(index*7.91,side*2.41));
          float cx=.5+side*(.26+seed*.22);
          float cy=.13+seed2*.48;
          vec2 center=vec2(cx,cy);
          center.x+=sin(uTime*(.07+seed*.06)+fi*2.1)*.025;
          center.y+=cos(uTime*(.05+seed2*.07)+fi*1.9)*.025;
          vec2 q=(uv-center)/vec2(.10+seed*.13,.075+seed2*.15);
          float coarse=n(q*1.3+vec2(fi*2.1,uTime*.055));
          float detail=n(q*3.6+vec2(-uTime*.075,fi*1.7));
          q+=vec2(coarse-.5,detail-.5)*.32;
          float angle=atan(q.y,q.x);
          float radial=length(q);
          float serration=.21*sin(angle*(3.+floor(seed*4.))+fi*2.3+uTime*.08)
                         +.13*sin(angle*9.+fi*1.4-uTime*.12);
          float edge=1.+serration+(coarse-.5)*.40+(detail-.5)*.17;
          float lobe=1.-smoothstep(edge-.30,edge+.23,radial);
          float internal=n(q*2.8+vec2(fi*1.9,uTime*.065));
          lobe*=.35+.65*smoothstep(.20,.75,internal);
          alpha=1.-(1.-alpha)*(1.-lobe*(.11+seed*.12));
        }
        // Soften only the outer canvas boundary; preserve irregular cloud edges.
        float frame=smoothstep(0.,.07,uv.x)*(1.-smoothstep(.93,1.,uv.x))
                   *smoothstep(0.,.06,uv.y)*(1.-smoothstep(.91,1.,uv.y));
        float x=abs(uv.x-.5);
        alpha*=frame*(.18+.82*smoothstep(.045,.25,x));
        gl_FragColor=vec4(vec3(.24,.065,.34),clamp(alpha,0.,.29));
      }`
  });
  const geometry=new THREE.PlaneGeometry(20,11);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='b5:path-adjacent-mist';
  mesh.renderOrder=3;
  mesh.frustumCulled=false;
  return {mesh,update(t,camera){
    uniforms.uTime.value=t;
    mesh.quaternion.copy(camera.quaternion);
    mesh.position.copy(camera.position).addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion),9);
  },dispose(){geometry.dispose();material.dispose();}};
}
