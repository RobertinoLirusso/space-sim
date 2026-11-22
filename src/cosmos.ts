import * as THREE from 'three';
import { createBackgroundStarfield } from './starfield';
import { createMilkyWayDestination } from './milkyway';
import { SpaceAudioEngine } from './audio';

THREE.ColorManagement.enabled = false;

interface GalaxyOptions {
  particleCount?: number;
  radius?: number;
  arms?: number;
  spin?: number;
  randomness?: number;
  power?: number;
  insideColor?: number;
  outsideColor?: number;
  dustColor?: number;
  position?: THREE.Vector3;
  rotation?: THREE.Euler;
}

export function initCosmicScene(container: HTMLElement) {

    const extraObjects: { obj: THREE.Object3D; speed: number }[] = [];


    const darkTextures = [createDarkCloudTexture(), createDarkCloudTexture(), createDarkCloudTexture()];
  const abyssTexture = createAbyssTexture();
  const wormHaloTexture = createWormHaloTexture();
  const glowTextureCache = new Map<string, THREE.CanvasTexture>();

  const U = 2.4;
// En el borde lejano del espacio visible
const wormLocal = new THREE.Vector3(57140, -21290, -63450);
const BH_CLEAR = 7800;
const sectorBlackHoleSpecs = [
  { dist: 138000, lon: 118, lat: 38, radius: 2400, palette: 1, strength: 1.50 },
  { dist: 195000, lon: -168, lat: -44, radius: 2800, palette: 2, strength: 1.55 },
];
const sectorBlackHoleLocalPositions = sectorBlackHoleSpecs.map(spec => {
  const phi = THREE.MathUtils.degToRad(90 - spec.lat);
  const theta = THREE.MathUtils.degToRad(spec.lon);
  return new THREE.Vector3(
    spec.dist * Math.sin(phi) * Math.cos(theta),
    spec.dist * Math.cos(phi),
    spec.dist * Math.sin(phi) * Math.sin(theta)
  );
});
function isNearSecondaryBlackHole(x: number, y: number, z: number, clearRadius: number): boolean {
  const r2 = clearRadius * clearRadius;
  for (let i = 0; i < sectorBlackHoleLocalPositions.length; i++) {
    const p = sectorBlackHoleLocalPositions[i];
    const dx = x - p.x;
    const dy = y - p.y;
    const dz = z - p.z;
    if (dx * dx + dy * dy + dz * dz < r2) return true;
  }
  return false;
}
  const exploreFog = new THREE.FogExp2(0x000000, 0.0001);
  const scene = new THREE.Scene();
  scene.fog = exploreFog;

    const animators: Array<(t: number) => void> = [];

  let currentBuildingChunkKey: string | null = null;

  const universe = new THREE.Group();
  universe.scale.setScalar(U);
  scene.add(universe);

  const bgStarfield = createBackgroundStarfield();
  scene.add(bgStarfield.group);

  const milkyWay = createMilkyWayDestination(26000);
  scene.add(milkyWay.group);

  const MILKY_WAY_WORLD_DIST = 6815000000;
  const MILKY_WAY_ARRIVAL_DIST = 4500;
  const MILKY_WAY_DISPLAY_LY = 2500000;
  const MILKY_WAY_TRAVEL_DIST = MILKY_WAY_WORLD_DIST - MILKY_WAY_ARRIVAL_DIST;
  const mwPhi = THREE.MathUtils.degToRad(90 - 16);
  const mwTheta = THREE.MathUtils.degToRad(-115);
  const mwAnchorWorldPos = new THREE.Vector3(
    MILKY_WAY_WORLD_DIST * Math.sin(mwPhi) * Math.cos(mwTheta),
    MILKY_WAY_WORLD_DIST * Math.cos(mwPhi),
    MILKY_WAY_WORLD_DIST * Math.sin(mwPhi) * Math.sin(mwTheta)
  );

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 40000);
  camera.position.set(0, 0, 0.1);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);

    function buildPoints(pos: Float32Array, col: Float32Array, size: number, scaled = true) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(geo, new THREE.PointsMaterial({
      size: scaled ? size * U : size,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
  }

    function glowSprite(scale: number, r: number, g: number, b: number, opacity = 0.9) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(256, r, g, b),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity,
      depthWrite: false
    }));
    s.scale.set(scale, scale, 1);
    return s;
  }

  function createGlowTexture(size = 128, r = 1, g = 1, b = 1) {
    const key = `${size}_${r.toFixed(2)}_${g.toFixed(2)}_${b.toFixed(2)}`;
    const cached = glowTextureCache.get(key);
    if (cached) return cached;

    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 1.0)`);
    grad.addColorStop(0.18, `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.8)`);
    grad.addColorStop(0.5, `rgba(${r * 200}, ${g * 180}, ${b * 255}, 0.25)`);
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cvs);
    glowTextureCache.set(key, tex);
    return tex;
  }

    function gauss() {
    const u = 1 - Math.random();
    const v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  
function createDarkMolecularCloud(count: number, radius: number) {
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: darkTextures[i % darkTextures.length],
      color: 0x050508,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.55, 0.92),
      depthWrite: false,
      depthTest: false
    });
    mat.rotation = Math.random() * Math.PI * 2;
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      gauss() * radius * 0.7,
      gauss() * radius * 0.35,
      gauss() * radius * 0.7
    );
    const s = THREE.MathUtils.randFloat(radius * 0.35, radius * 0.9);
    sprite.scale.set(s, s * (0.6 + Math.random() * 0.5), 1);
    sprite.renderOrder = 4;
    group.add(sprite);
  }
  return group;
}

function createEmissionNebula(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cHot = new THREE.Color(0xff4a6e);
  const cPink = new THREE.Color(0xff8ab8);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.6);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.55;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(cHot).lerp(cPink, Math.random());
    c.multiplyScalar(0.7 + Math.random() * 1.1);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 5.5);
  addCore(points, radius * 0.7, 1.0, 0.35, 0.55, 0.45);
  return points;
}

function createReflectionNebula(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cBlue = new THREE.Color(0x6eb8ff);
  const cCyan = new THREE.Color(0xa0e0ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.8);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.5;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(cBlue).lerp(cCyan, Math.random());
    c.multiplyScalar(0.6 + Math.random() * 0.9);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 5.0);
  addCore(points, radius * 0.55, 0.7, 0.85, 1.0, 0.55);
  return points;
}

function createOpenCluster(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cBlue = new THREE.Color(0xa0d4ff);
  const cWhite = new THREE.Color(0xffffff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.7);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.7;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(cBlue).lerp(cWhite, Math.random() * 0.7);
    c.multiplyScalar(0.9 + Math.random() * 1.4);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  return buildPoints(pos, col, 3.8);
}

function createEdgeOnGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe2aa);
  const cOut = new THREE.Color(0x4a8cff);
  const cDust = new THREE.Color(0x1a0a08);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.1) * radius;
    const angle = Math.random() * Math.PI * 2;

    pos[i3] = Math.cos(angle) * r;
    pos[i3 + 1] = gauss() * radius * 0.045;           // muy aplastada
    pos[i3 + 2] = Math.sin(angle) * r;

    // Banda de polvo central
    if (Math.abs(pos[i3 + 1]) < radius * 0.018 && Math.random() > 0.4) {
      c.copy(cDust).multiplyScalar(0.3 + Math.random() * 0.4);
    } else {
      c.copy(cIn).lerp(cOut, r / radius);
      c.multiplyScalar(0.7 + Math.max(0, 1 - r / (radius * 0.3)) * 1.6);
    }

    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.2);
  addCore(points, radius * 0.28, 1.0, 0.9, 0.7, 0.85);
  return points;
}

function createInterstellarFilament(length: number, count: number) {
  const group = new THREE.Group();
  const a = new THREE.Color(0x7a9fff);
  const b = new THREE.Color(0xd0a0ff);

  for (let i = 0; i < count; i++) {
    const t = i / count;
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: a.clone().lerp(b, t),
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.12, 0.28),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      (t - 0.5) * length + gauss() * 25,
      gauss() * 18,
      gauss() * 25
    );
    const s = THREE.MathUtils.randFloat(60, 160);
    sprite.scale.set(s, s * 0.6, 1);
    group.add(sprite);
  }
  return group;
}

function createStarFormingRegion(count: number, radius: number) {
  const group = new THREE.Group();

  // Estrellas jóvenes brillantes
  const starPos = new Float32Array(count * 3);
  const starCol = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.9);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    starPos[i3] = r * s * Math.cos(t);
    starPos[i3 + 1] = r * u * 0.6;
    starPos[i3 + 2] = r * s * Math.sin(t);

    c.setRGB(0.7 + Math.random() * 0.3, 0.85 + Math.random() * 0.15, 1.0);
    c.multiplyScalar(1.2 + Math.random() * 1.8);
    starCol[i3] = c.r; starCol[i3 + 1] = c.g; starCol[i3 + 2] = c.b;
  }

  group.add(buildPoints(starPos, starCol, 4.0));

  // Nebulosidad asociada
  const neb = createEmissionNebula(Math.floor(count * 0.6), radius * 1.1);
  group.add(neb);

  return group;
}

// ====================== MÁS TIPOS DE GALAXIAS ======================

function createBarredSpiralGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe9b8);
  const cOut = new THREE.Color(0x5fa8ff);
  const cDust = new THREE.Color(0xff4fa3);
  const c = new THREE.Color();
  const barLen = radius * 0.32;

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    if (i < count * 0.28) {
      // Barra central
      pos[i3] = (Math.random() * 2 - 1) * barLen;
      pos[i3 + 1] = gauss() * radius * 0.018;
      pos[i3 + 2] = gauss() * radius * 0.05;
      c.copy(cIn).multiplyScalar(1.3 + (1 - Math.abs(pos[i3]) / barLen) * 0.8);
    } else {
      // Brazos espirales desde la barra
      const arm = i % 2;
      const r = barLen + Math.pow(Math.random(), 1.45) * (radius - barLen);
      const angle = arm * Math.PI + (r - barLen) * 0.013;
      pos[i3] = Math.cos(angle) * r + gauss() * r * 0.045;
      pos[i3 + 1] = gauss() * radius * 0.02;
      pos[i3 + 2] = Math.sin(angle) * r + gauss() * r * 0.045;

      c.copy(cIn).lerp(cOut, (r - barLen) / (radius - barLen));
      if (Math.random() > 0.68) c.lerp(cDust, Math.random() * 0.65);
    }

    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 5.0);
  addCore(points, radius * 0.42, 1.0, 0.92, 0.75);
  return points;
}

function createLenticularGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe2a8);
  const cOut = new THREE.Color(0xd4b48a);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.4) * radius;
    const ang = Math.random() * Math.PI * 2;

    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.07; // disco delgado
    pos[i3 + 2] = Math.sin(ang) * r;

    c.copy(cIn).lerp(cOut, r / radius);
    c.multiplyScalar(0.7 + Math.max(0, 1 - r / (radius * 0.35)) * 1.5);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.3);
  addCore(points, radius * 0.48, 1.0, 0.88, 0.65, 0.9);
  return points;
}

function createFlocculentSpiral(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cIn = new THREE.Color(0xffe6b0);
  const cOut = new THREE.Color(0x6eb0ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = Math.pow(Math.random(), 2.0) * radius;
    const ang = Math.random() * Math.PI * 2 + r * 0.008 * (Math.random() > 0.5 ? 1 : -1);

    // Fragmentos de brazos (floculento)
    const patch = Math.floor(Math.random() * 7);
    const patchAng = ang + patch * 0.9;

    pos[i3] = Math.cos(patchAng) * r + gauss() * r * 0.08;
    pos[i3 + 1] = gauss() * radius * 0.03;
    pos[i3 + 2] = Math.sin(patchAng) * r + gauss() * r * 0.08;

    c.copy(cIn).lerp(cOut, r / radius);
    c.multiplyScalar(0.65 + Math.random() * 0.9);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.6);
  addCore(points, radius * 0.38, 1.0, 0.9, 0.7);
  return points;
}

function createDwarfSpheroidal(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color(0xffd9a0);
  const white = new THREE.Color(0xffffff);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.9);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.85;
    pos[i3 + 2] = r * s * Math.sin(t);

    c.copy(c).lerp(white, Math.random() * 0.4).multiplyScalar(0.6 + Math.random() * 0.7);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  return buildPoints(pos, col, 3.6);
}

function createSeyfertGalaxy(count: number, radius: number) {
  const group = new THREE.Group();

  // Disco espiral normal
  const disk = createSpiralGalaxy({
    particleCount: Math.floor(count * 0.85),
    radius,
    arms: 3,
    spin: 1.15,
    randomness: 0.28,
    insideColor: 0xffe9b0,
    outsideColor: 0x4a9fff,
    dustColor: 0xc43bff
  }).container;
  group.add(disk);

  // Núcleo extremadamente brillante (característica Seyfert)
  const core = glowSprite(radius * 0.55, 1.0, 0.95, 0.85, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.3, 0.7, 0.6, 1.0, 0.35));

  return group;
}

function createPeculiarGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color(0xffb07a);
  const c2 = new THREE.Color(0x7ab0ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.random();
    const ang = t * Math.PI * 6 + Math.random() * 2;

    // Forma distorsionada / colisional
    const r = radius * (0.3 + Math.pow(Math.random(), 1.6) * 0.9);
    pos[i3] = Math.cos(ang) * r * (1 + Math.sin(t * 8) * 0.25);
    pos[i3 + 1] = gauss() * radius * 0.12 + Math.sin(t * 5) * radius * 0.15;
    pos[i3 + 2] = Math.sin(ang) * r * (1 + Math.cos(t * 7) * 0.25);

    c.copy(c1).lerp(c2, Math.random());
    c.multiplyScalar(0.7 + Math.random() * 1.0);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.5);
  addCore(points, radius * 0.4, 1.0, 0.85, 0.6);
  return points;
}

function createClassicRingGalaxy(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cCore = new THREE.Color(0xffe0b0);
  const cRing = new THREE.Color(0x4de1ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.random() * Math.PI * 2;

    if (i < count * 0.22) {
      // Núcleo
      const r = Math.pow(Math.random(), 2.3) * radius * 0.2;
      pos[i3] = Math.cos(t) * r;
      pos[i3 + 1] = gauss() * radius * 0.025;
      pos[i3 + 2] = Math.sin(t) * r;
      c.copy(cCore).multiplyScalar(1.2 + Math.random() * 0.8);
    } else {
      // Anillo
      const r = radius * (0.72 + gauss() * 0.06);
      pos[i3] = Math.cos(t) * r;
      pos[i3 + 1] = gauss() * radius * 0.02;
      pos[i3 + 2] = Math.sin(t) * r;
      c.copy(cRing).multiplyScalar(0.75 + Math.random() * 0.9);
    }

    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  const points = buildPoints(pos, col, 4.6);
  addCore(points, radius * 0.32, 1.0, 0.9, 0.7);
  return points;
}

function createGalaxyGroup(seed: number) {
  const group = new THREE.Group();
  const num = 3 + Math.floor(seededRandom(seed) * 4); // 3 a 6 galaxias

  for (let i = 0; i < num; i++) {
    const localSeed = seed + i * 31;
    const size = 180 + seededRandom(localSeed) * 220;
    const type = seededRandom(localSeed + 1);

    let gal: THREE.Object3D;
    if (type < 0.25) {
      gal = createSpiralGalaxy({
        particleCount: Math.floor(9000 + seededRandom(localSeed + 2) * 14000),
        radius: size,
        arms: 2 + Math.floor(seededRandom(localSeed + 3) * 2),
        spin: 1.0 + seededRandom(localSeed + 4) * 0.8,
        randomness: 0.25,
        insideColor: 0xffe9b0,
        outsideColor: 0x4a9fff,
        dustColor: 0xc43bff
      }).container;
    } else {
      gal = createEllipticalGalaxy(
        Math.floor(8000 + seededRandom(localSeed + 2) * 10000),
        size * 0.85,
        0.6,
        0xffd9a0,
        0xff8a5a
      );
    }

    gal.position.set(
      (seededRandom(localSeed + 5) - 0.5) * 420,
      (seededRandom(localSeed + 6) - 0.5) * 180,
      (seededRandom(localSeed + 7) - 0.5) * 420
    );
    group.add(gal);
  }
  return group;
}

  function createNebulaCloudTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 256;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(128, 128, 6, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.88)');
    grad.addColorStop(0.28, 'rgba(215, 222, 234, 0.34)');
    grad.addColorStop(0.65, 'rgba(135, 148, 175, 0.09)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cvs);
  }

  function createPinpointStarTexture(size = 64) {
    const cvs = document.createElement('canvas');
    cvs.width = size;
    cvs.height = size;
    const ctx = cvs.getContext('2d')!;
    const half = size / 2;
    const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.11, 'rgba(255, 250, 240, 0.86)');
    grad.addColorStop(0.28, 'rgba(255, 236, 200, 0.24)');
    grad.addColorStop(0.56, 'rgba(255, 215, 160, 0.04)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(cvs);
  }

  const starTexture = createGlowTexture(64, 1, 1, 1);
  const pinpointStarTexture = createPinpointStarTexture(64);
  const nebulaTexture = createNebulaCloudTexture();

  // Vacío de Boötes + Tramos de Vacíos Oscuros
  const voidLon = 135;
  const voidLat = -40;
  const voidDistance = 10000;
  const voidRadius = 6000;
  const vPhi = THREE.MathUtils.degToRad(90 - voidLat);
  const vTheta = THREE.MathUtils.degToRad(voidLon);
  const voidDir = new THREE.Vector3(
    Math.sin(vPhi) * Math.cos(vTheta),
    Math.cos(vPhi),
    Math.sin(vPhi) * Math.sin(vTheta)
  );
  const voidCenter = voidDir.clone().multiplyScalar(voidDistance);

  const OBJECT_CHUNK_SIZE = 2800;
  const REGION_SIZE = 3;
  const REGION_LOCAL_SIZE = REGION_SIZE * OBJECT_CHUNK_SIZE;
  const VOID_REGION_HALF = REGION_LOCAL_SIZE * 0.54;

  type RegionType =
    | 'normal'
    | 'colossal_nebula'
    | 'dark_dust'
    | 'pillars_of_creation'
    | 'dark_void';

  function seededRandom(seed: number) {
    const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function getRegionType(cx: number, cy: number, cz: number): RegionType {
    const rx = Math.floor(cx / REGION_SIZE);
    const ry = Math.floor(cy / REGION_SIZE);
    const rz = Math.floor(cz / REGION_SIZE);
    if (rx === 0 && ry === 0 && rz === 0) return 'normal';
    const seed = rx * 73856093 ^ ry * 19349663 ^ rz * 83492791;
    const roll = seededRandom(seed);

    if (roll < 0.18) return 'pillars_of_creation';
    if (roll < 0.36) return 'dark_void';
    if (roll < 0.48) return 'colossal_nebula';
    if (roll < 0.58) return 'dark_dust';
    return 'normal';
  }

  function getDarkVoidRegionFactor(x: number, y: number, z: number): number {
    const cx = Math.floor(x / OBJECT_CHUNK_SIZE);
    const cy = Math.floor(y / OBJECT_CHUNK_SIZE);
    const cz = Math.floor(z / OBJECT_CHUNK_SIZE);
    if (getRegionType(cx, cy, cz) !== 'dark_void') return 0;

    const rx = Math.floor(cx / REGION_SIZE);
    const ry = Math.floor(cy / REGION_SIZE);
    const rz = Math.floor(cz / REGION_SIZE);
    const centerX = (rx + 0.5) * REGION_LOCAL_SIZE;
    const centerY = (ry + 0.5) * REGION_LOCAL_SIZE;
    const centerZ = (rz + 0.5) * REGION_LOCAL_SIZE;
    const k = Math.hypot(x - centerX, y - centerY, z - centerZ) / VOID_REGION_HALF;
    if (k >= 1) return 0;
    if (k <= 0.56) return 1;
    const t = (k - 0.56) / 0.44;
    return 1 - t * t * (3 - 2 * t);
  }

  function getVoidFactorAtLocal(x: number, y: number, z: number): number {
    const k = Math.hypot(x - voidCenter.x, y - voidCenter.y, z - voidCenter.z) / voidRadius;
    let bootes = 0;
    if (k < 1) {
      if (k <= 0.6) bootes = 1;
      else {
        const t = (k - 0.6) / 0.4;
        bootes = 1 - t * t * (3 - 2 * t);
      }
    }
    return Math.max(bootes, getDarkVoidRegionFactor(x, y, z));
  }

  function isInVoid(x: number, y: number, z: number) {
    const dx = x - voidCenter.x;
    const dy = y - voidCenter.y;
    const dz = z - voidCenter.z;
    const k = Math.sqrt(dx * dx + dy * dy + dz * dz) / voidRadius;
    if (k < 1) {
      if (k < 0.6) return true;
      const t = (k - 0.6) / 0.4;
      const cellX = Math.floor(x / 10);
      const cellY = Math.floor(y / 10);
      const cellZ = Math.floor(z / 10);
      const shellDensity = 0.02 + 0.98 * t * t * t;
      if (seededRandom(cellX * 73856093 ^ cellY * 19349663 ^ cellZ * 83492791) > shellDensity) {
        return true;
      }
    }

    const regionVoid = getDarkVoidRegionFactor(x, y, z);
    if (regionVoid > 0) {
      if (regionVoid >= 0.85) return true;
      const cellX = Math.floor(x / 18);
      const cellY = Math.floor(y / 18);
      const cellZ = Math.floor(z / 18);
      const keepProb = 1 - regionVoid;
      return seededRandom(cellX * 73856093 ^ cellY * 19349663 ^ cellZ * 83492791) > keepProb;
    }

    return false;
  }

  const voidLocalPosition = new THREE.Vector3();
  function isWorldPositionInVoid(position: THREE.Vector3) {
    voidLocalPosition.copy(position)
      .sub(universe.position)
      .divideScalar(universe.scale.x);
    return isInVoid(voidLocalPosition.x, voidLocalPosition.y, voidLocalPosition.z);
  }

  function createAbyssTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 512;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.97)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.94)');
    grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.45)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(cvs);
  }

  const abyss = new THREE.Sprite(new THREE.SpriteMaterial({
    map: abyssTexture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    fog: false
  }));
  abyss.position.copy(voidCenter);
  abyss.scale.set(voidRadius * 2, voidRadius * 2, 1);
  abyss.renderOrder = 10;
  universe.add(abyss);

  function createWormHaloTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 512;
    cvs.height = 512;
    const ctx = cvs.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grad.addColorStop(0.0, 'rgba(255, 140, 40, 0.0)');
    grad.addColorStop(0.2, 'rgba(255, 120, 30, 0.18)');
    grad.addColorStop(0.38, 'rgba(220, 80, 20, 0.22)');
    grad.addColorStop(0.55, 'rgba(140, 40, 10, 0.12)');
    grad.addColorStop(0.8, 'rgba(60, 15, 5, 0.04)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(cvs);
  }

  interface GravityBlackHole {
    chunkKey: string | null;
    isMainWormhole: boolean;
    localPos: THREE.Vector3 | null;
    worldPos: THREE.Vector3;
    visualRadius: number;
    pullRadius: number;
    turbRadius: number;
    throatRadius: number;
    pullStrength: number;
    diskMesh: THREE.Mesh;
    diskMaterial: THREE.ShaderMaterial;
    haloSprite: THREE.Sprite;
    baseHaloScale: number;
    baseHaloOpacity: number;
  }

  const gravityBlackHoles: GravityBlackHole[] = [];
  const bhDiskGeo = new THREE.PlaneGeometry(1, 1);

  const BH_PALETTES = [
    { tint: new THREE.Color(1.0, 0.85, 0.65), halo: 0xff9a44, spinDir: 1.0 },   // Classic Gargantua amber-gold
    { tint: new THREE.Color(0.68, 0.88, 1.15), halo: 0x62b4ff, spinDir: -1.0 }, // Quasar blue-white
    { tint: new THREE.Color(1.05, 0.52, 0.72), halo: 0xff4d7a, spinDir: 1.0 },  // Crimson-magenta plasma
    { tint: new THREE.Color(0.82, 0.72, 1.15), halo: 0x9b6cff, spinDir: -1.0 }, // Void indigo-violet
  ];

  function createBlackHoleShaderMaterial(
    tint: THREE.Color,
    spinDir: number,
    phaseOffset: number,
    depthTest: boolean,
    intensityMult = 1.15
  ) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uApproach: { value: 0 },
        uFarFade: { value: 1.0 },
        uTint: { value: tint.clone() },
        uSpinDir: { value: spinDir },
        uPhase: { value: phaseOffset },
        uIntensity: { value: intensityMult },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uApproach;
        uniform float uFarFade;
        uniform vec3 uTint;
        uniform float uSpinDir;
        uniform float uPhase;
        uniform float uIntensity;
        varying vec2 vUv;

        float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
                     mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * vnoise(p);
            p = p * 2.03 + vec2(11.3, 7.1);
            a *= 0.5;
          }
          return v;
        }

        vec3 heat(float x) {
          x = clamp(x, 0.0, 1.0);
          vec3 c = mix(vec3(0.0), vec3(0.28, 0.03, 0.0), smoothstep(0.0, 0.18, x));
          c = mix(c, vec3(0.75, 0.13, 0.0), smoothstep(0.15, 0.42, x));
          c = mix(c, vec3(1.0, 0.46, 0.04), smoothstep(0.38, 0.66, x));
          c = mix(c, vec3(1.0, 0.80, 0.28), smoothstep(0.62, 0.86, x));
          c = mix(c, vec3(1.0, 0.97, 0.75), smoothstep(0.84, 1.0, x));
          return c;
        }

        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float t = uTime + uPhase;

          vec2 pc = p - vec2(0.0, 0.03);
          float r = length(pc);
          float a = atan(pc.y, pc.x);

          float peak = -1.25 + 0.12 * sin(t * 0.11);
          float beam = pow(0.5 + 0.5 * cos(a - peak), 1.7);
          float beam2 = pow(0.5 + 0.5 * cos(a - (peak - 1.7)), 3.0);
          float doppler = 0.16 + 0.85 * beam + 0.35 * beam2;

          float n = fbm(vec2(a * 1.3 + t * 0.12 * uSpinDir, r * 4.0 - t * 0.10));
          float aperture = 1.0 + uApproach * 0.6;
          float ringR = 0.22 * aperture + 0.018 * (n - 0.5) + 0.008 * sin(t * 0.8 + a * 2.0);
          float width = (0.078 + 0.028 * n) * aperture;
          float dr = (r - ringR) / width;
          float ring = exp(-dr * dr);
          float orbitPulse = 0.88 + 0.12 * sin(t * 1.35 * uSpinDir - a * 2.0 + r * 18.0);
          float hz = max(r - 0.12, 0.0) * 3.4;
          float haze = exp(-hz * hz) * 0.12 * (0.5 + 0.7 * n);
          float outer = exp(-r * 4.5) * 0.10 * (0.4 + doppler);

          float I = ring * doppler * (0.75 + 0.5 * n) * orbitPulse + haze * (0.4 + doppler * 0.6) + outer;

          float rs = length(p - vec2(0.0, 0.07));
          float shadow = 1.0 - smoothstep(0.085 + uApproach * 0.12, 0.175 + uApproach * 0.16, rs);
          I = I * (1.0 - 0.92 * shadow) + shadow * 0.05;

          float edge = 1.0 - smoothstep(0.78, 1.0, length(p));
          float alpha = edge * clamp(smoothstep(0.0, 0.28, I) + shadow * 0.96, 0.0, 1.0) * uFarFade;
          vec3 col = heat(I * uIntensity) * uTint;
          col *= (1.0 - 0.94 * shadow);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
  }

  function createGravitationalBlackHole(
    localPos: THREE.Vector3,
    localRadius: number,
    seed: number,
    options?: {
      paletteIdx?: number;
      pullStrength?: number;
      haloOpacity?: number;
      intensity?: number;
      chunkKey?: string | null;
    }
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(localPos);

    const paletteIdx = options?.paletteIdx ?? Math.floor(seededRandom(seed + 1) * BH_PALETTES.length);
    const pal = BH_PALETTES[paletteIdx % BH_PALETTES.length];

    const diskMaterial = createBlackHoleShaderMaterial(
      pal.tint,
      pal.spinDir,
      seededRandom(seed + 2) * 40,
      true,
      options?.intensity ?? 1.12
    );
    const diskMesh = new THREE.Mesh(bhDiskGeo, diskMaterial);
    diskMesh.scale.set(localRadius * 2, localRadius * 2, 1);
    diskMesh.renderOrder = 6;
    group.add(diskMesh);

    const baseHaloOpacity = options?.haloOpacity ?? 0.62;
    const baseHaloScale = localRadius * 3.8;
    const haloSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: wormHaloTexture,
      color: pal.halo,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: baseHaloOpacity,
      depthWrite: false,
      fog: false
    }));
    haloSprite.scale.set(baseHaloScale, baseHaloScale, 1);
    haloSprite.renderOrder = 5;
    group.add(haloSprite);

    // Swirling hot accretion particles around the event horizon
    const dustCount = 2200;
    const dPos = new Float32Array(dustCount * 3);
    const dCol = new Float32Array(dustCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const ang = seededRandom(seed + i * 3.1) * Math.PI * 2;
      const rr = localRadius * (0.19 + Math.pow(seededRandom(seed + i * 5.7), 1.6) * 0.45);
      dPos[i3] = Math.cos(ang) * rr;
      dPos[i3 + 1] = (seededRandom(seed + i * 7.3) - 0.5) * localRadius * 0.035;
      dPos[i3 + 2] = Math.sin(ang) * rr;

      const heatFactor = 1.0 - Math.min(1, (rr / localRadius - 0.19) / 0.45);
      c.copy(pal.tint).multiplyScalar(0.55 + heatFactor * 1.35);
      dCol[i3] = c.r;
      dCol[i3 + 1] = c.g;
      dCol[i3 + 2] = c.b;
    }
    const dustPts = buildPoints(dPos, dCol, 3.6);
    dustPts.rotation.set(
      (seededRandom(seed + 8) - 0.5) * 1.1,
      seededRandom(seed + 9) * Math.PI,
      (seededRandom(seed + 10) - 0.5) * 0.8
    );
    group.add(dustPts);
    extraObjects.push({ obj: dustPts, speed: pal.spinDir * (0.12 + seededRandom(seed + 11) * 0.16) });

    const visualRadius = localRadius * U;
    const pullRadius = Math.max(4600, visualRadius * 2.15);
    const turbRadius = pullRadius * 1.55;
    const throatRadius = Math.max(460, visualRadius * 0.165);

    gravityBlackHoles.push({
      chunkKey: options?.chunkKey ?? null,
      isMainWormhole: false,
      localPos: localPos.clone(),
      worldPos: localPos.clone().multiplyScalar(U),
      visualRadius,
      pullRadius,
      turbRadius,
      throatRadius,
      pullStrength: options?.pullStrength ?? (1.15 + seededRandom(seed + 12) * 0.45),
      diskMesh,
      diskMaterial,
      haloSprite,
      baseHaloScale,
      baseHaloOpacity,
    });

    return group;
  }

  // ====================== SISTEMA DE ALERTAS DE PROXIMIDAD (ASTEROIDES Y ESCOMBROS) ======================
  interface HazardFieldRecord {
    chunkKey: string | null;
    localPos: THREE.Vector3;
    localRadius: number;
    label: string;
    impactCooldown: number;
  }

  const hazardFields: HazardFieldRecord[] = [];
  function registerHazardFieldIfAny(obj: THREE.Object3D, chunkKey: string | null) {
    const meta = obj.userData.hazardMeta as { label: string; localRadius: number } | undefined;
    if (!meta) return;
    hazardFields.push({
      chunkKey,
      localPos: obj.position.clone(),
      localRadius: meta.localRadius,
      label: meta.label,
      impactCooldown: 0,
    });
  }

  interface MassiveObjectRecord {
    chunkKey: string | null;
    localPos: THREE.Vector3;
    turbRadius: number;
    strength: number;
  }

  const massiveObjects: MassiveObjectRecord[] = [];
  function registerMassiveObject(
    localPos: THREE.Vector3,
    turbRadius: number,
    strength: number,
    chunkKey: string | null
  ) {
    massiveObjects.push({
      chunkKey,
      localPos: localPos.clone(),
      turbRadius,
      strength,
    });
  }

  // ====================== SISTEMA DE NODOS DE COMBUSTIBLE ======================
  interface FuelNodeRecord {
    id: string;
    chunkKey: string | null;
    localPos: THREE.Vector3;
    group: THREE.Group;
    innerRing: THREE.Mesh;
    outerRing: THREE.Mesh;
    haloSprite: THREE.Sprite;
    phase: number;
    collected: boolean;
    collectAnim: number;
  }

  const fuelNodes: FuelNodeRecord[] = [];
  const collectedFuelNodeIds = new Set<string>();
  const fuelCoreGeo = new THREE.OctahedronGeometry(28, 0);
  const fuelRingInnerGeo = new THREE.TorusGeometry(62, 2.4, 8, 36);
  const fuelRingOuterGeo = new THREE.TorusGeometry(84, 1.9, 8, 36);
  const fuelSharedGeos = new Set<THREE.BufferGeometry>([
    fuelCoreGeo,
    fuelRingInnerGeo,
    fuelRingOuterGeo,
  ]);
  const fuelGlowTex = createGlowTexture(256, 0.25, 1.0, 0.82);

  function createFuelNode(
    localPos: THREE.Vector3,
    id: string,
    chunkKey: string | null,
    seed: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.position.copy(localPos);

    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x9effef,
      fog: false,
    });
    const coreMesh = new THREE.Mesh(fuelCoreGeo, coreMat);
    group.add(coreMesh);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x32f5c8,
      transparent: true,
      opacity: 0.92,
      fog: false,
    });
    const innerRing = new THREE.Mesh(fuelRingInnerGeo, innerMat);
    innerRing.rotation.set(0.6, seededRandom(seed + 1) * Math.PI, 0.25);
    group.add(innerRing);

    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.8,
      fog: false,
    });
    const outerRing = new THREE.Mesh(fuelRingOuterGeo, outerMat);
    outerRing.rotation.set(-0.55, 0.4, seededRandom(seed + 2) * Math.PI);
    group.add(outerRing);

    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: fuelGlowTex,
        color: 0x80ffea,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        fog: false,
      })
    );
    coreGlow.scale.set(240, 240, 1);
    group.add(coreGlow);

    const haloSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: fuelGlowTex,
        color: 0x2de8bd,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        fog: false,
      })
    );
    haloSprite.scale.set(740, 740, 1);
    group.add(haloSprite);

    const alreadyCollected = collectedFuelNodeIds.has(id);
    if (alreadyCollected) {
      group.visible = false;
    }

    fuelNodes.push({
      id,
      chunkKey,
      localPos: localPos.clone(),
      group,
      innerRing,
      outerRing,
      haloSprite,
      phase: seededRandom(seed + 3) * Math.PI * 2,
      collected: alreadyCollected,
      collectAnim: 0,
    });

    return group;
  }

  // ====================== CAMPO ESTELAR INFINITO AVANZADO ======================
  const palette = [
    new THREE.Color(0xffb347),
    new THREE.Color(0xffb347),
    new THREE.Color(0xff9436),
    new THREE.Color(0xffd88a),
    new THREE.Color(0xfff2d6),
    new THREE.Color(0xffffff),
    new THREE.Color(0xa6cbff)
  ];

  const STAR_LAYERS = [
    { count: 22000, minR: 400,  maxR: 1800, size: 3.4, brightness: 0.95 },
    { count: 14000, minR: 1600, maxR: 3200, size: 4.5, brightness: 0.78 },
    { count: 9000,  minR: 2800, maxR: 5200, size: 6.2, brightness: 0.62 }
  ];

  const starFields: THREE.Points[] = [];
  const starGeometries: THREE.BufferGeometry[] = [];
  const starMaxDists: number[] = [];

  STAR_LAYERS.forEach((layer) => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(layer.count * 3);
    const colors = new Float32Array(layer.count * 3);

    for (let i = 0; i < layer.count; i++) {
      let x = 0, y = 0, z = 0;
      do {
        const radius = THREE.MathUtils.randFloat(layer.minR, layer.maxR);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
        x = radius * Math.sin(phi) * Math.cos(theta);
        y = radius * Math.sin(phi) * Math.sin(theta);
        z = radius * Math.cos(phi);
      } while (isInVoid(x, y, z));

      positions[i * 3]     = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const color = palette[Math.floor(Math.random() * palette.length)].clone();
      color.multiplyScalar((0.26 + Math.pow(Math.random(), 1.8) * 1.05) * layer.brightness);
      colors[i * 3]     = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: layer.size * U,
      map: pinpointStarTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    universe.add(points);

    starFields.push(points);
    starGeometries.push(geo);
    starMaxDists.push(layer.maxR * 1.15);
  });

  function createBokGlobule(radius: number) {
  const group = new THREE.Group();
  // Glóbulo denso + halo tenue
  for (let i = 0; i < 8; i++) {
    const mat = new THREE.SpriteMaterial({
      map: darkTextures[i % darkTextures.length],
      color: 0x060508,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.6, 0.95),
      depthWrite: false,
      depthTest: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(gauss() * radius * 0.25, gauss() * radius * 0.2, gauss() * radius * 0.25);
    const s = radius * THREE.MathUtils.randFloat(0.7, 1.3);
    sprite.scale.set(s, s * 0.85, 1);
    sprite.renderOrder = 5;
    group.add(sprite);
  }
  // Borde ionizado
  const rim = glowSprite(radius * 1.1, 0.9, 0.5, 0.35, 0.22);
  group.add(rim);
  // Estrella embebida débil
  group.add(glowSprite(radius * 0.2, 1.0, 0.85, 0.7, 0.5));
  return group;
}

function createProplydDisk(radius: number) {
  const group = new THREE.Group();
  const count = 5000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const ang = Math.random() * Math.PI * 2;
    const r = radius * (0.15 + Math.pow(Math.random(), 1.6) * 0.85);
    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.04;
    pos[i3 + 2] = Math.sin(ang) * r;
    const heat = 1 - r / radius;
    c.setRGB(1.0, 0.7 + heat * 0.25, 0.45 + heat * 0.4);
    c.multiplyScalar(0.6 + heat * 1.2);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.5));
  // Estrella central T Tauri
  group.add(glowSprite(radius * 0.35, 1.0, 0.9, 0.75, 1.0));
  // Cola de fotoevaporación (como proplyds de Orión)
  const tail = createHerbigHaroJets(radius * 1.4);
  tail.scale.setScalar(0.45);
  tail.rotation.z = Math.PI * 0.5;
  group.add(tail);
  return group;
}

function createStarburstGalaxy(count: number, radius: number) {
  const group = new THREE.Group();
  const disk = createSpiralGalaxy({
    particleCount: Math.floor(count * 0.7),
    radius,
    arms: 2 + Math.floor(Math.random() * 2),
    spin: 1.3,
    randomness: 0.4,
    insideColor: 0xffe0a0,
    outsideColor: 0x5aa0ff,
    dustColor: 0xff4a8a
  }).container;
  group.add(disk);
  // Estallido central de formación estelar
  const burst = createStarFormingRegion(Math.floor(count * 0.35), radius * 0.45);
  group.add(burst);
  group.add(glowSprite(radius * 0.6, 1.0, 0.7, 0.5, 0.55));
  return group;
}

function createKilonova(radius: number) {
  const group = new THREE.Group();
  const core = glowSprite(radius * 0.5, 1.0, 0.55, 0.35, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.6, 1.0, 0.35, 0.15, 0.35));
  const count = 8000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 0.85);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u;
    pos[i3 + 2] = r * s * Math.sin(t);
    // Eyección rica en r-process (rojo/naranja)
    c.setRGB(1.0, 0.35 + Math.random() * 0.35, 0.15);
    c.multiplyScalar(0.8 + Math.random() * 1.2);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 4.2));
  animators.push(t => {
    core.material.opacity = 0.65 + 0.35 * Math.sin(t * 4.0);
  });
  return group;
}

function createNova(radius: number) {
  const group = new THREE.Group();
  const shellCount = 3200;
  const positions = new Float32Array(shellCount * 3);
  const colors = new Float32Array(shellCount * 3);
  const hotGas = new THREE.Color(0xffa45f);
  const ionizedGas = new THREE.Color(0x9ddcff);
  const color = new THREE.Color();

  for (let i = 0; i < shellCount; i++) {
    const i3 = i * 3;
    const radiusAtPoint = radius * (0.82 + gauss() * 0.055);
    const y = Math.random() * 2 - 1;
    const angle = Math.random() * Math.PI * 2;
    const planarRadius = Math.sqrt(1 - y * y);
    positions[i3] = radiusAtPoint * planarRadius * Math.cos(angle);
    positions[i3 + 1] = radiusAtPoint * y * 0.72;
    positions[i3 + 2] = radiusAtPoint * planarRadius * Math.sin(angle);
    color.copy(hotGas).lerp(ionizedGas, Math.random() * 0.55)
      .multiplyScalar(0.55 + Math.random() * 0.9);
    colors[i3] = color.r;
    colors[i3 + 1] = color.g;
    colors[i3 + 2] = color.b;
  }

  const ejecta = buildPoints(positions, colors, 4.4);
  ejecta.material.transparent = true;
  ejecta.material.opacity = 0.62;
  group.add(ejecta);

  const whiteDwarf = glowSprite(radius * 0.22, 0.86, 0.94, 1.0, 1.0);
  group.add(whiteDwarf);

  const donorStar = glowSprite(radius * 0.48, 1.0, 0.56, 0.3, 0.9);
  donorStar.position.set(radius * 1.55, 0, 0);
  group.add(donorStar);

  const phase = Math.random() * Math.PI * 2;
  animators.push(t => {
    const outburst = 0.5 + 0.5 * Math.sin(t * 0.9 + phase);
    ejecta.material.opacity = 0.42 + outburst * 0.24;
    ejecta.scale.setScalar(1 + outburst * 0.035);
    whiteDwarf.material.opacity = 0.72 + outburst * 0.28;
  });

  return group;
}

function createGalaxyCluster(seed: number) {
  const group = new THREE.Group();
  const n = 5 + Math.floor(seededRandom(seed) * 6);
  for (let i = 0; i < n; i++) {
    const ls = seed + i * 41;
    const size = 140 + seededRandom(ls) * 180;
    let gal: THREE.Object3D;
    if (seededRandom(ls + 1) < 0.55) {
      gal = createEllipticalGalaxy(
        Math.floor(7000 + seededRandom(ls + 2) * 9000),
        size,
        0.55 + seededRandom(ls + 3) * 0.25,
        0xffe0b0,
        0xff9a60
      );
    } else {
      gal = createLenticularGalaxy(
        Math.floor(8000 + seededRandom(ls + 2) * 8000),
        size * 1.1
      );
    }
    gal.position.set(
      (seededRandom(ls + 4) - 0.5) * 700,
      (seededRandom(ls + 5) - 0.5) * 280,
      (seededRandom(ls + 6) - 0.5) * 700
    );
    group.add(gal);
  }
  // Medio intracúmulo (bruma tenue)
  for (let i = 0; i < 12; i++) {
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: 0x8ab0ff,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.04, 0.1),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(gauss() * 320, gauss() * 140, gauss() * 320);
    const s = THREE.MathUtils.randFloat(220, 480);
    sprite.scale.set(s, s * 0.7, 1);
    group.add(sprite);
  }
  return group;
}

function createRedSupergiantShell(radius: number) {
  const group = new THREE.Group();
  // Estrella (Betelgeuse-like)
  group.add(glowSprite(radius * 0.45, 1.0, 0.45, 0.2, 1.0));
  group.add(glowSprite(radius * 1.0, 1.0, 0.35, 0.12, 0.35));
  // Cascara de viento estelar
  const count = 7000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * (0.85 + gauss() * 0.08);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.9;
    pos[i3 + 2] = r * s * Math.sin(t);
    c.setRGB(1.0, 0.4 + Math.random() * 0.25, 0.2);
    c.multiplyScalar(0.5 + Math.random() * 0.7);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 4.0));
  return group;
}

let cachedExoplanetTex: THREE.CanvasTexture | null = null;
function getExoplanetTexture() {
  if (cachedExoplanetTex) return cachedExoplanetTex;
  const cvs = document.createElement('canvas');
  cvs.width = 256;
  cvs.height = 128;
  const ctx = cvs.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0.0, '#1e3556');
  grad.addColorStop(0.18, '#4a7ea8');
  grad.addColorStop(0.32, '#c89b6b');
  grad.addColorStop(0.46, '#e3be8d');
  grad.addColorStop(0.55, '#9d6a49');
  grad.addColorStop(0.7, '#d9ab7c');
  grad.addColorStop(0.85, '#3b628c');
  grad.addColorStop(1.0, '#172844');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 24; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 240, 215, 0.12)' : 'rgba(20, 35, 65, 0.16)';
    ctx.fillRect(0, (i / 24) * 128, 256, 2 + (i % 3));
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedExoplanetTex = tex;
  return tex;
}

function createRingedExoplanet(radius: number) {
  const group = new THREE.Group();
  const planetRadius = radius * 0.24;
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(planetRadius, 28, 20),
    new THREE.MeshBasicMaterial({ map: getExoplanetTexture() })
  );
  group.add(planet);

  // Atmósfera luminosa alrededor del exoplaneta
  group.add(glowSprite(planetRadius * 3.4, 0.55, 0.78, 1.0, 0.32));

  // Anillos planetarios concéntricos con división tipo Cassini
  const ringCount = 5200;
  const pos = new Float32Array(ringCount * 3);
  const col = new Float32Array(ringCount * 3);
  const c = new THREE.Color();
  for (let i = 0; i < ringCount; i++) {
    const i3 = i * 3;
    const band = Math.random();
    const rNorm = band < 0.42
      ? 0.36 + Math.random() * 0.24
      : 0.65 + Math.random() * 0.35;
    const r = radius * rNorm;
    const ang = Math.random() * Math.PI * 2;
    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.008;
    pos[i3 + 2] = Math.sin(ang) * r;

    if (band < 0.42) c.setRGB(0.88, 0.80, 0.68);
    else c.setRGB(0.68, 0.84, 1.0);
    c.multiplyScalar(0.55 + Math.random() * 0.75);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  const rings = buildPoints(pos, col, 3.0);
  group.add(rings);

  // Lunas heladas orbitando
  for (let m = 0; m < 2; m++) {
    const moonDist = radius * (1.15 + m * 0.28);
    const moonAng = m * 2.2;
    const moon = glowSprite(planetRadius * (0.35 - m * 0.08), 0.85, 0.92, 1.0, 0.9);
    moon.position.set(Math.cos(moonAng) * moonDist, (m - 0.5) * radius * 0.08, Math.sin(moonAng) * moonDist);
    group.add(moon);
  }

  group.rotation.set(0.35 + Math.random() * 0.3, Math.random() * Math.PI, -0.25);
  group.userData.hazardMeta = { label: 'RING DEBRIS', localRadius: radius * 1.15 };
  return group;
}

function createAsteroidBelt(radius: number) {
  const group = new THREE.Group();
  // Estrella enana central iluminando el cinturón rocoso
  group.add(glowSprite(radius * 0.24, 1.0, 0.86, 0.58, 0.95));

  const count = 4800;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * (0.48 + Math.random() * 0.52);
    const ang = Math.random() * Math.PI * 2;
    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.055;
    pos[i3 + 2] = Math.sin(ang) * r;

    const kind = Math.random();
    if (kind < 0.55) c.setRGB(0.62, 0.58, 0.54);
    else if (kind < 0.82) c.setRGB(0.75, 0.55, 0.38);
    else c.setRGB(0.72, 0.86, 0.98);
    c.multiplyScalar(0.5 + Math.random() * 0.9);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.8));
  group.rotation.set(Math.random() * 0.7, Math.random() * Math.PI, Math.random() * 0.5);
  group.userData.hazardMeta = { label: 'ASTEROID BELT', localRadius: radius };
  return group;
}

function createBipolarNebula(radius: number) {
  const group = new THREE.Group();
  // Remanente estelar central blanco-azulado
  group.add(glowSprite(radius * 0.28, 0.85, 0.95, 1.0, 1.0));
  group.add(glowSprite(radius * 0.75, 0.35, 0.85, 1.0, 0.35));

  const count = 9000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cInner = new THREE.Color(0x40e8ff);
  const cOuter = new THREE.Color(0xff428a);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const lobe = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.72);
    const ang = Math.random() * Math.PI * 2;
    const lobeWidth = radius * (0.08 + Math.sin(t * Math.PI * 0.88) * 0.44);
    const shellNoise = 0.78 + Math.random() * 0.28;

    pos[i3] = Math.cos(ang) * lobeWidth * shellNoise;
    pos[i3 + 1] = lobe * t * radius;
    pos[i3 + 2] = Math.sin(ang) * lobeWidth * shellNoise;

    c.copy(cInner).lerp(cOuter, t).multiplyScalar(0.55 + (1 - t * 0.4) * Math.random());
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 4.4));
  group.rotation.set(Math.random() * 1.4, Math.random() * Math.PI, Math.random() * 1.4);
  return group;
}

function createPulsarWindNebula(radius: number) {
  const group = new THREE.Group();
  group.add(glowSprite(radius * 0.26, 0.5, 0.9, 1.0, 1.0));
  group.add(glowSprite(radius * 1.2, 0.25, 0.6, 1.0, 0.26));

  const count = 8200;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    if (i < 1600) {
      // Jets relativistas del púlsar
      const side = i % 2 === 0 ? 1 : -1;
      const t = Math.random();
      const spread = radius * (0.02 + t * 0.06);
      pos[i3] = gauss() * spread;
      pos[i3 + 1] = side * t * radius * 1.25;
      pos[i3 + 2] = gauss() * spread;
      c.setRGB(0.65, 0.92, 1.0).multiplyScalar(1.1);
    } else {
      // Filamentos sincrotrón estilo Nebulosa del Cangrejo
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const fil = 0.72 + 0.28 * Math.sin(theta * 5 + u * 6);
      const r = radius * (0.35 + Math.pow(Math.random(), 0.7) * 0.65) * fil;
      pos[i3] = r * s * Math.cos(theta);
      pos[i3 + 1] = r * u * 0.78;
      pos[i3 + 2] = r * s * Math.sin(theta);

      if (Math.random() < 0.55) c.setRGB(0.32, 0.75, 1.0);
      else c.setRGB(1.0, 0.45, 0.32);
      c.multiplyScalar(0.55 + Math.random() * 0.9);
    }
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 4.0));
  return group;
}

function createBinaryAccretionSystem(radius: number) {
  const group = new THREE.Group();
  // Binaria de rayos X con transferencia de masa por lóbulo de Roche (tipo Cygnus X-1)
  const donorPos = new THREE.Vector3(-radius * 0.48, 0, 0);
  const accretorPos = new THREE.Vector3(radius * 0.36, 0, 0);

  const donor = glowSprite(radius * 0.62, 0.55, 0.82, 1.0, 1.0);
  donor.position.copy(donorPos);
  group.add(donor);
  const donorHalo = glowSprite(radius * 1.15, 0.32, 0.62, 1.0, 0.28);
  donorHalo.position.copy(donorPos);
  group.add(donorHalo);

  const accretor = glowSprite(radius * 0.24, 0.92, 0.96, 1.0, 1.0);
  accretor.position.copy(accretorPos);
  group.add(accretor);

  const count = 6400;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    if (i < 3400) {
      // Disco de acreción caliente alrededor del objeto compacto
      const r = radius * (0.06 + Math.pow(Math.random(), 1.3) * 0.34);
      const ang = Math.random() * Math.PI * 2;
      pos[i3] = accretorPos.x + Math.cos(ang) * r;
      pos[i3 + 1] = gauss() * radius * 0.014;
      pos[i3 + 2] = Math.sin(ang) * r;
      const t = 1 - r / (radius * 0.4);
      c.setRGB(0.65 + 0.35 * t, 0.78 + 0.22 * t, 1.0).multiplyScalar(0.75 + t * 0.95);
    } else if (i < 5200) {
      // Puente de plasma desde el punto de Lagrange L1
      const t = Math.random();
      const curve = Math.sin(t * Math.PI) * radius * 0.14;
      pos[i3] = THREE.MathUtils.lerp(donorPos.x + radius * 0.14, accretorPos.x, t) + gauss() * radius * 0.025;
      pos[i3 + 1] = gauss() * radius * 0.025;
      pos[i3 + 2] = curve + gauss() * radius * 0.025;
      c.setRGB(0.42, 0.88, 1.0).multiplyScalar(0.65 + t * 0.85);
    } else {
      // Jets relativistas del microcuásar
      const side = i % 2 === 0 ? 1 : -1;
      const t = Math.random();
      const spread = radius * (0.015 + t * 0.045);
      pos[i3] = accretorPos.x + gauss() * spread;
      pos[i3 + 1] = side * t * radius * 0.95;
      pos[i3 + 2] = gauss() * spread;
      c.setRGB(0.78, 0.72, 1.0).multiplyScalar(1.0 - t * 0.45);
    }
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.8));
  group.rotation.set(0.35 + Math.random() * 0.5, Math.random() * Math.PI, 0.2);
  return group;
}

function createCometWithTails(radius: number) {
  const group = new THREE.Group();
  // Coma helada brillante
  group.add(glowSprite(radius * 0.26, 0.78, 0.98, 1.0, 1.0));
  group.add(glowSprite(radius * 0.65, 0.35, 0.88, 0.95, 0.38));

  const count = 5600;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 1.35);
    if (i < 2800) {
      // Cola iónica recta (azul-cian por viento solar)
      const spread = radius * (0.015 + t * 0.065);
      pos[i3] = -t * radius * 1.45;
      pos[i3 + 1] = gauss() * spread;
      pos[i3 + 2] = gauss() * spread;
      c.setRGB(0.35, 0.82, 1.0).multiplyScalar((1 - t * 0.7) * (0.6 + Math.random() * 0.8));
    } else {
      // Cola de polvo curva (dorado-blanco)
      const spread = radius * (0.02 + t * 0.14);
      pos[i3] = -t * radius * 1.2;
      pos[i3 + 1] = gauss() * spread * 0.45;
      pos[i3 + 2] = t * t * radius * 0.38 + gauss() * spread;
      c.setRGB(1.0, 0.88, 0.65).multiplyScalar((1 - t * 0.72) * (0.55 + Math.random() * 0.75));
    }
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.6));
  group.rotation.set(Math.random() * 0.8, Math.random() * Math.PI * 2, Math.random() * 0.5);
  group.userData.hazardMeta = { label: 'COMETARY DEBRIS', localRadius: radius * 1.1 };
  return group;
}

function createProtoplanetarySystem(radius: number) {
  const group = new THREE.Group();
  // Protoestrella T-Tauri central con anillos concéntricos y brechas planetarias (tipo HL Tauri)
  group.add(glowSprite(radius * 0.32, 1.0, 0.90, 0.72, 1.0));
  group.add(glowSprite(radius * 0.95, 1.0, 0.62, 0.32, 0.28));

  const ringRadii = [0.22, 0.40, 0.62, 0.86];
  const count = 6800;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const band = ringRadii[i % ringRadii.length];
    const r = radius * (band + gauss() * 0.036);
    const ang = Math.random() * Math.PI * 2;
    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.015;
    pos[i3 + 2] = Math.sin(ang) * r;

    const heat = 1 - band;
    c.setRGB(0.95, 0.48 + heat * 0.42, 0.2 + heat * 0.38).multiplyScalar(0.55 + Math.random() * 0.8);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.6));
  group.rotation.set(0.45 + Math.random() * 0.5, Math.random() * Math.PI, -0.25);
  group.userData.hazardMeta = { label: 'ACCRETION DEBRIS', localRadius: radius };
  return group;
}

function createWhiteDwarfDebris(radius: number) {
  const group = new THREE.Group();
  // Enana blanca ultracaliente rodeada de restos planetarios pulverizados por marea (tipo WD 1145+017)
  group.add(glowSprite(radius * 0.22, 0.85, 0.95, 1.0, 1.0));
  group.add(glowSprite(radius * 0.58, 0.55, 0.80, 1.0, 0.36));

  const count = 4600;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * (0.34 + Math.random() * 0.62);
    const ang = Math.random() * Math.PI * 2;
    const clump = 0.72 + 0.28 * Math.sin(ang * 3.0 + r * 0.02);
    pos[i3] = Math.cos(ang) * r;
    pos[i3 + 1] = gauss() * radius * 0.022;
    pos[i3 + 2] = Math.sin(ang) * r;

    if (Math.random() < 0.6) c.setRGB(0.75, 0.88, 1.0);
    else c.setRGB(0.88, 0.68, 0.48);
    c.multiplyScalar(clump * (0.5 + Math.random() * 0.85));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.4));
  group.rotation.set(Math.random() * 0.7, Math.random() * Math.PI, Math.random() * 0.4);
  group.userData.hazardMeta = { label: 'DEBRIS FIELD', localRadius: radius };
  return group;
}

function createWolfRayetBubble(radius: number) {
  const group = new THREE.Group();
  // Burbuja cósmica esculpida por estrella Wolf-Rayet (tipo Nebulosa del Casco de Thor / Crescent)
  group.add(glowSprite(radius * 0.25, 0.72, 0.90, 1.0, 1.0));
  group.add(glowSprite(radius * 1.15, 0.18, 0.72, 0.88, 0.26));

  const count = 7600;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const u = Math.random() * 2 - 1;
    const theta = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const shockWave = 0.86 + 0.14 * Math.sin(theta * 4 + u * 5);
    const r = radius * (0.76 + gauss() * 0.06) * shockWave;
    pos[i3] = r * s * Math.cos(theta);
    pos[i3 + 1] = r * u * 0.88;
    pos[i3 + 2] = r * s * Math.sin(theta);

    if (Math.random() < 0.72) c.setRGB(0.22, 0.88, 0.96);
    else c.setRGB(1.0, 0.52, 0.36);
    c.multiplyScalar(0.55 + Math.random() * 0.85);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 4.2));
  return group;
}

function createEinsteinRing(radius: number) {
  const group = new THREE.Group();
  // Galaxia lente elíptica dorada en primer plano + anillo de Einstein azulado deformado
  group.add(glowSprite(radius * 0.42, 1.0, 0.82, 0.54, 0.95));
  group.add(glowSprite(radius * 0.95, 1.0, 0.65, 0.35, 0.24));

  const count = 5800;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    if (i < 2200) {
      // Galaxia lente central
      const r = Math.pow(Math.random(), 2.0) * radius * 0.38;
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(th);
      pos[i3 + 1] = r * u * 0.65;
      pos[i3 + 2] = r * s * Math.sin(th);
      c.setRGB(1.0, 0.80, 0.52).multiplyScalar(0.75 + Math.random() * 0.85);
    } else {
      // Anillo y arcos gravitacionales azul-cian de galaxia distante
      const arcBias = Math.random();
      const ang = arcBias < 0.7
        ? (Math.random() - 0.5) * Math.PI * 1.45
        : Math.random() * Math.PI * 2;
      const r = radius * (0.76 + gauss() * 0.035);
      pos[i3] = Math.cos(ang) * r;
      pos[i3 + 1] = Math.sin(ang) * r;
      pos[i3 + 2] = gauss() * radius * 0.02;
      c.setRGB(0.45, 0.82, 1.0).multiplyScalar(0.7 + Math.random() * 0.95);
    }
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 4.0));
  group.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
  return group;
}

  function wrapStarLayer(geo: THREE.BufferGeometry, maxDist: number, camPos: THREE.Vector3) {
    const positions = geo.attributes.position.array as Float32Array;
    const count = positions.length / 3;
    const limit = maxDist;
    const limit2 = limit * 2;
    let needsUpdate = false;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let x = positions[i3]     - camPos.x;
      let y = positions[i3 + 1] - camPos.y;
      let z = positions[i3 + 2] - camPos.z;

      if (x >  limit) { positions[i3]     -= limit2; needsUpdate = true; }
      if (x < -limit) { positions[i3]     += limit2; needsUpdate = true; }
      if (y >  limit) { positions[i3 + 1] -= limit2; needsUpdate = true; }
      if (y < -limit) { positions[i3 + 1] += limit2; needsUpdate = true; }
      if (z >  limit) { positions[i3 + 2] -= limit2; needsUpdate = true; }
      if (z < -limit) { positions[i3 + 2] += limit2; needsUpdate = true; }
    }

    if (needsUpdate) {
      geo.attributes.position.needsUpdate = true;
    }
  }

  // 2. Galaxias espirales
  const galaxiesGroup = new THREE.Group();
  universe.add(galaxiesGroup);

  function createSpiralGalaxy({
    particleCount = 28000,
    radius = 480,
    arms = 4,
    spin = 1.35,
    randomness = 0.28,
    power = 3.8,
    insideColor = 0xffe2aa,
    outsideColor = 0x3d7aff,
    dustColor = 0xd440ff,
    position = new THREE.Vector3(0, 0, 0),
    rotation = new THREE.Euler(0, 0, 0)
  }: GalaxyOptions) {
    const galaxyGeo = new THREE.BufferGeometry();
    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);

    const colorIn = new THREE.Color(insideColor);
    const colorOut = new THREE.Color(outsideColor);
    const colorDust = new THREE.Color(dustColor);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), power) * radius;
      const armAngle = (i % arms) * ((2 * Math.PI) / arms);
      const spinAngle = r * (spin / 100);

      const randomX = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;
      const randomY = Math.pow(Math.random(), 2.8) * (Math.random() < 0.5 ? 1 : -1) * (randomness * 0.42) * r;
      const randomZ = Math.pow(Math.random(), 2.4) * (Math.random() < 0.5 ? 1 : -1) * randomness * r;

      pos[i3] = Math.cos(armAngle + spinAngle) * r + randomX;
      pos[i3 + 1] = randomY;
      pos[i3 + 2] = Math.sin(armAngle + spinAngle) * r + randomZ;

      const mixedColor = colorIn.clone();
      mixedColor.lerp(colorOut, r / radius);

      if (Math.random() > 0.68) {
        mixedColor.lerp(colorDust, Math.random() * 0.7);
      }

      const coreBrightness = 1.0 + Math.max(0, 1.0 - r / (radius * 0.25)) * 2.2;
      mixedColor.multiplyScalar(coreBrightness);

      col[i3] = mixedColor.r;
      col[i3 + 1] = mixedColor.g;
      col[i3 + 2] = mixedColor.b;
    }

    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    galaxyGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const galaxyMat = new THREE.PointsMaterial({
      size: 5.0 * U,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const galaxyMesh = new THREE.Points(galaxyGeo, galaxyMat);

    const coreLightTexture = createGlowTexture(256, 1.0, 0.92, 0.78);
    const coreMat = new THREE.SpriteMaterial({
      map: coreLightTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.95
    });
    const coreSprite = new THREE.Sprite(coreMat);
    coreSprite.scale.set(radius * 0.45, radius * 0.45, 1);
    galaxyMesh.add(coreSprite);

    const galaxyContainer = new THREE.Group();
    galaxyContainer.position.copy(position);
    galaxyContainer.rotation.copy(rotation);
    galaxyContainer.add(galaxyMesh);

    return { container: galaxyContainer, mesh: galaxyMesh };
  }

  // El grupo central cubre el cielo en varias distancias para evitar solapamientos.
  const andromeda = createSpiralGalaxy({
    particleCount: 52000,
    radius: 720,
    arms: 2,
    spin: 1.15,
    randomness: 0.22,
    power: 3.2,
    insideColor: 0xffe8c0,
    outsideColor: 0x6aa8ff,
    dustColor: 0xff6a9a,
    position: sphericalPos(2200, -25, 16),
    rotation: new THREE.Euler(0.55, 0.35, -0.25)
  });
  galaxiesGroup.add(andromeda.container);
  extraObjects.push({ obj: andromeda.mesh, speed: 0.04 });
  registerMassiveObject(andromeda.container.position, 1150, 0.90, null);

  placeObject(
    createTidalDisruptionEvent(210),
    2550, 125, 18,
    new THREE.Euler(0.35, 0.2, 0.15),
    0.008
  );
  placeObject(
    createBarredGalaxy(28000, 500, 0xffe9b8, 0x5fa8ff, 0xff4fa3),
    2900, -145, -12,
    new THREE.Euler(0.85, 0.25, -0.35),
    0.018
  );
  placeObject(
    createIrregularGalaxy(18000, 320, [0x6ea8ff, 0xff7ad9, 0xffd27a, 0x7affc8]),
    2150, 65, -32,
    new THREE.Euler(0.4, 0.7, 0.15),
    0.012
  );
  placeObject(
    createRingGalaxy(20000, 380, 0xffe0b0, 0x4de1ff),
    3150, -65, 20,
    new THREE.Euler(0.95, 0.4, 0.2),
    0.014
  );
  placeObject(
    createMagnetar(240),
    2650, 165, 42,
    new THREE.Euler(0.5, 0.3, 0.1),
    0.006
  );
  placeObject(
    createKilonova(180),
    2400, -105, -42,
    new THREE.Euler(0.6, -0.25, 0.15),
    -0.01
  );

  const giantMixed = createEllipticalGalaxy(70000, 1400, 0.55, 0xffe4b8, 0xff7a50);
  giantMixed.position.copy(sphericalPos(8200, -45, 28));
  giantMixed.rotation.set(0.4, 0.2, 0.15);
  galaxiesGroup.add(giantMixed);
  extraObjects.push({ obj: giantMixed, speed: 0.008 });
  registerMassiveObject(giantMixed.position, 2200, 1.05, null);

  // 3. Nebulosas
  const nebulaGroup = new THREE.Group();
  universe.add(nebulaGroup);

  const nebulaColors = [
    new THREE.Color(0x1b3358),
    new THREE.Color(0x2f5a91),
    new THREE.Color(0x12203b),
    new THREE.Color(0x7a3817),
    new THREE.Color(0x221b33)
  ];

  const clouds: {
    sprite: THREE.Sprite;
    baseOpacity: number;
    pulseSpeed: number;
    phase: number;
    chunkKey?: string | null;
  }[] = [];

  // ====================== NEBULOSAS INFINITAS (CHUNKS) ======================
  const NEBULA_CHUNK_SIZE = 1800;
  const NEBULA_ACTIVE_RADIUS = 2;
  const activeNebulaChunks = new Map<string, THREE.Group>();

  function getChunkKey(cx: number, cy: number, cz: number) {
    return `${cx},${cy},${cz}`;
  }

  function createNebulaChunk(cx: number, cy: number, cz: number): THREE.Group {
    const group = new THREE.Group();
    const basePos = new THREE.Vector3(
      cx * NEBULA_CHUNK_SIZE,
      cy * NEBULA_CHUNK_SIZE,
      cz * NEBULA_CHUNK_SIZE
    );

    const count = 6 + Math.floor(Math.random() * 8);

    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.62) continue;

      const col = nebulaColors[Math.floor(Math.random() * nebulaColors.length)];
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: col,
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.024, 0.068),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        basePos.x + gauss() * NEBULA_CHUNK_SIZE * 0.42,
        basePos.y + gauss() * NEBULA_CHUNK_SIZE * 0.28,
        basePos.z + gauss() * NEBULA_CHUNK_SIZE * 0.42
      );

      if (isInVoid(sprite.position.x, sprite.position.y, sprite.position.z)) continue;

      if (sprite.position.distanceTo(wormLocal) < BH_CLEAR * 1.1) continue;
      if (isNearSecondaryBlackHole(sprite.position.x, sprite.position.y, sprite.position.z, 4600)) continue;

      const scale = THREE.MathUtils.randFloat(260, 740);
      sprite.scale.set(scale, scale, 1);
      group.add(sprite);

      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: THREE.MathUtils.randFloat(0.22, 0.65),
        phase: Math.random() * Math.PI * 2
      });
    }

    return group;
  }

  function updateNebulaChunks(camPos: THREE.Vector3) {
    const cx = Math.floor(camPos.x / NEBULA_CHUNK_SIZE);
    const cy = Math.floor(camPos.y / NEBULA_CHUNK_SIZE);
    const cz = Math.floor(camPos.z / NEBULA_CHUNK_SIZE);

    const needed = new Set<string>();

    for (let x = -NEBULA_ACTIVE_RADIUS; x <= NEBULA_ACTIVE_RADIUS; x++) {
      for (let y = -NEBULA_ACTIVE_RADIUS; y <= NEBULA_ACTIVE_RADIUS; y++) {
        for (let z = -NEBULA_ACTIVE_RADIUS; z <= NEBULA_ACTIVE_RADIUS; z++) {
          const key = getChunkKey(cx + x, cy + y, cz + z);
          needed.add(key);

          if (!activeNebulaChunks.has(key)) {
            const chunk = createNebulaChunk(cx + x, cy + y, cz + z);
            nebulaGroup.add(chunk);
            activeNebulaChunks.set(key, chunk);
          }
        }
      }
    }

    for (const [key, chunk] of activeNebulaChunks) {
      if (!needed.has(key)) {
        nebulaGroup.remove(chunk);
        chunk.traverse(obj => {
          if (obj instanceof THREE.Sprite) {
            const idx = clouds.findIndex(c => c.sprite === obj);
            if (idx !== -1) clouds.splice(idx, 1);
          }
        });
        activeNebulaChunks.delete(key);
      }
    }
  }

  // Inicializar chunks alrededor del origen
  updateNebulaChunks(new THREE.Vector3(0, 0, 0));


  // ====================== OBJETOS CÓSMICOS PROCEDURALES INFINITOS ======================
const OBJECT_ACTIVE_RADIUS = 2;          // chunks alrededor de la cámara
const activeObjectChunks = new Map<string, THREE.Group>();

const PILLAR_PALETTES = [
  {
    bg: [0xff4a7a, 0xff6a9a, 0x4a8cff, 0x7ab0ff, 0xffa060],
    rimA: 0xff8a60,
    rimB: 0xffd0a0,
    coreRgb: [1.0, 0.55, 0.7] as [number, number, number],
  },
  {
    bg: [0x2fd8c8, 0x529bff, 0xff9258, 0x9b6cff, 0x75f0d8],
    rimA: 0xffb86c,
    rimB: 0xffe4b8,
    coreRgb: [0.55, 0.88, 1.0] as [number, number, number],
  },
  {
    bg: [0xff5498, 0xc84bff, 0x3b7bff, 0xffb066, 0x6ce8ff],
    rimA: 0xff98c4,
    rimB: 0xffdfb0,
    coreRgb: [1.0, 0.62, 0.86] as [number, number, number],
  },
];

function createPillarsOfCreation(
  center: THREE.Vector3,
  parent: THREE.Group,
  scale = 1,
  seed = 1,
  variant = 0
) {
  const pal = PILLAR_PALETTES[Math.abs(variant) % PILLAR_PALETTES.length];
  const r = (offset: number) => seededRandom(seed + offset);

  // Fondo de H II (gas ionizado rosado/azul/teal, como M16)
  for (let i = 0; i < 42; i++) {
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: pal.bg[i % pal.bg.length],
      transparent: true,
      opacity: (0.07 + r(i * 3.1) * 0.11),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    const d = Math.pow(r(i * 5.7), 0.65) * 920 * scale;
    const th = r(i * 7.3) * Math.PI * 2;
    const ph = Math.acos((r(i * 11.1) - 0.5) * 1.4);
    sprite.position.set(
      center.x + d * Math.sin(ph) * Math.cos(th),
      center.y + d * Math.sin(ph) * Math.sin(th) * 0.55,
      center.z + d * Math.cos(ph)
    );
    const s = (280 + r(i * 13.7) * 440) * scale;
    sprite.scale.set(s, s * (0.65 + r(i * 17.3) * 0.45), 1);
    parent.add(sprite);
    clouds.push({
      sprite,
      baseOpacity: mat.opacity,
      pulseSpeed: 0.12 + r(i * 19.1) * 0.28,
      phase: r(i * 23.3) * Math.PI * 2,
      chunkKey: currentBuildingChunkKey,
    });
  }

  // Pilares de polvo y gas (3 a 4 columnas majestuosas)
  const pillarCount = scale > 1.2 ? 4 : 3;
  const baseOffsets = [
    new THREE.Vector3(-190, -50, 45),
    new THREE.Vector3(15, 0, -30),
    new THREE.Vector3(205, -65, 25),
    new THREE.Vector3(-55, -90, 145)
  ];
  const baseHeights = [540, 680, 490, 420];
  const baseWidths = [96, 114, 86, 78];

  const rimColorA = new THREE.Color(pal.rimA);
  const rimColorB = new THREE.Color(pal.rimB);

  for (let p = 0; p < pillarCount; p++) {
    const off = baseOffsets[p];
    const base = new THREE.Vector3(
      center.x + off.x * scale + (r(p * 31 + 1) - 0.5) * 50 * scale,
      center.y + off.y * scale,
      center.z + off.z * scale + (r(p * 31 + 2) - 0.5) * 50 * scale
    );
    const h = baseHeights[p] * scale * (0.88 + r(p * 37 + 3) * 0.26);
    const w = baseWidths[p] * scale * (0.9 + r(p * 41 + 4) * 0.22);
    const leanX = (r(p * 43 + 5) - 0.5) * 0.18;
    const leanZ = (r(p * 47 + 6) - 0.5) * 0.18;

    // Polvo oscuro (columna molecular opaca)
    for (let i = 0; i < 15; i++) {
      const t = i / 14;
      const mat = new THREE.SpriteMaterial({
        map: darkTextures[i % darkTextures.length],
        color: 0x07050a,
        transparent: true,
        opacity: 0.58 + r(p * 100 + i * 3) * 0.34,
        depthWrite: false,
        depthTest: false
      });
      mat.rotation = r(p * 100 + i * 5) * Math.PI * 2;
      const sprite = new THREE.Sprite(mat);
      const taper = 1.0 - t * 0.42;
      const puff = 1 + t * 0.3 + (r(p * 100 + i * 7) - 0.5) * 0.16;
      sprite.position.set(
        base.x + t * h * leanX + (r(p * 100 + i * 11) - 0.5) * w * 0.36 * taper,
        base.y + t * h,
        base.z + t * h * leanZ + (r(p * 100 + i * 13) - 0.5) * w * 0.36 * taper
      );
      const s = w * puff * (0.9 + r(p * 100 + i * 17) * 0.42);
      sprite.scale.set(s, s * 1.18, 1);
      sprite.renderOrder = 5;
      parent.add(sprite);
    }

    // Borde dorado iluminado (frente de fotoevaporación)
    for (let i = 0; i < 12; i++) {
      const t = 0.12 + (i / 11) * 0.85;
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: rimColorA.clone().lerp(rimColorB, r(p * 200 + i * 3)),
        transparent: true,
        opacity: 0.14 + r(p * 200 + i * 5) * 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        base.x + t * h * leanX + w * 0.42 + (r(p * 200 + i * 7) - 0.5) * 30 * scale,
        base.y + t * h,
        base.z + t * h * leanZ + (r(p * 200 + i * 11) - 0.5) * 35 * scale
      );
      const s = (75 + r(p * 200 + i * 13) * 85) * scale;
      sprite.scale.set(s, s * 0.82, 1);
      parent.add(sprite);
      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: 0.2 + r(p * 200 + i * 17) * 0.35,
        phase: r(p * 200 + i * 19) * Math.PI * 2,
        chunkKey: currentBuildingChunkKey,
      });
    }

    // Estrellas jóvenes en la cima (EGGs / glóbulos gaseosos en evaporación)
    const tip = new THREE.Vector3(
      base.x + h * 0.94 * leanX,
      base.y + h * 0.94,
      base.z + h * 0.94 * leanZ
    );
    const tipStars = createLuminousStarField(95, 55 * scale);
    tipStars.position.copy(tip);
    parent.add(tipStars);

    const tipGlow = glowSprite(115 * scale, 1.0, 0.88, 0.72, 0.45);
    tipGlow.position.copy(tip);
    parent.add(tipGlow);
  }

  // Núcleo brillante de la región H II
  const core = glowSprite(300 * scale, pal.coreRgb[0], pal.coreRgb[1], pal.coreRgb[2], 0.42);
  core.position.copy(center);
  parent.add(core);
}

function createColossalNebula(center: THREE.Vector3, parent: THREE.Group) {
  // Nebulosa realmente enorme
  const colors = [
    new THREE.Color(0xff3b6e),
    new THREE.Color(0x7a2bff),
    new THREE.Color(0x2a6bff),
    new THREE.Color(0xff9a3d),
    new THREE.Color(0x35e6ff)
  ];

  // Capas grandes de gas
  for (let i = 0; i < 70; i++) {
    const col = colors[i % colors.length];
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: col,
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.08, 0.22),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    const dist = Math.pow(Math.random(), 0.7) * 1400;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(THREE.MathUtils.randFloatSpread(1.6));

    sprite.position.set(
      center.x + dist * Math.sin(phi) * Math.cos(theta),
      center.y + dist * Math.sin(phi) * Math.sin(theta) * 0.55,
      center.z + dist * Math.cos(phi)
    );

    const scale = THREE.MathUtils.randFloat(480, 1100);
    sprite.scale.set(scale, scale * (0.7 + Math.random() * 0.5), 1);
    parent.add(sprite);

    clouds.push({
      sprite,
      baseOpacity: mat.opacity,
      pulseSpeed: THREE.MathUtils.randFloat(0.15, 0.45),
      phase: Math.random() * Math.PI * 2,
      chunkKey: currentBuildingChunkKey,
    });
  }

  // Núcleo brillante de la nebulosa
  const core = glowSprite(520, 1.0, 0.7, 0.9, 0.55);
  core.position.copy(center);
  parent.add(core);
}

function createLuminousStarField(count: number, radius: number) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.7);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.7;
    pos[i3 + 2] = r * s * Math.sin(t);

    // Estrellas muy brillantes (blancas / azules)
    c.setRGB(0.85 + Math.random() * 0.15, 0.9 + Math.random() * 0.1, 1.0);
    c.multiplyScalar(1.8 + Math.random() * 2.5); // mucho brillo
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  return buildPoints(pos, col, 6.5); // tamaño más grande = más luminosas
}

function createObjectChunk(cx: number, cy: number, cz: number): THREE.Group {
  const chunkKey = getChunkKey(cx, cy, cz);
  currentBuildingChunkKey = chunkKey;

  const group = new THREE.Group();
  const baseX = cx * OBJECT_CHUNK_SIZE;
  const baseY = cy * OBJECT_CHUNK_SIZE;
  const baseZ = cz * OBJECT_CHUNK_SIZE;

  const seed = cx * 73856093 ^ cy * 19349663 ^ cz * 83492791;
  const regionType = getRegionType(cx, cy, cz);

  const rx = Math.floor(cx / REGION_SIZE);
  const ry = Math.floor(cy / REGION_SIZE);
  const rz = Math.floor(cz / REGION_SIZE);
  const regionCx = rx * REGION_SIZE + Math.floor(REGION_SIZE / 2);
  const regionCy = ry * REGION_SIZE + Math.floor(REGION_SIZE / 2);
  const regionCz = rz * REGION_SIZE + Math.floor(REGION_SIZE / 2);
  const regionSeed = rx * 73856093 ^ ry * 19349663 ^ rz * 83492791;

  // ========== TRAMO DE VACÍO OSCURO ==========
  if (regionType === 'dark_void') {
    if (cx === regionCx && cy === regionCy && cz === regionCz) {
      // Manto central del vacío oscuro que absorbe estrellas y galaxias
      for (let i = 0; i < 4; i++) {
        const voidSprite = new THREE.Sprite(new THREE.SpriteMaterial({
          map: abyssTexture,
          transparent: true,
          opacity: i === 0 ? 0.94 : 0.72,
          depthTest: false,
          depthWrite: false,
          fog: false
        }));
        voidSprite.position.set(
          baseX + (seededRandom(regionSeed + i * 7 + 1) - 0.5) * OBJECT_CHUNK_SIZE * 0.9,
          baseY + (seededRandom(regionSeed + i * 7 + 2) - 0.5) * OBJECT_CHUNK_SIZE * 0.7,
          baseZ + (seededRandom(regionSeed + i * 7 + 3) - 0.5) * OBJECT_CHUNK_SIZE * 0.9
        );
        const voidScale = VOID_REGION_HALF * (i === 0 ? 1.85 : 1.15);
        voidSprite.scale.set(voidScale, voidScale, 1);
        voidSprite.renderOrder = 10;
        group.add(voidSprite);
      }
    }

    // Filamentos de oscuridad en todo el tramo
    if (seededRandom(seed + 4) > 0.35) {
      const darkVeil = createDarkMolecularCloud(
        6 + Math.floor(seededRandom(seed + 5) * 6),
        340 + seededRandom(seed + 6) * 320
      );
      darkVeil.position.set(
        baseX + (seededRandom(seed + 7) - 0.5) * OBJECT_CHUNK_SIZE * 0.75,
        baseY + (seededRandom(seed + 8) - 0.5) * OBJECT_CHUNK_SIZE * 0.55,
        baseZ + (seededRandom(seed + 9) - 0.5) * OBJECT_CHUNK_SIZE * 0.75
      );
      group.add(darkVeil);
    }

    currentBuildingChunkKey = null;
    return group;
  }

  if (isInVoid(baseX, baseY, baseZ)) {
    currentBuildingChunkKey = null;
    return group;
  }

  // ========== TRAMO DE PILARES DE LA CREACIÓN ==========
  if (regionType === 'pillars_of_creation') {
    const variant = Math.floor(seededRandom(regionSeed + 99) * PILLAR_PALETTES.length);

    if (cx === regionCx && cy === regionCy && cz === regionCz) {
      const center = new THREE.Vector3(baseX, baseY, baseZ);
      createPillarsOfCreation(center, group, 1.85, regionSeed, variant);
      registerMassiveObject(center, 1250, 0.72, chunkKey);
    } else if (seededRandom(seed + 13) < 0.32) {
      const subCenter = new THREE.Vector3(
        baseX + (seededRandom(seed + 14) - 0.5) * OBJECT_CHUNK_SIZE * 0.45,
        baseY + (seededRandom(seed + 15) - 0.5) * OBJECT_CHUNK_SIZE * 0.35,
        baseZ + (seededRandom(seed + 16) - 0.5) * OBJECT_CHUNK_SIZE * 0.45
      );
      const subScale = 0.95 + seededRandom(seed + 17) * 0.55;
      createPillarsOfCreation(subCenter, group, subScale, seed, variant);
      registerMassiveObject(subCenter, 680 * subScale, 0.55, chunkKey);
    } else if (seededRandom(seed + 18) < 0.55) {
      // Gas H II y formación estelar envolviendo todo el tramo
      const h2 = createStarFormingRegion(4200, 260 + seededRandom(seed + 19) * 180);
      h2.position.set(
        baseX + (seededRandom(seed + 20) - 0.5) * OBJECT_CHUNK_SIZE * 0.65,
        baseY + (seededRandom(seed + 21) - 0.5) * OBJECT_CHUNK_SIZE * 0.45,
        baseZ + (seededRandom(seed + 22) - 0.5) * OBJECT_CHUNK_SIZE * 0.65
      );
      group.add(h2);
    }

    currentBuildingChunkKey = null;
    return group;
  }

  // ========== TRAMO DE NEBULOSA COLOSAL ==========
  if (regionType === 'colossal_nebula') {
    if (cx === regionCx && cy === regionCy && cz === regionCz) {
      const center = new THREE.Vector3(baseX, baseY, baseZ);
      createColossalNebula(center, group);
      registerMassiveObject(center, 1600, 0.78, chunkKey);
    }

    if (seededRandom(seed) > 0.7) {
      const dust = createDarkMolecularCloud(4 + Math.floor(seededRandom(seed + 3) * 5), 180);
      dust.position.set(
        baseX + (seededRandom(seed + 4) - 0.5) * OBJECT_CHUNK_SIZE * 0.6,
        baseY + (seededRandom(seed + 5) - 0.5) * OBJECT_CHUNK_SIZE * 0.4,
        baseZ + (seededRandom(seed + 6) - 0.5) * OBJECT_CHUNK_SIZE * 0.6
      );
      group.add(dust);
    }

    currentBuildingChunkKey = null;
    return group;
  }

  // ========== TRAMO DE OSCURIDAD (polvo + estrellas luminosas + agujeros negros) ==========
  if (regionType === 'dark_dust') {
    const dustCount = 3 + Math.floor(seededRandom(seed) * 5);
    for (let i = 0; i < dustCount; i++) {
      const localSeed = seed + i * 19;
      const dust = createDarkMolecularCloud(
        6 + Math.floor(seededRandom(localSeed) * 8),
        200 + seededRandom(localSeed + 1) * 260
      );
      dust.position.set(
        baseX + (seededRandom(localSeed + 2) - 0.5) * OBJECT_CHUNK_SIZE * 0.75,
        baseY + (seededRandom(localSeed + 3) - 0.5) * OBJECT_CHUNK_SIZE * 0.45,
        baseZ + (seededRandom(localSeed + 4) - 0.5) * OBJECT_CHUNK_SIZE * 0.75
      );
      group.add(dust);
    }

    if (seededRandom(seed + 10) > 0.55) {
      const brightStars = createLuminousStarField(
        180 + Math.floor(seededRandom(seed + 11) * 220),
        90 + seededRandom(seed + 12) * 70
      );
      brightStars.position.set(
        baseX + (seededRandom(seed + 13) - 0.5) * OBJECT_CHUNK_SIZE * 0.5,
        baseY + (seededRandom(seed + 14) - 0.5) * OBJECT_CHUNK_SIZE * 0.3,
        baseZ + (seededRandom(seed + 15) - 0.5) * OBJECT_CHUNK_SIZE * 0.5
      );
      group.add(brightStars);
    }

    currentBuildingChunkKey = null;
    return group;
  }

  // ========== REGIÓN NORMAL ==========

  if (seededRandom(seed) < 0.30) {
    currentBuildingChunkKey = null;
    return group;
  }

  const objectCount = 1 + Math.floor(seededRandom(seed + 1) * 2); // 1 a 2 objetos por chunk

  for (let i = 0; i < objectCount; i++) {
    const localSeed = seed + i * 17;

    const lx = (seededRandom(localSeed) - 0.5) * OBJECT_CHUNK_SIZE * 0.85;
    const ly = (seededRandom(localSeed + 1) - 0.5) * OBJECT_CHUNK_SIZE * 0.55;
    const lz = (seededRandom(localSeed + 2) - 0.5) * OBJECT_CHUNK_SIZE * 0.85;

    const worldX = baseX + lx;
    const worldY = baseY + ly;
    const worldZ = baseZ + lz;

    if (isInVoid(worldX, worldY, worldZ)) continue;

    if (Math.hypot(worldX - wormLocal.x, worldY - wormLocal.y, worldZ - wormLocal.z) < BH_CLEAR) continue;
    if (isNearSecondaryBlackHole(worldX, worldY, worldZ, 4200)) continue;

    const typeRoll = seededRandom(localSeed + 5);
    let obj: THREE.Object3D;

    // ——— Galaxias comunes ———
    if (typeRoll < 0.032) {
      const size = 280 + seededRandom(localSeed + 6) * 400;
      obj = createSpiralGalaxy({
        particleCount: Math.floor(14000 + seededRandom(localSeed + 7) * 26000),
        radius: size,
        arms: 2 + Math.floor(seededRandom(localSeed + 8) * 3),
        spin: 0.9 + seededRandom(localSeed + 9) * 1.0,
        randomness: 0.24 + seededRandom(localSeed + 10) * 0.16,
        insideColor: 0xffe9b0,
        outsideColor: [0x3aa7ff, 0x00f0ff, 0x8a2be2, 0xff6a8a][
          Math.floor(seededRandom(localSeed + 11) * 4)
        ],
        dustColor: 0xc43bff,
        position: new THREE.Vector3(),
        rotation: new THREE.Euler(
          seededRandom(localSeed + 12) * Math.PI,
          seededRandom(localSeed + 13) * Math.PI,
          seededRandom(localSeed + 14) * Math.PI
        )
      }).container;
    } else if (typeRoll < 0.055) {
      obj = createBarredSpiralGalaxy(
        Math.floor(16000 + seededRandom(localSeed + 6) * 20000),
        300 + seededRandom(localSeed + 7) * 320
      );
    } else if (typeRoll < 0.075) {
      obj = createFlocculentSpiral(
        Math.floor(15000 + seededRandom(localSeed + 6) * 18000),
        290 + seededRandom(localSeed + 7) * 300
      );
    } else if (typeRoll < 0.125) {
      obj = createEllipticalGalaxy(
        Math.floor(14000 + seededRandom(localSeed + 6) * 15000),
        250 + seededRandom(localSeed + 7) * 260,
        0.55 + seededRandom(localSeed + 8) * 0.3,
        0xffd9a0,
        0xff7a3d
      );
    } else if (typeRoll < 0.165) {
      obj = createLenticularGalaxy(
        Math.floor(13000 + seededRandom(localSeed + 6) * 14000),
        260 + seededRandom(localSeed + 7) * 240
      );
    } else if (typeRoll < 0.205) {
      obj = createEdgeOnGalaxy(
        Math.floor(15000 + seededRandom(localSeed + 6) * 16000),
        300 + seededRandom(localSeed + 7) * 260
      );
    } else if (typeRoll < 0.24) {
      obj = createClassicRingGalaxy(
        Math.floor(14000 + seededRandom(localSeed + 6) * 14000),
        280 + seededRandom(localSeed + 7) * 240
      );
    } else if (typeRoll < 0.275) {
      obj = createPolarRingGalaxy(
        Math.floor(16000 + seededRandom(localSeed + 6) * 12000),
        320 + seededRandom(localSeed + 7) * 220
      );
    } else if (typeRoll < 0.31) {
      obj = createPeculiarGalaxy(
        Math.floor(14000 + seededRandom(localSeed + 6) * 15000),
        290 + seededRandom(localSeed + 7) * 250
      );
    } else if (typeRoll < 0.34) {
      obj = createDwarfSpheroidal(
        Math.floor(6000 + seededRandom(localSeed + 6) * 7000),
        90 + seededRandom(localSeed + 7) * 80
      );
    }

    // ——— Cúmulos y formación estelar ———
    else if (typeRoll < 0.38) {
      obj = createGlobularCluster(
        Math.floor(5500 + seededRandom(localSeed + 6) * 6500),
        60 + seededRandom(localSeed + 7) * 75
      );
    } else if (typeRoll < 0.42) {
      obj = createOpenCluster(
        Math.floor(4500 + seededRandom(localSeed + 6) * 5500),
        75 + seededRandom(localSeed + 7) * 85
      );
    } else if (typeRoll < 0.46) {
      obj = createStarFormingRegion(
        Math.floor(7500 + seededRandom(localSeed + 6) * 8500),
        170 + seededRandom(localSeed + 7) * 170
      );
    } else if (typeRoll < 0.50) {
      obj = createWolfRayetCluster(
        Math.floor(7000 + seededRandom(localSeed + 6) * 8000),
        150 + seededRandom(localSeed + 7) * 160
      );
    }

    // ——— Nebulosas ———
    else if (typeRoll < 0.53) {
      obj = createEmissionNebula(
        Math.floor(8500 + seededRandom(localSeed + 6) * 9000),
        190 + seededRandom(localSeed + 7) * 180
      );
    } else if (typeRoll < 0.56) {
      obj = createReflectionNebula(
        Math.floor(7500 + seededRandom(localSeed + 6) * 8000),
        170 + seededRandom(localSeed + 7) * 160
      );
    } else if (typeRoll < 0.59) {
      obj = createPlanetaryNebula(
        Math.floor(6500 + seededRandom(localSeed + 6) * 4500),
        95 + seededRandom(localSeed + 7) * 85,
        0x35e6ff,
        0xff3b6e
      );
    } else if (typeRoll < 0.62) {
      obj = createSupernovaRemnant(120 + seededRandom(localSeed + 6) * 90);
    }

    // ——— Galaxias activas / grupos ———
    else if (typeRoll < 0.645) {
      obj = createSeyfertGalaxy(
        Math.floor(16000 + seededRandom(localSeed + 6) * 18000),
        310 + seededRandom(localSeed + 7) * 280
      );
    } else if (typeRoll < 0.665) {
      obj = createStarburstGalaxy(
        Math.floor(16000 + seededRandom(localSeed + 6) * 16000),
        280 + seededRandom(localSeed + 7) * 240
      );
    } else if (typeRoll < 0.685) {
      obj = createGalaxyGroup(localSeed);
    } else if (typeRoll < 0.70) {
      obj = createInteractingGalaxies(380 + seededRandom(localSeed + 6) * 280);
    } else if (typeRoll < 0.715) {
      obj = createGalaxyCluster(localSeed);
    }

    // ——— Medio interestelar ———
    else if (typeRoll < 0.735) {
      obj = createDarkMolecularCloud(
        9 + Math.floor(seededRandom(localSeed + 6) * 9),
        240 + seededRandom(localSeed + 7) * 260
      );
    } else if (typeRoll < 0.75) {
      obj = createInterstellarFilament(
        400 + seededRandom(localSeed + 6) * 400,
        45 + Math.floor(seededRandom(localSeed + 7) * 45)
      );
    } else if (typeRoll < 0.765) {
      obj = createBokGlobule(90 + seededRandom(localSeed + 6) * 80);
    } else if (typeRoll < 0.78) {
      obj = createProplydDisk(110 + seededRandom(localSeed + 6) * 90);
    }

    // ——— Compactos / planetarios / fenómenos reales del universo ———
    else if (typeRoll < 0.793) {
      obj = createMagnetar(180 + seededRandom(localSeed + 6) * 120);
    } else if (typeRoll < 0.805) {
      obj = createPowerfulBlazar(420 + seededRandom(localSeed + 6) * 380);
    } else if (typeRoll < 0.817) {
      obj = createLuminousBlueVariable(220 + seededRandom(localSeed + 6) * 180);
    } else if (typeRoll < 0.829) {
      obj = createTidalDisruptionEvent(160 + seededRandom(localSeed + 6) * 130);
    } else if (typeRoll < 0.841) {
      obj = createGiantRadioGalaxy(380 + seededRandom(localSeed + 6) * 320);
    } else if (typeRoll < 0.853) {
      obj = createRedSupergiantShell(100 + seededRandom(localSeed + 6) * 90);
    } else if (typeRoll < 0.867) {
      obj = createRingedExoplanet(140 + seededRandom(localSeed + 6) * 110);
    } else if (typeRoll < 0.880) {
      obj = createAsteroidBelt(190 + seededRandom(localSeed + 6) * 150);
    } else if (typeRoll < 0.893) {
      obj = createBipolarNebula(190 + seededRandom(localSeed + 6) * 140);
    } else if (typeRoll < 0.906) {
      obj = createPulsarWindNebula(170 + seededRandom(localSeed + 6) * 130);
    } else if (typeRoll < 0.918) {
      obj = createHerbigHaroJets(220 + seededRandom(localSeed + 6) * 150);
    } else if (typeRoll < 0.931) {
      obj = createBinaryAccretionSystem(150 + seededRandom(localSeed + 6) * 110);
    } else if (typeRoll < 0.945) {
      obj = createCometWithTails(140 + seededRandom(localSeed + 6) * 110);
    } else if (typeRoll < 0.959) {
      obj = createProtoplanetarySystem(165 + seededRandom(localSeed + 6) * 120);
    } else if (typeRoll < 0.972) {
      obj = createWhiteDwarfDebris(120 + seededRandom(localSeed + 6) * 90);
    } else if (typeRoll < 0.986) {
      obj = createWolfRayetBubble(185 + seededRandom(localSeed + 6) * 130);
    } else {
      obj = createEinsteinRing(155 + seededRandom(localSeed + 6) * 110);
    }

    obj.position.set(worldX, worldY, worldZ);
    group.add(obj);
    registerHazardFieldIfAny(obj, chunkKey);
    if (typeRoll < 0.31) {
      registerMassiveObject(obj.position, 680, 0.78, chunkKey);
    } else if (typeRoll >= 0.62 && typeRoll < 0.715) {
      registerMassiveObject(obj.position, 900, 0.92, chunkKey);
    } else if (
      (typeRoll >= 0.59 && typeRoll < 0.62) ||
      (typeRoll >= 0.78 && typeRoll < 0.853) ||
      (typeRoll >= 0.893 && typeRoll < 0.906) ||
      (typeRoll >= 0.918 && typeRoll < 0.931) ||
      typeRoll >= 0.972
    ) {
      registerMassiveObject(obj.position, 420, 0.72, chunkKey);
    }

    const speed = (seededRandom(localSeed + 20) - 0.5) * 0.04;
    extraObjects.push({ obj, speed });
  }

  // Nodos de combustible deterministas (1 por macro-celda 2x2x2 fuera de vacíos oscuros y agujeros negros)
  const mx = Math.floor(cx / 2);
  const my = Math.floor(cy / 2);
  const mz = Math.floor(cz / 2);
  const macroSeed = (mx * 73856093) ^ (my * 19349663) ^ (mz * 83492791) ^ 0x51f3a9;
  const targetOx = Math.floor(seededRandom(macroSeed + 1) * 2);
  const targetOy = Math.floor(seededRandom(macroSeed + 2) * 2);
  const targetOz = Math.floor(seededRandom(macroSeed + 3) * 2);
  if (cx === mx * 2 + targetOx && cy === my * 2 + targetOy && cz === mz * 2 + targetOz) {
    const fnx = baseX + (seededRandom(macroSeed + 4) - 0.5) * OBJECT_CHUNK_SIZE * 0.65;
    const fny = baseY + (seededRandom(macroSeed + 5) - 0.5) * OBJECT_CHUNK_SIZE * 0.45;
    const fnz = baseZ + (seededRandom(macroSeed + 6) - 0.5) * OBJECT_CHUNK_SIZE * 0.65;
    if (
      !isInVoid(fnx, fny, fnz) &&
      Math.hypot(fnx - wormLocal.x, fny - wormLocal.y, fnz - wormLocal.z) >= BH_CLEAR &&
      !isNearSecondaryBlackHole(fnx, fny, fnz, 4200)
    ) {
      const fuelObj = createFuelNode(
        new THREE.Vector3(fnx, fny, fnz),
        `fn_${mx}_${my}_${mz}`,
        chunkKey,
        macroSeed + 10
      );
      group.add(fuelObj);
    }
  }

  currentBuildingChunkKey = null;
  return group;
}

function disposeChunkResources(chunk: THREE.Group) {
  chunk.traverse((obj) => {
    if (obj instanceof THREE.Points) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    } else if (obj instanceof THREE.Mesh) {
      if (obj.geometry !== bhDiskGeo && !fuelSharedGeos.has(obj.geometry)) obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
      else obj.material.dispose();
    } else if (obj instanceof THREE.Sprite) {
      obj.material.dispose();
    }
  });
}

function updateObjectChunks(camPos: THREE.Vector3) {
  const cx = Math.floor(camPos.x / OBJECT_CHUNK_SIZE);
  const cy = Math.floor(camPos.y / OBJECT_CHUNK_SIZE);
  const cz = Math.floor(camPos.z / OBJECT_CHUNK_SIZE);

  const needed = new Set<string>();

  for (let x = -OBJECT_ACTIVE_RADIUS; x <= OBJECT_ACTIVE_RADIUS; x++) {
    for (let y = -OBJECT_ACTIVE_RADIUS; y <= OBJECT_ACTIVE_RADIUS; y++) {
      for (let z = -OBJECT_ACTIVE_RADIUS; z <= OBJECT_ACTIVE_RADIUS; z++) {
        const key = getChunkKey(cx + x, cy + y, cz + z);
        needed.add(key);

        if (!activeObjectChunks.has(key)) {
          const chunk = createObjectChunk(cx + x, cy + y, cz + z);
          galaxiesGroup.add(chunk);
          activeObjectChunks.set(key, chunk);
        }
      }
    }
  }

  // Eliminar chunks lejanos
  for (const [key, chunk] of activeObjectChunks) {
    if (!needed.has(key)) {
      chunk.traverse(obj => {
        const idx = extraObjects.findIndex(e => e.obj === obj || e.obj.parent === obj);
        if (idx !== -1) extraObjects.splice(idx, 1);
      });
      for (let i = clouds.length - 1; i >= 0; i--) {
        if (clouds[i].chunkKey === key) clouds.splice(i, 1);
      }
      for (let i = gravityBlackHoles.length - 1; i >= 0; i--) {
        if (gravityBlackHoles[i].chunkKey === key) gravityBlackHoles.splice(i, 1);
      }
      for (let i = fuelNodes.length - 1; i >= 0; i--) {
        if (fuelNodes[i].chunkKey === key) fuelNodes.splice(i, 1);
      }
      for (let i = hazardFields.length - 1; i >= 0; i--) {
        if (hazardFields[i].chunkKey === key) hazardFields.splice(i, 1);
      }
      for (let i = massiveObjects.length - 1; i >= 0; i--) {
        if (massiveObjects[i].chunkKey === key) massiveObjects.splice(i, 1);
      }
      disposeChunkResources(chunk);
      galaxiesGroup.remove(chunk);
      activeObjectChunks.delete(key);
    }
  }
}

  // 3b. Tipos de galaxias y nubes cósmicas

  function sphericalPos(dist: number, lonDeg: number, latDeg: number) {
    const phi = THREE.MathUtils.degToRad(90 - latDeg);
    const theta = THREE.MathUtils.degToRad(lonDeg);
    return new THREE.Vector3(
      dist * Math.sin(phi) * Math.cos(theta),
      dist * Math.cos(phi),
      dist * Math.sin(phi) * Math.sin(theta)
    );
  }


  function addCore(parent: THREE.Object3D, scale: number, r: number, g: number, b: number, opacity = 0.9) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createGlowTexture(256, r, g, b),
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity,
      depthWrite: false
    }));
    sprite.scale.set(scale, scale, 1);
    parent.add(sprite);
  }

  function placeObject(obj: THREE.Object3D, dist: number, lonDeg: number, latDeg: number, rotation: THREE.Euler, speed: number) {
    const group = new THREE.Group();
    group.position.copy(sphericalPos(dist, lonDeg, latDeg));
    if (isInVoid(group.position.x, group.position.y, group.position.z)) return;
    group.rotation.copy(rotation);
    group.add(obj);
    galaxiesGroup.add(group);
    extraObjects.push({ obj, speed });
    registerMassiveObject(group.position, 680, 0.78, null);
  }

  function createBipolarReflectionNebula(scale = 1, seed = 404): THREE.Group {
    const group = new THREE.Group();
    const r = (offset: number) => seededRandom(seed + offset);

    // Alas bipolares azul-acero de polvo reflejado (inspirado en Gomez's Hamburger)
    const wingColors = [
      new THREE.Color(0x5088d4),
      new THREE.Color(0x7eb2f2),
      new THREE.Color(0xb8daff),
      new THREE.Color(0x365f9e),
    ];

    for (const side of [-1, 1]) {
      for (let i = 0; i < 22; i++) {
        const t = i / 21;
        const col = wingColors[i % wingColors.length];
        const mat = new THREE.SpriteMaterial({
          map: nebulaTexture,
          color: col,
          transparent: true,
          opacity: (0.07 + (1 - t) * 0.14) * (0.75 + r(i * 7 + side * 3) * 0.35),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        const lateral = side * (36 + t * 145 + r(i * 11 + side) * 65) * scale;
        const vertical = (r(i * 13 + side * 5) - 0.5) * (160 + t * 220) * scale;
        const depth = (r(i * 17 + side * 9) - 0.5) * (110 + t * 140) * scale;
        sprite.position.set(lateral, vertical, depth);
        const s = (120 + t * 240 + r(i * 19 + side) * 110) * scale;
        sprite.scale.set(s * 0.85, s * 1.15, 1);
        group.add(sprite);
        clouds.push({
          sprite,
          baseOpacity: mat.opacity,
          pulseSpeed: 0.14 + r(i * 23 + side) * 0.22,
          phase: r(i * 29 + side) * Math.PI * 2,
        });
      }

      // Filamentos tenues arqueándose hacia el vacío oscuro
      for (let f = 0; f < 10; f++) {
        const ft = f / 9;
        const mat = new THREE.SpriteMaterial({
          map: nebulaTexture,
          color: 0x3b67a8,
          transparent: true,
          opacity: 0.045 * (1 - ft * 0.55),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(
          side * (90 + ft * 280) * scale,
          (80 + ft * 290) * scale,
          (r(f * 31 + side) - 0.5) * 160 * scale
        );
        const s = (180 + ft * 160) * scale;
        sprite.scale.set(s, s * 0.72, 1);
        group.add(sprite);
      }

      // Borde interior cálido naranja-ámbar iluminado junto a la banda de polvo
      for (let w = 0; w < 10; w++) {
        const wt = (w / 9 - 0.5) * 2;
        const mat = new THREE.SpriteMaterial({
          map: nebulaTexture,
          color: w % 2 === 0 ? 0xff9a44 : 0xd96124,
          transparent: true,
          opacity: 0.13 * (1 - Math.abs(wt) * 0.55),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.set(
          side * (24 + r(w * 37 + side) * 22) * scale,
          wt * 125 * scale,
          (r(w * 41 + side) - 0.5) * 35 * scale
        );
        const s = (68 + r(w * 43 + side) * 52) * scale;
        sprite.scale.set(s * 0.65, s * 1.25, 1);
        group.add(sprite);
      }
    }

    // Banda central oscura de polvo molecular que divide el disco
    for (let d = 0; d < 16; d++) {
      const dt = (d / 15 - 0.5) * 2;
      const mat = new THREE.SpriteMaterial({
        map: darkTextures[d % darkTextures.length],
        color: 0x160703,
        transparent: true,
        opacity: 0.72 + (1 - Math.abs(dt)) * 0.24,
        depthWrite: false,
        depthTest: false,
      });
      mat.rotation = r(d * 47) * Math.PI * 2;
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        (r(d * 53) - 0.5) * 18 * scale,
        dt * 155 * scale,
        (r(d * 59) - 0.5) * 28 * scale
      );
      const s = (54 + (1 - Math.abs(dt) * 0.45) * 44) * scale;
      sprite.scale.set(s * 0.62, s * 1.35, 1);
      sprite.renderOrder = 6;
      group.add(sprite);
    }

    // Núcleo estelar oculto tras la franja de polvo
    const core = glowSprite(190 * scale, 1.0, 0.72, 0.36, 0.36);
    group.add(core);

    return group;
  }

  const pillarsLandmark = new THREE.Group();
  createPillarsOfCreation(new THREE.Vector3(), pillarsLandmark, 1.25, 101, 0);
  pillarsLandmark.position.copy(sphericalPos(1950, 0, 0));
  pillarsLandmark.rotation.set(0.08, 0.3, -0.04);
  galaxiesGroup.add(pillarsLandmark);
  registerMassiveObject(pillarsLandmark.position, 920, 0.72, null);

  const bipolarDiskLandmark = createBipolarReflectionNebula(1.35, 707);
  bipolarDiskLandmark.position.copy(sphericalPos(1520, -28, 9));
  bipolarDiskLandmark.rotation.set(0.12, 0.35, -0.26);
  galaxiesGroup.add(bipolarDiskLandmark);
  registerMassiveObject(bipolarDiskLandmark.position, 640, 0.66, null);

  // Solo dos agujeros negros adicionales extremadamente dispersos en cuadrantes opuestos (sumando 3 con el principal)
  sectorBlackHoleSpecs.forEach((spec, idx) => {
    const pos = sectorBlackHoleLocalPositions[idx];
    const bh = createGravitationalBlackHole(pos, spec.radius, 900 + idx * 73, {
      paletteIdx: spec.palette,
      pullStrength: spec.strength,
    });
    galaxiesGroup.add(bh);
  });

  function createEllipticalGalaxy(count: number, radius: number, flatten: number, inside: number, outside: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cIn = new THREE.Color(inside);
    const cOut = new THREE.Color(outside);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = Math.pow(Math.random(), 2.2) * radius;
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(t);
      pos[i3 + 1] = r * u * flatten;
      pos[i3 + 2] = r * s * Math.sin(t);
      c.copy(cIn).lerp(cOut, r / radius);
      c.multiplyScalar(0.6 + Math.max(0, 1 - r / (radius * 0.3)) * 1.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 4.5);
    addCore(points, radius * 0.5, 1, 0.85, 0.6);
    return points;
  }

  function createBarredGalaxy(count: number, radius: number, inside: number, outside: number, dust: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cIn = new THREE.Color(inside);
    const cOut = new THREE.Color(outside);
    const cDust = new THREE.Color(dust);
    const c = new THREE.Color();
    const barLen = radius * 0.3;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      if (i < count * 0.3) {
        pos[i3] = (Math.random() * 2 - 1) * barLen;
        pos[i3 + 1] = gauss() * radius * 0.015;
        pos[i3 + 2] = gauss() * radius * 0.04;
        c.copy(cIn).multiplyScalar(1.2 + (1 - Math.abs(pos[i3]) / barLen));
      } else {
        const arm = i % 2;
        const r = barLen + Math.pow(Math.random(), 1.5) * (radius - barLen);
        const angle = arm * Math.PI + (r - barLen) * 0.012;
        pos[i3] = Math.cos(angle) * r + gauss() * r * 0.04;
        pos[i3 + 1] = gauss() * radius * 0.015;
        pos[i3 + 2] = Math.sin(angle) * r + gauss() * r * 0.04;
        c.copy(cIn).lerp(cOut, (r - barLen) / (radius - barLen));
        if (Math.random() > 0.7) c.lerp(cDust, Math.random() * 0.7);
      }
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 5.0);
    addCore(points, radius * 0.4, 1, 0.92, 0.75);
    return points;
  }

  function createRingGalaxy(count: number, radius: number, coreColor: number, ringColor: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cCore = new THREE.Color(coreColor);
    const cRing = new THREE.Color(ringColor);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = Math.random() * Math.PI * 2;
      if (i < count * 0.65) {
        const r = radius * (0.78 + gauss() * 0.05);
        pos[i3] = Math.cos(t) * r;
        pos[i3 + 1] = gauss() * radius * 0.012;
        pos[i3 + 2] = Math.sin(t) * r;
        c.copy(cRing).multiplyScalar(0.8 + Math.random() * 0.8);
      } else {
        const r = Math.pow(Math.random(), 2.5) * radius * 0.22;
        pos[i3] = Math.cos(t) * r;
        pos[i3 + 1] = gauss() * radius * 0.02;
        pos[i3 + 2] = Math.sin(t) * r;
        c.copy(cCore).multiplyScalar(1 + (1 - r / (radius * 0.22)) * 1.5);
      }
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 4.5);
    addCore(points, radius * 0.35, 1, 0.9, 0.7);
    return points;
  }

  function createIrregularGalaxy(count: number, radius: number, colors: number[]) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const palette = colors.map(h => new THREE.Color(h));
    const white = new THREE.Color(0xffffff);
    const c = new THREE.Color();
    const centers = Array.from({ length: 6 }, () =>
      new THREE.Vector3(gauss() * radius * 0.35, gauss() * radius * 0.1, gauss() * radius * 0.35)
    );
    const spread = radius * 0.16;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const k = i % centers.length;
      pos[i3] = centers[k].x + gauss() * spread;
      pos[i3 + 1] = centers[k].y + gauss() * spread * 0.5;
      pos[i3 + 2] = centers[k].z + gauss() * spread;
      c.copy(palette[k % palette.length]).lerp(white, Math.random() * 0.5).multiplyScalar(0.7 + Math.random() * 0.9);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 4.5);
    addCore(points, radius * 0.6, 0.7, 0.8, 1.0, 0.35);
    return points;
  }

  function createGlobularCluster(count: number, radius: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const warm = new THREE.Color(0xffd9a0);
    const white = new THREE.Color(0xffffff);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = radius * Math.pow(Math.random(), 2.2);
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(t);
      pos[i3 + 1] = r * u;
      pos[i3 + 2] = r * s * Math.sin(t);
      c.copy(warm).lerp(white, Math.random() * 0.6).multiplyScalar(1 + (1 - r / radius) * 1.5);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 3.5);
    addCore(points, radius * 1.4, 1, 0.9, 0.7, 0.6);
    return points;
  }

  function createPlanetaryNebula(count: number, radius: number, innerColor: number, outerColor: number) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cIn = new THREE.Color(innerColor);
    const cOut = new THREE.Color(outerColor);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = radius * (0.75 + gauss() * 0.07);
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      pos[i3] = r * s * Math.cos(t);
      pos[i3 + 1] = r * u * 0.8;
      pos[i3 + 2] = r * s * Math.sin(t);
      const k = THREE.MathUtils.clamp((r / radius - 0.6) / 0.4, 0, 1);
      c.copy(cIn).lerp(cOut, k).multiplyScalar(0.8 + Math.random() * 0.6);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    const points = buildPoints(pos, col, 6.5);
    addCore(points, radius * 0.35, 0.8, 0.95, 1.0, 0.9);
    addCore(points, radius * 2.2, 0.2, 0.8, 0.9, 0.25);
    return points;
  }

  function createCloudCluster(center: THREE.Vector3, count: number, spread: number, c1: number, c2: number, minScale: number, maxScale: number) {
    const a = new THREE.Color(c1);
    const b = new THREE.Color(c2);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: a.clone().lerp(b, Math.random()),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.055, 0.145),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        center.x + gauss() * spread,
        center.y + gauss() * spread * 0.6,
        center.z + gauss() * spread
      );
      const s = THREE.MathUtils.randFloat(minScale, maxScale);
      sprite.scale.set(s, s, 1);
      nebulaGroup.add(sprite);
      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: THREE.MathUtils.randFloat(0.3, 0.9),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function createFilamentNebula(center: THREE.Vector3, radius: number, arc: number, count: number, c1: number, c2: number, tilt: THREE.Euler) {
    const a = new THREE.Color(c1);
    const b = new THREE.Color(c2);
    const q = new THREE.Quaternion().setFromEuler(tilt);
    for (let i = 0; i < count; i++) {
      const t = (i / count) * arc;
      const r = radius * (1 + gauss() * 0.04);
      const p = new THREE.Vector3(
        Math.cos(t) * r + gauss() * radius * 0.03,
        gauss() * radius * 0.03,
        Math.sin(t) * r + gauss() * radius * 0.03
      ).applyQuaternion(q).add(center);
      const mat = new THREE.SpriteMaterial({
        map: nebulaTexture,
        color: a.clone().lerp(b, i / count),
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.14, 0.3),
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.copy(p);
      const s = THREE.MathUtils.randFloat(50, 140);
      sprite.scale.set(s, s, 1);
      nebulaGroup.add(sprite);
      clouds.push({
        sprite,
        baseOpacity: mat.opacity,
        pulseSpeed: THREE.MathUtils.randFloat(0.3, 0.9),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  placeObject(createGlobularCluster(8000, 90), 650, -160, 35, new THREE.Euler(0, 0, 0), 0.01);
  placeObject(createOpenCluster(9000, 90), 700, 100, 45, new THREE.Euler(0, 0, 0), -0.012);
  placeObject(createPlanetaryNebula(9000, 120, 0x35e6ff, 0xff3b6e), 800, 30, -35, new THREE.Euler(0.6, 0.3, 0), 0.02);

  createCloudCluster(sphericalPos(1300, 140, 20), 40, 220, 0xff3b6e, 0xff9a3d, 220, 520);
  createCloudCluster(sphericalPos(1200, -20, -10), 40, 200, 0x2a6bff, 0x35e6ff, 200, 480);
  createCloudCluster(sphericalPos(1400, 230, -25), 40, 240, 0x7a2bff, 0xff3bd0, 240, 560);
  createFilamentNebula(sphericalPos(1000, -90, 5), 260, Math.PI * 1.3, 70, 0xff4f9a, 0x4f8cff, new THREE.Euler(0.8, 0.4, 0));

  // 3c. Elementos cósmicos adicionales
  const tmpV = new THREE.Vector3();
  const worldUp = new THREE.Vector3(0, 1, 0);
  const viewDir = new THREE.Vector3();
  const viewRight = new THREE.Vector3();
  const viewUp = new THREE.Vector3();


  // ====================== OBJETOS CRUZANDO (INTERSTELARES) ======================
type CrossingObject = {
  group: THREE.Group;
  velocity: THREE.Vector3;
  life: number;
  age: number;
  maxLife: number;
  type: string;
  impactCooldown: number;
};

const crossingObjects: CrossingObject[] = [];
const maxCrossing = 6;

function createCrossingComet() {
  const group = new THREE.Group();
  const length = THREE.MathUtils.randFloat(180, 420);

  // Núcleo
  const head = glowSprite(22, 0.95, 0.98, 1.0, 1.0);
  group.add(head);
  group.add(glowSprite(70, 0.6, 0.85, 1.0, 0.3));

  // Cola de polvo
  const dustCount = 1800;
  const dustPos = new Float32Array(dustCount * 3);
  const dustCol = new Float32Array(dustCount * 3);
  const c = new THREE.Color();

  for (let i = 0; i < dustCount; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 0.75);
    dustPos[i3] = -t * length;
    dustPos[i3 + 1] = gauss() * (4 + t * 18);
    dustPos[i3 + 2] = gauss() * (4 + t * 18);
    c.setRGB(1.0, 0.88 - t * 0.3, 0.7 - t * 0.25).multiplyScalar(Math.pow(1 - t, 1.4) * (0.6 + Math.random()));
    dustCol[i3] = c.r; dustCol[i3 + 1] = c.g; dustCol[i3 + 2] = c.b;
  }
  group.add(buildPoints(dustPos, dustCol, 3.8, false));

  return group;
}

function createCrossingAsteroidStream() {
  const group = new THREE.Group();
  const count = 40 + Math.floor(Math.random() * 50);

  for (let i = 0; i < count; i++) {
    const size = THREE.MathUtils.randFloat(3.5, 11);
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 0),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.15, 0.25 + Math.random() * 0.2),
        roughness: 0.9,
        flatShading: true
      })
    );
    mesh.position.set(
      gauss() * 90,
      gauss() * 50,
      -i * 18 + gauss() * 30
    );
    mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    group.add(mesh);
  }
  return group;
}

function createCrossingInterstellarObject() {
  // Objeto interestelar tipo 'Oumuamua / Borisov
  const group = new THREE.Group();

  const core = glowSprite(18, 0.85, 0.9, 1.0, 0.9);
  group.add(core);

  // Estela muy tenue
  const count = 900;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color(0xa0d4ff);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 0.8);
    pos[i3] = -t * 280;
    pos[i3 + 1] = gauss() * (3 + t * 10);
    pos[i3 + 2] = gauss() * (3 + t * 10);
    c.multiplyScalar(Math.pow(1 - t, 1.6) * (0.4 + Math.random() * 0.6));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }
  group.add(buildPoints(pos, col, 3.2, false));

  return group;
}

function createCrossingGasCloud() {
  const group = new THREE.Group();
  const count = 12 + Math.floor(Math.random() * 10);

  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.6, 0.55),
      transparent: true,
      opacity: THREE.MathUtils.randFloat(0.08, 0.22),
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(
      gauss() * 140,
      gauss() * 80,
      gauss() * 160
    );
    const s = THREE.MathUtils.randFloat(90, 260);
    sprite.scale.set(s, s * 0.7, 1);
    group.add(sprite);
  }
  return group;
}

function spawnCrossingObject() {
  if (crossingObjects.length >= maxCrossing) return;

  const roll = Math.random();
  let group: THREE.Group;
  let type: string;
  let speed: number;

  if (roll < 0.38) {
    group = createCrossingComet();
    type = 'comet';
    speed = THREE.MathUtils.randFloat(25, 55);
  } else if (roll < 0.62) {
    group = createCrossingAsteroidStream();
    type = 'asteroids';
    speed = THREE.MathUtils.randFloat(20, 45);
  } else if (roll < 0.82) {
    group = createCrossingInterstellarObject();
    type = 'interstellar';
    speed = THREE.MathUtils.randFloat(35, 65);
  } else {
    group = createCrossingGasCloud();
    type = 'cloud';
    speed = THREE.MathUtils.randFloat(12, 28);
  }

  // Trayectorias cruzadas: asteroides y objetos interestelares pueden pasar más cerca del corredor de vuelo
  const isCloseHazard = type === 'asteroids' || type === 'interstellar';
  const spawnDist = isCloseHazard
    ? THREE.MathUtils.randFloat(2800, 6200)
    : THREE.MathUtils.randFloat(5200, 7600);
  const side = isCloseHazard ? (Math.random() - 0.5) * 0.65 : (Math.random() - 0.5) * 0.9;
  const up = isCloseHazard ? (Math.random() - 0.5) * 0.45 : (Math.random() - 0.5) * 0.7;

  camera.getWorldDirection(viewDir);
  viewRight.crossVectors(viewDir, worldUp).normalize();
  viewUp.crossVectors(viewRight, viewDir).normalize();

  const startPos = camera.position.clone()
    .addScaledVector(viewDir, spawnDist)
    .addScaledVector(viewRight, side * spawnDist)
    .addScaledVector(viewUp, up * spawnDist);

  // Cruce tangencial a gran profundidad
  const target = camera.position.clone()
    .addScaledVector(viewDir, spawnDist * THREE.MathUtils.randFloat(0.72, 0.88))
    .addScaledVector(viewRight, -side * spawnDist)
    .addScaledVector(viewUp, -up * spawnDist);

  const velocity = target.sub(startPos).normalize().multiplyScalar(speed);

  group.position.copy(startPos);
  group.lookAt(startPos.clone().add(velocity));
  scene.add(group);

  crossingObjects.push({
    group,
    velocity,
    life: 0,
    age: 0,
    maxLife: THREE.MathUtils.randFloat(22, 38),
    type,
    impactCooldown: 0,
  });
}

// Llamar esto de vez en cuando
let nextCrossing = 8;

animators.push((t) => {
  // Spawn
  if (t > nextCrossing && mode === 'explore') {
    spawnCrossingObject();
    nextCrossing = t + THREE.MathUtils.randFloat(8, 16);
  }

  // Actualizar objetos existentes
  for (let i = crossingObjects.length - 1; i >= 0; i--) {
    const obj = crossingObjects[i];
    obj.age += 0.016; // aproximadamente dt
    obj.group.position.addScaledVector(obj.velocity, 0.016);

    // Fade in / out
    const fade = Math.min(1, obj.age * 1.8, (obj.maxLife - obj.age) * 1.5);
    
    obj.group.traverse(child => {
      if (child instanceof THREE.Sprite) {
        const mat = child.material as THREE.SpriteMaterial;
        if (mat.userData.baseOpacity === undefined) {
          mat.userData.baseOpacity = mat.opacity;
        }
        mat.opacity = mat.userData.baseOpacity * fade;
      }
      if (child instanceof THREE.Points) {
        const mat = child.material as THREE.PointsMaterial;
        if (mat.userData.baseOpacity === undefined) {
          mat.userData.baseOpacity = mat.opacity || 1;
        }
        mat.opacity = mat.userData.baseOpacity * fade;
      }
    });

    if (obj.age > obj.maxLife) {
      scene.remove(obj.group);
      crossingObjects.splice(i, 1);
    }
  }
});

  function placeStatic(obj: THREE.Object3D, dist: number, lonDeg: number, latDeg: number, rotation: THREE.Euler) {
    obj.position.copy(sphericalPos(dist, lonDeg, latDeg));
    if (isInVoid(obj.position.x, obj.position.y, obj.position.z)) return;
    obj.rotation.copy(rotation);
    universe.add(obj);
    registerHazardFieldIfAny(obj, null);
    registerMassiveObject(obj.position, 320, 0.65, null);
  }

    // ====================== BALIZA LEJANA (quásar + lente) ~25 000 u ======================
  const BEACON_DIST = 25000;
  const BEACON_LON = 48;   // dirección fija en el cielo (ajusta si quieres)
  const BEACON_LAT = 12;

  const beaconGroup = new THREE.Group();
  beaconGroup.position.copy(sphericalPos(BEACON_DIST, BEACON_LON, BEACON_LAT));
  // Orientar ligeramente hacia el origen
  beaconGroup.lookAt(0, 0, 0);

  // Núcleo del quásar (brillante)
  const beaconCore = glowSprite(420, 0.95, 0.92, 1.0, 1.0);
  beaconGroup.add(beaconCore);
  beaconGroup.add(glowSprite(1100, 0.55, 0.5, 1.0, 0.35));

  // Halo lejano (se ve desde muy lejos)
  const beaconHalo = glowSprite(3200, 0.45, 0.55, 1.0, 0.22);
  beaconGroup.add(beaconHalo);

  // Anillo tipo lente / arco de Einstein (plano de cielo)
  const beaconLens = createGravitationalLens(380);
  beaconLens.scale.setScalar(1.15);
  beaconGroup.add(beaconLens);

  // Jets tenues del quásar (escala grande)
  const beaconQuasar = createQuasar(520);
  beaconQuasar.scale.setScalar(1.4);
  beaconGroup.add(beaconQuasar);

  universe.add(beaconGroup);
  registerMassiveObject(beaconGroup.position, 1400, 1.0, null);

  // Pulso visible (núcleo + halo)
  animators.push((t) => {
    const pulse = 0.55 + 0.45 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.15), 2);
    const slow = 0.7 + 0.3 * Math.sin(t * 0.35);
    beaconCore.material.opacity = 0.75 + 0.25 * pulse;
    beaconCore.scale.setScalar(420 * (0.92 + 0.18 * pulse));
    beaconHalo.material.opacity = 0.12 + 0.16 * slow * pulse;
    beaconHalo.scale.setScalar(3200 * (0.95 + 0.12 * slow));
  });

  // Cometas con estela
  function createComet(length: number) {
    const group = new THREE.Group();

    const dustCount = 2600;
    const dustPos = new Float32Array(dustCount * 3);
    const dustCol = new Float32Array(dustCount * 3);
    const c = new THREE.Color();
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const t = Math.pow(Math.random(), 0.8);
      const spread = 2 + t * length * 0.12;
      dustPos[i3] = -t * length;
      dustPos[i3 + 1] = gauss() * spread + t * t * length * 0.12;
      dustPos[i3 + 2] = gauss() * spread;
      c.setRGB(1.0, 0.85 - 0.25 * t, 0.6 - 0.1 * t).multiplyScalar(Math.pow(1 - t, 1.5) * (0.5 + Math.random() * 0.9));
      dustCol[i3] = c.r; dustCol[i3 + 1] = c.g; dustCol[i3 + 2] = c.b;
    }
    const dust = buildPoints(dustPos, dustCol, 4.0, false);
    group.add(dust);

    const ionCount = 1400;
    const ionPos = new Float32Array(ionCount * 3);
    const ionCol = new Float32Array(ionCount * 3);
    for (let i = 0; i < ionCount; i++) {
      const i3 = i * 3;
      const t = Math.pow(Math.random(), 0.8);
      const spread = 1 + t * length * 0.015;
      ionPos[i3] = -t * length * 1.3;
      ionPos[i3 + 1] = gauss() * spread;
      ionPos[i3 + 2] = gauss() * spread;
      c.setRGB(0.45, 0.8, 1.0).multiplyScalar(Math.pow(1 - t, 1.2) * (0.6 + Math.random() * 1.0));
      ionCol[i3] = c.r; ionCol[i3 + 1] = c.g; ionCol[i3 + 2] = c.b;
    }
    const ion = buildPoints(ionPos, ionCol, 3.5, false);
    ion.rotation.z = -0.12;
    group.add(ion);

    const coma = glowSprite(90, 0.6, 0.85, 1.0, 0.35);
    const head = glowSprite(26, 0.95, 1.0, 1.0, 1.0);
    group.add(coma, head);

    return {
      group,
      parts: [
        { mat: dust.material as THREE.PointsMaterial, base: 1 },
        { mat: ion.material as THREE.PointsMaterial, base: 1 },
        { mat: coma.material, base: 0.35 },
        { mat: head.material, base: 1 }
      ]
    };
  }

  const xAxis = new THREE.Vector3(1, 0, 0);
  const comets = Array.from({ length: 2 }, (_, i) => {
    const comet = createComet(380);
    comet.group.visible = false;
    scene.add(comet.group);
    return {
      ...comet,
      t0: -1,
      next: 18 + i * 24,
      life: 48,
      speed: 28,
      start: new THREE.Vector3(),
      dir: new THREE.Vector3()
    };
  });

  animators.push(t => {
    for (const k of comets) {
      if (k.t0 < 0 && t > k.next) {
        const center = pointInView(7200, 0.18);
        if (isWorldPositionInVoid(center)) {
          k.next = t + 1;
          continue;
        }
        const ang = Math.random() * Math.PI * 2;
        k.dir.set(0, 0, 0)
          .addScaledVector(viewRight, Math.cos(ang))
          .addScaledVector(viewUp, Math.sin(ang) * 0.5);
        const n = tmpV.copy(center).normalize();
        k.dir.addScaledVector(n, -k.dir.dot(n)).normalize();
        k.speed = THREE.MathUtils.randFloat(22, 36);
        k.start.copy(center).addScaledVector(k.dir, -k.speed * k.life * 0.5);
        k.group.quaternion.setFromUnitVectors(xAxis, k.dir);
        k.t0 = t;
        k.group.visible = true;
      }
      if (k.t0 >= 0) {
        const age = t - k.t0;
        if (age > k.life) {
          k.group.visible = false;
          k.t0 = -1;
          k.next = t + THREE.MathUtils.randFloat(18, 36);
        } else {
          k.group.position.copy(k.start).addScaledVector(k.dir, k.speed * age);
          const fade = Math.min(1, age / 3, (k.life - age) / 3);
          const flicker = 0.9 + 0.1 * Math.sin(t * 7.0 + k.speed);
          for (const p of k.parts) p.mat.opacity = p.base * fade * flicker;
        }
      }
    }
  });

  function pointInView(dist: number, spread: number) {
    camera.getWorldDirection(viewDir);
    viewRight.crossVectors(viewDir, worldUp);
    if (viewRight.lengthSq() < 1e-6) viewRight.set(1, 0, 0);
    viewRight.normalize();
    viewUp.crossVectors(viewRight, viewDir).normalize();
    return viewDir.clone()
      .addScaledVector(viewRight, (Math.random() * 2 - 1) * spread)
      .addScaledVector(viewUp, (Math.random() * 2 - 1) * spread)
      .normalize()
      .multiplyScalar(dist)
      .add(camera.position);
  }

  // Nebulosas oscuras
  function createDarkCloudTexture() {
    const cvs = document.createElement('canvas');
    cvs.width = 256;
    cvs.height = 256;
    const ctx = cvs.getContext('2d')!;
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.sqrt(Math.random()) * 70;
      const x = 128 + Math.cos(a) * d;
      const y = 128 + Math.sin(a) * d * 0.7;
      const r = 30 + Math.random() * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(0, 0, 0, ${0.5 + Math.random() * 0.4})`);
      g.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }
    ctx.globalCompositeOperation = 'destination-in';
    const mask = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    mask.addColorStop(0, 'rgba(255, 255, 255, 1)');
    mask.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(cvs);
  }

  function createDarkNebula(center: THREE.Vector3, count: number, spread: number, minS: number, maxS: number) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({
        map: darkTextures[i % darkTextures.length],
        color: 0x000000,
        transparent: true,
        opacity: THREE.MathUtils.randFloat(0.55, 0.9),
        depthTest: false,
        depthWrite: false,
        fog: false
      });
      mat.rotation = Math.random() * Math.PI * 2;
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        center.x + gauss() * spread,
        center.y + gauss() * spread * 0.6,
        center.z + gauss() * spread
      );
      const s = THREE.MathUtils.randFloat(minS, maxS);
      sprite.scale.set(s, s, 1);
      sprite.renderOrder = 5;
      nebulaGroup.add(sprite);
    }
  }

  // Quásar
  function createQuasar(length: number) {
    const group = new THREE.Group();
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const cNear = new THREE.Color(0xdff4ff);
    const cFar = new THREE.Color(0x7a5cff);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const side = i % 2 === 0 ? 1 : -1;
      const t = Math.pow(Math.random(), 0.8);
      const spread = 2 + t * length * 0.05;
      pos[i3] = gauss() * spread;
      pos[i3 + 1] = side * t * length;
      pos[i3 + 2] = gauss() * spread;
      c.copy(cNear).lerp(cFar, t).multiplyScalar((1.5 - t) * (0.7 + Math.random() * 0.8));
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    group.add(buildPoints(pos, col, 4.0));

    const core = glowSprite(length * 0.28, 0.9, 0.95, 1.0, 1.0);
    group.add(core);
    group.add(glowSprite(length * 0.9, 0.5, 0.6, 1.0, 0.3));
    for (const side of [1, -1]) {
      const lobe = glowSprite(length * 0.55, 0.6, 0.4, 1.0, 0.28);
      lobe.position.set(0, side * length, 0);
      group.add(lobe);
    }

    animators.push(t => {
      core.material.opacity = 0.8 + 0.2 * Math.sin(t * 5.3) * Math.sin(t * 1.7);
    });
    return group;
  }

  // Púlsar
  function createPulsar(beamLength: number) {
    const group = new THREE.Group();
    const spin = new THREE.Group();
    const beams = new THREE.Group();
    beams.rotation.z = 0.5;
    spin.add(beams);
    group.add(spin);

    const count = 1400;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const side = i % 2 === 0 ? 1 : -1;
      const t = Math.pow(Math.random(), 0.7);
      const sp = 1 + t * beamLength * 0.035;
      pos[i3] = gauss() * sp;
      pos[i3 + 1] = side * t * beamLength;
      pos[i3 + 2] = gauss() * sp;
      const f = (1 - t) * (0.6 + Math.random() * 1.2);
      col[i3] = 0.55 * f; col[i3 + 1] = 0.9 * f; col[i3 + 2] = 1.0 * f;
    }
    beams.add(buildPoints(pos, col, 4.5));

    const core = glowSprite(beamLength * 0.35, 0.8, 0.95, 1.0, 1);
    group.add(core);
    group.add(glowSprite(beamLength * 0.9, 0.3, 0.7, 1.0, 0.18));

    animators.push(t => {
      spin.rotation.y = t * 2.4;
      core.material.opacity = 0.45 + 0.55 * Math.pow(Math.abs(Math.sin(t * 2.4)), 10);
    });
    return group;
  }

  // ====================== OBJETOS RAROS Y ESPECTACULARES ======================

