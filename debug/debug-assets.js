/* Read-only asset inventory and conservative reference audit. */
(function(){
 "use strict";
 const MANIFEST="./debug/assets-manifest.json";
 const SOURCES=["./index.html","./style.css","./script.js"];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 async function load(){const m=await fetch(MANIFEST,{cache:"no-store"});if(!m.ok)throw new Error("素材マニフェストを取得できません");const manifest=await m.json();const texts=await Promise.all(SOURCES.map(async url=>{try{const r=await fetch(url,{cache:"no-store"});return {url,text:r.ok?await r.text():"",ok:r.ok}}catch(_){return {url,text:"",ok:false}}}));
 const all=texts.map(x=>x.text).join("\n");const rows=(manifest.files||[]).map(f=>{const refs=texts.filter(x=>x.text.includes(f.path)).map(x=>x.url.replace("./",""));const status=refs.length?"使用中":"要確認";return {...f,refs,status}});return {manifest,rows,sources:texts,broken:findBroken(all,rows)}}
 function findBroken(all,rows){const known=new Set(rows.map(x=>x.path));const found=new Set();const re=/(?:\.\/?|\/)?(?:assets|music|se)\/[A-Za-z0-9_\-./ぁ-んァ-ヶ一-龠々ー（）() 　]+\.(?:png|jpe?g|webp|gif|svg|mp3|ogg|wav|m4a|mp4|webm|json|woff2?|ttf|otf)/gi;let m;while((m=re.exec(all))){let p=m[0].replace(/^\.\//,"").replace(/^\//,"");if(!known.has(p))found.add(p)}return [...found]}
 window.KotamaDebugAssets={load,escape:esc};
})();