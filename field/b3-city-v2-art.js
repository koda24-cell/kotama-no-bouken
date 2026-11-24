/* Trial-only composition helpers. Borrowed PBR images stay owned by the bundle. */
export function createStreetEdgeBlend(THREE, photoMaterials) {
  const source=photoMaterials.find(m=>m.name==='f3_damp_concrete');
  if(!source)return null;
  const n=128,data=new Uint8Array(n*n*4),hash=(x,y)=>{let h=Math.imul(x+83,374761393)^Math.imul(y+139,668265263);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};
  const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const edge=Math.sin(Math.PI*(y+.5)/n),broad=noise(x/15,y/20),fine=noise(x/3,y/3),i=(y*n+x)*4;
    const a=Math.max(0,Math.min(255,(edge*.65+broad*.52+fine*.20-.62)*650));
    data[i]=data[i+1]=data[i+2]=a;data[i+3]=255;
  }
  const mask=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);mask.wrapS=mask.wrapT=THREE.RepeatWrapping;mask.magFilter=mask.minFilter=THREE.LinearFilter;mask.channel=1;mask.needsUpdate=true;
  const material=source.clone();material.name='b3:v2-rooted-edge-blend';material.color.set(0x6a7858);material.alphaMap=mask;material.alphaTest=.34;material.side=THREE.DoubleSide;material.depthWrite=true;material.polygonOffset=true;material.polygonOffsetFactor=-1;material.roughness=.97;
  const geometry=new THREE.PlaneGeometry(4.04,.76);geometry.rotateX(-Math.PI/2);
  geometry.setAttribute('uv1',geometry.attributes.uv.clone());
  const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2.02,uv.getY(i)*.38);
  return {material,geometry,dispose(){material.dispose();geometry.dispose();mask.dispose();}};
}
