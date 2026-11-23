/* Local aperture lighting: three independent depth-tested shafts, no screen overlay. */
import * as THREE from 'three';
export function createApertureLightV4({root,openings,renderer}){
  const group=new THREE.Group();group.name='f1-v4:aperture-light';
  const geometry=[],materials=[],spots=[],time={value:0};let disposed=false;
  const previousShadow=renderer?{enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type}:null;
  function ownGeo(g){geometry.push(g);return g;}function ownMat(m){materials.push(m);return m;}
  const beamMaterial=ownMat(new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
    uniforms:{time},vertexShader:'varying vec2 shaftUV; void main(){shaftUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`varying vec2 shaftUV;uniform float time;
    void main(){float edge=pow(max(0.0,sin(shaftUV.x*6.283185)),2.0);float ends=smoothstep(0.0,0.15,shaftUV.y)*(1.0-smoothstep(0.82,1.0,shaftUV.y));float dust=0.92+0.08*sin(shaftUV.y*27.0+time*0.3);gl_FragColor=vec4(vec3(0.77,0.79,0.67),edge*ends*dust*0.075);}` }));
  const beamGeometry=ownGeo(new THREE.CylinderGeometry(.66,1.55,3.65,32,1,true));
  const skyGeometry=ownGeo(new THREE.CircleGeometry(.92,32));
  const skyMaterial=ownMat(new THREE.MeshBasicMaterial({color:0xc9d3be,side:THREE.DoubleSide}));
  for(const[x,z]of openings){
    const sky=new THREE.Mesh(skyGeometry,skyMaterial);sky.rotation.x=Math.PI/2;sky.position.set(x*4,4.38,z*4);sky.name='f1-v4:visible-sky-aperture';group.add(sky);
    const beam=new THREE.Mesh(beamGeometry,beamMaterial);beam.position.set(x*4,1.7,z*4);beam.name='f1-v4:soft-aperture-shaft';group.add(beam);
    const spot=new THREE.SpotLight(0xe4e2ca,240,7,.38,1,1.5);spot.position.set(x*4,4.3,z*4);spot.target.position.set(x*4,-.3,z*4);
    spot.castShadow=x===15&&!!renderer;spot.shadow.mapSize.set(512,512);spot.shadow.bias=-.0004;spot.shadow.normalBias=.025;
    spot.name='f1-v4:aperture-spot';group.add(spot,spot.target);spots.push(spot);
  }
  if(renderer){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
  root.add(group);
  return{update(t){time.value=t;},info(){return{apertures:openings.length,spotLights:spots.length,softShafts:openings.length,shadowMaps:spots.filter(s=>s.castShadow).length,disposed};},dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const s of spots)s.dispose();for(const g of geometry)g.dispose();for(const m of materials)m.dispose();if(renderer){renderer.shadowMap.enabled=previousShadow.enabled;renderer.shadowMap.type=previousShadow.type;}group.clear();}};
}
