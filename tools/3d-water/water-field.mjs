/** Tileable, self-authored flow/caustic RGBA texture generation. No external game assets. */
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const fract=v=>v-Math.floor(v),smooth=v=>{let t=clamp(v,0,1);return t*t*(3-2*t)};
const mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y,seed)=>fract(Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453);
function noise(u,v,grid,seed){
 const x=u*grid,y=v*grid,ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y));
 const h=(x,y)=>hash((x+grid)%grid,(y+grid)%grid,seed);
 return mix(mix(h(ix,iy),h(ix+1,iy),fx),mix(h(ix,iy+1),h(ix+1,iy+1),fx),fy);
}
export const WATER_EDGES=Object.freeze({N:8,E:2,S:1,W:4});
export function validWaterNeighbor(a,b,direction){
 if(!Number.isInteger(a)||a<0||a>15||!Number.isInteger(b)||b<0||b>15)throw Error('invalid tile mask');
 const opposite={N:'S',S:'N',E:'W',W:'E'};
 if(!opposite[direction])throw Error('invalid direction');
 return Boolean(a&WATER_EDGES[direction])===Boolean(b&WATER_EDGES[opposite[direction]]);
}
/** Encodes flow direction in RG, speed in B and local-tile foam in A. Edge foam is a preview mask, not actual coastline geometry. */
export function makeWaterFlowRGBA({size=128,seed=7,direction=[1,0],speed=.65,bankWidth=.13,swirl=.20}={}){
 if(!Number.isInteger(size)||size<8||size>1024)throw Error('invalid flow size');
 if(![...direction,speed,bankWidth,swirl,seed].every(Number.isFinite))throw Error('invalid parameters');
 const magnitude=Math.hypot(...direction);
 if(magnitude<1e-8)throw Error('zero flow direction');
 const base=[direction[0]/magnitude,direction[1]/magnitude],data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,perturb=(noise(u,v,4,seed)-.5)*2*swirl;
  const angle=Math.atan2(base[1],base[0])+perturb;
  const edge=Math.min(u,1-u,v,1-v),bank=smooth(edge/Math.max(.001,bankWidth));
  const curr=speed*(.25+.75*bank),i=(y*size+x)*4;
  data[i]=Math.round(127.5*(Math.cos(angle)+1));
  data[i+1]=Math.round(127.5*(Math.sin(angle)+1));
  data[i+2]=Math.round(clamp(curr,0,1)*255);
  data[i+3]=Math.round((1-bank)*255);
 }
 return {width:size,height:size,data,format:'RGBA8',channels:{r:'dir-x',g:'dir-y',b:'speed',a:'edge-foam'}};
}
export function makeCausticsRGBA({size=128,seed=5,scale=7}={}){
 if(!Number.isInteger(size)||size<8||size>1024||!Number.isFinite(seed)||!Number.isFinite(scale)||scale<=0)throw Error('invalid caustics parameters');
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size;
  const w1=Math.sin(TAU*(u*scale+noise(u,v,4,seed)*.18));
  const w2=Math.cos(TAU*(v*scale+noise(u,v,4,seed+9)*.18));
  const streak=Math.pow(clamp(1-Math.abs(w1*w2),0,1),6),i=(y*size+x)*4;
  data[i]=Math.round(streak*255);data[i+1]=Math.round(streak*.72*255);data[i+2]=0;data[i+3]=255;
 }
 return {width:size,height:size,data,format:'RGBA8'};
}
