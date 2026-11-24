/* Loaded only inside the explicit playtest iframe, before the real game scripts. */
(() => {
  'use strict';
  window.KotamaIndustrialPlaytest = true;
  const local = new Map([['kotama.field3d.quality','low'],['kotama.field3d.maxFps','20']]);
  const session = new Map();
  const store = receiver => receiver === window.sessionStorage ? session : local;
  Object.defineProperties(Storage.prototype, {
    getItem: { configurable:true, value(key){ return store(this).get(String(key)) ?? null; } },
    setItem: { configurable:true, value(key,value){ store(this).set(String(key),String(value)); } },
    removeItem: { configurable:true, value(key){ store(this).delete(String(key)); } },
    clear: { configurable:true, value(){ store(this).clear(); } },
    key: { configurable:true, value(index){ return [...store(this).keys()][Number(index)] ?? null; } },
    length: { configurable:true, get(){ return store(this).size; } }
  });
  const timer=setInterval(async () => {
    if(typeof fieldEnterArea!=='function'||!window.KotamaField3D)return;
    clearInterval(timer);
    try {
      try { tutorialFinish(); tutorialClose(); } catch (_) {}
      if(typeof tutorialState!=='undefined'){tutorialState.phase='complete';tutorialState.completed=true;tutorialState.started=false;}
      document.querySelectorAll('#tutorial-overlay').forEach(el=>el.hidden=true);
      document.body.classList.remove('tutorial-home-focus','tutorial-active');
      state.firstStageStarted=true;state.maxUnlockedStage=Math.max(3,state.maxUnlockedStage||1);
      fieldState.flags.prologue=true;fieldState.flags['labyrinth-tutorial']=true;
      for(let f=0;f<3;f++)fieldState.flags[`floor:3-${f}`]=true;
      if(typeof eventRead!=='undefined')for(const e of stageEvents||[])eventRead[e.id]=true;
      window.persistAutoSave=()=>true;
      if(window.KotamaIndustrialBattleEnabled!==true)window.kotamaAdminEncounterSettings={...(window.kotamaAdminEncounterSettings||{}),disableRandom:true,forceNext:false};
      const startFloor=Number.isInteger(window.KotamaIndustrialPlaytestStartFloor)&&window.KotamaIndustrialPlaytestStartFloor>=0&&window.KotamaIndustrialPlaytestStartFloor<=2?window.KotamaIndustrialPlaytestStartFloor:0;
      await fieldEnterArea(3,{floor:startFloor,fromHome:true});
      window.KotamaIndustrialPlaytestReady=true;
    } catch(error){window.KotamaIndustrialPlaytestError=String(error.message||error);console.error('[industrial-playtest]',error);}
  },100);
})();
