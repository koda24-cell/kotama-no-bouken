/**
 * Stage 4 lava prototype. Independent of gameplay and existing assets.
 * Use: const mat = createB4LavaMaterial(THREE); mat.uniforms.uTime.value = seconds;
 * Apply to a UV-mapped mesh; flow is local +V. Not yet production verified.
 */
export function createB4LavaMaterial(THREE, options = {}) {
  const uniforms = {
    uTime: { value: 0 },
    uFlowSpeed: { value: options.flowSpeed ?? 0.035 },
    uCrustScale: { value: options.crustScale ?? 6.0 },
    uCrustCoverage: { value: options.crustCoverage ?? 0.68 },
    uEmission: { value: options.emission ?? 2.2 },
    uEdgeDarkness: { value: options.edgeDarkness ?? 0.45 }
  };
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPosition = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vWorldPosition;
      uniform float uTime;
      uniform float uFlowSpeed;
      uniform float uCrustScale;
      uniform float uCrustCoverage;
      uniform float uEmission;
      uniform float uEdgeDarkness;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash21(i), hash21(i+vec2(1.,0.)), f.x),
                   mix(hash21(i+vec2(0.,1.)), hash21(i+vec2(1.,1.)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float a = 0.5, v = 0.0;
        for (int i=0; i<4; ++i) {
          v += a * noise2(p);
          p = p * 2.07 + vec2(13.1, 7.7);
          a *= 0.5;
        }
        return v;
      }
      float voronoiEdge(vec2 p) {
        vec2 g = floor(p), f = fract(p);
        float d1 = 10.0, d2 = 10.0;
        for(int y=-1; y<=1; ++y) {
          for(int x=-1; x<=1; ++x) {
            vec2 o = vec2(float(x),float(y));
            vec2 r = o + vec2(hash21(g+o), hash21(g+o+37.2)) - f;
            float d = dot(r,r);
            if (d < d1) { d2 = d1; d1 = d; }
            else if (d < d2) { d2 = d; }
          }
        }
        return sqrt(d2) - sqrt(d1);
      }
      void main() {
        // Large-scale distortion and slow, directional advection: avoid watery ripples.
        vec2 flow = vUv * uCrustScale;
        flow.y -= uTime * uFlowSpeed;
        vec2 warp = vec2(fbm(flow * 0.58), fbm(flow * 0.58 + 31.7));
        vec2 p = flow + (warp - 0.5) * 1.6;
        float edge = voronoiEdge(p);
        float brokenCrust = fbm(p * 0.67 + vec2(4.2, 9.8));
        float crack = 1.0 - smoothstep(0.035, 0.19, edge);
        float exposed = clamp(crack * 0.92 + (brokenCrust - uCrustCoverage) * 2.0, 0.0, 1.0);
        float hot = pow(clamp(fbm(p * 1.4 + 12.0), 0.0, 1.0), 2.0);
        vec3 crust = mix(vec3(0.014, 0.012, 0.012), vec3(0.072, 0.047, 0.039), fbm(p * 2.0));
        vec3 lava = mix(vec3(0.58, 0.038, 0.003), vec3(1.0, 0.30, 0.025), smoothstep(0.22, 0.72, hot));
        lava = mix(lava, vec3(1.0, 0.77, 0.20), smoothstep(0.75, 0.94, hot) * 0.55);
        // Keep UV boundaries dark; geometry must provide non-straight river banks.
        float bank = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y));
        float bankMask = smoothstep(0.0, 0.13, bank);
        float glow = exposed * mix(1.0-uEdgeDarkness, 1.0, bankMask);
        vec3 color = crust + lava * glow * uEmission;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true
  });
}