function createMagnetar(beamLength: number) {
  const group = new THREE.Group();
  const spin = new THREE.Group();
  group.add(spin);

  // Núcleo extremadamente brillante
  const core = glowSprite(beamLength * 0.55, 0.9, 0.95, 1.0, 1.0);
  group.add(core);
  group.add(glowSprite(beamLength * 1.4, 0.4, 0.6, 1.0, 0.25));

  // Haces de partículas (más intensos que un púlsar normal)
  const count = 2200;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const side = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.65);
    const sp = 1.5 + t * beamLength * 0.04;
    pos[i3] = gauss() * sp;
    pos[i3 + 1] = side * t * beamLength;
    pos[i3 + 2] = gauss() * sp;

    const f = (1 - t) * (1.1 + Math.random() * 1.6);
    col[i3] = 0.6 * f;
    col[i3 + 1] = 0.85 * f;
    col[i3 + 2] = 1.0 * f;
  }
  spin.add(buildPoints(pos, col, 5.2));

  // Destellos violentos (starquakes)
  animators.push(t => {
    spin.rotation.y = t * 3.8;
    const pulse = Math.pow(Math.abs(Math.sin(t * 4.2)), 14);
    core.material.opacity = 0.5 + 0.5 * pulse;
    core.scale.setScalar(beamLength * 0.55 * (1 + pulse * 0.7));
  });

  return group;
}

