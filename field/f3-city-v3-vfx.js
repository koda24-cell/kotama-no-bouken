/* Isolated review effects. One reflection target for the whole flooded district. */
import {Reflector} from 'three/addons/objects/Reflector.js';

export function createCityV3Water(T,{cells,cellSize=4,y=-1.2,high=false}){
 const positions=[],uvs=[];
 for(const [x,z]of cells){
  const a=x*cellSize-cellSize/2,b=x*cellSize+cellSize/2,c=-z*cellSize-cellSize/2,d=-z*cellSize+cellSize/2;
  for(const [px,py]of[[a,c],[b,c],[b,d],[a,c],[b,d],[a,d]]){positions.push(px,py,0);uvs.push(px*.12,py*.12);}
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
 const shader={uniforms:{color:{value:new T.Color(0x748d83)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},time:{value:0}},
  vertexShader:`uniform mat4 textureMatrix; varying vec4 reflectionUV; varying vec2 flowUV;
  void main(){flowUV=uv;reflectionUV=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform sampler2D tDiffuse;uniform vec3 color;uniform float time;varying vec4 reflectionUV;varying vec2 flowUV;
  void main(){vec4 q=reflectionUV;vec2 wave=vec2(sin(flowUV.x*2.1+flowUV.y*.7+time*.6),cos(flowUV.y*2.7-flowUV.x*.3+time*.4));q.xy+=wave*.0018*q.w;
   vec3 reflected=texture2DProj(tDiffuse,q).rgb;float ripple=sin(flowUV.x*8.+flowUV.y*4.+time*.9)*.012;
   gl_FragColor=vec4(mix(color,reflected,.42)+ripple,.52);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`};
 const object=new Reflector(geometry,{shader,textureWidth:high?512:128,textureHeight:high?512:128,clipBias:.01});
 object.name='city-v3 connected translucent floodwater';object.rotation.x=-Math.PI/2;object.position.y=y;object.userData.cityDynamic=true;
 object.material.transparent=true;object.material.depthWrite=false;
 const reflect=object.onBeforeRender;let last=-Infinity;
 object.onBeforeRender=function(...args){const now=performance.now();if(now-last<(high?120:300))return;last=now;reflect.apply(this,args);};
 return {object,tick:t=>{object.material.uniforms.time.value=t;},dispose(){object.dispose();geometry.dispose();}};
}

export function createCityV3LightShafts(T,sites){
 const object=new T.Group(),resources=[],time={value:0};object.name='city-v3 slanting roof light';object.userData.cityDynamic=true;
 const shader=new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{time},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 vUv;uniform float time;void main(){float edge=pow(max(0.,sin(vUv.x*3.14159)),2.);float fade=smoothstep(0.,.15,vUv.y)*(1.-smoothstep(.68,1.,vUv.y));float drift=.86+.14*sin(time*.5+vUv.y*7.);gl_FragColor=vec4(.91,.94,.81,edge*fade*drift*.055);}`});resources.push(shader);
 for(const site of sites){
  const bottom=new T.Vector3(site.x,site.y+.15,site.z),top=bottom.clone().add(new T.Vector3(-7,17,-5));
  for(const width of[new T.Vector3(2.3,0,0),new T.Vector3(0,0,2.3)]){
   const points=[bottom.clone().sub(width),bottom.clone().add(width),top.clone().addScaledVector(width,.40),top.clone().addScaledVector(width,-.40)];
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));geometry.setAttribute('uv',new T.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();resources.push(geometry);
   const mesh=new T.Mesh(geometry,shader);mesh.userData.cityDynamic=true;mesh.frustumCulled=false;object.add(mesh);
  }
 }
 return {object,tick:t=>{time.value=t;},dispose(){for(const resource of resources)resource.dispose();}};
}
