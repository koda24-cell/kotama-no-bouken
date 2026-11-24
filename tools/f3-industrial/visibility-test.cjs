const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const code=fs.readFileSync('field/b3-industrial-visibility.js','utf8');
 const {cityLineOfSight:los,cityVisibility:visible}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 const cells=new Set(['1,0','1,1','0,1']);const solid=(x,z)=>cells.has(`${x},${z}`);
 assert.equal(los(0,0,8,0,solid),false,'wall blocks building beyond it');
 assert.equal(los(0,0,0,-8,solid),true,'open street stays visible');
 assert.equal(los(0,0,4,0,solid,[1,0,1,0]),true,'own wall-mounted prop stays visible');
 assert.equal(los(0,0,8,0,solid,[2,0,2,0]),false,'owner exemption does not ignore intervening wall');
 assert.equal(los(0,0,8,8,solid,[2,2,2,2]),false,'touching diagonal corners do not leak');
 assert.equal(visible({x:0,z:0},{min:[7,0,-.4],max:[9,7,.4]},solid),false);
 assert.equal(visible({x:0,z:0},{min:[-.3,0,-10],max:[.3,4,-8]},solid),true);
 assert.equal(visible({x:0,z:0},{min:[0,0,-70],max:[1,4,-68]},solid),false,'far geometry is culled');
 // Quarter-turn invariance catches one-axis rounding and negative-coordinate errors.
 const rotate=(x,z)=>[-z,x],rotSolid=(x,z)=>solid(z,-x);
 for(const [tx,tz]of [[8,0],[0,-8],[8,8],[-8,-8]]){const [rx,rz]=rotate(tx,tz);assert.equal(los(0,0,tx,tz,solid),los(0,0,rx,rz,rotSolid));}
 console.log('Industrial sightlines: blocked streets, visible facade, corner closure, range and rotation passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