function createPowerfulBlazar(jetLength: number) {
  const group = new THREE.Group();

  // Núcleo del quasar
  const core = glowSprite(jetLength * 0.38, 1.0, 0.95, 0.9, 1.0);
  group.add(core);
  group.add(glowSprite(jetLength * 1.1, 0.6, 0.5, 1.0, 0.35));

  // Jets relativistas largos
  const count = 9000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const cNear = new THREE.Color(0xffffff);
  const cFar = new THREE.Color(0x7a5cff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const side = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.75);
    const spread = 3 + t * jetLength * 0.06;

    pos[i3] = gauss() * spread;
    pos[i3 + 1] = side * t * jetLength;
    pos[i3 + 2] = gauss() * spread;

    c.copy(cNear).lerp(cFar, t);
    c.multiplyScalar((1.8 - t) * (0.8 + Math.random() * 1.1));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.8));

  // Lóbulos terminales
  for (const side of [1, -1]) {
    const lobe = glowSprite(jetLength * 0.7, 0.55, 0.4, 1.0, 0.32);
    lobe.position.set(0, side * jetLength * 0.95, 0);
    group.add(lobe);
  }

  animators.push(t => {
    core.material.opacity = 0.75 + 0.25 * Math.sin(t * 6.2) * Math.sin(t * 2.1);
  });

  return group;
}

