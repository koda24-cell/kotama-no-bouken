/**
 * field-3d-runtime-bridge.js
 * Connects the first-person renderer to the existing field runtime.
 *
 * The bridge is intentionally thin:
 * - movement is delegated to fieldTryStep() (collision, doors, FOE turns,
 *   encounter checks and tile events stay in the existing game code);
 * - interaction is delegated to fieldActionPressed();
 * - this module only translates existing field coordinates into 3D poses.
 */

import { buildField3DSnapshot, FIELD_3D_DEFAULTS } from "./field-3d-grid-adapter.js";

const DIR_ORDER = Object.freeze(["up", "right", "down", "left"]);
const DIR_YAW = Object.freeze({ up: 0, right: -Math.PI / 2, down: Math.PI, left: Math.PI / 2 });

function assertFunction(name, value) {
  if (typeof value !== "function") {
    throw new TypeError(`createField3DRuntimeBridge: ${name} must be a function.`);
  }
}

function normalizeDir(dir) {
  return DIR_ORDER.includes(dir) ? dir : "down";
}

/**
 * @param {object} options
 * @param {Function} options.getArea Existing fieldArea() accessor.
 * @param {Function} options.getFieldState Existing fieldState accessor.
 * @param {Function} options.tryStep Existing fieldTryStep(area, dir, now) function.
 * @param {Function} options.action Existing fieldActionPressed() function.
 * @param {Function} [options.getTilePixels] Existing FIELD_TILE accessor (defaults to 32).
 * @param {object} [options.snapshotOptions] Read-only adapter callbacks/options.
 */
export function createField3DRuntimeBridge({
  getArea,
  getFieldState,
  tryStep,
  action,
  getTilePixels = () => 32,
  snapshotOptions = {}
} = {}) {
  assertFunction("getArea", getArea);
  assertFunction("getFieldState", getFieldState);
  assertFunction("tryStep", tryStep);
  assertFunction("action", action);
  assertFunction("getTilePixels", getTilePixels);

  function read() {
    const area = getArea();
    const fieldState = getFieldState();
    if (!area || !fieldState) return null;
    return { area, fieldState };
  }

  function getSnapshot() {
    const current = read();
    if (!current) return null;
    return buildField3DSnapshot({
      ...snapshotOptions,
      ...current,
      tilePixels: getTilePixels(),
      worldUnitsPerTile: snapshotOptions.worldUnitsPerTile ?? FIELD_3D_DEFAULTS.worldUnitsPerTile
    });
  }

  function getPlayerPose() {
    const current = read();
    if (!current) return null;
    const { fieldState } = current;
    const tilePixels = Math.max(1, Number(getTilePixels()) || 32);
    const scale = Math.max(0.1, Number(snapshotOptions.worldUnitsPerTile) || FIELD_3D_DEFAULTS.worldUnitsPerTile);
    // fieldState.view is the existing renderer-only interpolation position.
    // It is never written by this bridge.
    const position = fieldState.view || fieldState;
    const x = Number(position.x) || 0;
    const y = Number(position.y) || 0;
    return Object.freeze({
      x: (x / tilePixels) * scale,
      y: FIELD_3D_DEFAULTS.playerEyeHeight,
      z: (y / tilePixels) * scale,
      yaw: DIR_YAW[normalizeDir(fieldState.dir)],
      dir: normalizeDir(fieldState.dir),
      moving: !!fieldState.moving
    });
  }

  function move(dir, now = (typeof performance !== "undefined" ? performance.now() : Date.now())) {
    const current = read();
    if (!current) return false;
    if (current.fieldState.lock || current.fieldState.mapOpen) return false;
    return !!tryStep(current.area, normalizeDir(dir), now);
  }

  function turn(quarterTurns) {
    const current = read();
    if (!current || current.fieldState.lock || current.fieldState.mapOpen) return false;
    const amount = Math.trunc(Number(quarterTurns) || 0);
    if (!amount) return false;
    const index = DIR_ORDER.indexOf(normalizeDir(current.fieldState.dir));
    current.fieldState.dir = DIR_ORDER[(index + amount + 4) % 4];
    return true;
  }

  function interact() {
    const current = read();
    if (!current || current.fieldState.lock || current.fieldState.mapOpen) return false;
    action();
    return true;
  }

  return Object.freeze({
    getSnapshot,
    getPlayerPose,
    move,
    moveForward: () => move(normalizeDir(getFieldState()?.dir)),
    moveBackward: () => {
      const index = DIR_ORDER.indexOf(normalizeDir(getFieldState()?.dir));
      return move(DIR_ORDER[(index + 2) % 4]);
    },
    turnLeft: () => turn(-1),
    turnRight: () => turn(1),
    interact,
    getDirectionYaw: dir => DIR_YAW[normalizeDir(dir)]
  });
}
