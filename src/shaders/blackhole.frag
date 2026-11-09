precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_zoom;
varying vec2 v_uv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash2(vec2 p) {
  float n = sin(dot(p, vec2(41.0, 289.0)));
  return fract(vec2(262144.0, 32768.0) * n);
}

vec3 denseHawkingSwarm(vec2 uv, float t) {
  vec2 gv = fract(uv) - 0.5;
  vec2 id = floor(uv);
  vec3 accum = vec3(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 currentId = id + neighbor;
      vec2 rnd = hash2(currentId);

      if (rnd.x > 0.82) continue;

      float speed = 0.8 + rnd.y * 2.2;
      float orbitRad = 0.12 + rnd.x * 0.22;
      vec2 offsetPos = neighbor + vec2(
        sin(t * speed + rnd.x * 6.2831) * orbitRad,
        cos(t * speed * 1.1 + rnd.y * 6.2831) * orbitRad
      );

      vec2 delta = gv - offsetPos;
      float d = length(delta);

      float pulseFreq = 3.0 + rnd.y * 7.5;
      float phaseShift = rnd.x * 12.56;
      float blink = sin(t * pulseFreq + phaseShift);
      blink = smoothstep(0.1, 0.95, blink);

      float sizeExponent = mix(38.0, 110.0, rnd.y);
      float coreExp = mix(90.0, 260.0, rnd.x);

      float glow = exp(-d * sizeExponent) * blink;
      float pinCore = exp(-d * coreExp) * blink * 1.5;

      vec3 pWhite = vec3(1.0, 1.0, 1.0);
      vec3 pBlue = vec3(0.35, 0.75, 1.0);
      vec3 pViolet = vec3(0.82, 0.40, 1.0);

      vec3 pColor = mix(pBlue, pViolet, rnd.x);
      pColor = mix(pColor, pWhite, smoothstep(0.55, 1.0, rnd.y));

      accum += (pColor * glow * 1.4 + pWhite * pinCore * 2.2);
    }
  }
  return accum;
}

vec3 renderAbyssStarLayer(vec2 uv, float t, float layerScale, float blinkSpeedMult, float density) {
  vec2 st = uv * layerScale;
  vec2 gv = fract(st) - 0.5;
  vec2 id = floor(st);

  vec3 starsCol = vec3(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellId = id + neighbor;
      vec2 rnd = hash2(cellId * 13.17 + vec2(7.3, 29.8));
      float rnd3 = hash(cellId * 23.41 + vec2(11.9, 4.3));

      if (rnd.x > density) continue;

      vec2 starPos = neighbor + (rnd - 0.5) * 0.76;
      vec2 delta = gv - starPos;
      float d = length(delta);

      float freq = (1.5 + rnd.y * 3.8) * blinkSpeedMult;
      float phase = rnd.x * 6.2831 + rnd3 * 12.56;
      float twinkle = sin(t * freq + phase);
      twinkle = clamp(twinkle * 0.5 + 0.5, 0.0, 1.0);
      float twinkleSharp = pow(twinkle, 2.5);

      float pinCore = exp(-d * 380.0) * (0.8 + 1.2 * twinkleSharp);
      float innerGlow = exp(-d * 75.0) * (0.3 + 0.9 * twinkleSharp);
      float outerHalo = exp(-d * 24.0) * (0.08 + 0.35 * twinkleSharp);

      float crossRays = 0.0;
      if (rnd.y > 0.65) {
        float rayLen = 0.065 * twinkleSharp;
        float rayX = exp(-abs(delta.y) * 450.0) * smoothstep(rayLen, 0.0, abs(delta.x));
        float rayY = exp(-abs(delta.x) * 450.0) * smoothstep(rayLen, 0.0, abs(delta.y));
        crossRays = (rayX + rayY) * 0.45 * (rnd.y - 0.65) * 2.8;
      }

      vec3 colWhite = vec3(1.0, 1.0, 1.0);
      vec3 colWarmGold = vec3(1.0, 0.92, 0.72);
      vec3 colSoftBlue = vec3(0.85, 0.94, 1.0);

      vec3 starHue = mix(colWhite, colWarmGold, smoothstep(0.4, 0.95, rnd.y));
      if (rnd3 > 0.6) {
        starHue = mix(starHue, colSoftBlue, (rnd3 - 0.6) * 2.5);
      }

      starsCol += (starHue * (pinCore * 2.4 + innerGlow * 1.1 + outerHalo * 0.4 + crossRays * 1.2));
    }
  }
  return starsCol;
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

