/**
 * Experimental 5F 360° backdrop, independent of the current game runtime.
 * THREE is passed in so this file does not depend on a specific CDN/package.
 * The dome follows camera translation only, NEVER camera orientation.
 * Buildings stay fixed in world coordinates, producing real parallax.
 */
export function createFloor5Backdrop(THREE, options = {}) {
  const seed = options.seed ?? 51119;
  const radius = options.radius ?? 150;
  const groundY = options.groundY ?? -14;
  let randomState = seed >>> 0;
  const rand = () => ((randomState = (1664525 * randomState + 1013904223) >>> 0) / 4294967296);
  const root = new THREE.Group();
  root.name = 'F5_WORLD_LOCKED_360_BACKDROP';
  const skyGroup = new THREE.Group();
  skyGroup.name = 'F5_SKY_TRANSLATION_ONLY';
  root.add(skyGroup);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color('#090516') },
      horizonColor: { value: new THREE.Color('#35223f') },
      bottomColor: { value: new THREE.Color('#090711') }
    },
    vertexShader: `varying vec3 vWorldDir;
      void main() {
        vec4 p = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(p.xyz - modelMatrix[3].xyz);
        gl_Position = projectionMatrix * viewMatrix * p;
      }`,
    fragmentShader: `varying vec3 vWorldDir;
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      void main() {
        float h = normalize(vWorldDir).y;
        vec3 c = mix(horizonColor, topColor, smoothstep(0.0, 0.85, h));
        c = mix(bottomColor, c, smoothstep(-0.42, 0.02, h));
        gl_FragColor = vec4(c, 1.0);
      }`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius * 3, 48, 24), skyMaterial);
  dome.frustumCulled = false;
  skyGroup.add(dome);

  const buildings = new THREE.Group();
  buildings.name = 'F5_WORLD_FIXED_BUILDINGS';
  root.add(buildings);
  const material = new THREE.MeshStandardMaterial({ color: 0x17121e, roughness: 0.94, metalness: 0.06 });
  const highlight = new THREE.MeshBasicMaterial({ color: 0x5d3d75 });
  const meshes = [];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  // Far ring: full 360 degrees; deterministic varied silhouettes.
  // Medium ring: sparse nearer silhouettes, genuine translation parallax.
  for (const ring of [
    { count: 64, distance: radius * 0.85, minHeight: 16, maxHeight: 65, width: 7 },
    { count: 24, distance: radius * 0.48, minHeight: 10, maxHeight: 36, width: 5 }
  ]) {
    for (let i = 0; i < ring.count; i++) {
      const angle = (i + (rand() - 0.5) * 0.6) * Math.PI * 2 / ring.count;
      const distance = ring.distance * (0.92 + rand() * 0.15);
      const width = ring.width * (0.6 + rand() * 1.3);
      const depth = ring.width * (0.6 + rand() * 1.5);
      const height = ring.minHeight + rand() * (ring.maxHeight - ring.minHeight);
      const x = Math.sin(angle) * distance;
      const z = Math.cos(angle) * distance;
      const body = new THREE.Mesh(geo, material);
      body.position.set(x, groundY + height / 2, z);
      body.scale.set(width, height, depth);
      body.updateMatrix();
      body.matrixAutoUpdate = false;
      buildings.add(body);
      meshes.push(body);
      if (rand() < 0.35) {
        const crown = new THREE.Mesh(geo, material);
        crown.position.set(x, groundY + height + height * 0.11, z);
        crown.scale.set(width * 0.35, height * 0.22, depth * 0.35);
        crown.updateMatrix();
        crown.matrixAutoUpdate = false;
        buildings.add(crown);
        meshes.push(crown);
      }
      // Restrained emissive windows: intentionally sparse and not every facade.
      if (rand() < 0.43) {
        const window = new THREE.Mesh(geo, highlight);
        const facing = new THREE.Vector3(-x, 0, -z).normalize();
        window.position.set(x + facing.x * depth * 0.51, groundY + height * (0.4 + rand() * 0.4), z + facing.z * depth * 0.51);
        window.scale.set(width * 0.12, height * 0.025, 0.09);
        window.updateMatrix();
        window.matrixAutoUpdate = false;
        buildings.add(window);
        meshes.push(window);
      }
    }
  }
  function update(camera) {
    // Never copy camera.quaternion/rotation. Do not parent the skyline to camera.
    skyGroup.position.copy(camera.position);
  }
  function dispose() {
    for (const obj of meshes) buildings.remove(obj);
    geo.dispose();
    material.dispose();
    highlight.dispose();
    dome.geometry.dispose();
    skyMaterial.dispose();
    root.removeFromParent();
  }
  return { root, skyGroup, buildings, update, dispose };
}
