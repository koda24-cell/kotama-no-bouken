/* Local sunlight volume and drifting leaf shadow. No visible light-source geometry. */
import * as THREE from 'three';
export function createApertureLightV5({root,openings,renderer}){
 const group=new THREE.Group(),materials=[],spots=[],time={value:0},geometry=new THREE.BoxGeometry(3.2,3.6,3.2);group.name='f1-v5:flowing-aperture-sunlight';let disposed=false;
 const previous=renderer?{enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type}:null;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,128,128);
 for(let i=0;i<13;i++){const x=(i*47+13)%128,y=(i*29+31)%128;const gradient=ctx.createRadialGradient(x,y,2,x,y,12+i%7);gradient.addColorStop(0,'rgba(0,0,0,.68)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(x-22,y-22,44,44);}
 const cookie=new THREE.CanvasTexture(canvas);cookie.colorSpace=THREE.NoColorSpace;
 for(const[x,z]of openings){
  const center=new THREE.Vector3(x*4,1.8,z*4);
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
   uniforms:{time,shaftCenter:{value:center}},vertexShader:'varying vec3 shaftWorld;void main(){shaftWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(shaftWorld,1.0);}',
   fragmentShader:`varying vec3 shaftWorld;uniform float time;uniform vec3 shaftCenter;
   void main(){vec3 origin=cameraPosition-shaftCenter;vec3 ray=normalize(shaftWorld-cameraPosition);vec3 safeRay=sign(ray+vec3(0.000001))*max(abs(ray),vec3(0.00001));
    vec3 a=(vec3(-1.6,-1.8,-1.6)-origin)/safeRay,b=(vec3(1.6,1.8,1.6)-origin)/safeRay;vec3 lo=min(a,b),hi=max(a,b);
    float begin=max(max(lo.x,lo.y),max(lo.z,0.0)),end=min(min(hi.x,hi.y),hi.z);float stepLength=max(0.0,end-begin)/10.0;float sum=0.0;
    for(int i=0;i<10;i++){vec3 p=origin+ray*(begin+(float(i)+0.5)*stepLength);float h=(p.y+1.8)/3.6;
      vec2 sway=vec2(sin(time*.24+h*2.7),cos(time*.19+h*2.0))*.12*(1.0-h);float radius=mix(1.25,.48,h);
      float radial=length(p.xz-sway)/radius;float feather=1.0-smoothstep(.16,1.0,radial);
      float ribbons=.5+.25*sin(p.x*14.0+p.z*8.0+time*.34+h*1.3)+.25*sin(p.z*19.0-p.x*5.0-time*.21);
      float ends=smoothstep(0.0,.16,h)*(1.0-smoothstep(.86,1.0,h));sum+=feather*ends*(.16+.84*ribbons*ribbons)*stepLength;
    }gl_FragColor=vec4(vec3(.86,.87,.69),min(.24,sum*.105));}`});materials.push(material);
  const beam=new THREE.Mesh(geometry,material);beam.position.copy(center);beam.name='f1-v5:soft-flowing-sun-rays';group.add(beam);
  const spot=new THREE.SpotLight(0xe4e2ca,205,7,.38,1,1.5);spot.position.set(x*4,4.3,z*4);spot.target.position.set(x*4,-.3,z*4);spot.map=cookie;
  spot.castShadow=x===15&&!!renderer;spot.shadow.mapSize.set(512,512);spot.shadow.bias=-.0004;spot.shadow.normalBias=.025;spot.userData.origin=[x*4,z*4];group.add(spot,spot.target);spots.push(spot);
 }
 if(renderer){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}root.add(group);
 return{update(t){if(disposed)return;time.value=t;spots.forEach((s,i)=>{const[x,z]=s.userData.origin;s.target.position.set(x+Math.sin(t*.19+i)*.12,-.3,z+Math.cos(t*.16+i)*.10);s.intensity=205*(.95+.05*Math.sin(t*.23+i));});},info:()=>({version:5,apertures:openings.length,spotLights:spots.length,softShafts:openings.length,shadowMaps:spots.filter(s=>s.castShadow).length,visibleEmitterMeshes:0,animatedLeafProjection:true,animatedTimeSeconds:time.value,disposed}),dispose(){if(disposed)return;disposed=true;group.removeFromParent();spots.forEach(s=>s.dispose());materials.forEach(m=>m.dispose());geometry.dispose();cookie.dispose();group.clear();if(renderer){renderer.shadowMap.enabled=previous.enabled;renderer.shadowMap.type=previous.type;}}};
}
