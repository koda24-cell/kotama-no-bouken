/**
 * field-3d-decoration-layer.js
 * Deterministic, presentation-only environmental dressing for a grid snapshot.
 * It does not add collision, alter exploration, or modify game state.
 */

const DEFAULT_RULES = Object.freeze({
  grass: { moss: 0.28, fern: 0.10, glowPlant: 0.035, fungus: 0.055 },
  path: { moss: 0.12, fern: 0.025, glowPlant: 0.018, fungus: 0.025 },
  safe: { moss: 0.16, fern: 0.035, glowPlant: 0.025, fungus: 0.035 },
  floor: { moss: 0.20, fern: 0.055, glowPlant: 0.03, fungus: 0.045 }
});

function hash01(x, z, salt = 0) {
  const value = Math.sin((x + 19.19 + salt * 7.13) * 127.1 + (z + 7.71) * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function isWalkable(cell) {
  return !!cell && !cell.solid && cell.floorVisible;
}

export function buildField3DDecorationLayer(THREE, snapshot, {
  rules = {},
  density = 1,
  maxPerKind = 420,
  assets = {},
  assetKeys = {},
  includeRoots = true,
  rootDensity = 0.12,
  palette = {},
  floorY = -0.08
} = {}) {
  if (!THREE?.Group || !THREE?.InstancedMesh || !snapshot?.cells) {
    throw new TypeError("buildField3DDecorationLayer: Three.js and a valid snapshot are required.");
  }
  const group = new THREE.Group();
  group.name = "kotama-field-3d-decoration";
  const scale = snapshot.scale || 4;
  const cellMap = new Map(snapshot.cells.map(cell => [cell.tx + "," + cell.ty, cell]));
  const mergedRules = { ...DEFAULT_RULES, ...rules };
  const definitions = {
    moss: { color: palette.moss ?? 0x526b48, size: [0.72, 0.18, 0.55], roughness: 1 },
    fern: { color: palette.fern ?? 0x376b43, size: [0.42, 0.78, 0.34], roughness: 0.9 },
    glowPlant: { color: palette.glowPlant ?? 0x68c9a9, size: [0.28, 0.48, 0.28], roughness: 0.55, emissive: 0x245b48 },
    fungus: { color: palette.fungus ?? 0x8b9fcb, size: [0.38, 0.24, 0.38], roughness: 0.72, emissive: 0x344c78 },
    root: { color: palette.root ?? 0x594634, size: [0.22, 1.9, 0.22], roughness: 0.96 }
  };
  const geometry = {
    moss: new THREE.SphereGeometry(1, 7, 5),
    fern: new THREE.ConeGeometry(0.5, 1, 5),
    glowPlant: new THREE.SphereGeometry(0.5, 7, 6),
    fungus: new THREE.SphereGeometry(0.5, 8, 6),
    root: new THREE.CylinderGeometry(0.12, 0.28, 1, 6, 1)
  };
  const materials = {};
  for (const [kind, def] of Object.entries(definitions)) {
    materials[kind] = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: def.roughness,
      emissive: def.emissive ?? 0x000000,
      emissiveIntensity: kind === "glowPlant" ? 0.8 : kind === "fungus" ? 0.48 : 0
    });
  }
  const transforms = Object.fromEntries(Object.keys(definitions).map(kind => [kind, []]));
  const occupied = new Set((snapshot.objects || []).map(o => o.tx + "," + o.ty));
  const foeCells = new Set((snapshot.foes || []).filter(f => !f.defeated).map(f => f.tx + "," + f.ty));
  const playerCell = snapshot.player ? snapshot.player.tx + "," + snapshot.player.ty : "";

  for (const cell of snapshot.cells) {
    if (!isWalkable(cell)) continue;
    const key = cell.tx + "," + cell.ty;
    if (occupied.has(key) || foeCells.has(key) || key === playerCell) continue;
    const rule = mergedRules[cell.terrain] || mergedRules.floor;
    if (!rule) continue;
    for (const kind of ["moss", "fern", "glowPlant", "fungus"]) {
      const chance = Math.max(0, Math.min(1, (rule[kind] || 0) * density));
      if (hash01(cell.tx, cell.ty, kind.length) >= chance) continue;
      if (transforms[kind].length >= maxPerKind) continue;
      const angle = hash01(cell.tx, cell.ty, 11) * Math.PI * 2;
      const offset = scale * (0.18 + hash01(cell.tx, cell.ty, 17) * 0.20);
      const def = definitions[kind];
      transforms[kind].push({
        x: cell.world.x + Math.cos(angle) * offset,
        y: floorY + (kind === "fungus" ? 0.10 : def.size[1] * 0.28),
        z: cell.world.z + Math.sin(angle) * offset,
        sx: def.size[0] * (0.8 + hash01(cell.tx, cell.ty, 23) * 0.5),
        sy: def.size[1] * (0.8 + hash01(cell.tx, cell.ty, 29) * 0.45),
        sz: def.size[2] * (0.8 + hash01(cell.tx, cell.ty, 31) * 0.5),
        ry: angle
      });
    }

    if (includeRoots && transforms.root.length < maxPerKind && hash01(cell.tx, cell.ty, 43) < rootDensity) {
      const neighbors = [
        cellMap.get(cell.tx + "," + (cell.ty - 1)),
        cellMap.get((cell.tx + 1) + "," + cell.ty),
        cellMap.get(cell.tx + "," + (cell.ty + 1)),
        cellMap.get((cell.tx - 1) + "," + cell.ty)
      ];
      const wallSides = neighbors.map((neighbor, index) => neighbor?.solid ? index : -1).filter(index => index >= 0);
      if (wallSides.length) {
        const side = wallSides[Math.floor(hash01(cell.tx, cell.ty, 47) * wallSides.length)];
        const rotation = [0, Math.PI / 2, Math.PI, -Math.PI / 2][side];
        const def = definitions.root;
        const wallOffset = scale * 0.34;
        const wallOffsets = [{ x: 0, z: -wallOffset }, { x: wallOffset, z: 0 }, { x: 0, z: wallOffset }, { x: -wallOffset, z: 0 }];
        const offset = wallOffsets[side];
        transforms.root.push({
          x: cell.world.x + offset.x,
          y: 0.72 + hash01(cell.tx, cell.ty, 53) * 0.42,
          z: cell.world.z + offset.z,
          sx: 0.42 + hash01(cell.tx, cell.ty, 59) * 0.35,
          sy: 0.75 + hash01(cell.tx, cell.ty, 61) * 0.75,
          sz: 0.75 + hash01(cell.tx, cell.ty, 67) * 0.8,
          ry: rotation
        });
      }
    }
  }

  const dummy = new THREE.Object3D();
  const counts = {};
  for (const kind of Object.keys(definitions)) {
    const placements = transforms[kind];
    const assetKey = assetKeys[kind] || kind;
    const asset = assets[assetKey];
    if (asset?.clone) {
      for (const transform of placements) {
        const instance = asset.clone();
        instance.position.set(transform.x, transform.y, transform.z);
        instance.rotation.y = transform.ry;
        instance.scale.set(transform.sx, transform.sy, transform.sz);
        group.add(instance);
      }
      counts[kind] = placements.length;
      continue;
    }
    if (!placements.length) { counts[kind] = 0; continue; }
    const mesh = new THREE.InstancedMesh(geometry[kind], materials[kind], placements.length);
    placements.forEach((p, index) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.ry, kind === "fern" ? -0.12 : 0);
      dummy.scale.set(p.sx, p.sy, p.sz);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = kind === "root" || kind === "fern";
    mesh.receiveShadow = true;
    group.add(mesh);
    counts[kind] = placements.length;
  }

  function dispose() {
    group.clear();
    Object.values(geometry).forEach(item => item.dispose?.());
    Object.values(materials).forEach(item => item.dispose?.());
  }

  return Object.freeze({
    group,
    counts: Object.freeze(counts),
    dispose
  });
}
