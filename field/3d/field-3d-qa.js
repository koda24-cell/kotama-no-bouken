/**
 * field-3d-qa.js
 * Read-only structural checks for a 3D presentation snapshot.
 * These checks never alter map/game state and do not replace gameplay tests.
 */

export function inspectField3DSnapshot(snapshot) {
  if (!snapshot?.area || !Array.isArray(snapshot.cells)) {
    throw new TypeError("inspectField3DSnapshot: valid snapshot required.");
  }
  const issues = [];
  const width = Number(snapshot.area.width) || 0;
  const height = Number(snapshot.area.height) || 0;
  const expected = width * height;
  const coordinates = new Set();
  const cellByKey = new Map();

  for (const cell of snapshot.cells) {
    const key = cell.tx + "," + cell.ty;
    if (coordinates.has(key)) issues.push({ severity: "error", code: "duplicate-cell", detail: key });
    coordinates.add(key);
    cellByKey.set(key, cell);
    if (cell.tx < 0 || cell.ty < 0 || cell.tx >= width || cell.ty >= height) {
      issues.push({ severity: "error", code: "cell-out-of-bounds", detail: key });
    }
  }
  if (snapshot.cells.length !== expected) {
    issues.push({ severity: "error", code: "cell-count-mismatch", detail: snapshot.cells.length + "/" + expected });
  }

  const playerKey = snapshot.player?.tx + "," + snapshot.player?.ty;
  const playerCell = cellByKey.get(playerKey);
  if (!playerCell) issues.push({ severity: "error", code: "player-out-of-bounds", detail: playerKey });
  else if (playerCell.solid) issues.push({ severity: "error", code: "player-in-solid-cell", detail: playerKey });

  for (const object of snapshot.objects || []) {
    const key = object.tx + "," + object.ty;
    if (!cellByKey.has(key)) issues.push({ severity: "error", code: "object-out-of-bounds", detail: object.key || key });
    if (object.tx === snapshot.player?.tx && object.ty === snapshot.player?.ty) {
      issues.push({ severity: "warning", code: "object-on-player-start", detail: object.key || key });
    }
  }
  for (const foe of snapshot.foes || []) {
    const key = foe.tx + "," + foe.ty;
    if (!cellByKey.has(key)) issues.push({ severity: "error", code: "foe-out-of-bounds", detail: foe.key || key });
    else if (cellByKey.get(key).solid) issues.push({ severity: "warning", code: "foe-in-solid-cell", detail: foe.key || key });
  }

  const solidCount = snapshot.cells.filter(cell => cell.solid).length;
  const floorCount = snapshot.cells.filter(cell => cell.floorVisible).length;
  const errorCount = issues.filter(issue => issue.severity === "error").length;
  const warningCount = issues.filter(issue => issue.severity === "warning").length;
  return Object.freeze({
    ok: errorCount === 0,
    area: snapshot.area.key,
    width,
    height,
    cellCount: snapshot.cells.length,
    solidCount,
    floorCount,
    objectCount: (snapshot.objects || []).length,
    foeCount: (snapshot.foes || []).length,
    errorCount,
    warningCount,
    issues: Object.freeze(issues.map(issue => Object.freeze(issue)))
  });
}
