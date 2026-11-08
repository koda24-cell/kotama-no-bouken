import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
import { createField3DRuntimeBridge } from "./field-3d-runtime-bridge.js";
import { buildField3DWorld } from "./field-3d-world.js";
import { buildField3DAtmosphere } from "./field-3d-atmosphere.js";
import { createField3DProceduralTextures } from "./field-3d-procedural-textures.js";
import { buildField3DDecorationLayer } from "./field-3d-decoration-layer.js";
import { buildField3DObjectLayer } from "./field-3d-object-layer.js";
import { planField3DLandmarks } from "./field-3d-landmark-planner.js";
import { buildField3DLandmarkLayer } from "./field-3d-landmark-layer.js";
import { resolveField3DQualityPreset, applyField3DQualityPreset } from "./field-3d-quality-presets.js";
import { loadField3DAssets } from "./field-3d-asset-loader.js";
import { configureField3DMaterials } from "./field-3d-materials.js";
import { disposeField3DAssets } from "./field-3d-asset-disposal.js";

const root = document.getElementById("field-3d-viewport");
const canvasHost = document.getElementById("field-3d-canvas");
const status = document.getElementById("field-3d-status");
const fieldScreen = document.getElementById("field");
let renderer = null, scene = null, camera = null, atmosphere = null, world = null;
let decorationLayer = null, objectLayer = null, landmarkLayer = null, proceduralTextures = null;
let bridge = null, raf = 0, currentAreaKey = "", disposed = false;
let loadedAssets = null, assetLoadPromise = null;

