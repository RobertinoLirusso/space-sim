# Space Simulation

An interactive space journey that runs entirely in the browser. You start by looking at a relativistic black hole rendered in a GLSL shader, dive into its event horizon, and come out into a 360° cosmic panorama full of galaxies, nebulae and exotic objects. Out there you can fly freely, find a wormhole shaped like a storm, and get pulled through a turbulent tunnel that ends in a pitch-black abyss.

Built with **Vite**, **TypeScript**, **Three.js** and raw **WebGL / GLSL**. No backend, no assets: everything is procedural.

## Features

### Black hole (WebGL shader)
- Accretion disk with Doppler shift, photon ring and gravitational lensing
- Animated event horizon with ripples, flares and a shockwave flash when you cross it
- Hawking-style sparks swarming inside the horizon
- Layered twinkling starfield with a Milky Way band that fades in and out as you approach
- Mouse-driven steering and smooth zoom

### 360° cosmos (Three.js)
- Spiral, barred, elliptical, ring and irregular galaxies
- Globular clusters, a planetary nebula, emission and reflection clouds, filament nebulae and dark nebulae
- The Boötes Void: a vast, dark region with almost no stars
- Quasar with relativistic jets, pulsar, supernova remnant, gravitational lens arcs and a binary star with mass transfer
- Cosmic web of distant galaxy filaments
- Random supernova flashes, shooting stars and comets with dust and ion tails
- Free-flight camera with inertia

### Wormhole
- Storm-style wormhole: grey and blue spiral clouds around a black eye, with lightning
- Gravitational pull and camera turbulence that grow as you approach
- Dark tunnel with small tumbling meteorites and light streaks stretched by speed
- The trip ends in a completely black, empty abyss

## Controls

**Black hole phase**

| Input | Action |
| --- | --- |
| Mouse move | Steer the view |
| Mouse wheel (down) or `↑` | Move closer |
| Mouse wheel (up) or `↓` | Move away |
| `←` / `→` | Steer left / right |

**360° phase** (after crossing the event horizon)

| Input | Action |
| --- | --- |
| Click and drag / touch drag | Look around |
| `↑` | Fly forward |
| `↓` | Fly backward |
| `←` / `→` | Turn left / right |
| Mouse wheel (up) | Go back out to the black hole |

Fly toward the wormhole and it will pull you in. Once inside, controls are locked until the trip ends.

## Getting started

Requirements: Node.js 18 or newer and a browser with WebGL support.

```bash
git clone https://github.com/RobertinoLirusso/space-sim
cd space-simulation
npm install
npm run dev
```

Open the local URL printed by Vite.

To create a production build:

```bash
npm run build
npm run preview
```

The output goes to `dist/` and can be deployed to any static host (Vercel, Netlify, GitHub Pages).

## Project structure

```
index.html
src/
  main.ts                 Entry point
  style.css               Layout, loader and overlay styles
  loader.ts               Loading screen
  blackhole.ts            WebGL setup, input and zoom logic for the black hole
  cosmos.ts               Three.js 360° scene, objects, wormhole and tunnel
  shaders/
    blackhole.frag        Black hole fragment shader (GLSL)
  vite-env.d.ts           Vite client types (enables ?raw imports)
```

## How it works

- `blackhole.ts` draws a full-screen quad with the fragment shader and drives the `u_zoom` and `u_offset` uniforms from the wheel, keyboard and mouse.
- As the zoom approaches its maximum, a transparent Three.js canvas fades in on top and takes over the experience.
- `cosmos.ts` builds the whole sky procedurally with particles, sprites and small shaders, and handles navigation, the wormhole transit and the final abyss.

## Tips

- If the scene runs slowly, lower the particle counts in `cosmos.ts` (galaxies and `starCount`) or reduce the pixel ratio in the renderer setup.
- Shaders are imported as raw text with `?raw`, so edit `src/shaders/blackhole.frag` directly and Vite will hot-reload it.
