/** Opt-in animated water V2 prototype: generated flow map and caustics, no asset copies.
 * Not a screen-depth based shore mask, physical refraction, or real-time reflection. */
import * as THREE from 'three';
import {makeWaterFlowRGBA,makeCausticsRGBA} from './water-field.mjs';
import {waterCapabilities} from './water-quality.mjs';
const colors={
 lake:{deep:0x123e59,shallow:0x66cbd4,vel:[.12,.03]},
 stream:{deep:0x164c62,shallow:0x84dadf,vel:[.35,.04]},
 waterfall:{deep:0x387d9e,shallow:0xc0eaf4,vel:[.03,.7]},
};
function dataTexture(payload){
 const texture=new THREE.DataTexture(payload.data,payload.width,payload.height,THREE.RGBAFormat);
 texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
 texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;
 texture.generateMipmaps=false;texture.needsUpdate=true;
 texture.colorSpace=THREE.NoColorSpace;
 return texture;
}
export function createWaterV2(type='stream'){
 const p=colors[type];if(!p)throw Error('unknown water type');
 const flow=dataTexture(makeWaterFlowRGBA({direction:p.vel,seed:8,size:128}));
 const caustic=dataTexture(makeCausticsRGBA({seed:13,size:128}));
 const uniforms={
  uTime:{value:0},uFlowTexture:{value:flow},uCaustics:{value:caustic},
  uDeep:{value:new THREE.Color(p.deep)},uShallow:{value:new THREE.Color(p.shallow)},
  uWave:{value:1},uFoam:{value:1},uCaustic:{value:1},
 };
 const material=new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  vertexShader:`
  varying vec2 vUv;varying vec3 vWorld;
  void main(){vUv=uv;vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}
  `,
  fragmentShader:`
  precision highp float;
  uniform float uTime,uWave,uFoam,uCaustic;
  uniform sampler2D uFlowTexture,uCaustics;
  uniform vec3 uDeep,uShallow;
  varying vec2 vUv;varying vec3 vWorld;
  void main(){
    vec4 field=texture2D(uFlowTexture,vUv);
    vec2 velocity=(field.rg*2.0-1.0)*field.b;
    vec2 coord=vUv*5.0;
    vec2 uv1=coord+velocity*uTime*0.28;
    vec2 uv2=coord-velocity.yx*uTime*0.17;
    float broad=sin(uv1.x*8.0+uv1.y*3.0);
    float micro=sin(uv2.y*24.0-uv2.x*16.0);
    float wave=(broad*0.75+micro*0.25)*uWave;
    vec3 normal=normalize(vec3(0.13*cos(uv1.x*8.0),1.0,0.10*sin(uv2.y*12.0)));
    vec3 viewDir=normalize(cameraPosition-vWorld);
    float fresnel=pow(1.0-max(dot(normal,viewDir),0.0),3.0);
    // A decorative UV tint: NOT real scene depth.
    float depthMix=smoothstep(0.10,0.90,vUv.y);
    vec3 color=mix(uShallow,uDeep,0.6*depthMix);
    color*=0.96+wave*0.06;
    color+=vec3(0.25,0.39,0.47)*fresnel*0.45;
    float line=texture2D(uCaustics,vUv*2.0+velocity*uTime*0.07).r;
    color+=vec3(.08,.23,.22)*line*uCaustic*0.28;
    // Field alpha is only a local-tile border mask; real shores require geometry/depth.
    float foam=uFoam*field.a*clamp(.45+.18*broad,0.0,1.0);
    color=mix(color,vec3(.78,.93,.95),clamp(foam,0.0,.8));
    gl_FragColor=vec4(color,clamp(.78+.13*fresnel,0.0,1.0));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
  `,
 });
 return {material,update(timeSeconds,quality='high'){
  if(!Number.isFinite(timeSeconds))throw Error('invalid time');
  const q=waterCapabilities(quality);
  uniforms.uTime.value=timeSeconds;uniforms.uWave.value=q.microWave?1:0;
  uniforms.uFoam.value=q.foam?1:0;
  uniforms.uCaustic.value=quality==='high'?1:0;
 },dispose(){material.dispose();flow.dispose();caustic.dispose();}};
}
