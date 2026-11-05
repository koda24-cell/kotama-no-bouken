/* Test-only save storage. Never writes to the game's production save keys. */
(function(){
 "use strict";
 const KEY="kotamaDebugTestSaveV1", BACKUP="kotamaDebugTestBackupV1";
 const PRODUCTION_KEYS=["fantasyRpgSave","kotamaSaveSlot1","kotamaSaveSlot2"];
 function readJSON(raw){if(!raw)return null;try{return JSON.parse(raw)}catch(_){return null}}
 function read(){return readJSON(localStorage.getItem(KEY))}
 function write(data){localStorage.setItem(KEY,JSON.stringify(data));return true}
 function snapshot(){const raw=localStorage.getItem("fantasyRpgSave");if(!raw)throw new Error("通常オートセーブがありません。");const game=readJSON(raw);if(!game||!game.state)throw new Error("通常セーブの形式を確認できません。");const wrapped={format:"kotama-debug-test-v1",createdAt:new Date().toISOString(),source:"read-only snapshot of fantasyRpgSave",game:JSON.parse(JSON.stringify(game))};write(wrapped);return wrapped}
 function reset(){localStorage.removeItem(KEY)}
 function backup(){const raw=localStorage.getItem(KEY);if(!raw)throw new Error("テストデータがありません。");localStorage.setItem(BACKUP,raw);return raw}
 function restore(){const raw=localStorage.getItem(BACKUP);if(!raw)throw new Error("バックアップがありません。");const parsed=readJSON(raw);if(parsed?.format!=="kotama-debug-test-v1"||!parsed.game?.state)throw new Error("バックアップ形式が不正です。");localStorage.setItem(KEY,raw);return parsed}
 function importJSON(raw){const parsed=readJSON(raw);if(parsed?.format!=="kotama-debug-test-v1"||!parsed.game?.state)throw new Error("テスト専用形式のJSONではありません。通常セーブは取り込みません。");write(parsed);return parsed}
 function audit(){return {testExists:!!localStorage.getItem(KEY),backupExists:!!localStorage.getItem(BACKUP),productionKeys:PRODUCTION_KEYS.map(key=>({key,exists:localStorage.getItem(key)!==null})),separate:true}}
 window.KotamaDebugSave={KEY,BACKUP,read,write,snapshot,reset,backup,restore,importJSON,audit};
})();