function createLuminousBlueVariable(radius: number) {
  const group = new THREE.Group();

  // Estrella central extremadamente luminosa
  const core = glowSprite(radius * 0.5, 0.7, 0.85, 1.0, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.3, 0.5, 0.7, 1.0, 0.3));

  // Nebulosa bipolar (como Homunculus de Eta Carinae)
  const count = 14000;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c1 = new THREE.Color(0xff6a3d);
  const c2 = new THREE.Color(0xffd27a);
  const c3 = new THREE.Color(0x8ab4ff);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const lobe = i < count / 2 ? 1 : -1;
    const t = Math.pow(Math.random(), 1.3);
    const ang = Math.random() * Math.PI * 2;
    const r = radius * (0.25 + t * 0.85);
    const spread = radius * 0.22 * (1 - t * 0.7);

    pos[i3] = Math.cos(ang) * spread * (0.6 + t);
    pos[i3 + 1] = lobe * r;
    pos[i3 + 2] = Math.sin(ang) * spread * (0.6 + t);

    c.copy(c1).lerp(c2, t).lerp(c3, Math.random() * 0.3);
    c.multiplyScalar(0.7 + Math.random() * 1.0);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 5.0));
  return group;
}

function createPolarRingGalaxy(count: number, radius: number) {
  const group = new THREE.Group();

  // Disco principal
  const disk = createEllipticalGalaxy(Math.floor(count * 0.55), radius * 0.85, 0.35, 0xffe0b0, 0xff8a5a);
  group.add(disk);

  // Anillo polar
  const ringPos = new Float32Array(Math.floor(count * 0.45) * 3);
  const ringCol = new Float32Array(Math.floor(count * 0.45) * 3);
  const cRing = new THREE.Color(0x6ec8ff);
  const c = new THREE.Color();

  for (let i = 0; i < Math.floor(count * 0.45); i++) {
    const i3 = i * 3;
    const ang = Math.random() * Math.PI * 2;
    const r = radius * (0.75 + gauss() * 0.08);

    ringPos[i3] = Math.cos(ang) * r;
    ringPos[i3 + 1] = Math.sin(ang) * r;          // anillo vertical
    ringPos[i3 + 2] = gauss() * radius * 0.04;

    c.copy(cRing).multiplyScalar(0.7 + Math.random() * 0.9);
    ringCol[i3] = c.r; ringCol[i3 + 1] = c.g; ringCol[i3 + 2] = c.b;
  }

  group.add(buildPoints(ringPos, ringCol, 4.3));
  return group;
}