function getRuntime() {
  const api = window.__kotamaField3D;
  if (!api || typeof window.fieldTryStep !== "function" || typeof window.fieldActionPressed !== "function") {
    throw new Error("既存フィールド処理との接続APIが見つかりません。");
  }
  return api;
}
function ensureRenderer() {
  if (renderer) return;
  const runtime = getRuntime();
  bridge = createField3DRuntimeBridge({
    getArea: runtime.getArea,
    getFieldState: runtime.getFieldState,
    tryStep: (area, dir, now) => window.fieldTryStep(area, dir, now),
    action: () => window.fieldActionPressed(),
    getTilePixels: runtime.getTilePixels,
    isInputBlocked: runtime.isInputBlocked,
    snapshotOptions: {
      isSolidChar: runtime.isSolidChar,
      isDoorOpen: runtime.isDoorOpen,
      isPuzzleSolved: runtime.isPuzzleSolved,
      isObjectHidden: runtime.isObjectHidden,
      getObjectState: runtime.getObjectState
    }
  });
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1712);
  camera = new THREE.PerspectiveCamera(72, 1, 0.08, 180);
  const mobileViewport = (window.matchMedia?.("(max-width: 768px)")?.matches ?? false) || Number(navigator.maxTouchPoints || 0) > 1;
  const lowMemoryDevice = Number(navigator.deviceMemory || 8) <= 4;
  const qualityProfile = mobileViewport || lowMemoryDevice ? "mobile" : "high";
  const quality = resolveField3DQualityPreset({
    profile: qualityProfile,
    devicePixelRatio: window.devicePixelRatio || 1,
    maxTextureSize: 4096,
    reducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  });
  renderer = new THREE.WebGLRenderer({ antialias: quality.antialias, alpha: false, powerPreference: "high-performance" });
  applyField3DQualityPreset(renderer, quality);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.appendChild(renderer.domElement);
  atmosphere = buildField3DAtmosphere(THREE, scene, { fogDensity: quality.fogDensity, maxPixelRatio: quality.pixelRatio });
  const maxAnisotropy = renderer.capabilities?.getMaxAnisotropy?.() || 1;
  proceduralTextures = createField3DProceduralTextures(THREE, {
    resolution: qualityProfile === "mobile" ? 128 : 512,
    seed: 1701,
    anisotropy: Math.min(4, maxAnisotropy)
  });
  renderer.userData = renderer.userData || {};
  renderer.userData.kotama3DQuality = qualityProfile;
  resize();
  window.addEventListener("resize", resize, { passive: true });
  status.textContent = "B1F 3D探索";
}
function resize() {
  if (!renderer || !camera || !canvasHost) return;
  const w = Math.max(1, canvasHost.clientWidth), h = Math.max(1, canvasHost.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
async function ensureField3DAssets() {
  if (loadedAssets) return loadedAssets;
  if (assetLoadPromise) return assetLoadPromise;
  assetLoadPromise = (async () => {
    try {
      const manifestResponse = await fetch(new URL("../../assets/field-3d/b1/manifest.json", import.meta.url));
      if (!manifestResponse.ok) throw new Error("B1F 3D asset manifest could not be loaded: " + manifestResponse.status);
      const manifest = await manifestResponse.json();
      const enabledAssets = Object.fromEntries(Object.entries(manifest.assets || {}).filter(([, descriptor]) => descriptor?.enabled !== false));
      if (Object.keys(enabledAssets).length === 0) {
        statusElement("B1F 3D探索 · GLB未登録（仮素材）");
        loadedAssets = Object.freeze({ assets: Object.freeze({}), errors: Object.freeze([]), loadedCount: 0, completedCount: 0, totalCount: 0 });
        return loadedAssets;
      }
      const { GLTFLoader } = await import("https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js");
      const baseUrl = new URL("../../assets/field-3d/b1/", import.meta.url).href;
      loadedAssets = await loadField3DAssets({
        GLTFLoader,
        manifest: enabledAssets,
        baseUrl,
        onProgress: ({ key, status, completed, total }) => {
          statusElement("3D素材 " + completed + "/" + total + " · " + key + " " + status);
        },
        onAssetError: ({ key, url, error }) => console.warn("[field-3d asset fallback]", key, url, error)
      });
      if (disposed) {
        disposeField3DAssets(loadedAssets);
        loadedAssets = null;
        return null;
      }
      for (const [key, asset] of Object.entries(loadedAssets.assets)) {
        configureField3DMaterials(THREE, asset.scene, {
          profile: key.toLowerCase().includes("glow") || key.toLowerCase().includes("fungus") ? "glow" :
            key.toLowerCase().includes("moss") || key.toLowerCase().includes("fern") || key.toLowerCase().includes("root") ? "foliage" :
            key.toLowerCase().includes("dirt") ? "dirt" :
            key.toLowerCase().includes("stone") || key.toLowerCase().includes("column") || key.toLowerCase().includes("arch") || key.toLowerCase().includes("door") ? "stone" : "props",
          renderer,
          enableShadows: false,
          castShadow: false,
          receiveShadow: false
        });
      }
      return loadedAssets;
    } catch (error) {
      console.warn("[field-3d] GLB loading unavailable; using procedural fallback.", error);
      loadedAssets = Object.freeze({ assets: Object.freeze({}), errors: Object.freeze([{ key: "manifest", error }]), loadedCount: 0, completedCount: 0, totalCount: 0 });
      return loadedAssets;
    }
  })();
  return assetLoadPromise;
}
function statusElement(message) {
  if (status) status.textContent = message;
}
function rebuildWorld() {
  const snapshot = bridge.getSnapshot();
  if (!snapshot) return;
  if (world) { scene.remove(world.group); world.dispose(); }
  if (decorationLayer) { scene.remove(decorationLayer.group); decorationLayer.dispose(); }
  if (objectLayer) { scene.remove(objectLayer.group); objectLayer.dispose(); }
  if (landmarkLayer) { scene.remove(landmarkLayer.group); landmarkLayer.dispose(); }
  const isExplored = cell => !snapshot.explored || !!snapshot.explored[cell.ty * snapshot.area.width + cell.tx];
  const exploredKeys = new Set(snapshot.cells.filter(isExplored).map(cell => cell.tx + "," + cell.ty));
  const visibleSnapshot = { ...snapshot, cells: snapshot.cells.filter(isExplored), objects: (snapshot.objects || []).filter(o => exploredKeys.has(o.tx + "," + o.ty)), foes: (snapshot.foes || []).filter(f => exploredKeys.has(f.tx + "," + f.ty)) };
  world = buildField3DWorld(THREE, snapshot, {
    floorRoughness: 0.96,
    wallRoughness: 0.9,
    proceduralTextures,
    environmentAssets: loadedAssets?.assets || {}
  });
  scene.add(world.group);
  const qualityProfile = renderer.userData?.kotama3DQuality || "balanced";
  const mobile = qualityProfile === "mobile";
  decorationLayer = buildField3DDecorationLayer(THREE, visibleSnapshot, { density: mobile ? 0.62 : 0.88, maxPerKind: mobile ? 140 : 280, includeRoots: true, rootDensity: mobile ? 0.10 : 0.16, floorY: -0.035, assets: loadedAssets?.assets || {}, assetKeys: { moss: "mossClusterA", fern: "fernA", glowPlant: "glowPlantA", fungus: "fungusA", root: "wallRootA" } });
  scene.add(decorationLayer.group);
  objectLayer = buildField3DObjectLayer(THREE, visibleSnapshot, { fallback: true, hideConcealed: true, floorY: 0.02, assets: loadedAssets?.assets || {}, assetKeys: { door: "ancientDoorA", chest: "chestA", gather: "gatherA", save: "saveLampA" } });
  scene.add(objectLayer.group);
  const landmarkLimit = mobile ? 6 : 12;
  const landmarkPlan = planField3DLandmarks(visibleSnapshot, { maxCount: landmarkLimit, includeWallRoots: true, includeBrokenColumns: true, includeArches: true, seed: 1701 });
  landmarkLayer = buildField3DLandmarkLayer(THREE, landmarkPlan.map(item => { const assetKey = item.kind === "ancientArch" ? "ancientArchA" : item.kind === "brokenColumn" ? "brokenColumnA" : "wallRootA"; return { ...item, assetKey, lodAssetKeys: { lod0: assetKey, lod1: assetKey + "_lod1", lod2: assetKey + "_lod2" } }; }), { maxCount: landmarkLimit, floorY: 0, lodDistances: mobile ? [0, 12, 26] : [0, 18, 36], lodHysteresis: 0.08, assets: loadedAssets?.assets || {}, onPlacementError: error => console.warn("[field-3d landmark]", error) });
  scene.add(landmarkLayer.group);
  const decorationCount = Object.values(decorationLayer.counts).reduce((sum, count) => sum + count, 0);
  status.textContent = "B1F 3D探索 · 環境装飾 " + decorationCount + "点";
  currentAreaKey = snapshot.area.key;
}
function syncCamera() {
  const pose = bridge.getPlayerPose();
  if (!pose) return;
  camera.position.set(pose.x, pose.y, pose.z);
  camera.rotation.set(0, pose.yaw, 0);
}
function frame() {
  if (disposed || !renderer) return;
  if (!fieldScreen.classList.contains("active") || root.hidden) {
    raf = requestAnimationFrame(frame);
    return;
  }
  const area = getRuntime().getArea();
  if (area && area.key !== currentAreaKey) rebuildWorld();
  syncCamera();
  renderer.render(scene, camera);
  raf = requestAnimationFrame(frame);
}
function performAction(action) {
  if (!bridge || !window.__field3DMode) return;
  let changed = false;
  if (action === "forward") changed = bridge.moveForward();
  else if (action === "back") changed = bridge.moveBackward();
  else if (action === "left") changed = bridge.turnLeft();
  else if (action === "right") changed = bridge.turnRight();
  else if (action === "interact") changed = bridge.interact();
  if (changed && (action === "forward" || action === "back" || action === "interact")) rebuildWorld();
}
function setMode(mode) {
  const is3d = mode === "3d";
  window.__field3DMode = is3d;
  document.getElementById("field-viewport").hidden = is3d;
  document.getElementById("field-pad").hidden = is3d;
  root.hidden = !is3d;
  const fullMap = document.getElementById("field-fullmap");
  const mapHost = document.getElementById("field-viewport");
  if (fullMap && mapHost && fullMap.parentElement !== (is3d ? root : mapHost)) {
    (is3d ? root : mapHost).appendChild(fullMap);
  }
  document.getElementById("field-mode-2d").setAttribute("aria-pressed", String(!is3d));
  document.getElementById("field-mode-3d").setAttribute("aria-pressed", String(is3d));
  if (is3d) {
    try {
      ensureRenderer();
      rebuildWorld();
      resize();
      syncCamera();
      ensureField3DAssets().then(() => {
        if (!disposed && window.__field3DMode) rebuildWorld();
      });
      if (!raf) raf = requestAnimationFrame(frame);
    } catch (error) {
      console.error("[field-3d]", error);
      status.textContent = "3Dを開始できませんでした。2D探索に戻してください。";
      setMode("2d");
    }
  } else {
    const state = getRuntime().getFieldState();
    state && (state.view = state.view || null);
    const keys = window.__kotamaField3D.clearInput;
    if (keys) keys();
  }
}
document.getElementById("field-mode-2d").addEventListener("click", () => setMode("2d"));
document.getElementById("field-mode-3d").addEventListener("click", () => setMode("3d"));
document.querySelectorAll("[data-3d-action]").forEach(button => {
  const action = button.dataset["3dAction"];
  const run = () => performAction(action);
  button.addEventListener("pointerdown", event => { event.preventDefault(); run(); });
});
document.addEventListener("keydown", event => {
  if (!window.__field3DMode || !fieldScreen.classList.contains("active")) return;
  const key = event.key.toLowerCase();
  const actions = {
    arrowup: "forward", w: "forward", arrowdown: "back", s: "back",
    arrowleft: "left", q: "left", arrowright: "right", e: "right",
    z: "interact", enter: "interact", " ": "interact"
  };
  const action = actions[key];
  if (getRuntime().getFieldState().mapOpen) {
    if (["escape", "x", "z", "enter"].includes(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.fieldToggleFullMap?.(false);
    }
    return;
  }
  if (!action || event.repeat) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  performAction(action);
}, { capture: true });
window.addEventListener("pagehide", () => {
  disposed = true;
  if (raf) cancelAnimationFrame(raf);
  world?.dispose();
  decorationLayer?.dispose();
  objectLayer?.dispose();
  landmarkLayer?.dispose();
  if (loadedAssets) disposeField3DAssets(loadedAssets);
  proceduralTextures?.dispose();
  atmosphere?.dispose();
  renderer?.dispose();
}, { once: true });
