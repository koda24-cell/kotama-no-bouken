/**
 * field-3d-procedural-models.js
 * High-detail procedural B1F prop models.
 * These are reusable Three.js meshes, not pre-rendered images or GLB files.
 * Every generated geometry/material is owned by the returned model and disposed once.
 */

const PALETTE = Object.freeze({
  stone: 0x77796d, darkStone: 0x454d46, edge: 0x969487,
  moss: 0x435d3d, root: 0x59432f, wood: 0x684b32,
  iron: 0x343d3c, crystal: 0x76cdb5, gold: 0xb69a5b
});

export function createField3DProceduralModel(THREE, kind, options = {}) {
  if (!THREE?.Group || !THREE?.Mesh || !THREE?.MeshStandardMaterial) {
    throw new TypeError("createField3DProceduralModel: Three.js is required.");
  }
  const detail = Math.max(0, Math.min(2, Math.floor(options.detail ?? 0)));
  const group = new THREE.Group();
  group.name = "b1-prop-" + kind;
  const geometries = [];
  const materials = [];
  const mat = (color, roughness = 0.92, extra = {}) => {
    const value = new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    materials.push(value);
    return value;
  };
  const mesh = (geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) => {
    geometries.push(geometry);
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.scale.set(...scale);
    item.rotation.set(...rotation);
    item.castShadow = true;
    item.receiveShadow = true;
    group.add(item);
    return item;
  };
  const box = (size, material, p, r = [0, 0, 0]) =>
    mesh(new THREE.BoxGeometry(...size), material, p, [1, 1, 1], r);
  const cylinder = (rt, rb, h, sides, material, p, r = [0, 0, 0]) =>
    mesh(new THREE.CylinderGeometry(rt, rb, h, sides, 1), material, p, [1, 1, 1], r);
  const stone = mat(PALETTE.stone);
  const dark = mat(PALETTE.darkStone);
  const edge = mat(PALETTE.edge);
  const moss = mat(PALETTE.moss, 1);
  const root = mat(PALETTE.root, 0.98);
  const wood = mat(PALETTE.wood, 0.88);
  const iron = mat(PALETTE.iron, 0.48, { metalness: 0.62 });
  const glow = mat(PALETTE.crystal, 0.32, { emissive: 0x245b4b, emissiveIntensity: 1.15 });
  const sides = detail === 0 ? 12 : detail === 1 ? 9 : 6;

  if (kind === "brokenColumn" || kind === "column") {
    cylinder(0.39, 0.48, 0.18, sides, dark, [0, 0.09, 0]);
    cylinder(0.31, 0.39, 1.55, sides, stone, [0, 0.94, 0]);
    cylinder(0.42, 0.34, 0.16, sides, edge, [0, 1.77, 0]);
    cylinder(0.34, 0.29, 0.10, sides, dark, [0, 1.9, 0]);
    // Broken crown: staggered stone fragments create a chipped silhouette.
    for (let i = 0; i < (detail === 0 ? 7 : 4); i++) {
      const a = i * Math.PI * 2 / (detail === 0 ? 7 : 4);
      box([0.18, 0.16 + (i % 3) * 0.09, 0.20], i % 2 ? stone : edge,
        [Math.cos(a) * 0.19, 2.00 + (i % 3) * 0.025, Math.sin(a) * 0.19], [0, a, 0]);
    }
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      cylinder(0.035, 0.045, 0.55 + i * 0.12, 5, moss,
        [Math.cos(a) * 0.33, 0.7 + i * 0.35, Math.sin(a) * 0.33],
        [0.12 * Math.sin(a), 0, 0.12 * Math.cos(a)]);
    }
  } else if (kind === "ancientArch" || kind === "arch") {
    const width = 3.0, spring = 2.35, count = detail === 0 ? 11 : detail === 1 ? 8 : 6;
    box([0.62, 2.15, 0.62], stone, [-1.18, 1.08, 0]);
    box([0.62, 2.15, 0.62], stone, [1.18, 1.08, 0]);
    box([0.78, 0.22, 0.78], edge, [-1.18, 2.18, 0]);
    box([0.78, 0.22, 0.78], edge, [1.18, 2.18, 0]);
    for (let i = 0; i <= count; i++) {
      const a = Math.PI * i / count;
      const x = Math.cos(a) * 1.18;
      const y = spring + Math.sin(a) * 0.78;
      box([0.48, 0.34, 0.72], i % 2 ? stone : edge, [x, y, 0], [0, 0, -a + Math.PI / 2]);
    }
    box([0.72, 0.25, 0.82], dark, [0, 2.20, 0]);
    // Moss settles on the upper joints.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.17);
      mesh(new THREE.IcosahedronGeometry(0.16, detail === 0 ? 1 : 0), moss,
        [Math.cos(a) * 1.18, spring + Math.sin(a) * 0.78 + 0.18, 0.18]);
    }
  } else if (kind === "monolith") {
    box([1.05, 3.25, 0.62], dark, [0, 1.62, 0]);
    box([0.94, 3.05, 0.56], stone, [0, 1.66, 0]);
    box([0.98, 0.18, 0.64], edge, [0, 3.22, 0]);
    // Inset-like rune grooves and a softly glowing central sigil.
    for (let i = 0; i < 3; i++) {
      box([0.035, 0.68 - i * 0.12, 0.018], dark, [-0.22 + i * 0.22, 1.9, 0.292]);
    }
    box([0.12, 0.12, 0.025], glow, [0, 2.43, 0.30]);
    for (let i = 0; i < 4; i++) {
      box([0.20, 0.035, 0.02], moss, [-0.28 + i * 0.18, 0.48 + i * 0.06, 0.30], [0, 0, -0.18]);
    }
  } else if (kind === "rootCurtain" || kind === "roots") {
    for (let i = 0; i < (detail === 0 ? 13 : detail === 1 ? 9 : 6); i++) {
      const x = -1.15 + i * (2.3 / (detail === 0 ? 12 : detail === 1 ? 8 : 5));
      const length = 1.15 + ((i * 7) % 5) * 0.24;
      cylinder(0.025, 0.075 + (i % 3) * 0.018, length, 5, root,
        [x, 2.0 - length / 2, Math.sin(i * 1.7) * 0.10],
        [0.08 * Math.sin(i), 0, 0.10 * Math.cos(i * 1.3)]);
      if (i % 3 === 0) {
        cylinder(0.012, 0.035, 0.62, 5, moss,
          [x + 0.12, 1.35, 0.08], [0, 0, 0.38]);
      }
    }
  } else if (kind === "canopy") {
    const leaf = mat(0x294b35, 0.96);
    const leafLight = mat(0x426b43, 0.94);
    for (let i = 0; i < (detail === 0 ? 9 : 5); i++) {
      const a = i * Math.PI * 2 / (detail === 0 ? 9 : 5);
      const g = new THREE.IcosahedronGeometry(0.78 + (i % 3) * 0.12, detail === 0 ? 2 : 1);
      mesh(g, i % 2 ? leaf : leafLight,
        [Math.cos(a) * 1.1, 2.1 + Math.sin(i * 2) * 0.28, Math.sin(a) * 1.1],
        [1.3, 0.62, 0.9], [0, a, 0.18 * Math.sin(a)]);
    }
  } else if (kind === "chest" || kind === "chestA") {
    box([1.05, 0.62, 0.72], wood, [0, 0.38, 0]);
    box([1.12, 0.12, 0.78], iron, [0, 0.70, 0]);
    // Faceted lid, iron bands, and a central clasp.
    mesh(new THREE.SphereGeometry(0.56, sides, Math.max(4, Math.floor(sides / 2)), 0, Math.PI * 2, 0, Math.PI / 2),
      wood, [0, 0.70, 0], [1, 0.55, 0.70]);
    box([0.12, 0.40, 0.79], iron, [0, 0.43, 0]);
    box([0.22, 0.24, 0.06], edge, [0, 0.47, 0.40]);
    cylinder(0.055, 0.055, 0.12, 8, goldMaterial(), [0, 0.48, 0.45], [Math.PI / 2, 0, 0]);
  } else if (kind === "saveLamp" || kind === "saveLampA") {
    cylinder(0.20, 0.30, 0.22, sides, dark, [0, 0.11, 0]);
    cylinder(0.10, 0.16, 1.05, sides, iron, [0, 0.72, 0]);
    cylinder(0.30, 0.18, 0.14, sides, edge, [0, 1.30, 0]);
    mesh(new THREE.OctahedronGeometry(0.24, detail === 0 ? 1 : 0), glow, [0, 1.62, 0]);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      cylinder(0.025, 0.04, 0.55, 6, iron,
        [Math.cos(a) * 0.22, 1.55, Math.sin(a) * 0.22], [0, 0, a]);
    }
  } else if (kind === "gather" || kind === "gatherA" || kind === "crystal") {
    cylinder(0.42, 0.52, 0.18, sides, dark, [0, 0.09, 0]);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      mesh(new THREE.OctahedronGeometry(0.34 + (i % 2) * 0.10, detail === 0 ? 1 : 0),
        i % 2 ? glow : mat(0x91b8a0, 0.36, { emissive: 0x183c35, emissiveIntensity: 0.55 }),
        [Math.cos(a) * 0.22, 0.45 + (i % 3) * 0.20, Math.sin(a) * 0.22],
        [0.72, 1.55, 0.72], [0, a, 0.12 * Math.sin(a)]);
    }
    for (let i = 0; i < 3; i++) {
      box([0.12, 0.08, 0.12], moss, [-0.28 + i * 0.26, 0.22, 0.18]);
    }
  } else if (kind === "door" || kind === "ancientDoor") {
    // Heavy timber door with stone surround, iron straps and a central ring handle.
    box([1.62, 2.55, 0.24], dark, [0, 1.28, 0]);
    box([1.42, 2.34, 0.16], stone, [0, 1.23, 0.03]);
    box([1.18, 2.02, 0.12], wood, [0, 1.18, 0.13]);
    for (let i = 0; i < 5; i++) box([0.19, 1.94, 0.035], i % 2 ? wood : dark, [-0.40 + i * 0.20, 1.18, 0.205]);
    for (const y of [0.48, 1.55, 2.10]) box([1.30, 0.09, 0.07], iron, [0, y, 0.25]);
    box([0.18, 0.32, 0.08], edge, [0.30, 1.18, 0.28]);
    mesh(new THREE.TorusGeometry(0.10, 0.025, 6, sides), goldMaterial(), [0.30, 1.05, 0.34], [1, 1, 0.35], [Math.PI / 2, 0, 0]);
  } else if (kind === "gate") {
    box([1.75, 2.45, 0.18], dark, [0, 1.22, 0]);
    for (let i = 0; i < 7; i++) {
      const x = -0.72 + i * 0.24;
      cylinder(0.045, 0.055, 2.30, 8, iron, [x, 1.18, 0.12]);
      mesh(new THREE.ConeGeometry(0.09, 0.20, 6), edge, [x, 2.42, 0.12]);
    }
    for (const y of [0.38, 1.95]) box([1.70, 0.13, 0.20], edge, [0, y, 0.12]);
    box([0.22, 0.32, 0.22], goldMaterial(), [0, 1.12, 0.25]);
  } else if (kind === "stairs") {
    for (let i = 0; i < 6; i++) {
      const depth = 0.42, height = 0.20;
      box([2.0, height, depth], i % 2 ? stone : edge,
        [0, height * (i + 0.5), 1.05 - i * depth]);
    }
    box([2.15, 0.18, 0.34], dark, [0, 0.09, 1.30]);
    box([2.15, 0.18, 0.34], dark, [0, 1.29, -1.22]);
    for (const x of [-0.92, 0.92]) {
      cylinder(0.10, 0.14, 1.20, sides, moss, [x, 0.68, -0.02]);
    }
  } else if (kind === "sign") {
    cylinder(0.08, 0.11, 1.35, 8, wood, [0, 0.68, 0]);
    box([1.05, 0.48, 0.12], wood, [0, 1.24, 0]);
    box([0.88, 0.30, 0.035], edge, [0, 1.24, 0.075]);
    for (let i = 0; i < 3; i++) box([0.38 - i * 0.06, 0.025, 0.02], dark, [0, 1.31 - i * 0.08, 0.10]);
    box([0.22, 0.12, 0.16], iron, [0, 0.12, 0]);
  } else if (kind === "wallTorch") {
    box([0.30, 0.42, 0.12], dark, [0, 0.22, 0]);
    cylinder(0.045, 0.075, 0.72, 7, iron, [0, 0.70, 0.08], [0.18, 0, 0]);
    mesh(new THREE.IcosahedronGeometry(0.20, detail === 0 ? 1 : 0), glow, [0, 1.16, 0.08], [0.8, 1.35, 0.8]);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      cylinder(0.018, 0.035, 0.36, 5, iron, [Math.cos(a) * 0.13, 1.08, 0.08 + Math.sin(a) * 0.13]);
    }
  } else {
    // Unknown kinds remain visible as a stone marker rather than silently disappearing.
    box([0.8, 1.4, 0.8], stone, [0, 0.7, 0]);
  }

  // Apply the shared B1F procedural PBR library by material role.
  const surfaceSets = options.textures || {};
  const applySurface = (material, key, metalness = 0) => {
    const surface = surfaceSets[key];
    if (!surface || !material) return;
    material.map = surface.map || null;
    material.normalMap = surface.normalMap || null;
    material.roughnessMap = surface.roughnessMap || null;
    material.metalnessMap = surface.metalnessMap || null;
    material.metalness = metalness;
    material.needsUpdate = true;
  };
  [stone, dark, edge].forEach(material => applySurface(material, "stone"));
  applySurface(moss, "moss");
  applySurface(root, "bark");
  applySurface(wood, "wood");
  applySurface(iron, "metal", 0.62);
  applySurface(glow, "crystal");
  materials.filter(material => material !== stone && material !== dark && material !== edge &&
    material !== moss && material !== root && material !== wood && material !== iron && material !== glow)
    .forEach(material => {
      const color = material.color?.getHex?.();
      if (color === 0x294b35 || color === 0x426b43) applySurface(material, "moss");
    });
  function goldMaterial() {
    const gold = mat(PALETTE.gold, 0.42, { metalness: 0.72 });
    applySurface(gold, "metal", 0.72);
    return gold;
  }
  group.userData.generatedResources = { geometries, materials };
  group.userData.proceduralModel = true;
  return group;
}

export function getField3DProceduralModelKinds() {
  return Object.freeze([
    "brokenColumn", "ancientArch", "monolith", "rootCurtain", "canopy",
    "chest", "saveLamp", "gather", "crystal", "door", "gate", "stairs", "sign", "wallTorch"
  ]);
}
