import * as THREE from 'three';

export interface MilkyWayDestination {
  group: THREE.Group;
  update: (
    camera: THREE.Camera,
    anchorWorldPos: THREE.Vector3,
    remainingFraction: number
  ) => void;
  dispose: () => void;
}

export function createMilkyWayDestination(planeSize = 26000): MilkyWayDestination {
  const group = new THREE.Group();
  group.name = 'milky-way-destination';

  const geometry = new THREE.PlaneGeometry(1, 1);

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    fog: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec2 vUv;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * vnoise(p);
          p = p * 2.03 + vec2(17.1, 9.7);
          a *= 0.5;
        }
        return v;
      }

      vec3 milkyWayBand(vec2 uv) {
        float tilt = 0.55;
        mat2 rot = mat2(cos(tilt), -sin(tilt), sin(tilt), cos(tilt));
        vec2 p = rot * uv;

        float curve = sin(p.x * 2.4 + 0.8) * 0.10 + sin(p.x * 5.3 + 2.0) * 0.025;
        float d = p.y - curve;

        float clouds = fbm(vec2(p.x * 3.2, d * 6.0) + vec2(4.0, 9.0));
        float fine = fbm(vec2(p.x * 14.0, d * 22.0));

        float halo = exp(-d * d * 7.0);
        float body = exp(-d * d * 28.0) * (0.45 + 0.9 * clouds);
        float coreGlow = exp(-d * d * 90.0) * exp(-p.x * p.x * 1.6) * 0.9;
        float dust = exp(-d * d * 260.0) * smoothstep(0.35, 0.8, fbm(vec2(p.x * 7.0, d * 30.0) + 11.0));
        float grain = pow(hash(floor(uv * 520.0)), 22.0) * 3.0 * (halo * 0.4 + body);

        vec3 cool = vec3(0.42, 0.55, 0.95);
        vec3 warm = vec3(1.0, 0.82, 0.58);

        vec3 col = cool * halo * 0.14
                 + mix(cool, warm, 0.5 + 0.5 * fine) * body * 0.35
                 + warm * coreGlow * 0.6;
        col += vec3(1.0, 0.95, 0.9) * grain * 0.5;
        col *= (1.0 - 0.85 * dust);
        return col;
      }

      void main() {
        vec2 centered = (vUv - 0.5) * 2.0;
        float radialEdge = 1.0 - smoothstep(0.48, 0.98, length(centered));

        vec2 uv = (vUv - 0.5) * vec2(2.05, 1.65);
        vec3 col = milkyWayBand(uv) * 2.4 * radialEdge * uOpacity;

        float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
        if (alpha <= 0.001) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -50;
  group.add(mesh);

  const dirVec = new THREE.Vector3();
  const PROXY_CLAMP_DIST = 28000;
  const VISIBILITY_START_DIST = 120000;

  const update: MilkyWayDestination['update'] = (
    camera,
    anchorWorldPos,
    _remainingFraction
  ) => {
    dirVec.copy(anchorWorldPos).sub(camera.position);
    const dist = dirVec.length();

    if (dist >= VISIBILITY_START_DIST) {
      mesh.visible = false;
      material.uniforms.uOpacity.value = 0.0;
      return;
    }

    mesh.visible = true;
    group.quaternion.copy(camera.quaternion);

    const fadeT = THREE.MathUtils.clamp((VISIBILITY_START_DIST - dist) / (VISIBILITY_START_DIST - PROXY_CLAMP_DIST), 0, 1);
    material.uniforms.uOpacity.value = fadeT * fadeT * (3 - 2 * fadeT);

    if (dist > PROXY_CLAMP_DIST) {
      dirVec.divideScalar(dist || 1);
      group.position.copy(camera.position).addScaledVector(dirVec, PROXY_CLAMP_DIST);
      const proxyScale = PROXY_CLAMP_DIST / dist;
      mesh.scale.set(planeSize * proxyScale, planeSize * 0.8 * proxyScale, 1);
      mesh.renderOrder = -50;
      material.depthTest = false;
    } else {
      group.position.copy(anchorWorldPos);
      mesh.scale.set(planeSize, planeSize * 0.8, 1);
      mesh.renderOrder = 0;
      material.depthTest = true;
    }
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { group, update, dispose };
}
