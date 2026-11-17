/** Pure water quality decisions. No Three.js dependency, safe for Node tests. */
export function selectWaterQuality(projectedPixels,previous='medium'){
 if(!Number.isFinite(projectedPixels)||projectedPixels<0)throw Error('invalid projectedPixels');
 if(previous==='high') return projectedPixels<85?'medium':'high';
 if(previous==='low') return projectedPixels>32?'medium':'low';
 if(previous!=='medium')throw Error('unknown water quality');
 return projectedPixels>115?'high':projectedPixels<20?'low':'medium';
}
export function waterCapabilities(tier){
 if(tier==='low')return {microWave:false,foam:false,caustics:false};
 if(tier==='medium')return {microWave:true,foam:false,caustics:false};
 if(tier==='high')return {microWave:true,foam:true,caustics:false};
 throw Error('unknown water quality');
}
