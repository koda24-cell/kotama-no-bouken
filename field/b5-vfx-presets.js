/* Shared low-cost VFX presets for floor 5; optional visual-only effects. */
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
        // Domain-warp the boundary at two scales so no straight silhouette remains.
        float broad=n(uv*vec2(3.2,2.7)+vec2(uTime*.035,-uTime*.022));
        float medium=n(uv*vec2(8.1,5.4)+vec2(-uTime*.061,uTime*.027));
        float fine=n(uv*vec2(19.,12.)+vec2(uTime*.093,-uTime*.041));
        float displacement=(broad-.5)*.24+(medium-.5)*.115+(fine-.5)*.035;
        float x=abs(uv.x-.5);
        float raggedEdge=.22+displacement;
        float side=smoothstep(raggedEdge-.115,raggedEdge+.095,x);
        // Break up the upper edge into drifting, nonuniform wisps.
        float upperNoise=n(uv*vec2(5.3,4.7)+vec2(-uTime*.043,uTime*.032));
        float upperFine=n(uv*vec2(13.,8.)+vec2(uTime*.074,-uTime*.019));
        float upperHeight=.59+(upperNoise-.5)*.31+(upperFine-.5)*.13;
        float heightMask=1.-smoothstep(upperHeight-.17,upperHeight+.16,uv.y);
        float wisps=smoothstep(.24,.72,broad*.47+medium*.34+fine*.19);
        float holes=n(uv*vec2(10.,7.)+vec2(uTime*.03,uTime*.016));
        float opacity=(.055+.20*wisps)*side*heightMask*(.62+.38*holes);
        // Keep the actual walkable corridor visible; no changes to its geometry.
        opacity*=1.-(1.-smoothstep(.045,.25,x))*.88;
        gl_FragColor=vec4(vec3(.24,.065,.34),clamp(opacity,0.,.24));
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
