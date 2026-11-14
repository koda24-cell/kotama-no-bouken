import * as THREE from 'three';

/**
 * Standalone stage-5 distant backdrop, not automatically integrated into gameplay.
 * Draw behind geometry only where the map's visibility/occlusion logic permits.
 * @param {{width?:number,height?:number,seed?:number}} opts
 * @returns {{mesh:THREE.Mesh,update:(seconds:number)=>void,dispose:()=>void}}
 */
export function createB5DistantFogBackground({width=24,height=12,seed=514,windowTexture=null}={}) {
  const vertexShader=`
    varying vec2 vUv;
    void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
  `;
  const fragmentShader=`
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform float uSeed;
    uniform sampler2D uWindowMap;
    uniform float uUseWindowMap;
    uniform float uFlashStrength;
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
      float windowSeed=hash(block*17.7+cell*3.13+uSeed);
      float pulse=pow(max(0.,sin(uTime*(.25+windowSeed*.8)+windowSeed*6.283)),18.);
      float flicker=.65+.25*sin(uTime*.15+windowSeed*6.283)+.38*pulse;
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
      // Warp both fog layers slowly to mimic organic rolling and drifting.
      vec2 drift=vec2(fbm(uv*vec2(2.5,3.)+uTime*.018),fbm(uv*vec2(3.,2.5)-uTime*.014));
      float warp=fbm(uv*vec2(6.,4.)+drift*.9+vec2(uTime*.026,-uTime*.009));
      col+=vec3(.065,.012,.09)*smoothstep(.35,.7,warp);
      vec3 lights=windows(uv);
      if(uUseWindowMap>.5){
        vec2 wuv=vec2(fract(uv.x*2.0),fract(uv.y*1.0));
        vec3 realLight=texture2D(uWindowMap,wuv).rgb;
        float mask=step(.09,max(max(realLight.r,realLight.g),realLight.b));
        vec2 grid=floor(uv*vec2(110.,50.));
        float windowSeed=hash(grid+uSeed);
        float pulse=pow(max(0.,sin(uTime*(.22+windowSeed*.8)+windowSeed*6.283)),22.);
        float flicker=.58+.22*sin(uTime*.18+windowSeed*6.283)+.7*pulse;
        lights=realLight*mask*vec3(1.,.55,.74)*1.45*flicker;
      }
      float farFog=fbm(uv*vec2(3.7,2.1)+vec2(uTime*.016,0.));
      col+=lights*(.42+.38*farFog);
      float fog1=smoothstep(.36,.73,cloud)*.56;
      float fog2=smoothstep(.40,.76,wisps)*.40;
      col=mix(col,vec3(.18,.045,.19),fog1*.65);
      col=mix(col,vec3(.11,.052,.15),fog2*.65);
      col+=vec3(.08,.014,.055)*pow(max(0.,cloud-.55)*2.,2.);
      // Sparse deterministic purple lightning-like bloom in the cloud field.
      float flashCell=floor(uTime*.31);
      float chance=hash(vec2(flashCell,uSeed));
      float phase=fract(uTime*.31);
      float flash=(1.-smoothstep(.025,.13,phase))*step(.81,chance)*uFlashStrength;
      vec2 flashPos=vec2(.12+.76*hash(vec2(flashCell,5.)),.25+.5*hash(vec2(flashCell,9.)));
      float halo=exp(-dot((uv-flashPos)*vec2(2.3,3.1),(uv-flashPos)*vec2(2.3,3.1))*9.);
      col+=vec3(.36,.13,.62)*flash*halo;
      gl_FragColor=vec4(col,1.);
    }
  `;
  const uniforms={uTime:{value:0},uSeed:{value:seed},uWindowMap:{value:windowTexture},uUseWindowMap:{value:windowTexture?1:0},uFlashStrength:{value:1}};
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,depthWrite:false,depthTest:true,side:THREE.DoubleSide});
  const geometry=new THREE.PlaneGeometry(width,height);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name='b5-distant-window-fog-background';
  mesh.renderOrder=-100;
  return {mesh,update(seconds){uniforms.uTime.value=seconds;},dispose(){geometry.dispose();material.dispose();}};
}
