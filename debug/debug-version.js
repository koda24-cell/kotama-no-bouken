/* Version display and local draft changelog. No automatic repository writes. */
(function(){
 "use strict";
 const VERSION_URL="./debug/version.json", CHANGELOG_URL="./debug/CHANGELOG.md", LOCAL_KEY="kotamaDebugLocalChangelogV1";
 async function load(){const [v,c]=await Promise.all([fetch(VERSION_URL,{cache:"no-store"}),fetch(CHANGELOG_URL,{cache:"no-store"})]);if(!v.ok||!c.ok)throw new Error("バージョン情報を読み込めません");return {version:await v.json(),changelog:await c.text(),local:JSON.parse(localStorage.getItem(LOCAL_KEY)||"[]")}}
 function add(entry){const list=JSON.parse(localStorage.getItem(LOCAL_KEY)||"[]");list.unshift({...entry,createdAt:new Date().toISOString(),status:"ローカル記録・未反映"});localStorage.setItem(LOCAL_KEY,JSON.stringify(list));return list}
 window.KotamaDebugVersion={load,add,LOCAL_KEY};
})();