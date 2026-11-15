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
        float drift=n(uv*vec2(6.,4.)+vec2(uTime*.08,-uTime*.035));
        float detail=n(uv*vec2(14.,7.)+vec2(-uTime*.06,uTime*.025));
        float side=smoothstep(.15,.55,abs(uv.x-.5)+(.5-drift)*.09);
        float nearFloor=1.-smoothstep(.43,.75,uv.y);
        float centralOpening=1.-smoothstep(.06,.31,abs(uv.x-.5));
        float opacity=(.035+.15*drift+.075*detail)*side*nearFloor;
        opacity*=1.-centralOpening*.88;
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