function createTidalDisruptionEvent(radius: number) {
  const group = new THREE.Group();

  // Agujero negro central
  const core = glowSprite(radius * 0.35, 1.0, 0.9, 0.7, 1.0);
  group.add(core);
  group.add(glowSprite(radius * 1.1, 1.0, 0.5, 0.2, 0.35));

  // Corriente de escombros (stream)
  const count = 7500;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const t = Math.pow(Math.random(), 0.7);

    // Trayectoria en espiral que cae
    const ang = t * 9.0;
    const r = radius * (0.15 + t * 0.9);

    pos[i3] = Math.cos(ang) * r * (1 - t * 0.4);
    pos[i3 + 1] = gauss() * radius * 0.06;
    pos[i3 + 2] = Math.sin(ang) * r * (1 - t * 0.4);

    c.setRGB(1.0, 0.55 - t * 0.3, 0.25);
    c.multiplyScalar((1.3 - t) * (0.8 + Math.random()));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.5));

  animators.push(t => {
    core.material.opacity = 0.7 + 0.3 * Math.sin(t * 5.5);
  });

  return group;
}

function createGiantRadioGalaxy(lobeSize: number) {
  const group = new THREE.Group();

  // Núcleo
  const core = glowSprite(lobeSize * 0.25, 0.9, 0.85, 1.0, 0.9);
  group.add(core);

  // Dos lóbulos enormes
  for (const side of [-1, 1]) {
    const count = 5500;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const baseColor = new THREE.Color(0x7a9fff);
    const c = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = Math.random();
      const spread = lobeSize * (0.3 + t * 0.5);

      pos[i3] = gauss() * spread * 0.7;
      pos[i3 + 1] = side * (lobeSize * 0.6 + t * lobeSize * 0.7);
      pos[i3 + 2] = gauss() * spread * 0.7;

      c.copy(baseColor).multiplyScalar(0.5 + Math.random() * 0.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    group.add(buildPoints(pos, col, 5.5));
  }

  return group;
}

function createHerbigHaroJets(length: number) {
  const group = new THREE.Group();

  // Protoestrella central
  const core = glowSprite(length * 0.18, 1.0, 0.85, 0.6, 1.0);
  group.add(core);

  // Jets bipolares
  const count = 4800;
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const side = i % 2 === 0 ? 1 : -1;
    const t = Math.pow(Math.random(), 0.8);
    const spread = 2 + t * length * 0.04;

    pos[i3] = gauss() * spread;
    pos[i3 + 1] = side * t * length;
    pos[i3 + 2] = gauss() * spread;

    c.setRGB(0.4 + t * 0.3, 0.7, 1.0);
    c.multiplyScalar((1.2 - t) * (0.7 + Math.random()));
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.2));
  return group;
}

