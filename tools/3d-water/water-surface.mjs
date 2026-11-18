/* Experimental WebGL water surface: authored for Kotama, not derived game shaders.
   No screen-space reflection, depth buffer or fluid simulation required. */
import * as THREE from 'three';
import {waterCapabilities} from './water-quality.mjs';
export {waterCapabilities,selectWaterQuality} from './water-quality.mjs';
export const WATER_PRESETS=Object.freeze({
  lake:{shallow:0x57bfcb,deep:0x164765,opacity:0.82,flow:[0.12,0.025],foam:0.045},
  stream:{shallow:0x81dce0,deep:0x1a6879,opacity:0.78,flow:[0.34,0.045],foam:0.10},
  waterfall:{shallow:0xa9eff6,deep:0x3d89ac,opacity:0.86,flow:[0.02,0.68],foam:0.24},
});
/** Creates a self-contained surface shader; ground/water geometry remains caller-owned.
    For arbitrary flowing channels use a future per-vertex/flow-map direction field. */
export function createKotamaWaterMaterial(type='lake'){
 const p=WATER_PRESETS[type];
 if(!p)throw Error('unknown water preset');
 return new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,side:THREE.DoubleSide,
  uniforms:{
   uTime:{value:0},uShallow:{value:new THREE.Color(p.shallow)},uDeep:{value:new THREE.Color(p.deep)},
   uOpacity:{value:p.opacity},uFlow:{value:new THREE.Vector2(...p.flow)},
   uFoamWidth:{value:p.foam},uMicro:{value:1},uFoam:{value:1},
  },
  vertexShader:`varying vec3 vWorld; varying vec2 vUv;
void main(){vUv=uv;vec4 wp=modelMatrix*vec4(position,1.);vWorld=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
  fragmentShader:`precision highp float;
uniform float uTime,uOpacity,uFoamWidth,uMicro,uFoam;
uniform vec3 uShallow,uDeep;
uniform vec2 uFlow;
varying vec3 vWorld;varying vec2 vUv;
void main(){
 vec2 coord=vWorld.xz;
 // Two independently moving bands imitate surface normals without textures.
 float a=sin(dot(coord+uFlow*uTime,vec2(2.4,1.7))*2.3);
 float b=cos(dot(coord-uFlow.yx*uTime*0.65,vec2(-2.9,2.1))*1.8);
 float micro=sin(dot(coord+uFlow*uTime*1.35,vec2(15.3,9.4)));
 float ripples=0.55*a+0.35*b+0.10*micro*uMicro;
 vec3 N=normalize(vec3(-0.17*cos(dot(coord+uFlow*uTime,vec2(2.4,1.7))*2.3),
   1.,-0.15*sin(dot(coord-uFlow.yx*uTime*0.65,vec2(-2.9,2.1))*1.8)));
 vec3 V=normalize(cameraPosition-vWorld);
 float fresnel=pow(1.0-max(dot(N,V),0.0),3.0);
 // UV edge foam is a preview mask, NOT a real coastline/depth intersection.
 float edge=min(min(vUv.x,1.-vUv.x),min(vUv.y,1.-vUv.y));
 float foam=uFoam*(1.-smoothstep(0.,max(uFoamWidth,0.001),edge))
   *(0.47+0.20*sin(uTime*2.+coord.x*4.5+coord.y*3.2));
 float depthTint=smoothstep(.10,.90,vUv.y);
 vec3 base=mix(uShallow,uDeep,depthTint*.64);
 vec3 col=base*(0.93+0.095*ripples)+vec3(0.25,0.55,0.67)*fresnel*.55;
 col=mix(col,vec3(.79,.94,.96),clamp(foam,0.,1.));
 gl_FragColor=vec4(col,clamp(uOpacity+fresnel*.10,0.,1.));
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`,
 });
}
export function updateKotamaWater(material,timeSeconds,quality='high'){
 if(!Number.isFinite(timeSeconds))throw Error('invalid time');
 const q=waterCapabilities(quality);
 material.uniforms.uTime.value=timeSeconds;
 material.uniforms.uMicro.value=q.microWave?1:0;
 material.uniforms.uFoam.value=q.foam?1:0;
}
