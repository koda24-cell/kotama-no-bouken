'use strict';
// Exercise existing deserialization and start placement with positions made solid by V4.
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path'),cp=require('child_process');
const ROOT=path.resolve(__dirname,'../..');process.chdir(ROOT);const read=p=>fs.readFileSync(p,'utf8');
const p=read('field/field-persistence.js'),deserialize=p.slice(p.indexOf('function fieldDeserialize(d)'),p.indexOf('/* ------------------------------------------------------------',p.indexOf('function fieldDeserialize(d)')));
const context={state:{firstStageStarted:true,maxUnlockedStage:1},enemyEncounterCounts:{},fieldLootDeserialize:()=>{}};vm.createContext(context);
vm.runInContext(read('data/field-maps.js')+'\n'+read('field.js')+'\n'+read('field/field-navigation.js')+'\n'+deserialize+'\nthis.a=fieldArea(1,2);',context);
const prior={};vm.createContext(prior);vm.runInContext(cp.execFileSync('git',['show','fb8a776:data/field-maps.js'],{encoding:'utf8'})+'\n'+read('field.js')+'\nthis.a=fieldArea(1,2);this.s=(x,z)=>fieldCharSolid(a,fieldTileAt(a,x,z));',prior);
const tests=[];
for(let z=0;z<context.a.h;z++)for(let x=0;x<context.a.w;x++)if(context.a.floor.map[z][x]==='#'&&!prior.s(x,z)){
 const r=vm.runInContext(`(()=>{const p=fieldTileCenter(${x},${z});const flags={'chest:1-2:10:6':true,'floor:1-2':true,'side:woodcutter':true};fieldDeserialize({area:1,floor:2,x:p.x,y:p.y,positioned:true,flags});const rejected=!fieldState.positioned;fieldPlaceAtStart();return {rejected,tile:fieldPlayerTile(),flags:fieldState.flags};})()`,context);
 assert(r.rejected);assert.deepEqual(JSON.parse(JSON.stringify(r.tile)),{tx:context.a.start.tx,ty:context.a.start.ty});assert.equal(r.flags['chest:1-2:10:6'],true);assert.equal(r.flags['floor:1-2'],true);assert.equal(r.flags['side:woodcutter'],true);tests.push([x,z]);
}
assert(tests.length>0);fs.writeFileSync('docs/reviews/f1-v4/save-fallback.json',JSON.stringify({passed:true,changedPositionsChecked:tests.length,flagsPreserved:true,existingDeserializerAndStartPlacement:true,limitations:'In-memory read-only fixture; disk persistence and full loot state are separate from this positional fallback check.'},null,2));console.log({passed:true,changedPositions:tests.length});
