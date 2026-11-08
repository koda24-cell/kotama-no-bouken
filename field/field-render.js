"use strict";
/* ============================================================
   field/field-render.js — 探索画面・HUD・ミニマップ・全体マップの描画
   共通状態・定数は field.js を参照。index.html の読み込み順を維持すること。
   ============================================================ */
/* ------------------------------------------------------------
   描画（DOM）
   ------------------------------------------------------------ */
function fieldEnsureExtraDom() {
  const vp = $("field-viewport"), hud = document.querySelector("#field .field-hud"); if (!vp || !hud) return;
  if (!$("field-floor-label")) {
    const lab = document.createElement("span"); lab.id = "field-floor-label"; lab.className = "field-floor-label";
    $("field-area-name")?.after(lab);
    const danger = document.createElement("span"); danger.id = "field-danger"; danger.className = "field-danger"; danger.dataset.level = "0"; danger.title = "エンカウントの危険度"; danger.setAttribute("aria-label", "エンカウントの危険度");
    lab.after(danger);
    const mapBtn = document.createElement("button"); mapBtn.id = "field-map-button"; mapBtn.className = "field-map-button"; mapBtn.type = "button"; mapBtn.textContent = "MAP";
    $("field-home-button")?.before(mapBtn);
    mapBtn.addEventListener("click", () => fieldToggleFullMap());
  }
  if (!$("field-minimap")) {
    const mini = document.createElement("canvas"); mini.id = "field-minimap"; mini.className = "field-minimap"; mini.setAttribute("aria-label", "ミニマップ（タップで全体マップ）");
    vp.appendChild(mini); mini.addEventListener("click", () => fieldToggleFullMap());
    const fog = document.createElement("div"); fog.id = "field-fog"; fog.className = "field-fog"; fog.setAttribute("aria-hidden", "true");
    vp.insertBefore(fog, vp.children[1] || null);
    const full = document.createElement("div"); full.id = "field-fullmap"; full.className = "field-fullmap"; full.hidden = true; full.setAttribute("role", "dialog"); full.setAttribute("aria-label", "全体マップ");
    full.innerHTML = `<div class="field-fullmap-head"><strong id="field-fullmap-title"></strong><span id="field-fullmap-rate"></span><button type="button" id="field-fullmap-close">閉じる</button></div><canvas id="field-fullmap-canvas"></canvas><div class="field-fullmap-legend"><span><i class="lg-player"></i>現在地</span><span><i class="lg-stairs"></i>階段</span><span><i class="lg-lamp"></i>導きの灯</span><span><i class="lg-chest"></i>宝箱</span><span><i class="lg-gather"></i>採取</span><span><i class="lg-foe"></i>FOE</span><span><i class="lg-gate"></i>ボス</span></div>`;
    vp.appendChild(full);
    $("field-fullmap-close").addEventListener("click", () => fieldToggleFullMap(false));
  }
  if (!$("field-map-rail")) {
    const rail = document.createElement("aside");
    rail.id = "field-map-rail"; rail.className = "field-map-rail";
    rail.setAttribute("aria-label", "探索マップ");
    rail.innerHTML = '<strong>MAP</strong><span class="field-map-hint">周囲9×9マスを表示</span><div id="field-minimap-status" class="field-minimap-status"></div><div id="field-minimap-legend" class="field-minimap-legend"><span><i class="mini-player"></i>現在地</span><span><i class="mini-stairs"></i>階段</span><span><i class="mini-chest"></i>宝箱</span><span><i class="mini-gather"></i>採集</span><span><i class="mini-puzzle"></i>仕掛け</span><span><i class="mini-secret"></i>隠し通路</span><span><i class="mini-foe"></i>FOE巡回</span><span><i class="mini-chase"></i>FOE追跡</span></div>';
    vp.after(rail);
    const mini = $("field-minimap");
    if (mini) rail.insertBefore(mini, $("field-minimap-status"));
  }
}
function fieldBuildDom() {
  const a = fieldArea(), screen = $("field"), map = $("field-map"); if (!a || !screen || !map) return;
  fieldEnsureExtraDom();
  screen.dataset.area = String(a.n); screen.dataset.floor = String(a.f);
  screen.dataset.theme = a.def.theme || "forest";
  $("field-area-name").textContent = `${fieldStratumLabel(a.n)} ${a.def.name}`;
  $("field-floor-label").textContent = fieldFloorLabel(a.n, a.f);
  map.style.width = a.w * FIELD_TILE + "px"; map.style.height = a.h * FIELD_TILE + "px";
  map.style.setProperty("--tile", FIELD_TILE + "px");
  const exp = fieldExplored(a), tiles = [];
  for (let ty = 0; ty < a.h; ty++) for (let tx = 0; tx < a.w; tx++) {
    const c = fieldTileAt(a, tx, ty), wall = c === "#" || fieldWallLike(a, c);   // [PUZZLE] 壁付きの物・未発見の隠し通路は壁として描く
    const edge = wall && !fieldCharSolid(a, fieldTileAt(a, tx, ty + 1)) ? " is-edge" : "";
    const fog = exp[ty * a.w + tx] ? "" : " is-unexplored";
    tiles.push(`<i class="field-tile ${wall ? "tile-wall" : FIELD_TILE_CLASS[c] || "tile-floor"}${edge}${fog}" style="left:${tx * FIELD_TILE}px;top:${ty * FIELD_TILE}px"></i>`);
  }
  const objs = a.objects.map(o => {
    const opened = (o.kind === "chest" && fieldState.flags[o.key]) || (o.kind === "gather" && (fieldState.gatherUsed[o.key] || 0) >= FIELD_GATHER_USES) ? " is-opened" : "";
    const fog = exp[o.ty * a.w + o.tx] ? "" : " is-unexplored";
    const stateClass = typeof fieldObjectStateClass === "function" ? fieldObjectStateClass(o) : "";   // [PUZZLE]/[DOOR]/[SIDE] の状態クラス
    return `<div class="field-object${opened}${stateClass}${fog}" data-kind="${esc(o.kind)}" data-object-id="${esc(o.id || o.key)}" data-key="${esc(o.key)}" data-sprite="${esc(o.sprite || "")}" data-tx="${o.tx}" data-ty="${o.ty}" style="left:${o.tx * FIELD_TILE}px;top:${o.ty * FIELD_TILE}px"><span class="field-object-sprite"></span>${o.name ? `<b class="field-object-label">${esc(o.name)}</b>` : ""}</div>`;
  }).join("");
  map.innerHTML = `<div class="field-tiles">${tiles.join("")}</div>${objs}<div id="field-foes" class="field-foes"></div><div id="field-player" class="field-player" data-dir="down" data-moving="false" data-step="0"><span class="field-player-shadow"></span><span class="field-player-sprite"></span></div>`;
  fieldState.built = a.key; fieldState.nearKey = ""; fieldState.lastTileKey = "";
  fieldSpawnFoes();
  fieldMiniDirty = true;
  if (window.KotamaField3D) window.KotamaField3D.build();   // [FIELD-3D] 第1階層の一人称3D表示（field/field-3d-view.js）
}
function fieldViewScale() {
  const vp = $("field-viewport"); if (!vp) return 1;
  return Math.max(1, Math.min(2, Math.floor((vp.clientWidth / (12 * FIELD_TILE)) * 4) / 4));
}
function fieldRender() {
  const a = fieldArea(), vp = $("field-viewport"), map = $("field-map"), p = $("field-player");
  if (!a || !vp || !map || !p) return;
  const view = fieldViewPos();   // [GRID] 見た目の位置（移動アニメーション中は補間）
  p.style.left = (view.x - 16) + "px";
  p.style.top = (view.y - 34) + "px";
  p.style.zIndex = String(10 + Math.floor(view.y));
  p.dataset.dir = fieldState.dir; p.dataset.moving = String(fieldState.moving); p.dataset.step = String(fieldState.step);
  const s = fieldViewScale(), vw = vp.clientWidth, vh = vp.clientHeight, mw = a.w * FIELD_TILE * s, mh = a.h * FIELD_TILE * s;
  const tx = mw <= vw ? (vw - mw) / 2 : -Math.max(0, Math.min(mw - vw, view.x * s - vw / 2));
  const ty = mh <= vh ? (vh - mh) / 2 : -Math.max(0, Math.min(mh - vh, (view.y - 12) * s - vh / 2));
  map.style.transform = `translate(${Math.round(tx)}px,${Math.round(ty)}px) scale(${s})`;
  // 視界：主人公を中心に、外側ほど暗くする
  const fog = $("field-fog");
  if (fog) {
    const cx = Math.round(tx + view.x * s), cy = Math.round(ty + (view.y - 10) * s), r = FIELD_VISION * FIELD_TILE * s;
    fog.style.background = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${Math.round(r * .55)}px, rgba(0,0,0,.5) ${Math.round(r * .95)}px, rgba(0,0,0,.66) ${Math.round(r * 1.25)}px)`;
  }
  fieldRenderFoes();
  const now = performance.now();
  if (fieldMiniDirty || now - fieldMiniTimer > 250) { fieldMiniTimer = now; fieldMiniDirty = false; fieldDrawMinimap(); if (fieldState.mapOpen) fieldDrawFullMap(); }
  if (window.KotamaField3D) window.KotamaField3D.frame();   // [FIELD-3D]
}

/* ------------------------------------------------------------
   ミニマップ・全体マップ
   ------------------------------------------------------------ */
const FIELD_MAP_COLORS = { wall: "#3a4160", floor: "#a9b8d6", path: "#c9b98f", grass: "#8fbf7d", water: "#3d78c4", lava: "#e0612a", safe: "#d9e6b8", gate: "#ff5a5a", exit: "#ffffff" };
function fieldMapColor(a, c) {
  if (c === "#" || (typeof fieldWallLike === "function" && fieldWallLike(a, c))) return FIELD_MAP_COLORS.wall;
  if (c === "~") return a.def.theme === "lava" ? FIELD_MAP_COLORS.lava : FIELD_MAP_COLORS.water;
  if (c === ",") return FIELD_MAP_COLORS.path;
  if (c === "*") return FIELD_MAP_COLORS.grass;
  if (c === "B") return FIELD_MAP_COLORS.gate;
  if ("_PE<>S".includes(c)) return FIELD_MAP_COLORS.safe;
  return FIELD_MAP_COLORS.floor;
}
function fieldDrawMap(canvas, cell, full) {
  const a = fieldArea(); if (!canvas || !a) return;
  const local = !full, radius = 4, player = fieldPlayerTile();
  const originX = local ? player.tx - radius : 0, originY = local ? player.ty - radius : 0;
  const cols = local ? 9 : a.w, rows = local ? 9 : a.h;
  const W = cols * cell, H = rows * cell, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
  }
  const g = canvas.getContext("2d"), exp = fieldExplored(a);
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  g.fillStyle = "#030912"; g.fillRect(0, 0, W, H);
  const inWindow = (x,y) => x >= originX && y >= originY && x < originX + cols && y < originY + rows;
  for (let my=0; my<rows; my++) for (let mx=0; mx<cols; mx++) {
    const x=originX+mx, y=originY+my, sx=mx*cell, sy=my*cell;
    g.fillStyle="#07111c"; g.fillRect(sx,sy,cell,cell);
    if (x<0 || y<0 || x>=a.w || y>=a.h || !exp[y*a.w+x]) continue;
    const visible=fieldState.visible?.has(x+","+y)||false;
    g.fillStyle=fieldMapColor(a,fieldTileAt(a,x,y)); g.fillRect(sx,sy,cell,cell);
    g.fillStyle=visible?"rgba(255,231,151,.24)":"rgba(2,8,16,.48)"; g.fillRect(sx,sy,cell,cell);
    g.strokeStyle=visible?"rgba(255,224,125,.86)":"rgba(0,0,0,.28)";
    g.lineWidth=Math.max(.7,cell*.08); g.strokeRect(sx+.5,sy+.5,Math.max(0,cell-1),Math.max(0,cell-1));
  }
  const dot=(x,y,color,size=.62,shape="circle")=>{
    if(!inWindow(x,y)) return;
    g.fillStyle=color;
    const cx=(x-originX+.5)*cell,cy=(y-originY+.5)*cell,rad=cell*size/2;
    if(shape==="square") g.fillRect(cx-rad,cy-rad,rad*2,rad*2);
    else if(shape==="triangle"||shape==="triangle-down"){
      g.beginPath();
      if(shape==="triangle"){g.moveTo(cx,cy-rad*1.2);g.lineTo(cx+rad,cy+rad*.8);g.lineTo(cx-rad,cy+rad*.8)}
      else{g.moveTo(cx-rad,cy-rad*.8);g.lineTo(cx+rad,cy-rad*.8);g.lineTo(cx,cy+rad*1.2)}
      g.closePath();g.fill();
    } else if(shape==="diamond"){g.beginPath();g.moveTo(cx,cy-rad);g.lineTo(cx+rad,cy);g.lineTo(cx,cy+rad);g.lineTo(cx-rad,cy);g.closePath();g.fill()}
    else{g.beginPath();g.arc(cx,cy,rad,0,Math.PI*2);g.fill()}
  };
  for(const o of a.objects){
    if(!inWindow(o.tx,o.ty)||!exp[o.ty*a.w+o.tx]) continue;
    if(o.kind==="stairs") dot(o.tx,o.ty,"#ffd84a",.84,o.dir==="up"?"triangle":"triangle-down");
    else if(o.kind==="save") dot(o.tx,o.ty,"#ffe27a",.8);
    else if(o.kind==="chest") dot(o.tx,o.ty,fieldState.flags[o.key]?"#7a6a55":"#ff9a3c",.76,"square");
    else if(o.kind==="gather") dot(o.tx,o.ty,(fieldState.gatherUsed[o.key]||0)>=FIELD_GATHER_USES?"#5d7a5d":"#3ee07a",.76);
    else if(o.kind==="npc"||o.kind==="sign") dot(o.tx,o.ty,"#c7a3ff",.72,"square");
    else if(o.kind==="event"){
      const done=typeof fieldSideDone==="function"&&fieldSideDone(o.event);
      if(!o.hidden||done) dot(o.tx,o.ty,done?"#5f7f8f":"#7fd6ff",.72,"square");
    }
    else if(o.kind==="switch"){
      const solved=typeof fieldPuzzleSolved==="function"&&fieldPuzzleSolved(o.puzzle);
      dot(o.tx,o.ty,solved?"#7a6a8a":"#ff8ad8",.72,"square");
    }
    else if(o.kind==="cache"){
      const opened=!!fieldState.flags["puzzle:"+o.puzzle+":reward"];
      dot(o.tx,o.ty,opened?"#7a6a55":"#ff9a3c",.76,"square");
    }
    else if(o.kind==="gate") dot(o.tx,o.ty,"#ff3030",.9);
    else if(o.kind==="exit") dot(o.tx,o.ty,"#fff4c2",.9,"square");
    else if(o.kind==="door"){
      const opened=typeof fieldDoorOpen==="function"?fieldDoorOpen(o):!!fieldState.flags["door:"+o.id+":open"];
      if(!o.hidden||opened) dot(o.tx,o.ty,opened?"#63d6dc":"#f0c36a",.82,o.hidden?"diamond":"square");
    }
    else if(o.kind==="hiddenPassage"||o.kind==="hidden-passage") dot(o.tx,o.ty,"#c68cff",.82,"diamond");
  }
  for(const foe of fieldState.foes){
    if(foe.defeated) continue;
    const fx=Math.floor(foe.x/FIELD_TILE),fy=Math.floor(foe.y/FIELD_TILE);
    if(inWindow(fx,fy)&&exp[fy*a.w+fx]) dot(fx,fy,foe.mode==="chase"?"#ff3030":"#ffad45",.94,foe.mode==="chase"?"triangle":"circle");
  }
  g.save();g.translate((fieldState.x/FIELD_TILE-originX)*cell,(fieldState.y/FIELD_TILE-originY)*cell);
  g.rotate({up:0,right:Math.PI/2,down:Math.PI,left:-Math.PI/2}[fieldState.dir]||0);
  g.fillStyle="#fff";g.strokeStyle="#000";g.lineWidth=Math.max(1,cell/8);
  g.beginPath();g.moveTo(0,-cell*.55);g.lineTo(cell*.42,cell*.4);g.lineTo(-cell*.42,cell*.4);g.closePath();g.stroke();g.fill();g.restore();
}
function fieldDrawMinimap() {
  fieldDrawMap($("field-minimap"), 12, false);
  const a=fieldArea(),status=$("field-minimap-status");
  if(!a||!status)return;
  const {tx,ty}=fieldPlayerTile();
  const visible=(fieldState.foes||[]).filter(f=>{
    if(f.defeated)return false;
    const fx=Math.floor(f.x/FIELD_TILE),fy=Math.floor(f.y/FIELD_TILE);
    return fieldState.visible?.has(`${fx},${fy}`);
  });
  const chasing=visible.filter(f=>f.mode==="chase").length;
  status.textContent=`座標 ${tx+1}, ${ty+1}　/　視界内FOE ${visible.length}（追跡 ${chasing}）`;
}
function fieldDrawFullMap() {
  const a = fieldArea(), vp = $("field-viewport"); if (!a || !vp) return;
  const cell = Math.max(6, Math.floor(Math.min((vp.clientWidth - 24) / a.w, (vp.clientHeight - 92) / a.h)));
  fieldDrawMap($("field-fullmap-canvas"), cell, true);
  $("field-fullmap-title").textContent = `${fieldStratumLabel(a.n)} ${a.def.name}　${fieldFloorLabel(a.n, a.f)}`;
  $("field-fullmap-rate").textContent = `踏破率 ${fieldExploredRate(a)}%`;
}
function fieldToggleFullMap(force) {
  const full = $("field-fullmap"); if (!full) return;
  const open = typeof force === "boolean" ? force : full.hidden;
  if (open && (fieldState.lock && !fieldState.mapOpen)) return;
  full.hidden = !open; fieldState.mapOpen = open;
  fieldInput.keys.clear(); fieldInput.pad.clear();
  if (open) fieldDrawFullMap();
  if (typeof sound === "function") sound(open ? "select" : "back");
}

