/** B2 modular vegetation placement. Independent of Three.js and game runtime.
 * The caller maps yielded transforms to THREE.Group instances; no global writes.
 * A single reusable GLB can be rotated/scaled without making duplicates.
 */
const HASH = 2166136261;
function rng32(seed) {
 let x=(seed>>>0)||HASH;
 return () => {x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
export const B2_PLANT_LIBRARY = Object.freeze({
 wet_fern_v01: Object.freeze({
  glb: 'b2_wet_ruin_fern_v01.glb',
  allowedSurfaces: ['wet_rock','ruin_crack','shore_soil','cave_floor'],
  excludeSurfaces: ['water','ice_smooth','walkway','door','stairs'],
  footprintRadius: 0.43, collision: false, maxPerTile:3, chance:0.42,
  scaleRange:[0.70,1.22], pitchRange:[-0.08,0.08],
 })
});
const sqr=(v)=>v*v;
const overlaps=(p,r,points)=>points.some(q=>sqr(q.x-p.x)+sqr(q.z-p.z)<sqr(q.radius+r));
/** Stable deterministic layout, independent for each tile and surface.
 * @param {object} opts
 * @param {number} opts.seed
 * @param {string} opts.tileKey stable cell identity, e.g. "floor2:4:8"
 * @param {string} opts.surface terrain tag from caller
 * @param {object} opts.bounds {minX,maxX,minZ,maxZ,y}
 * @param {Array} opts.reserved [{x,z,radius}] other props/route footprints
 * @param {number} opts.maxAttempts limits retries
 * @returns {Array} position, rotation, scale descriptors; no scene mutation
 */
export function planB2Vegetation({seed=1,tileKey,surface,bounds,reserved=[],maxAttempts=16,
 library=B2_PLANT_LIBRARY}) {
 if(!tileKey || !surface || !bounds) throw new Error('tileKey/surface/bounds required');
 let h=HASH;
 for(const c of String(tileKey)+':'+String(seed)) h=Math.imul(h^c.charCodeAt(0),16777619);
 const random=rng32(h), placed=[],occupied=reserved.map(p=>({...p}));
 const width=bounds.maxX-bounds.minX, depth=bounds.maxZ-bounds.minZ;
 if(width<=0||depth<=0)return [];
 for(const [id,asset] of Object.entries(library)){
  if(!asset.allowedSurfaces.includes(surface)||asset.excludeSurfaces.includes(surface))continue;
  if(random()>asset.chance)continue;
  let attempts=0;
  while(placed.filter(p=>p.assetId===id).length<asset.maxPerTile && attempts++<maxAttempts){
   const scale=asset.scaleRange[0]+random()*(asset.scaleRange[1]-asset.scaleRange[0]);
   const radius=asset.footprintRadius*scale;
   if(width<2*radius||depth<2*radius)break;
   const x=bounds.minX+radius+random()*(width-2*radius);
   const z=bounds.minZ+radius+random()*(depth-2*radius);
   if(overlaps({x,z},radius,occupied))continue;
   const point={assetId:id,glb:asset.glb,x,y:bounds.y,z,radius,
    yaw:random()*Math.PI*2,pitch:asset.pitchRange[0]+random()*(asset.pitchRange[1]-asset.pitchRange[0]),scale};
   placed.push(point);occupied.push(point);
  }
 }
 return placed;
}