function createWolfRayetCluster(count: number, radius: number) {
  const group = new THREE.Group();

  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    const r = radius * Math.pow(Math.random(), 1.9);
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);

    pos[i3] = r * s * Math.cos(t);
    pos[i3 + 1] = r * u * 0.65;
    pos[i3 + 2] = r * s * Math.sin(t);

    // Estrellas muy calientes y luminosas
    c.setRGB(0.6 + Math.random() * 0.4, 0.8, 1.0);
    c.multiplyScalar(1.4 + Math.random() * 2.2);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.5));

  // Vientos estelares (nebulosidad)
  const wind = createEmissionNebula(Math.floor(count * 0.5), radius * 1.3);
  group.add(wind);

  return group;
}

function createInteractingGalaxies(radius: number) {
  const group = new THREE.Group();

  // Dos galaxias
  const g1 = createSpiralGalaxy({
    particleCount: 18000,
    radius: radius * 0.7,
    arms: 3,
    spin: 1.2,
    randomness: 0.3,
    insideColor: 0xffe9b0,
    outsideColor: 0x4a9fff,
    dustColor: 0xc43bff
  }).container;
  g1.position.set(-radius * 0.45, 0, 0);
  group.add(g1);

  const g2 = createEllipticalGalaxy(14000, radius * 0.55, 0.6, 0xffd9a0, 0xff7a3d);
  g2.position.set(radius * 0.5, radius * 0.15, 0);
  group.add(g2);

  // Colas de marea
  const tailCount = 6500;
  const pos = new Float32Array(tailCount * 3);
  const col = new Float32Array(tailCount * 3);
  const c = new THREE.Color(0xa0c8ff);

  for (let i = 0; i < tailCount; i++) {
    const i3 = i * 3;
    const t = Math.random();
    const side = i < tailCount / 2 ? -1 : 1;

    pos[i3] = side * radius * (0.6 + t * 1.4) + gauss() * 40;
    pos[i3 + 1] = Math.sin(t * 3.5) * radius * 0.35 + gauss() * 25;
    pos[i3 + 2] = gauss() * 35;

    c.multiplyScalar(0.5 + Math.random() * 0.8);
    col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
  }

  group.add(buildPoints(pos, col, 4.0));
  return group;
}

  // Remanente de supernova
  function createSupernovaRemnant(radius: number) {
    const group = new THREE.Group();
    const filaments = 46;
    const steps = 34;
    const pos = new Float32Array(filaments * steps * 3);
    const col = new Float32Array(filaments * steps * 3);
    const remnantColors = [0xff5a3d, 0xff9a3d, 0x35e6ff, 0xc43bff, 0xff4fa3].map(h => new THREE.Color(h));
    const c = new THREE.Color();
    const p = new THREE.Vector3();
    const vel = new THREE.Vector3();
    const jit = new THREE.Vector3();
    let idx = 0;
    for (let f = 0; f < filaments; f++) {
      const rr = radius * (0.8 + Math.random() * 0.3);
      p.set(gauss(), gauss(), gauss()).setLength(rr);
      vel.set(gauss(), gauss(), gauss()).normalize();
      for (let s = 0; s < steps; s++) {
        p.addScaledVector(vel, radius * 0.045);
        vel.add(jit.set(gauss(), gauss(), gauss()).multiplyScalar(0.35)).normalize();
        p.setLength(rr * (1 + gauss() * 0.02));
        pos[idx * 3] = p.x + gauss() * radius * 0.006;
        pos[idx * 3 + 1] = p.y + gauss() * radius * 0.006;
        pos[idx * 3 + 2] = p.z + gauss() * radius * 0.006;
        c.copy(remnantColors[f % remnantColors.length]).multiplyScalar(0.6 + Math.random() * 0.9);
        col[idx * 3] = c.r; col[idx * 3 + 1] = c.g; col[idx * 3 + 2] = c.b;
        idx++;
      }
    }
    group.add(buildPoints(pos, col, 4.5));
    addCore(group, radius * 0.25, 0.6, 0.9, 1.0, 1.0);
    addCore(group, radius * 2.4, 1.0, 0.5, 0.4, 0.18);

    animators.push(t => {
      const s = 1 + 0.03 * Math.sin(t * 0.4);
      group.scale.set(s, s, s);
      group.rotation.y = t * 0.01;
    });
    return group;
  }

  // Lente gravitacional
  function createGravitationalLens(ringRadius: number) {
    const group = new THREE.Group();
    addCore(group, ringRadius * 0.9, 1, 0.82, 0.55, 0.9);

    const count = 3600;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const arcs = [
      { start: 0.2, len: 1.5 },
      { start: 2.5, len: 0.9 },
      { start: 4.0, len: 1.1 },
      { start: 5.4, len: 0.5 }
    ];
    const cArc = new THREE.Color(0x7fb0ff);
    const cArc2 = new THREE.Color(0xffb0e0);
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const arc = arcs[i % arcs.length];
      const ang = arc.start + Math.random() * arc.len;
      const r = ringRadius * (1 + gauss() * 0.025);
      pos[i3] = Math.cos(ang) * r;
      pos[i3 + 1] = Math.sin(ang) * r;
      pos[i3 + 2] = gauss() * 2;
      const taper = Math.sin(Math.PI * (ang - arc.start) / arc.len);
      c.copy(cArc).lerp(cArc2, Math.random() * 0.6).multiplyScalar(0.5 + 1.8 * taper);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    group.add(buildPoints(pos, col, 4.5));
    return group;
  }

  // Sistema binario
  function createBinarySystem(sep: number) {
    const group = new THREE.Group();
    const rot = new THREE.Group();
    group.add(rot);
    group.rotation.set(0.45, 0, 0.2);

    const a = new THREE.Vector3(-sep * 0.35, 0, 0);
    const b = new THREE.Vector3(sep * 0.65, 0, 0);

    const starA = glowSprite(sep * 1.1, 0.75, 0.88, 1.0, 1);
    starA.position.copy(a);
    const starB = glowSprite(sep * 0.8, 1.0, 0.6, 0.3, 0.95);
    starB.position.copy(b);
    rot.add(starA, starB);

    const streamCount = 700;
    const diskCount = 900;
    const pos = new Float32Array((streamCount + diskCount) * 3);
    const col = new Float32Array((streamCount + diskCount) * 3);
    const c = new THREE.Color();
    for (let i = 0; i < streamCount; i++) {
      const t = Math.random();
      const i3 = i * 3;
      pos[i3] = THREE.MathUtils.lerp(b.x, a.x, t) + gauss() * sep * 0.012;
      pos[i3 + 1] = Math.sin(t * Math.PI) * sep * 0.28 + gauss() * sep * 0.012;
      pos[i3 + 2] = Math.sin(t * Math.PI * 2) * sep * 0.1 + gauss() * sep * 0.012;
      c.setRGB(1.0, 0.7 - 0.2 * t, 0.4 + 0.5 * t).multiplyScalar(0.8 + Math.random() * 0.8);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    for (let i = 0; i < diskCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const r = sep * (0.12 + Math.random() * 0.18);
      const i3 = (streamCount + i) * 3;
      pos[i3] = a.x + Math.cos(ang) * r;
      pos[i3 + 1] = gauss() * sep * 0.01;
      pos[i3 + 2] = a.z + Math.sin(ang) * r;
      c.setRGB(1.0, 0.85, 0.65).multiplyScalar(0.6 + Math.random() * 1.0);
      col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;
    }
    rot.add(buildPoints(pos, col, 3.5));

    animators.push(t => {
      rot.rotation.y = t * 0.35;
    });
    return group;
  }

  function createTripleSystem(sep: number) {
    const group = new THREE.Group();
    const outerOrbit = new THREE.Group();
    const innerOrbit = new THREE.Group();
    outerOrbit.add(innerOrbit);
    group.add(outerOrbit);

    const primary = glowSprite(sep * 0.72, 0.8, 0.9, 1.0, 1.0);
    primary.position.x = -sep * 0.42;
    const secondary = glowSprite(sep * 0.48, 1.0, 0.67, 0.38, 0.95);
    secondary.position.x = sep * 0.58;
    innerOrbit.add(primary, secondary);

    const companion = glowSprite(sep * 0.62, 0.72, 0.82, 1.0, 0.9);
    companion.position.z = sep * 2.8;
    outerOrbit.add(companion);

    animators.push(t => {
      innerOrbit.rotation.y = t * 1.8;
      outerOrbit.rotation.y = t * 0.24;
    });

    return group;
  }

  // Telaraña cósmica
  function createCosmicWeb() {
    const nodes: THREE.Vector3[] = [];
    for (let i = 0; i < 16; i++) {
      nodes.push(sphericalPos(
        THREE.MathUtils.randFloat(1700, 2600),
        Math.random() * 360,
        THREE.MathUtils.randFloat(-70, 70)
      ));
    }
    const positions: number[] = [];
    const colors: number[] = [];
    const cA = new THREE.Color(0xbcd4ff);
    const cB = new THREE.Color(0xffe2b0);
    const c = new THREE.Color();
    const p = new THREE.Vector3();

    const push = (v: THREE.Vector3, bright: number) => {
      if (isInVoid(v.x, v.y, v.z)) return;
      positions.push(v.x, v.y, v.z);
      c.copy(cA).lerp(cB, Math.random()).multiplyScalar(bright);
      colors.push(c.r, c.g, c.b);
    };

    for (const n of nodes) {
      for (let i = 0; i < 650; i++) {
        p.set(n.x + gauss() * 70, n.y + gauss() * 70, n.z + gauss() * 70);
        push(p, 0.7 + Math.random() * 1.3);
      }
    }
    for (let a = 0; a < nodes.length; a++) {
      for (let b = a + 1; b < nodes.length; b++) {
        if (nodes[a].distanceTo(nodes[b]) > 2400) continue;
        for (let i = 0; i < 420; i++) {
          p.lerpVectors(nodes[a], nodes[b], Math.random());
          p.x += gauss() * 22;
          p.y += gauss() * 22;
          p.z += gauss() * 22;
          push(p, 0.5 + Math.random() * 0.9);
        }
      }
    }
    return buildPoints(new Float32Array(positions), new Float32Array(colors), 4.0);
  }

  // Supernova ocasional
  const flash = glowSprite(10, 0.85, 0.92, 1.0, 0);
  scene.add(flash);
  let flashStart = -1;
  let nextFlash = 6;
  animators.push(t => {
    if (flashStart < 0 && t > nextFlash) {
      for (let k = 0; k < 12; k++) {
        const p = pointInView(THREE.MathUtils.randFloat(900, 1800), 0.55);
        if (!isWorldPositionInVoid(p)) {
          flash.position.copy(p);
          break;
        }
      }
      flashStart = t;
    }
    if (flashStart >= 0) {
      const k = (t - flashStart) / 6;
      if (k >= 1) {
        flash.material.opacity = 0;
        flashStart = -1;
        nextFlash = t + THREE.MathUtils.randFloat(8, 18);
      } else {
        const rise = Math.min(k / 0.08, 1);
        flash.material.opacity = rise * Math.pow(1 - k, 2.2);
        const s = 20 + 260 * Math.sqrt(k);
        flash.scale.set(s, s, 1);
      }
    }
  });

  // Estrellas fugaces
  const trailLen = 28;
  const streaks = Array.from({ length: 4 }, () => {
    const pos = new Float32Array(trailLen * 3);
    const col = new Float32Array(trailLen * 3);
    for (let j = 0; j < trailLen; j++) {
      const f = Math.pow(1 - j / trailLen, 2);
      col[j * 3] = f; col[j * 3 + 1] = f * 0.95; col[j * 3 + 2] = f;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 4,
      map: starTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return {
      pts,
      mat,
      pos,
      start: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      t0: -1,
      next: 2 + Math.random() * 6
    };
  });

  animators.push(t => {
    const speed = 700;
    const spacing = 5;
    const life = 0.9;
    for (const s of streaks) {
      if (s.t0 < 0 && t > s.next) {
        s.start.copy(pointInView(800, 0.5));
        s.dir.set(0, 0, 0)
          .addScaledVector(viewRight, Math.random() * 2 - 1)
          .addScaledVector(viewUp, (Math.random() * 2 - 1) * 0.6);
        const n = tmpV.copy(s.start).normalize();
        s.dir.addScaledVector(n, -s.dir.dot(n)).normalize();
        s.t0 = t;
      }
      if (s.t0 >= 0) {
        const age = t - s.t0;
        if (age > life) {
          s.mat.opacity = 0;
          s.t0 = -1;
          s.next = t + THREE.MathUtils.randFloat(2, 7);
        } else {
          const d = speed * age;
          for (let j = 0; j < trailLen; j++) {
            const k = d - j * spacing;
            s.pos[j * 3] = s.start.x + s.dir.x * k;
            s.pos[j * 3 + 1] = s.start.y + s.dir.y * k;
            s.pos[j * 3 + 2] = s.start.z + s.dir.z * k;
          }
          (s.pts.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          s.mat.opacity = Math.sin(Math.PI * age / life);
        }
      }
    }
  });

  universe.add(createCosmicWeb());
  createDarkNebula(sphericalPos(900, 40, -5), 9, 170, 220, 420);
  createDarkNebula(sphericalPos(1000, 180, 25), 8, 150, 200, 380);
  createDarkNebula(sphericalPos(950, 330, -25), 9, 180, 220, 440);

  placeStatic(createQuasar(220), 1500, 60, 40, new THREE.Euler(0.3, 0, 0.6));
  placeStatic(createPulsar(160), 600, 250, -40, new THREE.Euler(0.2, 0, 0.3));
  placeStatic(createSupernovaRemnant(140), 700, 110, 5, new THREE.Euler(0.4, 0.2, 0));
  placeStatic(createGravitationalLens(120), 1400, 150, 55, new THREE.Euler(0, 0, 0));
  universe.children[universe.children.length - 1].lookAt(0, 0, 0);
  placeStatic(createBinarySystem(40), 450, 195, 15, new THREE.Euler(0.45, 0, 0.2));
  placeStatic(createTripleSystem(48), 1250, -180, 20, new THREE.Euler(0.3, 0.1, 0.2));
  placeStatic(createProplydDisk(135), 1150, 80, -25, new THREE.Euler(0.4, 0.2, 0));
  placeStatic(createNova(165), 1750, -80, -12, new THREE.Euler(0.2, -0.3, 0.1));
  placeStatic(createEmissionNebula(9000, 180), 2050, -135, 38, new THREE.Euler(0.5, 0.1, 0.3));
  placeStatic(createReflectionNebula(7500, 170), 1850, 215, 8, new THREE.Euler(0.2, 0.4, 0));
  placeStatic(createRingedExoplanet(160), 580, 32, -10, new THREE.Euler(0.2, 0.4, 0.1));
  placeStatic(createAsteroidBelt(230), 820, -48, 16, new THREE.Euler(0.3, -0.2, 0.15));
  placeStatic(createBipolarNebula(210), 1350, 128, -22, new THREE.Euler(0.15, 0.5, -0.2));
  placeStatic(createPulsarWindNebula(190), 1620, -155, 28, new THREE.Euler(0.4, 0.1, 0.25));
  placeStatic(createKilonova(155), 1120, 175, -8, new THREE.Euler(0.1, 0.2, 0.3));
  placeStatic(createHerbigHaroJets(240), 1480, -18, 42, new THREE.Euler(0.35, -0.2, 0.1));
  placeStatic(createBinaryAccretionSystem(175), 980, -34, -22, new THREE.Euler(0.35, 0.2, 0.15));
  placeStatic(createCometWithTails(160), 690, 56, 14, new THREE.Euler(0.18, -0.45, 0.22));
  placeStatic(createProtoplanetarySystem(180), 1240, -112, 24, new THREE.Euler(0.42, 0.3, -0.15));
  placeStatic(createWhiteDwarfDebris(135), 880, 142, -30, new THREE.Euler(0.28, 0.5, 0.12));
  placeStatic(createWolfRayetBubble(210), 1720, 88, 34, new THREE.Euler(0.22, -0.35, 0.18));
  placeStatic(createEinsteinRing(165), 1890, -162, -16, new THREE.Euler(0.15, 0.65, 0));

  // Nodos de combustible iniciales de referencia en el sector cercano
  galaxiesGroup.add(createFuelNode(sphericalPos(1050, 22, 6), 'fn_starter_1', null, 401));
  galaxiesGroup.add(createFuelNode(sphericalPos(2450, -88, -10), 'fn_starter_2', null, 709));

  // 3d. Agujero negro colosal principal + registro en el sistema gravitatorio
const wormPos = wormLocal.clone().multiplyScalar(U);
const wormRadius = 9600;

  const wormMat = createBlackHoleShaderMaterial(
    new THREE.Color(1.0, 0.92, 0.78),
    1.0,
    0.0,
    false,
    1.15
  );

  const wormMesh = new THREE.Mesh(bhDiskGeo, wormMat);
  wormMesh.scale.set(wormRadius * 2, wormRadius * 2, 1);
  wormMesh.position.copy(wormPos);
  wormMesh.renderOrder = 9;
  scene.add(wormMesh);

  const wormHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: wormHaloTexture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    depthTest: false,
    fog: false
  }));
  wormHalo.scale.set(wormRadius * 3.6, wormRadius * 3.6, 1);
  wormHalo.position.copy(wormPos);
  wormHalo.renderOrder = 7;
  scene.add(wormHalo);

  const mainWormholeWell: GravityBlackHole = {
    chunkKey: null,
    isMainWormhole: true,
    localPos: null,
    worldPos: wormPos,
    visualRadius: wormRadius,
    pullRadius: 10500,
    turbRadius: 15500,
    throatRadius: wormRadius * 0.16,
    pullStrength: 1.45,
    diskMesh: wormMesh,
    diskMaterial: wormMat,
    haloSprite: wormHalo,
    baseHaloScale: wormRadius * 3.6,
    baseHaloOpacity: 0.72,
  };
  gravityBlackHoles.push(mainWormholeWell);

  // 3e. Caída en el agujero negro
  const tunnelLength = 1800;
  const transitGroup = new THREE.Group();
  transitGroup.visible = false;
  scene.add(transitGroup);

  const grainCount = 7000;
  const grainRange = 900;
  const grainPos = new Float32Array(grainCount * 2 * 3);
  const grainEnd = new Float32Array(grainCount * 2);
  const grainSeed = new Float32Array(grainCount * 2);
  for (let i = 0; i < grainCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const rad = 1.5 + 70 * Math.pow(Math.random(), 0.6);
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    const z = Math.random() * grainRange;
    const s = Math.random();
    for (let k = 0; k < 2; k++) {
      const idx = i * 2 + k;
      grainPos[idx * 3] = x;
      grainPos[idx * 3 + 1] = y;
      grainPos[idx * 3 + 2] = z;
      grainEnd[idx] = k;
      grainSeed[idx] = s;
    }
  }
  const grainGeo = new THREE.BufferGeometry();
  grainGeo.setAttribute('position', new THREE.BufferAttribute(grainPos, 3));
  grainGeo.setAttribute('aEnd', new THREE.BufferAttribute(grainEnd, 1));
  grainGeo.setAttribute('aSeed', new THREE.BufferAttribute(grainSeed, 1));

   const grainWarm = new THREE.Color(1.0, 1.0, 1.0);
  const grainDeep = new THREE.Color(0.72, 0.82, 1.0);

  const grainUniforms = {
    uTime: { value: 0 },
    uCamZ: { value: 0 },
    uLen: { value: 1.2 },
    uLight: { value: 0 },
    uFade: { value: 0 },
    uScale: { value: 540 },
    uTint: { value: new THREE.Color(1.0, 1.0, 1.0) }
  };

  function makeGrainMaterial(asPoints: boolean) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      defines: asPoints ? { IS_POINTS: '' } : {},
      uniforms: grainUniforms,
      vertexShader: `
        attribute float aEnd;
        attribute float aSeed;
        uniform float uTime;
        uniform float uCamZ;
        uniform float uLen;
        uniform float uLight;
        uniform float uFade;
        uniform float uScale;
        uniform vec3 uTint;
        varying vec3 vCol;
        void main() {
          vec3 p = position;
          float range = 900.0;
          p.z = uCamZ - 40.0 + mod(position.z - uCamZ + 40.0, range);
          float ahead = (p.z - uCamZ + 40.0) / range;
          float glint = 0.6 + 0.4 * sin(uTime * (0.5 + aSeed * 2.5) + aSeed * 60.0);
          p.z += aEnd * uLen * (0.4 + 1.2 * aSeed);
          float bright = (0.2 + 0.8 * aSeed * aSeed) * pow(1.0 - ahead, 1.6) * glint;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
        #ifdef IS_POINTS
          gl_PointSize = min(60.0, (0.9 + 2.2 * aSeed * aSeed) * uScale / max(-mv.z, 1.0));
          vCol = uTint * bright * uLight * (1.0 - step(0.5, aEnd)) * (1.0 - uFade) * 1.4;
        #else
          vCol = uTint * bright * uLight * (1.0 - aEnd * 0.9) * (1.0 - uFade) * 2.2;
        #endif
        }
      `,
      fragmentShader: `
        varying vec3 vCol;
        void main() {
        #ifdef IS_POINTS
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c) * 2.0;
          gl_FragColor = vec4(vCol * exp(-d * d * 5.0), 1.0);
        #else
          gl_FragColor = vec4(vCol, 1.0);
        #endif
        }
      `
    });
  }

  const grains = new THREE.LineSegments(grainGeo, makeGrainMaterial(false));
  grains.frustumCulled = false;
  transitGroup.add(grains);

  const grainGlow = new THREE.Points(grainGeo, makeGrainMaterial(true));
  grainGlow.frustumCulled = false;
  transitGroup.add(grainGlow);

  const exitFlashUniforms = {
    uProgress: { value: 0 },
    uAspect: { value: window.innerWidth / window.innerHeight }
  };
  const exitFlash = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: exitFlashUniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uProgress;
        uniform float uAspect;
        varying vec2 vUv;
        void main() {
          vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
          float r = length(p);
          float flash = 1.0 - smoothstep(0.0, 0.24, uProgress);
          float core = exp(-r * r * 5.0) * (1.0 - smoothstep(0.08, 0.7, uProgress));
          float waveRadius = uProgress * 1.55;
          float wave = exp(-pow((r - waveRadius) * 16.0, 2.0))
            * (1.0 - smoothstep(0.62, 0.96, uProgress));
          float black = smoothstep(0.68, 0.96, uProgress);
          float alpha = mix(clamp(flash * 0.98 + core * 0.8 + wave * 0.9, 0.0, 1.0), 1.0, black);
          vec3 burst = mix(vec3(0.3, 0.62, 1.0), vec3(1.0, 0.48, 0.18), smoothstep(0.0, 0.95, r));
          vec3 color = mix(burst, vec3(1.0), clamp(flash + core, 0.0, 1.0));
          color = mix(color, vec3(0.0), black);
          gl_FragColor = vec4(color, alpha);
        }
      `
    })
  );
  exitFlash.visible = false;
  exitFlash.renderOrder = 10;
  exitFlash.frustumCulled = false;
  transitGroup.add(exitFlash);

  
  function updateTransitFx(time: number, camZ: number, speed: number, t: number, fade: number) {
    grainUniforms.uTime.value = time;
    grainUniforms.uCamZ.value = camZ;
    grainUniforms.uLen.value = 1.2 + speed * 0.05;
    grainUniforms.uLight.value = (0.4 + 0.9 * Math.exp(-t * 3.0)) * Math.min(1, t * 25);
    grainUniforms.uFade.value = fade;
    grainUniforms.uScale.value = renderer.domElement.height / 2;
    grainUniforms.uTint.value.lerpColors(grainWarm, grainDeep, Math.min(1, t * 1.3));
  }

  // 4. Navegación 360°, Selección de Cámara (1 y 3) y Sonido Ambiente del Universo
  type CameraMode = 'first' | 'wide';
  const CAMERA_ORDER: CameraMode[] = ['first', 'wide'];
  let cameraMode: CameraMode = 'first';

  const audioToggleBtn = document.getElementById('audio-toggle') as HTMLButtonElement | null;
  const audioLabelEl = document.getElementById('audio-label');
  const camSelectorEl = document.getElementById('camera-selector');
  const hudDimToggleBtn = document.getElementById('hud-dim-toggle') as HTMLButtonElement | null;
  const hudDimLabelEl = document.getElementById('hud-dim-label');
  const camButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.cam-btn'));

  let hudAutoDim = true;
  let hudUiHovered = false;
  let lastHudClickWakeTime = -10;

  function syncHudDimUi() {
    if (!hudDimToggleBtn || !hudDimLabelEl) return;
    hudDimToggleBtn.setAttribute('aria-pressed', hudAutoDim.toString());
    hudDimToggleBtn.classList.toggle('pinned', !hudAutoDim);
    hudDimLabelEl.textContent = hudAutoDim ? 'HUD Auto' : 'HUD Full';
  }

  function wakeHudClick() {
    lastHudClickWakeTime = clock.getElapsed();
  }

  hudDimToggleBtn?.addEventListener('mousedown', (e) => e.stopPropagation());
  hudDimToggleBtn?.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  hudDimToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hudAutoDim = !hudAutoDim;
    syncHudDimUi();
    if (!hudAutoDim) wakeHudClick();
  });

  function syncAudioUi(muted: boolean) {
    if (!audioToggleBtn || !audioLabelEl) return;
    audioToggleBtn.classList.toggle('muted', muted);
    audioToggleBtn.setAttribute('aria-pressed', (!muted).toString());
    audioLabelEl.textContent = muted ? 'Sound Off' : 'Sound On';
  }

  const audioEngine = new SpaceAudioEngine((muted) => {
    syncAudioUi(muted);
  });

  const unlockAudioOnce = () => {
    audioEngine.unlock();
  };
  window.addEventListener('pointerdown', unlockAudioOnce, { passive: true, capture: true });
  window.addEventListener('keydown', unlockAudioOnce, { passive: true, capture: true });
  window.addEventListener('wheel', unlockAudioOnce, { passive: true, capture: true });
  window.addEventListener('touchstart', unlockAudioOnce, { passive: true, capture: true });

  audioToggleBtn?.addEventListener('mousedown', (e) => e.stopPropagation());
  audioToggleBtn?.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  audioToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const muted = audioEngine.toggleMute();
    syncAudioUi(muted);
  });

  let isDragging = false;
  let prevMousePos = { x: 0, y: 0 };
  let lon = 0;
  let lat = 0;
  let targetLon = 0;
  let targetLat = 0;
  let camBank = 0;

  function setCameraMode(next: CameraMode) {
    if (cameraMode === next) return;
    cameraMode = next;
    camButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.cam === next);
    });
  }

  camButtons.forEach((btn) => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cam = btn.dataset.cam as CameraMode | undefined;
      if (cam) setCameraMode(cam);
    });
  });

  const navKeys = { Left: false, Right: false, Up: false, Down: false };
  const keyMap: Record<string, 'Left' | 'Right' | 'Up' | 'Down'> = {
    ArrowLeft: 'Left',
    ArrowRight: 'Right',
    ArrowUp: 'Up',
    ArrowDown: 'Down'
  };

  let mode: 'explore' | 'transit' | 'abyss' = 'explore';
  const isActive360 = () => container.style.pointerEvents === 'auto';

  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'm' || e.key === 'M') {
      const muted = audioEngine.toggleMute();
      syncAudioUi(muted);
      return;
    }
    if (mode !== 'explore') {
      e.stopImmediatePropagation();
      return;
    }
    if (isActive360()) {
      if (e.key === '1') { setCameraMode('first'); return; }
      if (e.key === '3') { setCameraMode('wide'); return; }
      if (e.key === 'h' || e.key === 'H') {
        hudAutoDim = !hudAutoDim;
        syncHudDimUi();
        if (!hudAutoDim) wakeHudClick();
        return;
      }
      if (e.key === 'c' || e.key === 'C') {
        const nextIdx = (CAMERA_ORDER.indexOf(cameraMode) + 1) % CAMERA_ORDER.length;
        setCameraMode(CAMERA_ORDER[nextIdx]);
        return;
      }
    }
    const k = keyMap[e.key];
    if (k && isActive360()) {
      navKeys[k] = true;
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }, { capture: true });

  window.addEventListener('keyup', (e: KeyboardEvent) => {
    const k = keyMap[e.key];
    if (k) navKeys[k] = false;
  }, { capture: true });

  window.addEventListener('wheel', (e: WheelEvent) => {
    if (mode !== 'explore') e.stopImmediatePropagation();
  }, { capture: true });

  window.addEventListener('mousedown', (e: MouseEvent) => {
    isDragging = true;
    prevMousePos = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - prevMousePos.x;
    const deltaY = e.clientY - prevMousePos.y;
    prevMousePos = { x: e.clientX, y: e.clientY };

    targetLon -= deltaX * 0.12;
    targetLat += deltaY * 0.12;
    targetLat = Math.max(-85, Math.min(85, targetLat));
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  window.addEventListener('touchstart', (e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging = true;
      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePos.x;
    const deltaY = e.touches[0].clientY - prevMousePos.y;
    prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    targetLon -= deltaX * 0.15;
    targetLat += deltaY * 0.15;
    targetLat = Math.max(-85, Math.min(85, targetLat));
  }, { passive: true });

  window.addEventListener('touchend', () => { isDragging = false; });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 5. Bucle de animación
  const clock = new THREE.Timer();
  clock.connect(document);
  const bhCanvas = document.getElementById('sim-canvas') as HTMLElement;
  const transitDuration = 11;
  const bigBangDuration = 3.5;
  const shipPos = new THREE.Vector3(0, 0, 0.1);
  const lookDir = new THREE.Vector3();
  const toWorm = new THREE.Vector3();
  const bestToBh = new THREE.Vector3();
  const bhToCam = new THREE.Vector3();
  const lastSuctionDir = new THREE.Vector3(0, 0, 1);
  const lastSuctionWorldPos = new THREE.Vector3();
  const ejectOffset = new THREE.Vector3();
  let lastSuctionSafeDist = 14000;
  const flashOffset = new THREE.Vector3();
  const bgWorldCamPos = new THREE.Vector3();
  const bgPrevWorldCamPos = new THREE.Vector3();
  const bgInstVel = new THREE.Vector3();
  const bgSmoothVel = new THREE.Vector3();
  const toMilkyWay = new THREE.Vector3();
  const camFwdVec = new THREE.Vector3();
  const camRightVec = new THREE.Vector3();
  const camUpVec = new THREE.Vector3();
  const trueHomeVec = new THREE.Vector3();
  const camLocalReused = new THREE.Vector3();
  const prevShipLocal = new THREE.Vector3();
  const curShipLocal = new THREE.Vector3();
  const fuelSegVec = new THREE.Vector3();
  const fuelToNode = new THREE.Vector3();
  const fuelClosestPt = new THREE.Vector3();
  const toFuelNode = new THREE.Vector3();
  const shipWorldVel = new THREE.Vector3();
  const hazardWorldPos = new THREE.Vector3();
  const hazardDelta = new THREE.Vector3();
  const hazardDir = new THREE.Vector3();
  const hazardRelVel = new THREE.Vector3();
  const hazardRelDir = new THREE.Vector3();
  const hazardClosestPt = new THREE.Vector3();
  const prevShipWorld = new THREE.Vector3();
  const impactSegVec = new THREE.Vector3();
  const impactToHazard = new THREE.Vector3();
  const impactClosestPt = new THREE.Vector3();
  let bgHasPrevPos = false;
  let camVel = 0;
  let cruiseHoldTime = 0;
  let boostEnergy = 1.0;
  let boostCooldown = false;
  let isBoosting = false;
  let wasBoosting = false;
  let boostKick = 0;
  let smoothBoostShake = 0;
  let smoothMassiveTurb = 0;
  let fuelLevel = 1.0;
  let fuelRefuelFlash = 0;
  let impactSlowdownTimer = 0;
  let impactJolt = 0;
  let impactLabel = '';
  let mwArrived = false;
  let mwExploreAfterArrival = false;
  let smoothVoidFactor = 0;
  let lastT = 0;
  let transitStart = 0;
  let returning = false;
  let hiddenSince = -1;

  const hudEl = document.getElementById('milkyway-hud');
  const hudDistEl = document.getElementById('hud-distance');
  const hudEtaEl = document.getElementById('hud-eta');
  const hudFillEl = document.getElementById('hud-bar-fill') as HTMLElement | null;
  const hudPctEl = document.getElementById('hud-progress');
  const hudSpeedEl = document.getElementById('hud-speed');
  const hudBoostStateEl = document.getElementById('hud-boost-state');
  const hudBoostPctEl = document.getElementById('hud-boost-pct');
  const hudBoostFillEl = document.getElementById('hud-boost-fill') as HTMLElement | null;
  const hudFuelStateEl = document.getElementById('hud-fuel-state');
  const hudFuelPctEl = document.getElementById('hud-fuel-pct');
  const hudFuelFillEl = document.getElementById('hud-fuel-fill') as HTMLElement | null;
  const hudFuelBearingEl = document.getElementById('hud-fuel-bearing');
  const hudFuelArrowEl = document.getElementById('hud-fuel-arrow') as unknown as SVGElement | null;
  const hudFuelNodeDistEl = document.getElementById('hud-fuel-node-dist');
  const hudBearingEl = document.getElementById('hud-bearing');
  const hudArrowEl = document.getElementById('hud-arrow') as unknown as SVGElement | null;
  const hudAlignEl = document.getElementById('hud-align');
  const hudRegionEl = document.getElementById('hud-region');
  const hudProximityRowEl = document.getElementById('hud-proximity-row');
  const hudProximityStateEl = document.getElementById('hud-proximity-state');
  const hudProximityMetaEl = document.getElementById('hud-proximity-meta');
  const hudGravityRowEl = document.getElementById('hud-gravity-row');
  const hudGravityStateEl = document.getElementById('hud-gravity-state');
  const hudGravityPctEl = document.getElementById('hud-gravity-pct');
  const arrivalEl = document.getElementById('milkyway-arrival');
  const arrivalExploreBtn = document.getElementById('arrival-explore-btn');
  const singularityEl = document.getElementById('singularity-overlay');
  const singularityEjectBtn = document.getElementById('singularity-eject-btn');

  hudEl?.addEventListener('mouseenter', () => { hudUiHovered = true; });
  hudEl?.addEventListener('mouseleave', () => { hudUiHovered = false; });
  hudEl?.addEventListener('pointerdown', () => { wakeHudClick(); });
  hudEl?.addEventListener('click', () => { wakeHudClick(); });
  window.addEventListener('pointerdown', (e: PointerEvent) => {
    if (hudEl && !hudEl.contains(e.target as Node)) {
      lastHudClickWakeTime = -10;
    }
  }, { passive: true });

  function formatRealDuration(seconds: number): string {
    const totalSec = Math.max(0, Math.round(seconds));
    const months = Math.floor(totalSec / (30 * 86400));
    const remAfterMonths = totalSec % (30 * 86400);
    const days = Math.floor(remAfterMonths / 86400);
    const hours = Math.floor((remAfterMonths % 86400) / 3600);
    const mins = Math.floor((remAfterMonths % 3600) / 60);
    const secs = totalSec % 60;

    if (months > 0) return `${months} mo ${days} d`;
    if (days > 0) return `${days} d ${String(hours).padStart(2, '0')} h`;
    if (hours > 0) return `${hours} h ${String(mins).padStart(2, '0')} m`;
    return `${mins} m ${String(secs).padStart(2, '0')} s`;
  }

  arrivalExploreBtn?.addEventListener('click', () => {
    mwExploreAfterArrival = true;
    arrivalEl?.classList.remove('visible');
  });

  singularityEjectBtn?.addEventListener('click', () => {
    if (mode !== 'abyss') return;
    singularityEl?.classList.remove('visible');
    mode = 'explore';
    scene.fog = exploreFog;
    scene.children.forEach(c => { c.visible = c !== transitGroup; });
    exitFlash.visible = false;
    exitFlashUniforms.uProgress.value = 0;
    if (bhCanvas) bhCanvas.style.visibility = 'visible';

    universe.scale.setScalar(U);
    ejectOffset.copy(lastSuctionWorldPos).addScaledVector(lastSuctionDir, lastSuctionSafeDist);
    universe.position.sub(ejectOffset);
    wormPos.sub(ejectOffset);
    wormMesh.position.copy(wormPos);
    wormHalo.position.copy(wormPos);
    wormLocal.copy(wormPos).sub(universe.position).divideScalar(U);
    mwAnchorWorldPos.sub(ejectOffset);

    renderer.setClearColor(0x000000, 0);
    camera.position.set(0, 0, 0.1);
    shipPos.set(0, 0, 0.1);
    camera.fov = 65;
    camera.updateProjectionMatrix();

    camVel = 0;
    cruiseHoldTime = 0;
    boostEnergy = 1.0;
    boostCooldown = false;
    isBoosting = false;
    wasBoosting = false;
    boostKick = 0;
    smoothBoostShake = 0;
    smoothMassiveTurb = 0;
    fuelLevel = 1.0;
    fuelRefuelFlash = 0;
    impactSlowdownTimer = 0;
    impactJolt = 0;
    impactLabel = '';
    for (let i = 0; i < hazardFields.length; i++) hazardFields[i].impactCooldown = 0;
    for (let i = 0; i < crossingObjects.length; i++) crossingObjects[i].impactCooldown = 0;
    collectedFuelNodeIds.clear();
    for (let i = 0; i < fuelNodes.length; i++) {
      const fn = fuelNodes[i];
      fn.collected = false;
      fn.collectAnim = 0;
      fn.group.visible = true;
      fn.group.scale.setScalar(1);
    }
    bgHasPrevPos = false;
    bgSmoothVel.set(0, 0, 0);
    lastT = clock.getElapsed();
    audioEngine.setSilent(false);
  });

  function startTransit(suckingBh?: GravityBlackHole) {
    if (suckingBh) {
      lastSuctionWorldPos.copy(suckingBh.worldPos);
      lastSuctionDir.copy(shipPos).sub(suckingBh.worldPos);
      if (lastSuctionDir.lengthSq() < 1e-4) lastSuctionDir.set(0.3, 0.2, 0.9);
      lastSuctionDir.normalize();
      lastSuctionSafeDist = Math.max(20000, suckingBh.turbRadius * 1.35);
    }
    mode = 'transit';
    transitStart = clock.getElapsed();
    scene.fog = null;
    scene.children.forEach(c => { c.visible = c === transitGroup; });
    hudEl?.classList.remove('visible', 'dimmed', 'hazard-alert', 'hazard-critical');
    hudProximityRowEl?.classList.remove('active', 'critical');
    camSelectorEl?.classList.remove('visible');
    hudDimToggleBtn?.classList.remove('visible');
    arrivalEl?.classList.remove('visible');
    singularityEl?.classList.remove('visible');
    exitFlash.visible = false;
    exitFlashUniforms.uProgress.value = 0;
    if (bhCanvas) bhCanvas.style.visibility = 'hidden';
    camera.position.set(0, 0, 0);
    ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].forEach(key => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key }));
    });
  }

  function animateCosmos() {
    requestAnimationFrame(animateCosmos);
    if (mode === 'abyss') {
      audioEngine.setSilent(true);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      return;
    }

    clock.update();
    const elapsedTime = clock.getElapsed();
    const dt = Math.min(elapsedTime - lastT, 0.1);
    lastT = elapsedTime;

    if (mode === 'transit') {
      const age = elapsedTime - transitStart;
      const t = THREE.MathUtils.clamp(age / transitDuration, 0, 1);
      const z = tunnelLength * 0.85 * t * t;
      const speed = (tunnelLength * 0.85 * 2 * t) / transitDuration;
      const k = elapsedTime;

      camera.position.set(Math.sin(k * 0.7) * 0.4, Math.cos(k * 0.5) * 0.4, z);
      camera.lookAt(0, 0, z + 100);
      camera.rotateZ(t * t * 0.9 + 0.1 * t);
      camera.rotateX(Math.sin(k * 29.0) * 0.003 * t * t);
      camera.rotateY(Math.sin(k * 23.0) * 0.003 * t * t);
      camera.fov = 75 + 25 * t * t;
      camera.updateProjectionMatrix();

      updateTransitFx(k, z, speed, t, THREE.MathUtils.smoothstep(t, 0.82, 1.0));

      const exitT = THREE.MathUtils.clamp((age - transitDuration) / bigBangDuration, 0, 1);
      if (age >= transitDuration) {
        exitFlash.visible = true;
        exitFlashUniforms.uProgress.value = exitT;
        exitFlashUniforms.uAspect.value = camera.aspect;
        const flashDistance = 18;
        const flashHeight = 2 * flashDistance * Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
        flashOffset.set(0, 0, -flashDistance).applyQuaternion(camera.quaternion);
        exitFlash.position.copy(camera.position)
          .add(flashOffset);
        exitFlash.quaternion.copy(camera.quaternion);
        exitFlash.scale.set(flashHeight * camera.aspect, flashHeight, 1);
      }

      if (age >= transitDuration + bigBangDuration) {
        mode = 'abyss';
        scene.children.forEach(c => { c.visible = false; });
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        audioEngine.setSilent(true);
        singularityEl?.classList.add('visible');
        return;
      }
      renderer.render(scene, camera);
      return;
    }

    const active = isActive360();
    const introOpacity = parseFloat(container.style.opacity || '0');
    if (!active) {
      returning = false;
      navKeys.Left = false;
      navKeys.Right = false;
      navKeys.Up = false;
      navKeys.Down = false;
      hudEl?.classList.remove('visible', 'dimmed', 'hazard-alert', 'hazard-critical');
      hudProximityRowEl?.classList.remove('active', 'critical');
      camSelectorEl?.classList.remove('visible');
      hudDimToggleBtn?.classList.remove('visible');
      arrivalEl?.classList.remove('visible');
      singularityEl?.classList.remove('visible');
      cruiseHoldTime = 0;
      isBoosting = false;
      boostEnergy = Math.min(1, boostEnergy + dt / 30.0);
      if (boostEnergy >= 1) boostCooldown = false;
      if (introOpacity === 0) {
        if (hiddenSince < 0) hiddenSince = elapsedTime;
        else if (elapsedTime - hiddenSince > 1.6) {
          shipPos.set(0, 0, 0.1);
          camera.position.set(0, 0, 0.1);
          camVel = 0;
          boostEnergy = 1.0;
          boostCooldown = false;
          wasBoosting = false;
          boostKick = 0;
          smoothBoostShake = 0;
          smoothMassiveTurb = 0;
          fuelLevel = 1.0;
          fuelRefuelFlash = 0;
          impactSlowdownTimer = 0;
          impactJolt = 0;
          impactLabel = '';
          for (let i = 0; i < hazardFields.length; i++) hazardFields[i].impactCooldown = 0;
          for (let i = 0; i < crossingObjects.length; i++) crossingObjects[i].impactCooldown = 0;
          collectedFuelNodeIds.clear();
          for (let i = 0; i < fuelNodes.length; i++) {
            const fn = fuelNodes[i];
            fn.collected = false;
            fn.collectAnim = 0;
            fn.group.visible = true;
            fn.group.scale.setScalar(1);
          }
          bgHasPrevPos = false;
          bgSmoothVel.set(0, 0, 0);
          mwArrived = false;
          mwExploreAfterArrival = false;
        }
      } else {
        hiddenSince = -1;
      }
    } else {
      hiddenSince = -1;
      camSelectorEl?.classList.add('visible');
      hudDimToggleBtn?.classList.add('visible');
    }

    if (navKeys.Left) targetLon -= 1.1;
    if (navKeys.Right) targetLon += 1.1;

    const moving = navKeys.Up || navKeys.Down || Math.abs(camVel) > 5;
    if (!isDragging && !navKeys.Left && !navKeys.Right && !moving) {
      targetLon += 0.024;
    }

    lon += (targetLon - lon) * 0.055;
    lat += (targetLat - lat) * 0.055;

    const phi = THREE.MathUtils.degToRad(90 - lat);
    const theta = THREE.MathUtils.degToRad(lon);

    lookDir.set(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );

    // Evaluar todos los agujeros negros activos para atracción gravitatoria, alerta temprana y succión
    const curScale = universe.scale.x;
    let bestBh: GravityBlackHole | null = null;
    let bestPull = 0;
    let bestTurbProx = 0;
    let bestWarn = 0;
    let nearestWarnDist = Infinity;
    let suckingBh: GravityBlackHole | null = null;

    for (let i = 0; i < gravityBlackHoles.length; i++) {
      const bh = gravityBlackHoles[i];
      if (bh.localPos) {
        bh.worldPos.copy(bh.localPos).multiplyScalar(curScale).add(universe.position);
      }

      toWorm.copy(bh.worldPos).sub(shipPos);
      const dist = toWorm.length();
      const bhProx = THREE.MathUtils.clamp(1 - dist / bh.turbRadius, 0, 1);

      if (bhProx > bestTurbProx) bestTurbProx = bhProx;

      const warnRadius = Math.max(bh.turbRadius * 1.6, bh.pullRadius * 2.5);
      const bhWarn = active ? THREE.MathUtils.clamp(1 - dist / warnRadius, 0, 1) : 0;
      if (bhWarn > bestWarn) bestWarn = bhWarn;
      if (dist < nearestWarnDist) nearestWarnDist = dist;

      const farFade = 1 - THREE.MathUtils.smoothstep(dist, 29000, 39500);
      bh.diskMaterial.uniforms.uTime.value = elapsedTime;
      bh.diskMaterial.uniforms.uApproach.value = bhProx;
      bh.diskMaterial.uniforms.uFarFade.value = farFade;
      bh.diskMesh.visible = farFade > 0.002;
      bh.haloSprite.visible = farFade > 0.002;

      if (bh.isMainWormhole) {
        bh.diskMesh.scale.setScalar(bh.visualRadius * 2 * (1 + bhProx * 0.8));
        bh.haloSprite.scale.setScalar(bh.baseHaloScale * (1 + bhProx));
        (bh.haloSprite.material as THREE.SpriteMaterial).opacity = (bh.baseHaloOpacity + bhProx * 0.22) * farFade;
      } else {
        bh.haloSprite.scale.setScalar(bh.baseHaloScale * (1 + bhProx * 0.65));
        (bh.haloSprite.material as THREE.SpriteMaterial).opacity = (bh.baseHaloOpacity + bhProx * 0.28) * farFade;
      }

      if (dist < bh.throatRadius) {
        suckingBh = bh;
      }

      const bhPull = active ? THREE.MathUtils.clamp(1 - dist / bh.pullRadius, 0, 1) : 0;
      if (bhPull > bestPull) {
        bestPull = bhPull;
        bestBh = bh;
        bestToBh.copy(toWorm).divideScalar(dist || 1);
      }
    }

    if (bestBh && bestPull > 0) {
      lookDir.lerp(bestToBh, Math.pow(bestPull, 1.45) * 0.94).normalize();
    }

// ====================== MOVEMENT (AVERAGE SPEED + LIMITED MAX SPEED + RECHARGE) ======================
const baseSpeed = 380;
const maxCruiseSpeed = 24000;
const BOOST_HOLD_DELAY = 0.65;
const BOOST_DURATION = 5.0;
const BOOST_RECHARGE_DURATION = 30.0;
const distToMW = mwAnchorWorldPos.distanceTo(shipPos);
const trappedInPull = bestPull > 0.35;
prevShipLocal.copy(shipPos).sub(universe.position).divideScalar(U);
prevShipWorld.copy(shipPos);
shipWorldVel.set(0, 0, 0);

if (impactSlowdownTimer > 0) impactSlowdownTimer = Math.max(0, impactSlowdownTimer - dt);
if (impactJolt > 0) impactJolt = Math.max(0, impactJolt - dt * 0.85);

if (active) {
  const hasFuel = fuelLevel > 0.001;
  const impactThrottled = impactSlowdownTimer > 0.35;

  if (navKeys.Up && !trappedInPull && hasFuel && !impactThrottled && (!mwArrived || mwExploreAfterArrival)) {
    cruiseHoldTime += dt;
  } else {
    cruiseHoldTime = Math.max(0, cruiseHoldTime - dt * 3.5);
  }

  let effectiveMaxSpeed = hasFuel ? baseSpeed : baseSpeed * 0.30;
  isBoosting = false;

  if (navKeys.Up && hasFuel && !impactThrottled && (!mwArrived || mwExploreAfterArrival)) {
    if (cruiseHoldTime >= BOOST_HOLD_DELAY && !boostCooldown && boostEnergy > 0 && bestPull < 0.72) {
      isBoosting = true;
      boostEnergy = Math.max(0, boostEnergy - dt / BOOST_DURATION);
      const rampT = THREE.MathUtils.clamp((cruiseHoldTime - BOOST_HOLD_DELAY) / 1.4, 0, 1);
      effectiveMaxSpeed = baseSpeed + (maxCruiseSpeed - baseSpeed) * Math.pow(rampT, 1.4);
      if (boostEnergy <= 0) {
        boostCooldown = true;
        isBoosting = false;
      }
    } else {
      boostEnergy = Math.min(1, boostEnergy + dt / BOOST_RECHARGE_DURATION);
      if (boostEnergy >= 1) {
        boostCooldown = false;
      }
    }
  } else {
    boostEnergy = Math.min(1, boostEnergy + dt / BOOST_RECHARGE_DURATION);
    if (boostEnergy >= 1) {
      boostCooldown = false;
    }
  }

  // Fuel depletion over time, cruise thrust, and high-speed boost burn
  const idleBurn = 0.0014;
  const thrustBurn = (navKeys.Up || navKeys.Down) ? 0.0045 : 0;
  const boostBurn = isBoosting ? 0.025 : 0;
  fuelLevel = Math.max(0, fuelLevel - (idleBurn + thrustBurn + boostBurn) * dt);
  if (fuelRefuelFlash > 0) fuelRefuelFlash = Math.max(0, fuelRefuelFlash - dt);

  // Ralentización temporal tras impactar con asteroides o escombros espaciales
  if (impactSlowdownTimer > 0) {
    const slowT = THREE.MathUtils.clamp(impactSlowdownTimer / 3.4, 0, 1);
    const impactCap = baseSpeed * THREE.MathUtils.lerp(0.82, 0.22, slowT * slowT);
    effectiveMaxSpeed = Math.min(effectiveMaxSpeed, impactCap);
  }

  // Smooth deceleration when approaching the Milky Way
  if (distToMW < 26000) {
    const approachT = THREE.MathUtils.clamp((distToMW - MILKY_WAY_ARRIVAL_DIST) / 21500, 0, 1);
    const approachCap = THREE.MathUtils.lerp(260, maxCruiseSpeed, approachT * approachT);
    effectiveMaxSpeed = Math.min(effectiveMaxSpeed, Math.max(baseSpeed * 0.30, approachCap));
  }

  let targetVel = navKeys.Up ? effectiveMaxSpeed : 0;
  if (mwArrived && !mwExploreAfterArrival) {
    targetVel = 0;
  }

  // Responsive acceleration, smooth fallback, and heavy drag braking during debris impact
  const accelRate = targetVel < camVel
    ? (impactSlowdownTimer > 0 ? 0.0005 : 0.008)
    : (impactSlowdownTimer > 0 ? 0.09 : 0.018);
  camVel += (targetVel - camVel) * (1 - Math.pow(accelRate, dt));

  // Tidal drag inside deep black hole gravity wells
  if (bestPull > 0.25) {
    camVel *= Math.max(0, 1 - bestPull * 0.75 * dt);
  }

  // Motion
  shipPos.addScaledVector(lookDir, camVel * dt);
  shipWorldVel.addScaledVector(lookDir, camVel);

  // Gravitational attraction & event-horizon suction from nearest black hole
  if (bestBh && bestPull > 0) {
    const p2 = bestPull * bestPull;
    const suctionSpeed = (900 + 7800 * p2 * bestPull) * bestBh.pullStrength;
    shipPos.addScaledVector(bestToBh, suctionSpeed * dt);
    shipWorldVel.addScaledVector(bestToBh, suctionSpeed);

    if (bestPull > 0.04) {
      const compress = 1 - bestPull * bestPull * 0.28;
      universe.scale.setScalar(U * compress);
    } else {
      universe.scale.setScalar(U);
    }
  } else {
    universe.scale.setScalar(U);
  }
} else {
  camVel *= 0.92;
}

// Tecla abajo para regresar
if (active && navKeys.Down && !returning) {
  trueHomeVec.copy(shipPos).sub(universe.position);
  const homeDist = trueHomeVec.length();
  if (homeDist < 8) {
    returning = true;
    camVel = 0;
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: -1000 }));
  } else {
    camVel *= 0.88;
    const homeSpeed = THREE.MathUtils.clamp(homeDist * 1.2, 60, 4500);
    trueHomeVec.divideScalar(homeDist);
    const reverseMag = Math.min(homeDist, homeSpeed * dt);
    shipPos.addScaledVector(trueHomeVec, -reverseMag);
    shipWorldVel.addScaledVector(trueHomeVec, -homeSpeed);
  }
}

// Detección continua de impacto contra cinturones de asteroides o nubes de escombros
impactSegVec.copy(shipPos).sub(prevShipWorld);
const impactSegLenSq = impactSegVec.lengthSq();
const shipImpactSpeed = shipWorldVel.length();
const curImpactScale = universe.scale.x;

const checkAsteroidDebrisImpact = (
  worldX: number,
  worldY: number,
  worldZ: number,
  impactRadius: number,
  cooldown: number,
  label: string
): boolean => {
  if (!active || cooldown > 0 || shipImpactSpeed < 140) return false;
  hazardWorldPos.set(worldX, worldY, worldZ);
  let tProj = 0;
  if (impactSegLenSq > 1e-6) {
    impactToHazard.copy(hazardWorldPos).sub(prevShipWorld);
    tProj = THREE.MathUtils.clamp(impactToHazard.dot(impactSegVec) / impactSegLenSq, 0, 1);
  }
  impactClosestPt.copy(prevShipWorld).addScaledVector(impactSegVec, tProj);
  if (impactClosestPt.distanceTo(hazardWorldPos) > impactRadius) return false;

  const impactSeverity = THREE.MathUtils.clamp((shipImpactSpeed - 140) / 2200, 0.45, 1.0);
  impactSlowdownTimer = Math.max(impactSlowdownTimer, 2.8 + impactSeverity * 0.9);
  impactJolt = Math.max(impactJolt, 0.65 + impactSeverity * 0.35);
  impactLabel = label;
  cruiseHoldTime = 0;
  isBoosting = false;
  camVel *= THREE.MathUtils.lerp(0.34, 0.14, impactSeverity);
  return true;
};

for (let i = 0; i < hazardFields.length; i++) {
  const hf = hazardFields[i];
  if (hf.impactCooldown > 0) hf.impactCooldown = Math.max(0, hf.impactCooldown - dt);
  if (
    checkAsteroidDebrisImpact(
      hf.localPos.x * curImpactScale + universe.position.x,
      hf.localPos.y * curImpactScale + universe.position.y,
      hf.localPos.z * curImpactScale + universe.position.z,
      hf.localRadius * curImpactScale * 0.92,
      hf.impactCooldown,
      hf.label
    )
  ) {
    hf.impactCooldown = 4.8;
  }
}

for (let i = 0; i < crossingObjects.length; i++) {
  const co = crossingObjects[i];
  if (co.impactCooldown > 0) co.impactCooldown = Math.max(0, co.impactCooldown - dt);
  if (co.type !== 'asteroids' && co.type !== 'interstellar' && co.type !== 'comet') continue;
  const cLabel = co.type === 'asteroids'
    ? 'ASTEROID STREAM'
    : co.type === 'interstellar'
      ? 'INTERSTELLAR DEBRIS'
      : 'COMETARY DEBRIS';
  const cImpactRadius = co.type === 'asteroids' ? 220 : 155;
  if (
    checkAsteroidDebrisImpact(
      co.group.position.x,
      co.group.position.y,
      co.group.position.z,
      cImpactRadius,
      co.impactCooldown,
      cLabel
    )
  ) {
    co.impactCooldown = 4.8;
  }
}

    // === ESPACIO INFINITO ===
    camLocalReused.copy(shipPos).sub(universe.position).divideScalar(U);
    curShipLocal.copy(camLocalReused);

    // Animar y detectar recolección de nodos de combustible (segmento continuo para evitar tunneling en boost)
    const FUEL_PICKUP_LOCAL_RADIUS = 400;
    fuelSegVec.copy(curShipLocal).sub(prevShipLocal);
    const fuelSegLenSq = fuelSegVec.lengthSq();
    let bestFuelNode: FuelNodeRecord | null = null;
    let bestFuelDistLocal = Infinity;

    for (let i = 0; i < fuelNodes.length; i++) {
      const fn = fuelNodes[i];
      if (!fn.collected) {
        fn.innerRing.rotation.x += dt * 0.95;
        fn.innerRing.rotation.y += dt * 0.65;
        fn.outerRing.rotation.y -= dt * 0.72;
        fn.outerRing.rotation.z += dt * 0.48;
        const pulse = 1 + 0.14 * Math.sin(elapsedTime * 2.4 + fn.phase);
        fn.haloSprite.scale.set(740 * pulse, 740 * pulse, 1);

        if (active) {
          let tProj = 0;
          if (fuelSegLenSq > 1e-6) {
            fuelToNode.copy(fn.localPos).sub(prevShipLocal);
            tProj = THREE.MathUtils.clamp(fuelToNode.dot(fuelSegVec) / fuelSegLenSq, 0, 1);
          }
          fuelClosestPt.copy(prevShipLocal).addScaledVector(fuelSegVec, tProj);
          const segDist = fuelClosestPt.distanceTo(fn.localPos);
          if (segDist <= FUEL_PICKUP_LOCAL_RADIUS) {
            fn.collected = true;
            fn.collectAnim = 0.001;
            collectedFuelNodeIds.add(fn.id);
            fuelLevel = Math.min(1.0, fuelLevel + 0.40);
            boostEnergy = Math.min(1.0, boostEnergy + 0.25);
            if (boostEnergy > 0.2) boostCooldown = false;
            fuelRefuelFlash = 2.4;
            continue;
          }
          const dCur = curShipLocal.distanceTo(fn.localPos);
          if (dCur < bestFuelDistLocal) {
            bestFuelDistLocal = dCur;
            bestFuelNode = fn;
          }
        }
      } else if (fn.collectAnim > 0 && fn.collectAnim < 1) {
        fn.collectAnim = Math.min(1, fn.collectAnim + dt * 3.4);
        const s = Math.max(0.001, (1 - fn.collectAnim) * (1 + fn.collectAnim * 0.8));
        fn.group.scale.setScalar(s);
        if (fn.collectAnim >= 1) {
          fn.group.visible = false;
          fn.group.scale.setScalar(1);
        }
      }
    }

    for (let i = 0; i < starGeometries.length; i++) {
      wrapStarLayer(starGeometries[i], starMaxDists[i], camLocalReused);
    }

    updateNebulaChunks(camLocalReused);
    updateObjectChunks(camLocalReused);

    // Efecto atmosférico de tramo Vacío Oscuro
    const targetVoidFactor = getVoidFactorAtLocal(camLocalReused.x, camLocalReused.y, camLocalReused.z);
    smoothVoidFactor += (targetVoidFactor - smoothVoidFactor) * (1 - Math.exp(-2.4 * dt));
    exploreFog.density = 0.0001 + smoothVoidFactor * 0.00018;
    for (let i = 0; i < starFields.length; i++) {
      (starFields[i].material as THREE.PointsMaterial).opacity = 1 - smoothVoidFactor * 0.78;
    }

    // Soft limit para evitar problemas de precisión de floating point
    const softLimit = 12000 * U;
if (shipPos.length() > softLimit) {
  const offset = shipPos.clone();
  universe.position.sub(offset);
  shipPos.set(0, 0, 0.1);
wormPos.sub(offset);
wormMesh.position.copy(wormPos);
wormHalo.position.copy(wormPos);
wormLocal.copy(wormPos).sub(universe.position).divideScalar(U); // mantener alineado BH_CLEAR
mwAnchorWorldPos.sub(offset);
for (let i = 0; i < crossingObjects.length; i++) {
  crossingObjects[i].group.position.sub(offset);
}
}

    // Llegada al destino final: Vía Láctea
    const updatedDistToMW = mwAnchorWorldPos.distanceTo(shipPos);
    if (active && updatedDistToMW <= MILKY_WAY_ARRIVAL_DIST && !mwArrived) {
      mwArrived = true;
      mwExploreAfterArrival = false;
      cruiseHoldTime = 0;
      arrivalEl?.classList.add('visible');
    } else if (mwArrived && updatedDistToMW > MILKY_WAY_ARRIVAL_DIST * 2.5) {
      mwArrived = false;
      mwExploreAfterArrival = false;
      arrivalEl?.classList.remove('visible');
    }

    if (active && suckingBh) {
      startTransit(suckingBh);
      return;
    }

    // Resolver vista según la cámara seleccionada (1: Primera persona, 3: Gran angular)
    // Shake dinámico por entrada en modo boost, alta velocidad y turbulencia al pasar cerca de objetos masivos
    if (isBoosting && !wasBoosting) {
      boostKick = 1.0;
    }
    wasBoosting = isBoosting;
    if (boostKick > 0) boostKick = Math.max(0, boostKick - dt * 1.45);

    const prox = bestTurbProx;
    const shakeVelRatio = Math.min(1.0, Math.abs(camVel) / baseSpeed);
    const highSpeedRatio = THREE.MathUtils.clamp((Math.abs(camVel) - baseSpeed) / (maxCruiseSpeed - baseSpeed), 0, 1);
    const cruiseFovBoost = highSpeedRatio * 14;

    const curMassScale = universe.scale.x;
    let bestMassiveTurb = 0;
    if (active) {
      for (let i = 0; i < massiveObjects.length; i++) {
        const mo = massiveObjects[i];
        const wx = mo.localPos.x * curMassScale + universe.position.x;
        const wy = mo.localPos.y * curMassScale + universe.position.y;
        const wz = mo.localPos.z * curMassScale + universe.position.z;
        const dx = wx - shipPos.x;
        const dy = wy - shipPos.y;
        const dz = wz - shipPos.z;
        const wr = mo.turbRadius * curMassScale;
        const dSq = dx * dx + dy * dy + dz * dz;
        if (dSq >= wr * wr) continue;
        const proxM = 1 - Math.sqrt(dSq) / wr;
        const flyby = THREE.MathUtils.clamp(
          proxM * mo.strength * (0.65 + 0.6 * highSpeedRatio + 0.35 * shakeVelRatio),
          0,
          1.35
        );
        if (flyby > bestMassiveTurb) bestMassiveTurb = flyby;
      }
    }

    smoothMassiveTurb += (bestMassiveTurb - smoothMassiveTurb) * (1 - Math.exp(-6.0 * dt));
    const targetBoostShake = THREE.MathUtils.clamp(
      (isBoosting ? 0.38 : 0) + Math.pow(highSpeedRatio, 0.68) * 0.82 + boostKick * 0.55,
      0,
      1.35
    );
    smoothBoostShake += (targetBoostShake - smoothBoostShake) * (1 - Math.exp(-8.5 * dt));

    const heavyTurb =
      prox * prox +
      smoothMassiveTurb * smoothMassiveTurb * 0.68 +
      impactJolt * impactJolt * 1.45;
    const speedShake = smoothBoostShake;

    const targetBank = THREE.MathUtils.clamp((lon - targetLon) * 0.045, -0.52, 0.52);
    camBank += (targetBank - camBank) * (1 - Math.exp(-8 * dt));

    camera.position.copy(shipPos);
    camera.lookAt(
      shipPos.x + lookDir.x * 500,
      shipPos.y + lookDir.y * 500,
      shipPos.z + lookDir.z * 500
    );
    const baseFov = cameraMode === 'wide' ? 92 : 65;
    if (cameraMode === 'wide') {
      camera.rotateZ(camBank * 0.22);
    }
    camera.fov =
      baseFov +
      prox * 14 +
      cruiseFovBoost +
      smoothMassiveTurb * 2.4 -
      impactJolt * 7.5 +
      Math.sin(elapsedTime * 14) * 2.5 * heavyTurb +
      Math.sin(elapsedTime * 42) * 0.6 * speedShake;

    camera.updateMatrixWorld();

    // Orientar todos los discos de agujeros negros visibles hacia la cámara
    for (let i = 0; i < gravityBlackHoles.length; i++) {
      const bh = gravityBlackHoles[i];
      bhToCam.copy(bh.worldPos).sub(camera.position);
      if (bh.isMainWormhole || bhToCam.lengthSq() < 1.6e9) {
        bh.diskMesh.quaternion.copy(camera.quaternion);
      }
    }

    const rxHeavy = (Math.sin(elapsedTime * 17.3) + 0.6 * Math.sin(elapsedTime * 29.1 + 1.2)) * 0.011 * heavyTurb;
    const ryHeavy = (Math.sin(elapsedTime * 14.9 + 0.7) + 0.6 * Math.sin(elapsedTime * 25.7)) * 0.011 * heavyTurb;
    const rzHeavy = (Math.sin(elapsedTime * 9.7) + 0.5 * Math.sin(elapsedTime * 21.3 + 2.1)) * 0.026 * heavyTurb;

    const rxBoost = (Math.sin(elapsedTime * 53.0) + 0.55 * Math.cos(elapsedTime * 83.0 + 0.4)) * 0.0028 * speedShake;
    const ryBoost = (Math.cos(elapsedTime * 47.0 + 1.1) + 0.55 * Math.sin(elapsedTime * 79.0)) * 0.0028 * speedShake;
    const rzBoost = (Math.sin(elapsedTime * 37.0 + 2.3) + 0.5 * Math.cos(elapsedTime * 61.0)) * 0.0052 * speedShake;

    const rxCruise = Math.sin(elapsedTime * 21.0) * 0.0007 * shakeVelRatio;
    const ryCruise = Math.cos(elapsedTime * 18.0) * 0.0007 * shakeVelRatio;

    camera.rotateX(rxHeavy + rxBoost + rxCruise);
    camera.rotateY(ryHeavy + ryBoost + ryCruise);
    camera.rotateZ(rzHeavy + rzBoost);

    const transAmp = 0.22 * (heavyTurb * 0.9 + speedShake * 0.55);
    if (transAmp > 0.001) {
      camRightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
      camUpVec.set(0, 1, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(
        camRightVec,
        (Math.sin(elapsedTime * 41.3) + 0.5 * Math.cos(elapsedTime * 67.1)) * transAmp
      );
      camera.position.addScaledVector(
        camUpVec,
        (Math.cos(elapsedTime * 35.7 + 0.8) + 0.5 * Math.sin(elapsedTime * 59.3)) * transAmp
      );
    }

    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    for (const e of extraObjects) {
      e.obj.rotation.y = elapsedTime * e.speed;
    }

    for (const fn of animators) fn(elapsedTime);

    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i];
      (c.sprite.material as THREE.SpriteMaterial).opacity =
        c.baseOpacity * 0.5 * (0.82 + 0.28 * Math.sin(elapsedTime * c.pulseSpeed + c.phase));
    }

    const remainingWorld = Math.max(0, updatedDistToMW - MILKY_WAY_ARRIVAL_DIST);
    const remainingFraction = THREE.MathUtils.clamp(remainingWorld / MILKY_WAY_TRAVEL_DIST, 0, 1);

    milkyWay.update(camera, mwAnchorWorldPos, remainingFraction);

    if (active) {
      hudEl?.classList.add('visible');

      // Sistema de alerta por proximidad de asteroides o escombros a alta velocidad
      const MIN_HIGH_APPROACH_SPEED = 240;
      const curUnivScale = universe.scale.x;
      let bestHazardSeverity = 0;
      let bestHazardLabel = '';
      let bestHazardEdgeDist = Infinity;
      let bestHazardTti = Infinity;

      const evaluateHazardCandidate = (
        worldX: number,
        worldY: number,
        worldZ: number,
        worldRadius: number,
        velX: number,
        velY: number,
        velZ: number,
        label: string
      ) => {
        hazardWorldPos.set(worldX, worldY, worldZ);
        hazardDelta.copy(hazardWorldPos).sub(shipPos);
        const dist = hazardDelta.length();
        if (dist > 22000) return;

        hazardDir.copy(hazardDelta).divideScalar(dist || 1);
        hazardRelVel.set(
          shipWorldVel.x - velX,
          shipWorldVel.y - velY,
          shipWorldVel.z - velZ
        );
        const closingSpeed = hazardRelVel.dot(hazardDir);
        if (closingSpeed < MIN_HIGH_APPROACH_SPEED) return;

        const edgeDist = Math.max(0, dist - worldRadius);
        const warnRange = Math.min(18000, Math.max(1500, worldRadius * 2.2 + closingSpeed * 2.4));
        if (edgeDist >= warnRange) return;

        const relSpeed = hazardRelVel.length();
        hazardRelDir.copy(hazardRelVel).divideScalar(relSpeed || 1);
        const proj = Math.max(0, hazardDelta.dot(hazardRelDir));
        hazardClosestPt.copy(hazardRelDir).multiplyScalar(proj);
        const perpDist = hazardDelta.distanceTo(hazardClosestPt);
        const corridorRadius = worldRadius * 2.35 + 420;
        if (perpDist > corridorRadius && dist > worldRadius * 1.65) return;

        const distFactor = THREE.MathUtils.clamp(1 - edgeDist / warnRange, 0, 1);
        const speedFactor = THREE.MathUtils.clamp((closingSpeed - MIN_HIGH_APPROACH_SPEED) / 1600, 0.35, 1.0);
        const tti = edgeDist / Math.max(1, closingSpeed);
        const ttiFactor = THREE.MathUtils.clamp(1 - tti / 3.8, 0, 1);
        const candSeverity = THREE.MathUtils.clamp(Math.max(distFactor * speedFactor, ttiFactor * speedFactor), 0, 1);

        if (candSeverity > bestHazardSeverity) {
          bestHazardSeverity = candSeverity;
          bestHazardLabel = label;
          bestHazardEdgeDist = edgeDist;
          bestHazardTti = tti;
        }
      };

      if (shipWorldVel.lengthSq() >= MIN_HIGH_APPROACH_SPEED * MIN_HIGH_APPROACH_SPEED * 0.5) {
        for (let i = 0; i < hazardFields.length; i++) {
          const hf = hazardFields[i];
          evaluateHazardCandidate(
            hf.localPos.x * curUnivScale + universe.position.x,
            hf.localPos.y * curUnivScale + universe.position.y,
            hf.localPos.z * curUnivScale + universe.position.z,
            hf.localRadius * curUnivScale,
            0,
            0,
            0,
            hf.label
          );
        }
      }

      for (let i = 0; i < crossingObjects.length; i++) {
        const co = crossingObjects[i];
        if (co.type !== 'asteroids' && co.type !== 'interstellar' && co.type !== 'comet') continue;
        const cLabel = co.type === 'asteroids'
          ? 'ASTEROID STREAM'
          : co.type === 'interstellar'
            ? 'INTERSTELLAR DEBRIS'
            : 'COMETARY DEBRIS';
        const cRadius = co.type === 'asteroids' ? 240 : 180;
        evaluateHazardCandidate(
          co.group.position.x,
          co.group.position.y,
          co.group.position.z,
          cRadius,
          co.velocity.x,
          co.velocity.y,
          co.velocity.z,
          cLabel
        );
      }

      const impactActive = impactSlowdownTimer > 0;
      const hazardAlertActive = impactActive || bestHazardSeverity > 0.08;
      const hazardCritical = impactActive || (hazardAlertActive && (bestHazardSeverity > 0.58 || bestHazardTti < 1.6));

      hudEl?.classList.toggle('hazard-alert', hazardAlertActive);
      hudEl?.classList.toggle('hazard-critical', hazardCritical);
      if (hudProximityRowEl && hudProximityStateEl && hudProximityMetaEl) {
        hudProximityRowEl.classList.toggle('active', hazardAlertActive);
        hudProximityRowEl.classList.toggle('critical', hazardCritical);
        if (impactActive) {
          hudProximityStateEl.textContent = `IMPACT SLOWDOWN · ${impactLabel || 'DEBRIS'}`;
          hudProximityMetaEl.textContent = `${impactSlowdownTimer.toFixed(1)}s`;
        } else if (hazardAlertActive) {
          hudProximityStateEl.textContent = hazardCritical
            ? `IMPACT RISK · ${bestHazardLabel}`
            : `PROXIMITY · ${bestHazardLabel}`;
          const dLabel = bestHazardEdgeDist >= 1000
            ? `${(bestHazardEdgeDist / 1000).toFixed(1)}k u`
            : `${Math.round(bestHazardEdgeDist)} u`;
          const ttiLabel = bestHazardTti < 10 ? ` · ${bestHazardTti.toFixed(1)}s` : '';
          hudProximityMetaEl.textContent = `${dLabel}${ttiLabel}`;
        }
      }

      const isHudClickedRecently = (elapsedTime - lastHudClickWakeTime) < 2.8;
      const hasHudAlert =
        hazardAlertActive ||
        bestPull > 0.03 ||
        bestWarn > 0.02 ||
        fuelLevel < 0.30 ||
        fuelRefuelFlash > 0;
      const shouldHideHud =
        hudAutoDim &&
        !hudUiHovered &&
        !isHudClickedRecently &&
        !hasHudAlert;
      hudEl?.classList.toggle('dimmed', shouldHideHud);

      const progressRatio = 1 - remainingFraction;
      const remainingLY = (remainingWorld / MILKY_WAY_TRAVEL_DIST) * MILKY_WAY_DISPLAY_LY;
      const speedUnits = Math.round(Math.abs(camVel));
      const etaSpeed = Math.max(baseSpeed, Math.abs(camVel));
      const etaSeconds = remainingWorld / etaSpeed;

      if (hudDistEl) {
        hudDistEl.textContent = mwArrived
          ? '0.000 ly'
          : `${remainingLY.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ly`;
      }
      if (hudEtaEl) {
        hudEtaEl.textContent = mwArrived ? '0 s (Arrived)' : formatRealDuration(etaSeconds);
      }
      if (hudFillEl) {
        hudFillEl.style.width = `${(progressRatio * 100).toFixed(3)}%`;
      }
      if (hudPctEl) {
        hudPctEl.textContent = mwArrived ? '100.000%' : `${(progressRatio * 100).toFixed(3)}%`;
      }
      if (hudSpeedEl) {
        hudSpeedEl.textContent = `${speedUnits.toLocaleString('en-US')} u/s`;
      }

      if (hudBoostStateEl && hudBoostPctEl && hudBoostFillEl) {
        const boostPct = Math.round(boostEnergy * 100);
        hudBoostPctEl.textContent = `${boostPct}%`;
        hudBoostFillEl.style.width = `${boostPct}%`;

        hudBoostStateEl.classList.remove('boosting', 'cooldown');
        hudBoostFillEl.classList.remove('boosting', 'cooldown');

        if (fuelLevel <= 0.001) {
          hudBoostStateEl.textContent = 'NO FUEL · BOOST LOCKED';
          hudBoostStateEl.classList.add('cooldown');
          hudBoostFillEl.classList.add('cooldown');
        } else if (impactSlowdownTimer > 0.35) {
          hudBoostStateEl.textContent = 'IMPACT DRAG · SLOWED';
          hudBoostStateEl.classList.add('cooldown');
          hudBoostFillEl.classList.add('cooldown');
        } else if (isBoosting) {
          hudBoostStateEl.textContent = 'MAX SPEED BURST';
          hudBoostStateEl.classList.add('boosting');
          hudBoostFillEl.classList.add('boosting');
        } else if (boostCooldown) {
          hudBoostStateEl.textContent = 'RECHARGING (AVG)';
          hudBoostStateEl.classList.add('cooldown');
          hudBoostFillEl.classList.add('cooldown');
        } else if (boostEnergy < 0.999) {
          hudBoostStateEl.textContent = 'RECHARGING MAX';
        } else {
          hudBoostStateEl.textContent = 'MAX SPEED READY';
        }
      }

      if (hudFuelStateEl && hudFuelPctEl && hudFuelFillEl) {
        const fuelPct = Math.round(fuelLevel * 100);
        hudFuelPctEl.textContent = `${fuelPct}%`;
        hudFuelFillEl.style.width = `${fuelPct}%`;

        hudFuelStateEl.classList.remove('drain', 'low', 'critical', 'refuel');
        hudFuelFillEl.classList.remove('low', 'critical');

        if (fuelRefuelFlash > 0) {
          hudFuelStateEl.textContent = 'REFUELED (+40%)';
          hudFuelStateEl.classList.add('refuel');
        } else if (fuelLevel <= 0.001) {
          hudFuelStateEl.textContent = 'DEPLETED · RESERVE';
          hudFuelStateEl.classList.add('critical');
          hudFuelFillEl.classList.add('critical');
        } else if (fuelLevel < 0.20) {
          hudFuelStateEl.textContent = 'FUEL · CRITICAL';
          hudFuelStateEl.classList.add('critical');
          hudFuelFillEl.classList.add('critical');
        } else if (fuelLevel < 0.40) {
          hudFuelStateEl.textContent = 'FUEL · LOW';
          hudFuelStateEl.classList.add('low');
          hudFuelFillEl.classList.add('low');
        } else if (isBoosting) {
          hudFuelStateEl.textContent = 'FUEL · BOOST DRAIN';
          hudFuelStateEl.classList.add('drain');
        } else {
          hudFuelStateEl.textContent = 'FUEL · NOMINAL';
        }
      }

      const cx = Math.floor(camLocalReused.x / OBJECT_CHUNK_SIZE);
      const cy = Math.floor(camLocalReused.y / OBJECT_CHUNK_SIZE);
      const cz = Math.floor(camLocalReused.z / OBJECT_CHUNK_SIZE);
      const curRegion = getRegionType(cx, cy, cz);

      if (hudRegionEl) {
        hudRegionEl.classList.remove('pillars', 'void', 'nebula');
        if (smoothVoidFactor > 0.35 || curRegion === 'dark_void') {
          hudRegionEl.textContent = 'Dark Void';
          hudRegionEl.classList.add('void');
        } else if (curRegion === 'pillars_of_creation') {
          hudRegionEl.textContent = 'Pillars of Creation';
          hudRegionEl.classList.add('pillars');
        } else if (curRegion === 'colossal_nebula') {
          hudRegionEl.textContent = 'Colossal Nebula';
          hudRegionEl.classList.add('nebula');
        } else if (curRegion === 'dark_dust') {
          hudRegionEl.textContent = 'Dark Dust Rift';
          hudRegionEl.classList.add('void');
        } else {
          hudRegionEl.textContent = 'Deep Space';
        }
      }

      if (hudGravityRowEl && hudGravityStateEl && hudGravityPctEl) {
        if (bestPull > 0.03) {
          const pullPct = Math.min(100, Math.round(bestPull * 100));
          hudGravityRowEl.classList.add('active');
          hudGravityRowEl.classList.remove('warning');
          hudGravityRowEl.classList.toggle('critical', bestPull > 0.6);
          hudGravityStateEl.textContent = bestPull > 0.6 ? 'CRITICAL SUCTION' : 'GRAVITY PULL';
          hudGravityPctEl.textContent = `${pullPct}%`;
        } else if (bestWarn > 0.02) {
          hudGravityRowEl.classList.add('active', 'warning');
          hudGravityRowEl.classList.remove('critical');
          hudGravityStateEl.textContent = 'SINGULARITY NEARBY';
          hudGravityPctEl.textContent = `${(nearestWarnDist / 1000).toFixed(1)}k u`;
        } else {
          hudGravityRowEl.classList.remove('active', 'warning', 'critical');
        }
      }

      camera.getWorldDirection(camFwdVec);
      camRightVec.crossVectors(camFwdVec, worldUp);
      if (camRightVec.lengthSq() < 1e-6) camRightVec.set(1, 0, 0);
      camRightVec.normalize();
      camUpVec.crossVectors(camRightVec, camFwdVec).normalize();

      if (hudFuelBearingEl && hudFuelArrowEl && hudFuelNodeDistEl) {
        if (!bestFuelNode) {
          hudFuelBearingEl.classList.remove('aligned');
          hudFuelBearingEl.classList.add('none');
          hudFuelNodeDistEl.textContent = 'SCANNING';
          hudFuelArrowEl.style.transform = 'rotate(0deg)';
        } else {
          hudFuelBearingEl.classList.remove('none');
          const distWorld = bestFuelDistLocal * U;
          const distLabel = distWorld >= 1000
            ? `${(distWorld / 1000).toFixed(1)}k u`
            : `${Math.round(distWorld)} u`;
          toFuelNode.copy(bestFuelNode.localPos).sub(curShipLocal).normalize();
          const fFwd = toFuelNode.dot(camFwdVec);
          const fRight = toFuelNode.dot(camRightVec);
          const fUp = toFuelNode.dot(camUpVec);

          if (fFwd > 0.985) {
            hudFuelBearingEl.classList.add('aligned');
            hudFuelNodeDistEl.textContent = distLabel;
            hudFuelArrowEl.style.transform = 'rotate(0deg)';
          } else {
            hudFuelBearingEl.classList.remove('aligned');
            let fAngle = THREE.MathUtils.radToDeg(Math.atan2(fRight, fUp));
            if (fFwd < 0 && Math.hypot(fRight, fUp) < 0.18) {
              fAngle = fRight >= 0 ? 90 : -90;
            }
            hudFuelArrowEl.style.transform = `rotate(${fAngle.toFixed(1)}deg)`;
            hudFuelNodeDistEl.textContent = distLabel;
          }
        }
      }

      if (hudArrowEl && hudAlignEl && hudBearingEl) {
        if (mwArrived) {
          hudBearingEl.classList.add('aligned');
          hudAlignEl.textContent = 'ARRIVED';
          hudArrowEl.style.transform = 'rotate(0deg)';
        } else {
          toMilkyWay.copy(mwAnchorWorldPos).sub(shipPos).normalize();
          const fwdDot = toMilkyWay.dot(camFwdVec);
          const rightDot = toMilkyWay.dot(camRightVec);
          const upDot = toMilkyWay.dot(camUpVec);

          if (fwdDot > 0.985) {
            hudBearingEl.classList.add('aligned');
            hudAlignEl.textContent = 'ON COURSE';
            hudArrowEl.style.transform = 'rotate(0deg)';
          } else {
            hudBearingEl.classList.remove('aligned');
            const degOff = Math.round(THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(fwdDot, -1, 1))));
            let screenAngle = THREE.MathUtils.radToDeg(Math.atan2(rightDot, upDot));
            if (fwdDot < 0 && Math.hypot(rightDot, upDot) < 0.18) {
              screenAngle = rightDot >= 0 ? 90 : -90;
              hudAlignEl.textContent = `BEHIND ${degOff}°`;
            } else {
              hudAlignEl.textContent = `${degOff}°`;
            }
            hudArrowEl.style.transform = `rotate(${screenAngle.toFixed(1)}deg)`;
          }
        }
      }
    }

    audioEngine.setSilent(false);

    bgWorldCamPos.copy(shipPos).sub(universe.position);
    if (!bgHasPrevPos) {
      bgPrevWorldCamPos.copy(bgWorldCamPos);
      bgHasPrevPos = true;
    }
    if (dt > 0.0001) {
      bgInstVel.copy(bgWorldCamPos).sub(bgPrevWorldCamPos).divideScalar(dt);
      const velAlpha = 1 - Math.exp(-8 * dt);
      bgSmoothVel.lerp(bgInstVel, velAlpha);
    }
    bgPrevWorldCamPos.copy(bgWorldCamPos);
    bgStarfield.update(
      elapsedTime,
      bgWorldCamPos,
      camera.position,
      bgSmoothVel,
      renderer.getPixelRatio(),
      smoothVoidFactor
    );

    renderer.render(scene, camera);
  }

  animateCosmos();
}