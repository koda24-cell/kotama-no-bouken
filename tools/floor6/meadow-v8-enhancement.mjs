/** F6 meadow V8 LOOK experiment. Does not modify the source GLB or original materials.
 * Apply only AFTER enableV7MeadowWind; keeps V7 COLOR_0 and geometry intact.
 * World-space lighting is a stylized approximation, not a physical translucency model.
 */
export function installMeadowV8Look(root, sunDirection) {
  if (!sunDirection || ![sunDirection.x,sunDirection.y,sunDirection.z].every(Number.isFinite)) {
    throw Error('finite sun direction required');
  }
  const length=Math.hypot(sunDirection.x,sunDirection.y,sunDirection.z);
  if(length<1e-6)throw Error('zero sun direction');
  const uniforms={
    uKotamaEnhance:{value:1},
    uKotamaSunWorldDir:{value:{x:sunDirection.x/length,y:sunDirection.y/length,z:sunDirection.z/length}}
  };
  let count=0;
  root.traverse(mesh=>{
    if(!mesh.isMesh || !mesh.userData.originalV7Material)return;
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const mat of mats){
      const previous=mat.onBeforeCompile;
      const previousKey=mat.customProgramCacheKey?.bind(mat);
      mat.onBeforeCompile=(shader,renderer)=>{
        previous?.(shader,renderer);
        if(!shader.vertexShader.includes('#include <begin_vertex>')||
           !shader.fragmentShader.includes('#include <color_fragment>')||
           !shader.fragmentShader.includes('#include <lights_fragment_end>')){
          throw Error('V8 incompatible Three.js shader chunks');
        }
        Object.assign(shader.uniforms,uniforms);
        shader.vertexShader=`varying float vKotamaTip;
varying float vKotamaPhase;
varying vec2 vKotamaWorldXZ;
varying vec3 vKotamaWorldNormal;
`+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',
          `#include <begin_vertex>
vKotamaTip=aWindHeight;
vKotamaPhase=aPlantPhase;
vKotamaWorldXZ=(modelMatrix*vec4(position,1.0)).xz;
vKotamaWorldNormal=normalize(mat3(modelMatrix)*normal);`);
        shader.fragmentShader=`uniform float uKotamaEnhance;
uniform vec3 uKotamaSunWorldDir;
varying float vKotamaTip;
varying float vKotamaPhase;
varying vec2 vKotamaWorldXZ;
varying vec3 vKotamaWorldNormal;
`+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
          `#include <color_fragment>
// Keep source V7 vertex colors. Modulate root darkness and tip warmth subtly.
float kotamaTip=smoothstep(0.05,0.98,vKotamaTip);
vec3 kotamaShade=mix(vec3(0.79,0.85,0.75),vec3(1.00,1.015,0.93),kotamaTip);
float kotamaCluster=0.975+0.04*sin(vKotamaPhase*1.618);
float kotamaField=0.985+0.025*sin(vKotamaWorldXZ.x*3.7+vKotamaWorldXZ.y*1.9);
diffuseColor.rgb*=mix(vec3(1.0),kotamaShade*kotamaCluster*kotamaField,uKotamaEnhance);`);
        shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',
          `#include <lights_fragment_end>
// Very subtle backlit leaf approximation; no alpha transparency or additive glow.
float kotamaBack=pow(max(dot(-normalize(vKotamaWorldNormal),normalize(uKotamaSunWorldDir)),0.0),2.0);
reflectedLight.indirectDiffuse+=diffuseColor.rgb*(0.075*kotamaBack*uKotamaEnhance);`);
      };
      mat.customProgramCacheKey=()=> (previousKey?previousKey():'v7')+'|kotama-meadow-v8-look';
      if('roughness' in mat)mat.roughness=Math.max(mat.roughness??0,0.88);
      if('metalness' in mat)mat.metalness=0;
      // The original V7 GLB has emissiveFactor [1,1,1] on every grass material.
      // Disable its white self-illumination on the cloned review material only;
      // otherwise it can wash out COLOR_0 and defeat root occlusion.
      if(mat.emissive?.setRGB)mat.emissive.setRGB(0,0,0);
      if('emissiveIntensity' in mat)mat.emissiveIntensity=0;
      mat.needsUpdate=true;
    }
    count++;
  });
  if(count!==8)throw Error('expected 8 V7 grass/canopy meshes; found '+count);
  return {uniforms,matched:count,setEnhanced(enabled){uniforms.uKotamaEnhance.value=enabled?1:0;}};
}
