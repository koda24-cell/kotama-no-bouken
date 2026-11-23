'use strict';
// Compile the authored native map; no legacy courtyard anchors or copied clearance claims.
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path');
const ROOT=path.resolve(__dirname,'../..');process.chdir(ROOT);
const read=p=>fs.readFileSync(p,'utf8'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
const stable=x=>JSON.stringify(sort(x)),clean=x=>JSON.parse(JSON.stringify(x));
const c={window:{KotamaSacredPlaytest:true}};vm.createContext(c);vm.runInContext(read('data/field-maps.js')+'\n'+read('field/f1-review-layout-v6.js')+'\n'+read('field.js')+'\nthis.a=fieldArea(1,2);this.solid=(x,z)=>fieldCharSolid(a,fieldTileAt(a,x,z));',c);
const a=clean(c.a),map=a.floor.map,w=a.w,h=a.h;
const previous=JSON.parse(read('assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v3.json'));
const l=clean(previous),KIT='assets/3d/dungeons/b1_sacred_forest_candidates/';
l.presentationRevision='closed_ruins_v4';l.natureRevision=6;l.mapModified=false; // Descriptor never mutates the native map; verifies the separately authored map.
l.expectedSourceBaseline={branch:'feature/f1-nature-light-v5-20261123',note:'Authored V4 map; original development identity comparison in map-qa.json'};
const critical={area:1,floor:2,floorKey:a.key,width:w,height:h,map,objects:a.objects,foes:a.floor.foes,chests:a.floor.chests,gathers:a.floor.gathers,encounter:a.floor.encounter,start:a.start,up:a.up,down:a.down,areaStage:a.def.stage,enterScene:a.def.enterScene,bossScene:a.def.bossScene,signScene:a.def.signScene,objectDefinitions:a.def.objects};
l.beforeFingerprint={algorithm:'SHA-256 over recursively key-sorted JSON',mapSha256:sha(stable(map)),saveCriticalDataSha256:sha(stable(critical)),saveCriticalData:clean(critical)};
const m=JSON.parse(read(KIT+'manifest.json'));const assets=new Map(m.assets.map(x=>[x.id,{id:x.id,file:KIT+x.file,sha256:x.sha256}]));
const archFile='assets/3d/dungeons/b1_layer_v4_candidates/modules/v4_passage_arch.glb';
l.revisionSources.push({id:'v4_passage_arch',file:archFile,sha256:sha(fs.readFileSync(archFile))});
for(const x of l.revisionSources)assets.set(x.id,x);
function row(id,assetId,position,rotationY=0,scale=[1,1,1],extra={}){const s=assets.get(assetId);if(!s)throw Error(assetId);return{id,assetId,file:s.file,sourceSha256:s.sha256,position,rotationY,scale,...extra};}
const char=(x,z)=>map[z]?.[x]??'#',walk=(x,z)=>x>=0&&z>=0&&x<w&&z<h&&!c.solid(x,z);
const water=(x,z)=>char(x,z)==='~';
// Interactive solid tiles still have visible floor and objects; only masonry is a visual wall.
const open=(x,z)=>x>=0&&z>=0&&x<w&&z<h&&char(x,z)!=='#';
const dirs=[[0,-1,0,'up'],[1,0,-Math.PI/2,'right'],[0,1,Math.PI,'down'],[-1,0,Math.PI/2,'left']];
const holes=[[11,3],[15,8],[3,13]],holeSet=new Set(holes.map(t=>t.join(',')));
l.floorPlacements=[];l.boundaryWallPlacements=[];l.ceilingPlacements=[];l.candidatePropPlacements=[];l.dressingGroundPlacements=[];l.cells=[];
const props=l.candidatePropPlacements,solid=[],waterTiles=[];
for(let z=0;z<h;z++)for(let x=0;x<w;x++){
 const t=[x,z],key=t.join(','),isWalk=walk(x,z),isWater=water(x,z),isNiche=x===11&&z===3;
 l.cells.push({tile:t,sourceChar:char(x,z),worldCenter:[x*4,0,z*4],navigationSolid:!isWalk,visualWall:!open(x,z),water:isWater,zone:z>12?'root_approach':isWater?'sunken_grove':'sealed_corridor',ceiling:!holeSet.has(key)});
 if(!isWalk)solid.push(t);if(isWater)waterTiles.push(t);
 if(open(x,z)&&!isWater)l.floorPlacements.push(row('floor_'+x+'_'+z,'mod_sacred_stone_floor_4m',[x*4,0,z*4],((x+z)%4)*Math.PI/2,[1,1,1],{tile:t,renderProfile:'stone_full_asset',sourceCharUnchanged:char(x,z)}));
 if(isNiche)l.dressingGroundPlacements.push(row('niche_ground','mod_root_soil_floor_4m',[44,0,12],0,[1,1,1],{tile:t,renderProfile:'soil_surface_only',sourceCharUnchanged:'#',gameTraversable:false,navigationSolidUnchanged:true,mapBoundsExpanded:false}));
 const boss=x>=21&&z<=4,roofId=holeSet.has(key)?'v3_collapse_oculus':'legacy_root_ceiling';
 l.ceilingPlacements.push(row('roof_'+key,roofId,[x*4,holeSet.has(key)?3.5:boss?5.1:4.3,z*4]));
 if(!open(x,z)&&!isNiche)continue;
 for(const [dx,dz,rot,name]of dirs){if(open(x+dx,z+dz)||(x+dx===11&&z+dz===3)||(isNiche&&x+dx===12&&z+dz===3))continue;
  l.boundaryWallPlacements.push(row('wall_'+x+'_'+z+'_'+name,'mod_sacred_wall_4m',[x*4+dx*2,0,z*4+dz*2],rot,[1,boss?1.25:1,1],{openTile:t,blockedTile:[x+dx,z+dz],boundary:name}));
 }
 if(isWalk){
  props.push(row('moss_'+key,'v3_moss_veil',[x*4,.012,z*4],((x*7+z*11)%16)*Math.PI/8,[.9,1,.9]));
  if((x+z)%2===0){const d=dirs.find(([dx,dz])=>!open(x+dx,z+dz));if(d)props.push(row('understory_'+key,'v3_shade_understory',[x*4+d[0]*1.6,0,z*4+d[1]*1.6],x+z,[.65,.8,.65]));}
  const protectedObject=a.objects.some(o=>Math.abs(o.tx-x)+Math.abs(o.ty-z)<=1);
  if(!protectedObject&&(x+z)%3===0){const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].filter(([dx,dz])=>!open(x+dx,z)&&!open(x,z+dz));for(const[dx,dz]of corners.slice(0,1))props.push(row('pillar_'+key,'legacy_pillar',[x*4+dx*1.65,0,z*4+dz*1.65],0,[.7,1,.7]));}
 }
}
const heroVerge=new Set(['5,14','1,5','7,12','11,14','15,14','21,14','25,10','19,4']);
// Reused assets form edge ecologies: stone base, low plants, sparse flowers, hanging canopy.
for(let z=1;z<h-1;z++)for(let x=1;x<w-1;x++){
 if(!walk(x,z)||a.objects.some(o=>Math.abs(o.tx-x)+Math.abs(o.ty-z)<=1))continue;
 const seed=x*17+z*31,sides=dirs.filter(([dx,dz])=>!open(x+dx,z+dz));if(!sides.length)continue;
 const[dx,dz,rot]=sides[seed%sides.length],side=[x*4+dx*1.72,0,z*4+dz*1.72];
 if(heroVerge.has(x+','+z))props.push(row('nature_log_'+x+'_'+z,'fallen_cedar_log',[side[0]+dz*.4,-.05,side[2]-dx*.4],rot,[.55,.55,.55]));
 if(seed%3===0||heroVerge.has(x+','+z))props.push(row('nature_rock_'+x+'_'+z,'mossy_granite_boulder',[side[0],-.15,side[2]],rot,[.43,.62,.43]));
 if(seed%2===0||seed%3===0||heroVerge.has(x+','+z))props.push(row('nature_growth_'+x+'_'+z,'v3_shade_understory',[side[0]-dz*.35,0,side[2]+dx*.35],seed,[.85,.9,.85]));
 if(seed%7===0||heroVerge.has(x+','+z))props.push(row('nature_fern_'+x+'_'+z,'forest_fern_cluster',[side[0]+dz*.45,0,side[2]-dx*.45],seed,heroVerge.has(x+','+z)?[.9,1.2,.9]:[.68,.8,.68]));
 if(seed%5===0||heroVerge.has(x+','+z))props.push(row('nature_flower_'+x+'_'+z,'white_wildflower_patch',[side[0]-dz*.55,0,side[2]+dx*.55],seed,[.7,.8,.7]));
 if(seed%2===1)props.push(row('nature_vine_'+x+'_'+z,'hanging_forest_vines',[side[0],4.1,side[2]],rot,[.9,1.0+(seed%3)*.06,.9]));
}
// Thresholds connect lateral walls and never act as isolated garden props.
for(const[x,z]of[[5,13],[4,11],[1,8],[5,4],[8,3],[11,5],[19,3],[23,4]]){
 const vertical=walk(x,z-1)&&walk(x,z+1)&&!open(x-1,z)&&!open(x+1,z);
 const horizontal=walk(x-1,z)&&walk(x+1,z)&&!open(x,z-1)&&!open(x,z+1);
 if(!vertical&&!horizontal)throw Error('Unconnected authored threshold '+[x,z]);
 props.push(row('threshold_'+x+'_'+z,'v4_passage_arch',[x*4+(horizontal?2:0),0,z*4+(vertical?2:0)],vertical?0:Math.PI/2));
}
props.push(row('niche_arch','v4_passage_arch',[46,0,12],Math.PI/2));
props.push(row('niche_shrine','sacred_hokora_shrine',[44,0,12],Math.PI/2));
props.push(row('niche_torii','weathered_torii_gate',[50,0,12],-Math.PI/2,[1,.8,1]));
for(const[z,n]of[[10.5,'north'],[13.5,'south']]){
 props.push(row('niche_lantern_'+n,'moss_stone_lantern',[44.7,0,z],0,[.6,.6,.6]));
 props.push(row('niche_growth_'+n,'v3_shade_understory',[45,0,z],0,[1,1,1]));
}
props.push(row('niche_ofuda','ofuda_seal_cluster',[42.15,.8,12],Math.PI/2,[.7,.7,.7]));
props.push(row('niche_stele','broken_votive_stele',[44,0,13.5],.25,[.65,.65,.65]));
for(const z of[28,36])props.push(row('flood_partition_'+z,'mod_sacred_wall_4m',[62,0,z],Math.PI/2));
props.push(row('flood_partition_arch','v4_passage_arch',[62,-.15,32],Math.PI/2));
for(const[x,z]of waterTiles)for(const[dx,dz,rot,name]of dirs)if(!water(x+dx,z+dz)&&walk(x+dx,z+dz))props.push(row('bank_'+x+'_'+z+'_'+name,'v3_eroded_bank',[x*4+dx*2,0,z*4+dz*2],rot));
l.navigation={source:'actual V4 native map',walkableTileCount:w*h-solid.length,navigationSolidTiles:solid,preservedWaterTiles:waterTiles,reservedObjectAndFoeNeighbourhoods:[],clearanceSweptRectangles:[]};
l.preservedFoes.definitions=a.floor.foes;
l.closedRuinsV3={roof:{roofModules:w*h,openingCount:holes.length,openings:holes,coveredWalkFloorCells:w*h-solid.length-holes.filter(([x,z])=>walk(x,z)).length,walkFloorCells:w*h-solid.length,walkFloorCoverage:(w*h-solid.length-holes.filter(([x,z])=>walk(x,z)).length)/(w*h-solid.length),eyeMeters:1.6},lightPockets:[],visualApproval:'pending_user_review'};
for(const k of['omittedUnsafePropPlacements','authoredArtPockets','authoredForestDensity','integrationHandoff','omittedUnsafeDressingGroundPlacements'])delete l[k];
l.performanceEstimate={status:'not_measured_for_v4',realDevicePerformanceApproved:false};l.assetGeometryVerification={status:'pending_v4_actual_geometry_clearance'};
l.closedRuinsV4={design:'narrow branching labyrinth, sealed dead-end shrine, divided flooded chamber',approval:'NOT_APPROVED',archSource:assets.get('v4_passage_arch'),sequentialProduction:true};
const dest=KIT+'scene/game-layout-v6.json';fs.writeFileSync(dest,JSON.stringify(l,null,2)+'\n');console.log(JSON.stringify({dest,visualFloors:l.floorPlacements.length,walkable:l.navigation.walkableTileCount,walls:l.boundaryWallPlacements.length,props:props.length,roof:l.ceilingPlacements.length}));
