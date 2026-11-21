# Space Simulator

Space Simulator is an interactive, fully procedural space exploration experience built for the browser with Three.js and TypeScript. The simulation begins near a WebGL/GLSL-rendered black hole and evolves into a vast 360-degree cosmic environment that can be explored in free flight.

The project does not rely on downloaded models or external textures for its main environments. Stars, nebulae, galaxies, stellar systems, debris fields, and other astronomical structures are generated directly in the browser.

## Overview

Space Simulator combines real-time rendering, procedural generation, gravitational effects, navigation systems, ambient audio, and an interface designed for long-form exploration.

The experience is organized into multiple phases:

1. **Black hole approach** — steer toward an animated black hole rendered with a full-screen WebGL shader.
2. **Cosmic exploration** — enter a 360-degree Three.js universe and fly freely through procedural space.
3. **Deep-space navigation** — use the navigation HUD to travel toward distant destinations.
4. **Wormhole transit** — approach a main wormhole or other gravitational structures and cross into a tunnel sequence.
5. **Singularity state** — reach the event-horizon limit and eject back into deep space.

## Core Features

### Procedural Black Hole

- Full-screen GLSL rendering.
- Animated accretion disk.
- Doppler-style brightness variation.
- Photon ring and gravitational lensing effects.
- Rippled event horizon and flaring activity.
- Mouse-steering and smooth zoom controls.
- Smooth transition into the Three.js cosmic scene.
- Reduced-motion behavior based on the browser preference.

### 360-Degree Space Exploration

- Free-flight navigation inside a Three.js scene.
- Drag-to-look interaction for mouse and touch devices.
- Keyboard and touch-compatible movement controls.
- First-person and wide-angle camera modes.
- Camera inertia, banking, shake, and velocity-sensitive field-of-view changes.
- High-speed boost with acceleration and recharge behavior.
- Fuel consumption, reserve status, and fuel-node replenishment.
- Soft movement limits and safe repositioning for long sessions.

### Procedural Universe

The universe is assembled from seeded procedural chunks, allowing exploration to continue as the camera moves through space.

- Spiral galaxies.
- Barred spiral galaxies.
- Elliptical galaxies.
- Lenticular galaxies.
- Edge-on galaxies.
- Ring galaxies.
- Polar-ring galaxies.
- Flocculent and peculiar galaxies.
- Dwarf spheroidal galaxies.
- Interacting galaxies and galaxy groups.
- Galaxy clusters.
- Open and globular star clusters.
- Binary and triple-star systems.

### Nebulae and Interstellar Regions

- Emission nebulae.
- Reflection nebulae.
- Planetary nebulae.
- Bipolar nebulae.
- Colossal nebula regions.
- Pillars of Creation-inspired landmarks.
- Dark molecular clouds.
- Bok globules.
- Interstellar filaments.
- Photo-evaporating proplyds.
- Star-forming regions.
- H II regions.
- Dark dust regions and distant dust lanes.
- Procedural nebula billboards and animated cloud backdrops.

### Stellar and Compact Objects

- Quasars.
- Powerful blazars.
- Pulsars.
- Magnetars.
- Neutron stars.
- Wolf-Rayet clusters and bubbles.
- Luminous blue variables.
- Red supergiant shells.
- White dwarfs.
- White dwarf debris fields.
- Nova outbursts.
- Kilonova events.
- Supernova remnants.
- Tidal disruption events.
- Binary accretion systems.
- X-ray binary-style mass transfer systems.
- Einstein rings and gravitational lens arcs.
- Giant radio galaxies.
- Cosmic web filaments.

### Planetary and Debris Systems

- Ringed exoplanets.
- Planetary rings with separated bands.
- Icy moons.
- Asteroid belts.
- Protoplanetary systems.
- Accretion debris.
- Comets with separate dust and ion tails.
- Interstellar objects.
- Asteroid streams.
- Gas clouds.
- Flying debris hazard fields.

### Starfield and Deep-Space Background

