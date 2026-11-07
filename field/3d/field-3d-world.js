/**
 * field-3d-world.js
 * Lightweight Three.js geometry builder for a field-3d-grid-adapter snapshot.
 * Geometry is instanced by category; gameplay and collision remain elsewhere.
 */

export function buildField3DWorld(THREE, snapshot, options = {}) {
  if (!THREE?.Group || !THREE?.InstancedMesh || !snapshot?.cells) {
    throw new TypeError("buildField3DWorld: Three.js and a valid grid snapshot are required.");
  }

  const scale = snapshot.scale;
  const wallHeight = snapshot.wallHeight;
  const floorY = -0.12;
  const group = new THREE.Group();
  group.name = "kotama-field-3d-world";

  const palette = {
    floor: 0x59665a,
    path: 0x756c52,
    grass: 0x405d3d,
    safe: 0x777b62,
    wall: 0x39483f,
    hazard: 0x274d59
  };
  Object.assign(palette, options.palette || {});

  const floorGeometry = new THREE.PlaneGeometry(scale, scale);
  floorGeometry.rotateX(-Math.PI / 2);
  const wallGeometry = new THREE.BoxGeometry(scale, wallHeight, scale);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.96, vertexColors: true
  });
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: 0.92, vertexColors: true
  });

  const floorCells = snapshot.cells.filter(cell => cell.floorVisible);
  const wallCells = snapshot.cells.filter(cell => cell.solid);
  const floorMesh = floorCells.length
    ? new THREE.InstancedMesh(floorGeometry, floorMaterial, floorCells.length)
    : null;
  const wallMesh = wallCells.length
    ? new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCells.length)
    : null;

  const dummy = new THREE.Object3D();
  function placeInstances(mesh, cells, kind) {
    if (!mesh) return;
    cells.forEach((cell, index) => {
      dummy.position.set(
        cell.world.x,
        kind === "wall" ? wallHeight / 2 - 0.12 : floorY,
        cell.world.z
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const colorKey = kind === "wall" ? "wall" : cell.terrain;
      // Stable per-cell tint variation breaks up large flat surfaces without textures
      // or per-cell materials. Coordinates are used instead of randomness so reloads
      // produce exactly the same map appearance.
      const hash = Math.abs(Math.sin((cell.tx + 17) * 127.1 + (cell.ty + 31) * 311.7));
      const variation = kind === "wall"
        ? 0.88 + hash * 0.18
        : 0.94 + hash * 0.10;
      const instanceColor = new THREE.Color(palette[colorKey] ?? palette.floor);
      instanceColor.multiplyScalar(variation);
      mesh.setColorAt(index, instanceColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = kind === "wall";
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  placeInstances(floorMesh, floorCells, "floor");
  placeInstances(wallMesh, wallCells, "wall");

  // A subtle base slab prevents gaps at map edges without changing cell collision.
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(snapshot.area.worldWidth, 0.2, snapshot.area.worldDepth),
    new THREE.MeshStandardMaterial({ color: options.baseColor ?? 0x1b211b, roughness: 1 })
  );
  base.position.set(snapshot.area.worldWidth / 2, -0.28, snapshot.area.worldDepth / 2);
  base.receiveShadow = true;
  group.add(base);

  group.userData.kotama3d = {
    floorMesh, wallMesh, floorGeometry, wallGeometry,
    floorMaterial, wallMaterial, base
  };

  function dispose() {
    group.traverse(object => {
      if (!object.isMesh) return;
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
      else object.material?.dispose?.();
    });
  }

  return Object.freeze({ group, dispose, floorCount: floorCells.length, wallCount: wallCells.length });
}
