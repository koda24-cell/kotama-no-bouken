'use strict';
const fs=require('fs'),path=require('path');process.chdir(path.resolve(__dirname,'../..'));
const base=JSON.parse(fs.readFileSync('assets/3d/dungeons/b1_sacred_forest_candidates/scene/game-layout-v4.json')).beforeFingerprint.saveCriticalData.map;
const g=base.map(r=>[...r]);
const paths=[[[1,7],[1,1],[5,1],[5,3]],[[3,1],[3,5]],[[7,3],[7,7],[9,7],[9,11],[7,11],[7,13]],[[5,15],[7,15],[7,13],[11,13],[11,15],[15,15],[15,13],[19,13],[19,15],[23,15],[23,13],[25,13],[25,9],[23,9]],[[11,13],[11,9],[13,9]],[[15,15],[15,16],[19,16],[19,15]],[[21,15],[21,11]],[[23,5],[25,5],[25,7],[23,7],[23,9]],[[25,11],[26,11]],[[25,13],[26,13]],[[1,3],[3,3]]];
for(const points of paths)for(let i=1;i<points.length;i++){const[x,z]=points[i-1],[a,b]=points[i];if(x!==a&&z!==b)throw Error('Diagonal');for(let y=Math.min(z,b);y<=Math.max(z,b);y++)for(let xx=Math.min(x,a);xx<=Math.max(x,a);xx++){if(g[y][xx]==='~')throw Error('Water footprint');if(g[y][xx]==='#')g[y][xx]=',';}}
const rows=g.map(r=>r.join('')),render=rs=>rs.map((r,i)=>'        '+JSON.stringify(r)+(i<rs.length-1?',':'')).join('\n');
const p='data/field-maps.js';let s=fs.readFileSync(p,'utf8');if(s.includes(render(base)))s=s.replace(render(base),render(rows));else if(!s.includes(render(rows)))throw Error('Unknown source map');fs.writeFileSync(p,s);
fs.writeFileSync('docs/reviews/f1-v5/map-plan.json',JSON.stringify({paths,from:base,to:rows},null,2));