- Four independent starfield depth layers.
- 360-degree parallax star wrapping.
- Star color palettes with blue, white, warm, amber, cyan, and magenta tones.
- Twinkling and brightness variation.
- Procedural nebula dome.
- Distant instanced nebula clouds.
- Speed streaks that become more prominent during flight.
- Random meteors and shooting stars.
- Periodic supernova flashes.
- Crossing comets and interstellar objects.
- Reduced visual density inside dark void regions.

## Navigation and HUD

The navigation interface provides real-time travel information throughout the cosmic phase.

- Destination bearing toward the Milky Way.
- Remaining distance in light years.
- Estimated travel time.
- Overall journey progress.
- Current flight speed.
- Max-speed recharge and boost status.
- Fuel reserve and depletion state.
- Direction and distance to the nearest fuel node.
- Current space-region label.
- Cinematic HUD auto-dimming.
- Full HUD mode.
- Asteroid and debris proximity warnings.
- Critical impact-risk indicators.
- Gravity pull and singularity proximity information.
- Milky Way arrival notification.
- Black hole singularity overlay.

The HUD can be left in automatic dimming mode or pinned to remain fully visible.

## Fuel and Flight Systems

- The ship consumes fuel while idle, thrusting, and boosting.
- Standard forward flight provides normal cruise speed.
- Sustained forward thrust activates a high-speed boost mode.
- Boost energy needs to recharge after depletion.
- Fuel nodes can be detected and collected during flight.
- Collecting a fuel node restores fuel and boost energy.
- Low fuel limits maximum speed and locks boost behavior.
- Asteroid and debris impacts temporarily slow the ship.
- Impact cooldown prevents repeated collision effects from triggering continuously.

## Black Holes and Gravitational Effects

The scene includes a main wormhole and secondary black holes placed across the universe.

Each gravitational object can provide:

- A visual event-horizon disk.
- A colored halo and accretion particles.
- Far-distance fading.
- Approach scaling.
- Turbulence range.
- Gravity pull range.
- Black hole-specific attraction strength.
- Camera compression and visual distortion near the event horizon.
- A throat or singularity threshold.
- Transit to the black-hole sequence.

When entering the main wormhole or another qualifying singularity:

- The cosmic scene is replaced by a transit sequence.
- Controls are locked temporarily.
- Tunnel particles and streaks accelerate toward the camera.
- A final flash and exit effect transition the simulation.
- The user arrives in a completely dark abyss.
- An overlay allows the user to eject back into deep space.

## Deep-Space Regions

### Boötes Void

A large, low-density region removes much of the surrounding visible stellar and galactic structure. The starfield and fog adapt as the camera enters and leaves it.

### Dark Void Regions

Additional seeded dark regions can absorb or heavily reduce local stars and objects. These regions include dark molecular clouds and void-specific visual masks.

### Pillars of Creation Region

A guaranteed procedural landmark contains:

- Ionized multicolor background gas.
- Dense dark molecular pillars.
- Illuminated photo-evaporating edges.
- Young stars and luminous star fields.
- Massive-region gravity and turbulence.

### Colossal Nebula Region

Large nebula sectors contain oversized gas clouds, bright cores, dark dust, and nearby massive objects.

### Dark Dust Region

Dark dust sectors combine molecular clouds, bright stars, and reduced environmental visibility.

## Procedural Chunk System

Large parts of the universe use a seeded chunk system:

- Active chunks surround the camera position.
- Distant chunks are unloaded as the player moves.
- Nearby nebula chunks stream independently from major object chunks.
- Region types are assigned deterministically.
- Chunk resources are disposed when they leave the active area.
- Objects are cleared from void regions and near the main wormhole.
- Fuel nodes are placed deterministically in reserved sectors.
- Collected fuel nodes remain collected after moving away and returning.

## Milky Way Destination

The final visual destination is a Milky Way plane placed extremely far from the starting position.

- It fades into view as the ship approaches.
- It is represented through a proxy position until the player is close enough.
- The HUD tracks the remaining distance and estimated arrival time.
- Progress is calculated from the original travel distance.
- The destination is visually aligned with the camera.
- Reaching the arrival threshold displays a destination overlay.
- The player can continue exploring after arrival.

## Ambient Audio

Space Simulator includes a procedural Web Audio engine that creates an ambient cosmic soundscape without external audio files.

The audio graph includes:

