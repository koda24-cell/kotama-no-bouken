/**
 * field-3d-landmark-planner.js
 * Creates optional visual landmark suggestions from a read-only grid snapshot.
 * Suggestions are anchored to solid cells and never change map/game rules.
 */

function hash01(x, z, salt = 0) {
  const v = Math.sin((x + 13.7 + salt) * 127.1 + (z + 9.2) * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function planField3DLandmarks(snapshot, {
  maxCount = 18,
  scale = snapshot?.scale || 4,
  includeWallRoots = true,
  includeBrokenColumns = true,
  includeArches = true,
  seed = 1
} = {}) {
  if (!snapshot?.cells || !snapshot.area) {
    throw new TypeError("planField3DLandmarks: a field 3D snapshot is required.");
  }
  const cellMap = new Map(snapshot.cells.map(cell => [cell.tx + "," + cell.ty, cell]));
  const walkable = cell => !!cell && !cell.solid && cell.floorVisible;
  const objects = new Set((snapshot.objects || []).map(o => o.tx + "," + o.ty));
  const foes = new Set((snapshot.foes || []).filter(f => !f.defeated).map(f => f.tx + "," + f.ty));
  const playerKey = snapshot.player?.tx + "," + snapshot.player?.ty;
  const candidates = [];

  for (const cell of snapshot.cells) {
    if (!cell.solid || cell.char !== "#") continue;
    const key = cell.tx + "," + cell.ty;
    if (objects.has(key) || foes.has(key) || key === playerKey) continue;
    const adjacent = [
      { dx: 0, dy: -1, side: 0 },
      { dx: 1, dy: 0, side: 1 },
      { dx: 0, dy: 1, side: 2 },
      { dx: -1, dy: 0, side: 3 }
    ].filter(dir => walkable(cellMap.get((cell.tx + dir.dx) + "," + (cell.ty + dir.dy))));
    if (!adjacent.length) continue;

    const roll = hash01(cell.tx, cell.ty, seed);
    const toward = adjacent[Math.floor(hash01(cell.tx, cell.ty, seed + 3) * adjacent.length)];
    const position = {
      x: cell.world.x + toward.dx * scale * 0.54,
      y: 0,
      z: cell.world.z + toward.dy * scale * 0.54
    };
    const rotation = { y: [0, -Math.PI / 2, Math.PI, Math.PI / 2][toward.side] };
    let kind = null;
    let factor = 1;

    // Corners / dead-end boundaries get larger silhouettes at a restrained rate.
    if (includeArches && adjacent.length >= 2 && roll < 0.035) {
      kind = "ancientArch";
      factor = 0.72;
    } else if (includeBrokenColumns && adjacent.length === 1 && roll < 0.12) {
      kind = "brokenColumn";
      factor = 0.82 + hash01(cell.tx, cell.ty, seed + 7) * 0.28;
    } else if (includeWallRoots && roll < 0.32) {
      kind = "rootCurtain";
      factor = 0.72 + hash01(cell.tx, cell.ty, seed + 11) * 0.5;
    }
    if (!kind) continue;
    candidates.push({
      id: "auto-" + snapshot.area.key + "-" + cell.tx + "-" + cell.ty,
      kind,
      position,
      rotation,
      scale: factor,
      sourceCell: { tx: cell.tx, ty: cell.ty },
      presentationOnly: true
    });

  }

  // Rank by stable seeded score rather than map scan order, avoiding a cluster at the northwest edge.\n  candidates.sort((a, b) => hash01(b.sourceCell.tx, b.sourceCell.ty, seed + 101) - hash01(a.sourceCell.tx, a.sourceCell.ty, seed + 101));\n  const suggestions = candidates.slice(0, Math.max(0, Math.floor(maxCount)));\n  return Object.freeze(suggestions.map(item => Object.freeze({
    ...item,
    position: Object.freeze(item.position),
    rotation: Object.freeze(item.rotation),
    sourceCell: Object.freeze(item.sourceCell)
  })));
}
