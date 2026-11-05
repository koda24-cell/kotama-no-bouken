/* Development-only loader. GitHub Pages / public hosts never load debug modules. */
(function(){
 "use strict";
 const host=location.hostname;
 const isLocal=host==="localhost"||host==="127.0.0.1";
 if(!isLocal)return;
 const css=document.createElement("link");css.rel="stylesheet";css.href="./debug/debug.css?v=20261106-2";document.head.appendChild(css);
 ["debug-save.js","debug-assets.js","debug-version.js","debug.js"].forEach(name=>{const s=document.createElement("script");s.src="./debug/"+name+"?v=20261106-2";s.async=false;document.head.appendChild(s)});
})();