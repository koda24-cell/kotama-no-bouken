/**
 * field-3d-grid-adapter.js
 * Existing labyrinth state -> read-only 3D presentation snapshot.
 *
 * This module deliberately does not mutate fieldState, map cells, save data,
 * collision rules, puzzle flags, or FOE AI. The caller supplies the existing
 * game functions as callbacks so this adapter does not duplicate game rules.
 */

export const FIELD_3D_DEFAULTS = Object.freeze({
  worldUnitsPerTile: 4,
  wallHeight: 4,
  floorThickness: 0.22,
  playerEyeHeight: 1.68
});

const WALKABLE_TERRAIN = new Set([".", ",", "*", "_", "P", "E", "B", "<", ">"]);
const SAFE_TERRAIN = new Set(["_", "P", "E", "B", "<", ">", "S"]);
const DEFAULT_SOLID_TERRAIN = new Set(["#", "~", "S", "T", "?", "G"]);

function finite(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function worldCenter(tx, ty, scale) {
  return Object.freeze({
    x: (tx + 0.5) * scale,
    y: 0,
    z: (ty + 0.5) * scale
  });
}

function normalizeObject(object, context) {
  const { scale, isDoorOpen, isPuzzleSolved, isObjectHidden, getObjectState } = context;
  const doorOpen = object.kind === "door" ? !!isDoorOpen?.(object) : false;
  const puzzleSolved = object.puzzle ? !!isPuzzleSolved?.(object.puzzle) : false;
  const hidden = !!isObjectHidden?.(object);
  const state = getObjectState?.(object) ?? null;
  return Object.freeze({
    key: String(object.key ?? ""),
    id: object.id == null ? null : String(object.id),
    kind: String(object.kind ?? "unknown"),
    name: String(object.name ?? ""),
    sprite: String(object.sprite ?? ""),
    tx: finite(object.tx),
    ty: finite(object.ty),
    world: worldCenter(finite(object.tx), finite(object.ty), scale),
    walk: !!object.walk,
    onWall: !!object.onWall,
    hidden,
    concealed: !!object.hidden,
    doorOpen,
    puzzleSolved,
    state,
    presentationClass: String(state?.presentationClass ?? ""),
    lootState: state?.lootState ?? null,
    gatherKind: state?.gatherKind ?? null,
    remaining: Number.isFinite(Number(state?.remaining)) ? Number(state.remaining) : null
  });
}

/**
 * Build a renderer-facing snapshot from fieldArea() and current field state.
 *
 * Required:
 *   area: return value of fieldArea()
 *   fieldState: existing fieldState object
 *
 * Optional callbacks should be references to existing game functions:
 *   isSolidChar(area, char), isDoorOpen(object), isPuzzleSolved(id),
 *   isObjectHidden(object), getObjectState(object)
 */
export function buildField3DSnapshot({
  area,
  fieldState,
  worldUnitsPerTile = FIELD_3D_DEFAULTS.worldUnitsPerTile,
  wallHeight = FIELD_3D_DEFAULTS.wallHeight,
  tilePixels = 32,
  isSolidChar = null,
  isDoorOpen = null,
  isPuzzleSolved = null,
  isObjectHidden = null,
  getObjectState = null
} = {}) {
  if (!area || !Array.isArray(area.grid) || !area.grid.length) {
    throw new TypeError("buildField3DSnapshot: area.grid is required.");
  }
  if (!fieldState || typeof fieldState !== "object") {
    throw new TypeError("buildField3DSnapshot: fieldState is required.");
  }

  const scale = Math.max(0.1, finite(worldUnitsPerTile, FIELD_3D_DEFAULTS.worldUnitsPerTile));
  const height = Math.max(0.5, finite(wallHeight, FIELD_3D_DEFAULTS.wallHeight));
  const tileSize = Math.max(1, finite(tilePixels, 32));
  const rows = area.grid;
  const width = finite(area.w, Math.max(...rows.map(row => row.length)));
  const depth = finite(area.h, rows.length);
  const objectByCell = new Map();

  const context = { scale, isDoorOpen, isPuzzleSolved, isObjectHidden, getObjectState };
  const objects = (Array.isArray(area.objects) ? area.objects : []).map(object => {
    const normalized = normalizeObject(object, context);
    const cellKey = normalized.tx + "," + normalized.ty;
    const list = objectByCell.get(cellKey) || [];
    list.push(normalized);
    objectByCell.set(cellKey, list);
    return normalized;
  });

  const cells = [];
  for (let ty = 0; ty < depth; ty += 1) {
    const row = rows[ty] || [];
    for (let tx = 0; tx < width; tx += 1) {
      const char = row[tx] ?? "#";
      const linkedObjects = objectByCell.get(tx + "," + ty) || [];
      const linkedDoor = linkedObjects.find(object => object.kind === "door");
      const solid = linkedDoor
        ? !linkedDoor.doorOpen
        : (typeof isSolidChar === "function"
          ? !!isSolidChar(area, char)
          : DEFAULT_SOLID_TERRAIN.has(char) || /[a-z]/.test(char));
      const terrain = char === "#" ? "wall"
        : char === "~" ? "hazard"
        : char === "*" ? "grass"
        : char === "," ? "path"
        : SAFE_TERRAIN.has(char) ? "safe"
        : WALKABLE_TERRAIN.has(char) ? "floor"
        : /[a-z]/.test(char) ? "object"
        : "unknown";
      const center = worldCenter(tx, ty, scale);
      cells.push(Object.freeze({
        tx, ty, char, terrain, solid,
        floorVisible: char !== "#" && char !== "~" && !linkedObjects.some(object => object.onWall),
        wallHeight: solid ? height : 0,
        world: center,
        objects: Object.freeze(linkedObjects)
      }));
    }
  }

  const playerTileX = Math.floor(finite(fieldState.x) / tileSize);
  const playerTileY = Math.floor(finite(fieldState.y) / tileSize);
  const playerDir = ["up", "right", "down", "left"].includes(fieldState.dir)
    ? fieldState.dir : "down";
  const foes = (Array.isArray(fieldState.foes) ? fieldState.foes : []).map(foe => {
    const tx = finite(foe.tx, Math.floor(finite(foe.x) / tileSize));
    const ty = finite(foe.ty, Math.floor(finite(foe.y) / tileSize));
    return Object.freeze({
      key: String(foe.key ?? ""),
      enemyId: String(foe.def?.enemy ?? ""),
      name: String(foe.enemy?.name ?? "FOE"),
      sprite: String(foe.enemy?.sprite ?? "monster"),
      tx, ty,
      world: worldCenter(tx, ty, scale),
      dir: foe.dir ?? "down",
      mode: foe.mode ?? "patrol",
      defeated: !!foe.defeated,
      type: foe.type ?? "chaser"
    });
  });

  const explored = fieldState.explored?.[area.key] ?? null;
  const visible = fieldState.visible instanceof Set
    ? Object.freeze([...fieldState.visible])
    : Object.freeze([]);

  return Object.freeze({
    area: Object.freeze({
      n: finite(area.n), f: finite(area.f), key: String(area.key ?? ""),
      name: String(area.def?.name ?? ""), theme: String(area.def?.theme ?? "forest"),
      width, height: depth, worldWidth: width * scale, worldDepth: depth * scale
    }),
    scale,
    wallHeight: height,
    player: Object.freeze({
      tx: playerTileX, ty: playerTileY,
      world: worldCenter(playerTileX, playerTileY, scale),
      dir: playerDir, moving: !!fieldState.moving
    }),
    cells: Object.freeze(cells),
    objects: Object.freeze(objects),
    foes: Object.freeze(foes),
    explored: explored ? Object.freeze(Array.from(explored, value => value ? 1 : 0)) : null,
    visible
  });
}