vec3 renderDeepAbyssStarfield(vec2 uv, float t) {
  vec3 layer1 = renderAbyssStarLayer(uv, t, 18.0, 1.0, 0.85);
  vec2 off2 = vec2(3.14, 8.2);
  vec3 layer2 = renderAbyssStarLayer(uv + off2, t, 28.0, 1.4, 0.75);
  vec3 layer3 = renderAbyssStarLayer(uv * 1.2 + vec2(-4.5, 12.1), t, 12.0, 0.8, 0.60);

  return layer1 * 0.75 + layer2 * 0.9 + layer3 * 1.2;
}

void main() {
  vec2 st = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);

  float prog = clamp(u_zoom, 0.0, 1.0);

  float timeSpeed = mix(1.0, 0.03, pow(prog, 1.8));
  float effectiveTime = u_time * 2.2 * timeSpeed;
  float cosmicTime = u_time * 1.5;

  float zoomScale = mix(1.0, 3.8, pow(prog, 1.4));
  vec2 pos = st / zoomScale;

  float idleT = effectiveTime * 0.85;
  vec2 intrinsicWarpOffset = vec2(
    sin(idleT * 1.3) * 0.09 + cos(idleT * 2.1) * 0.04,
    cos(idleT * 1.1) * 0.08 + sin(idleT * 1.7) * 0.05
  );

  vec2 activeOffset = (u_offset + intrinsicWarpOffset);
  vec2 mPos = activeOffset / zoomScale;
  vec2 toOffset = pos - mPos;
  float distOffset = length(toOffset);
  float offsetMagnitude = length(activeOffset);
  float offsetAngle = atan(mPos.y, mPos.x);

  float tidal = exp(-distOffset * 2.2) * (0.28 + offsetMagnitude * 0.42);
  vec2 tidalPull = normalize(toOffset + vec2(1e-4)) * tidal;
  vec2 swirlOffset = vec2(-toOffset.y, toOffset.x) * (smoothstep(1.1, 0.02, distOffset) * (0.22 + offsetMagnitude * 0.35));

  vec2 warpedSt = pos - tidalPull + swirlOffset;

  vec2 starSt = st + u_offset * 0.12;
  vec3 abyssStarfield = renderDeepAbyssStarfield(starSt, cosmicTime);

  float starfieldArrival = smoothstep(0.85, 0.99, prog);

  if (prog >= 0.999) {
    gl_FragColor = vec4(abyssStarfield * 0.15, 0.1);
    return;
  }

  abyssStarfield += milkyWayBand(starSt) * (1.0 - smoothstep(0.9, 0.999, prog));

  vec2 diskSt = vec2(warpedSt.x, warpedSt.y * 1.55);
  float diskR = length(diskSt);
  float diskAngle = atan(diskSt.y, diskSt.x);

  float r = length(warpedSt);
  float angle = atan(warpedSt.y, warpedSt.x);

  float harmonic1 = sin(2.0 * angle - effectiveTime * 1.6 + offsetAngle) * 0.038;
  float harmonic2 = cos(3.0 * angle + effectiveTime * 2.2) * 0.024;
  float harmonic3 = sin(5.0 * angle - effectiveTime * 3.4) * 0.015;

  float reactiveDip = cos(angle - offsetAngle) * (0.07 * min(1.2, offsetMagnitude * 1.8 + 0.15));
  float reactiveQuad = cos(2.0 * (angle - offsetAngle)) * (0.05 * min(1.0, offsetMagnitude * 1.5 + 0.1));

  float horizonRipples = sin(effectiveTime * 3.0 - r * 16.0) * 0.018;

  float totalDeform = harmonic1 + harmonic2 + harmonic3 + reactiveDip + reactiveQuad + horizonRipples;

  float baseRadius = mix(0.34, 0.76, pow(prog, 1.2));
  float dynamicHorizon = max(0.08, baseRadius + totalDeform);

  float waveDist = abs(r - dynamicHorizon);
  float ambientWavePhase = effectiveTime * 3.5 - waveDist * 32.0;
  float ambientRipples = pow(clamp(cos(ambientWavePhase), 0.0, 1.0), 6.0) * exp(-waveDist * 3.8);

  float flashWindow = smoothstep(0.70, 0.92, prog) * (1.0 - smoothstep(0.965, 0.995, prog));
  float flashIntensity = pow(flashWindow, 1.1) * 5.2;

  float shockPhase = effectiveTime * 9.0 - waveDist * 44.0;
  float shockRipples = pow(clamp(cos(shockPhase), 0.0, 1.0), 9.0) * exp(-waveDist * 4.2);
  float shockRipples2 = pow(clamp(sin(effectiveTime * 14.0 - waveDist * 78.0), 0.0, 1.0), 12.0) * exp(-waveDist * 6.5);
  float shockwaveBurst = (shockRipples * 2.2 + shockRipples2 * 1.5) * flashIntensity;

  float permanentFlares = pow(clamp(cos(angle * 8.0 + effectiveTime * 3.0), 0.0, 1.0), 18.0) * 1.4
                        + pow(clamp(sin(angle * 14.0 - effectiveTime * 4.5), 0.0, 1.0), 22.0) * 1.6
                        + pow(clamp(cos(angle * 24.0 + effectiveTime * 6.0), 0.0, 1.0), 32.0) * 1.1;

  float flashRays = pow(clamp(cos(angle * 12.0 + effectiveTime * 6.0), 0.0, 1.0), 14.0) * 0.5
                  + pow(clamp(sin(angle * 8.0 - effectiveTime * 4.0), 0.0, 1.0), 10.0) * 0.4;
  float flashHalo = exp(-r * 3.2) * 1.8;
  float flashHorizonBurst = exp(-pow(abs(r - dynamicHorizon) * 40.0, 2.0)) * 3.5;

  vec3 stellarBlue = vec3(0.24, 0.65, 1.0);
  vec3 cosmicViolet = vec3(0.74, 0.28, 1.0);
  vec3 pureWhite = vec3(0.96, 0.98, 1.0);
  vec3 goldSparkle = vec3(1.0, 0.88, 0.58);

  float colorMix = 0.5 + 0.5 * sin(angle * 2.0 + effectiveTime * 2.0);
  vec3 flashHue = mix(cosmicViolet, stellarBlue, colorMix);

  vec3 circularWavesColor = mix(stellarBlue, cosmicViolet, clamp(0.5 + 0.5 * sin(ambientWavePhase), 0.0, 1.0)) * ambientRipples * 1.8;
  vec3 shockColor = mix(flashHue, pureWhite, clamp(shockRipples * 0.7, 0.0, 0.85)) * shockwaveBurst;

  vec3 circleFlaresColor = mix(goldSparkle, pureWhite, clamp(permanentFlares * 0.5, 0.0, 1.0)) * permanentFlares * exp(-pow(abs(r - dynamicHorizon) * 35.0, 2.0)) * 1.8;

  vec3 flashColor = mix(flashHue, pureWhite, clamp(flashIntensity * 0.35, 0.0, 0.95));
  vec3 totalFlash = flashColor * (flashIntensity * (flashHalo + flashHorizonBurst + flashRays * flashIntensity)) + shockColor;

  float darkeningFactor = smoothstep(0.995, 0.70, prog);
  darkeningFactor = pow(darkeningFactor, 1.3);

  float abyssSparkFactor = smoothstep(0.04, 0.40, prog) * (1.0 - smoothstep(0.92, 0.985, prog));
  vec3 abyssSparksTotal = vec3(0.0);

  if (abyssSparkFactor > 0.001) {
    float abyssMask = smoothstep(dynamicHorizon, dynamicHorizon * 0.94, r);

    if (abyssMask > 0.001) {
      float abyssSpin = effectiveTime * 0.22 + prog * 0.6;
      mat2 rot1 = mat2(cos(abyssSpin), -sin(abyssSpin), sin(abyssSpin), cos(abyssSpin));
      mat2 rot2 = mat2(cos(-abyssSpin * 1.3), -sin(-abyssSpin * 1.3), sin(-abyssSpin * 1.3), cos(-abyssSpin * 1.3));
      mat2 rot3 = mat2(cos(abyssSpin * 0.7 + 1.2), -sin(abyssSpin * 0.7 + 1.2), sin(abyssSpin * 0.7 + 1.2), cos(abyssSpin * 0.7 + 1.2));

      float baseDensityScale = 28.0 + prog * 24.0;
      vec2 uv1 = rot1 * (warpedSt * baseDensityScale) + vec2(effectiveTime * 0.12, -effectiveTime * 0.09);
      vec2 uv2 = rot2 * (warpedSt * (baseDensityScale * 1.55)) + vec2(-effectiveTime * 0.16, effectiveTime * 0.14) + vec2(7.3, 19.1);
      vec2 uv3 = rot3 * (warpedSt * (baseDensityScale * 2.1)) + vec2(effectiveTime * 0.08, effectiveTime * 0.18) + vec2(14.8, 3.4);

      vec3 swarm1 = denseHawkingSwarm(uv1, effectiveTime * 1.8);
      vec3 swarm2 = denseHawkingSwarm(uv2, effectiveTime * 2.3 + 5.7);
      vec3 swarm3 = denseHawkingSwarm(uv3, effectiveTime * 2.9 + 11.2);

      vec3 combinedSwarm = swarm1 * 1.0 + swarm2 * 0.85 + swarm3 * 0.7;
      abyssSparksTotal = combinedSwarm * abyssSparkFactor * abyssMask * 1.6;
    }
  }

  if (r <= dynamicHorizon) {
    vec3 interiorContent = abyssSparksTotal + (abyssStarfield * starfieldArrival);
    if (flashIntensity > 0.01) {
      gl_FragColor = vec4(totalFlash * darkeningFactor + interiorContent, 1.0);
      return;
    }
    gl_FragColor = vec4(interiorContent, 1.0);
    return;
  }

  float dist = r - dynamicHorizon;
  float gravityWell = 1.0 / max(dist + 0.035, 0.001);

  float orbitalVel = sin(diskAngle);
  float dopplerFactor = clamp(1.0 - orbitalVel * 0.68, 0.25, 2.8);
  float dopplerBoost = pow(dopplerFactor, 2.8);

  float diskDist = diskR - dynamicHorizon;
  float flow = log(max(dist, 0.0003)) * 4.6 - effectiveTime * 2.2 - gravityWell * 0.4;
  float spiralTwist = (1.6 / (dist + 0.015)) + (gravityWell * 0.16);
  float spiralAngle = angle + spiralTwist - effectiveTime * 2.6;

  float photonCore = exp(-pow(abs(dist - 0.004) * 240.0, 2.0)) * 4.0;
  float photonInnerHalo = exp(-pow(abs(dist - 0.008) * 95.0, 2.0)) * 2.0;
  float photonGlow = exp(-dist * 60.0) * 0.9;
  float totalPhotonRing = (photonCore + photonInnerHalo + photonGlow);

  float diskDensity = smoothstep(0.0, 0.04, diskDist) * (1.0 - smoothstep(0.38, 0.88, diskR));
  float diskSpiral1 = pow(clamp(sin(flow * 14.0 + spiralAngle * 3.0), 0.0, 1.0), 45.0);
  float diskSpiral2 = pow(clamp(cos(flow * 20.0 - spiralAngle * 4.0), 0.0, 1.0), 65.0);
  float diskRibbons = pow(clamp(sin(diskAngle * 5.0 + flow * 8.0 - effectiveTime * 4.0), 0.0, 1.0), 30.0);
  float accretionDisk = (diskSpiral1 * 0.9 + diskSpiral2 * 1.1 + diskRibbons * 0.75) * diskDensity;

  float lensedRing = exp(-pow(abs(r - (dynamicHorizon + 0.075)) * 40.0, 2.0)) * 0.45 * smoothstep(-0.2, 0.8, -warpedSt.y);

  float stretchFactor = clamp(1.0 + gravityWell * 0.15, 1.0, 4.5);
  float sparkAngle1 = spiralAngle * 12.0 + flow * 9.0;
  float sparkRadial1 = sin(flow * (14.0 / stretchFactor));
  float sparkRaw1 = pow(clamp(sin(sparkAngle1) * sparkRadial1, 0.0, 1.0), 45.0);

  float sparkAngle2 = spiralAngle * 18.0 - flow * 13.0;
  float sparkRadial2 = cos(flow * (20.0 / stretchFactor));
  float sparkRaw2 = pow(clamp(cos(sparkAngle2) * sparkRadial2, 0.0, 1.0), 55.0);

  float heating = 1.0 + exp(-dist * 16.0) * 2.2;
  float sparks = (sparkRaw1 * 3.8 + sparkRaw2 * 4.2) * heating;
  float sparksHalo = (pow(clamp(sin(sparkAngle1) * sparkRadial1, 0.0, 1.0), 16.0) + pow(clamp(cos(sparkAngle2) * sparkRadial2, 0.0, 1.0), 18.0)) * heating * 0.8;

  vec3 colBlueWhite = vec3(0.92, 0.96, 1.0);
  vec3 colBrightGold = vec3(1.0, 0.90, 0.65);
  vec3 colRedAmber = vec3(0.85, 0.38, 0.12);
  vec3 colDeepCrimson = vec3(0.55, 0.18, 0.05);

  vec3 dopplerColor = mix(colDeepCrimson, colRedAmber, smoothstep(0.2, 0.9, dopplerFactor));
  dopplerColor = mix(dopplerColor, colBrightGold, smoothstep(0.9, 1.6, dopplerFactor));
  dopplerColor = mix(dopplerColor, colBlueWhite, smoothstep(1.6, 2.5, dopplerFactor));
  dopplerColor = mix(dopplerColor, colDeepCrimson * 0.4, prog * 0.9);

  vec3 photonRingColor = mix(vec3(1.0, 0.88, 0.55), vec3(1.0, 1.0, 1.0), clamp(photonCore * 0.45, 0.0, 1.0));

  float outerFade = 1.0 - smoothstep(0.70, 1.05, r);
  float darkenEdge = smoothstep(0.0, 0.14, dist);

  vec3 ringEmission = photonRingColor * totalPhotonRing * darkenEdge;
  vec3 diskEmission = dopplerColor * accretionDisk * dopplerBoost * darkenEdge * outerFade * 1.7;
  vec3 lensEmission = dopplerColor * lensedRing * dopplerBoost * 0.6 * darkenEdge;
  vec3 sparkEmission = mix(colBrightGold, colBlueWhite, smoothstep(1.0, 2.0, dopplerFactor)) * (sparks + sparksHalo) * darkenEdge * outerFade * 1.8;

  vec3 emissionBase = (ringEmission + diskEmission + lensEmission + sparkEmission + circleFlaresColor + circularWavesColor) * darkeningFactor;
  vec3 finalColor = emissionBase + totalFlash * darkeningFactor + abyssSparksTotal + (abyssStarfield * starfieldArrival);

  gl_FragColor = vec4(finalColor, 1.0);
}