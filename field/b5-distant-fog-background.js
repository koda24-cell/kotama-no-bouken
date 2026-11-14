import * as THREE from 'three';

/**
 * Standalone stage-5 distant backdrop, not automatically integrated into gameplay.
 * Draw behind geometry only where the map's visibility/occlusion logic permits.
 * @param {{width?:number,height?:number,seed?:number}} opts
 * @returns {{mesh:THREE.Mesh,update:(seconds:number)=>void,dispose:()=>void}}
 */
export function createB5DistantFogBackground({width=24,height=12,seed=514}={}) {
  const vertexShader=`
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `;
  const fragmentShader=`
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uSeed;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
    float noise(vec2 p){
      vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
      return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                 mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
    }
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.07+11.3;a*=.5;}return v;}
    vec3 windows(vec2 uv){
      // Grouped illuminated rectangles, with no drawn building silhouettes.
      vec2 q=uv*vec2(18.,6.);
      vec2 block=floor(q),local=fract(q);
      float present=step(.43,hash(block+uSeed));
      vec2 cell=floor(local*vec2(4.,8.));
      vec2 f=fract(local*vec2(4.,8.));
      float on=step(.62,hash(block*17.7+cell+uSeed));
      float rect=step(.2,f.x)*step(f.x,.68)*step(.16,f.y)*step(f.y,.72);
      float flicker=.85+.15*sin(uTime*.25+hash(block+cell)*6.283);
      float light=present*on*rect*flicker;
      float warm=hash(block+cell*3.1);
      return mix(vec3(.48,.08,.28),vec3(1.,.35,.13),warm)*light;
    }
    void main(){
      vec2 uv=vUv;
      vec3 col=mix(vec3(.017,.012,.037),vec3(.065,.023,.065),uv.y);
      float wisps=fbm(uv*vec2(4.5,3.)+vec2(uTime*.011,-uTime*.003));
      float cloud=fbm(uv*vec2(7.,4.)+vec2(-uTime*.022,uTime*.006)+wisps*.8);
      float redVein=pow(max(0.,fbm(uv*vec2(8.,5.)+uTime*.005)-.56)*3.,2.);
      col+=vec3(.18,.022,.14)*redVein;
      vec3 lights=windows(uv);
      float farFog=fbm(uv*vec2(3.7,2.1)+vec2(uTime*.016,0.));
      col+=lights*(.42+.38*farFog);
      float fog1=smoothstep(.36,.73,cloud)*.56;
      float fog2=smoothstep(.40,.76,wisps)*.40;
      col=mix(col,vec3(.18,.045,.19),fog1*.65);
      col=mix(col,vec3(.11,.052,.15),fog2*.65);
      col+=vec3(.08,.014,.055)*pow(max(0.,cloud-.55)*2.,2.);
      gl_FragColor=vec4(col,1.);
    }
  `;
  const uniforms={uTime:{value:0},uSeed:{value:seed}};
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,depthWrite:false,depthTest:true,side:THREE.DoubleSide});
  const geometry=new THREE.PlaneGeometry(width,height);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='b5-distant-window-fog-background';
  mesh.renderOrder=-100;
  return {mesh,update(seconds){uniforms.uTime.value=seconds;},dispose(){geometry.dispose();material.dispose();}};
}