- Deep sub-cosmic oscillator tones.
- Slowly evolving harmonic voices.
- Spatial binaural beating.
- Pink-noise-based solar wind.
- A low-frequency interstellar breeze.
- Plasma-like band-pass noise.
- Stereo panning effects.
- Convolution reverb.
- Dynamic compression and limiting.
- Master volume control.
- Mute/unmute support.
- Automatic silence during singularity sequences and other special states.
- User-interaction-based audio unlocking for browser compatibility.

## Camera Modes

### First-Person View

- A narrow, focused field of view.
- Direct simulation of forward travel.
- Suitable for precise navigation and close-space maneuvers.

### Wide-Angle View

- A significantly wider field of view.
- Enhanced sense of scale and environmental coverage.
- Mild cinematic bank behavior.

Camera mode can be changed with the interface or keyboard controls.

## Keyboard and Mouse Controls

### Black Hole Entry

- Move the mouse to steer the shader view.
- Scroll down or press the up arrow to approach.
- Scroll up or press the down arrow to move away.
- Use left and right arrows to steer horizontally.

### Cosmic Exploration

- Click and drag or touch and drag to look around.
- Press up to fly forward.
- Press down to move backward or return toward the origin.
- Press left or right to turn.
- Press 1 or 3 to switch camera modes.
- Press C to cycle camera modes.
- Press H to toggle automatic HUD dimming.
- Press M to mute or unmute sound.

## Input and Accessibility

- Supports desktop mouse and keyboard interaction.
- Supports drag navigation on touch devices.
- Includes semantic HTML controls for the navigation interface.
- Honors reduced-motion preferences in the initial black-hole shader loop.
- Keeps controls inactive when the cosmic scene is not active.
- Displays immediate visual feedback for proximity, fuel, impact, and gravity states.

## Technical Implementation

- **Vite** provides the development server and production build pipeline.
- **TypeScript** manages application state, rendering setup, input, physics, and UI updates.
- **Three.js** renders the 360-degree universe and manages scene objects.
- **Raw GLSL** creates the black hole and many visual effects.
- **WebGL** renders the initial full-screen shader.
- **Canvas textures** provide procedural glow and nebula assets.
- **Shader materials** support background nebulae, starfields, black holes, and transit effects.
- **Instanced and particle geometry** render large-scale visual structures efficiently.
- **Chunk-based generation** keeps the open universe manageable.
- **Web Audio API** synthesizes the ambient soundtrack directly in the browser.
- **Responsive DOM overlays** display the HUD and modal states.

## Project Structure

```text
.
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.ts
    ├── loader.ts
    ├── blackhole.ts
    ├── cosmos.ts
    ├── starfield.ts
    ├── milkyway.ts
    ├── audio.ts
    ├── style.css
    ├── assets/
    │   └── procedural and template assets
    └── shaders/
        └── blackhole.frag
```

## Requirements

- Node.js 18 or newer.
- npm.
- A modern browser with WebGL support.
- A browser with Web Audio API support for the ambient soundtrack.
- A GPU capable of rendering Three.js scenes and particle-heavy procedural effects.

## Installation

```bash
git clone https://github.com/RobertinoLirusso/space-sim.git
cd space-sim
npm install
npm run dev
```

The Vite development server is configured to listen on port `3000`.

## Production Build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/` and can be deployed to any static hosting provider.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Starts Vite on `0.0.0.0:3000` |
| `npm run build` | Runs TypeScript validation and builds the project |
| `npm run lint` | Runs `tsc --noEmit` |
| `npm run preview` | Serves the production build locally |

## Performance

Space Simulator is visually intensive because it combines particles, procedural chunk generation, shaders, transparent sprites, multiple camera effects, and dynamic gravity calculations.

Performance can be adjusted by:

- Reducing the device pixel ratio in the Three.js renderer setup.
- Lowering starfield counts and particle densities.
- Reducing galaxy and nebula object counts.
- Lowering WebGL point sizes or active chunk radius.
- Reducing high-speed or boost shake effects.
- Using the wide-angle camera or lower-resolution browser mode on less capable devices.

The astronomical arrangements, scales, colors, and distances are artistic representations rather than physically accurate maps.
