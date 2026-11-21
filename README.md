# Space Simulation

Simulación espacial interactiva y procedural creada con [Three.js](https://threejs.org/) y TypeScript. La experiencia comienza frente a un agujero negro generado con WebGL/GLSL, permite cruzar su horizonte de sucesos y continúa en un universo 3D libre, donde es posible explorar objetos cósmicos, viajar hacia un agujero de gusano y atravesarlo.

**Demo:** [space-simulator-xklw.onrender.com](https://space-simulator-xklw.onrender.com/)

> El proyecto no utiliza texturas externas ni modelos descargados: estrellas, galaxias, nebulosas y otros fenómenos se generan proceduralmente en el navegador.

## Características

- **Agujero negro WebGL:** disco de acreción animado, lente gravitacional, anillo de fotones, horizonte deformado y efectos de entrada al canal.
- **Universo 360°:** navegación libre en Three.js dentro de una escena procedural con sistemas de partículas, sprites y shaders personalizados.
- **Landmarks astronómicos:** galaxias espirales, barredas, lenticulares, elípticas y irregulares, cúmulos, nebulosas, púlsares, cuásares, supernovas, magnetars, agujeros negros y otros fenómenos.
- **Pilares de la Creación:** landmark garantizado dentro del mundo procedural.
- **Vacío de Boötes:** región oscura y determinista con una densidad astronómica muy reducida.
- **Exploración infinita:** sectores y objetos se generan por chunks alrededor de la cámara para mantener el mundo abierto sin cargar todos los elementos a la vez.
- **Destino a la Vía Láctea:** navegación guiada por HUD con rumbo, distancia, ETA, progreso, velocidad y combustible.
- **Agujeros de gusano:** regiones visuales con atracción gravitacional, turbulencia y secuencia de tránsito hacia un espacio negro.
- **Singularidades:** objetos gravitacionales con efecto de aproximación, pantalla de atracción y opción de expulsión.
- **Sistema de cámara:** modos en primera persona y gran angular.
- **Ambiente sonoro espacial:** motor Web Audio procedural con sonido ambiental, reverberación, controles de activación y silencio.
- **Interfaz adaptativa:** HUD de navegación, proximidad de asteroides, estado gravitatorio y nodos de combustible.
- **Accesibilidad:** soporte básico para `prefers-reduced-motion` y controles visibles con botones semánticos.

## Controles

### Fase del agujero negro

| Entrada | Acción |
| --- | --- |
| Mouse | Dirigir la vista |
| Rueda hacia abajo / `↑` | Aproximarse |
| Rueda hacia arriba / `↓` | Alejarse |
| `←` / `→` | Mover la vista lateralmente |

Al acercarte suficientemente al horizonte, la escena 3D toma el control.

### Exploración en el cosmos

| Entrada | Acción |
| --- | --- |
| Click izquierdo + arrastrar / toque + arrastrar | Mirar alrededor |
| `W` / `↑` | Volar hacia adelante |
| `S` / `↓` | Volar hacia atrás |
| `A` / `D` o `←` / `→` | Girar o desplazarse lateralmente |
| `Shift` | Impulsar / boost |
| `1` | Cámara en primera persona |
| `3` | Cámara gran angular |
| `H` | Activar/desactivar auto-ocultado del HUD |
| `M` | Activar/silenciar el sonido |
| Rueda hacia arriba | Volver hacia el agujero negro |

Dirígete a un agujero de gusano para iniciar su tránsito. Durante la secuencia, los controles quedan bloqueados temporalmente.

## Tecnologías

- **Vite** — servidor de desarrollo y empaquetado
- **TypeScript** — lógica de la aplicación
- **Three.js** — escena 3D, objetos y navegación
- **WebGL / GLSL** — efecto principal del agujero negro y shaders de fondo
- **Web Audio API** — ambiente sonoro generado en tiempo real
- **HTML y CSS** — interfaz, HUD y overlays

## Requisitos

- Node.js 18 o superior
- npm
- Navegador moderno con soporte para WebGL y Web Audio

## Instalación y ejecución

```bash
git clone https://github.com/RobertinoLirusso/space-sim.git
cd space-sim
npm install
npm run dev
```

Vite iniciará el servidor en `http://localhost:3000`.

Para crear y probar una compilación de producción:

```bash
npm run build
npm run preview
```

Los archivos finales se generan en `dist/` y pueden desplegarse en cualquier hosting estático.

## Scripts disponibles

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia Vite en `0.0.0.0:3000` |
| `npm run build` | Ejecuta la comprobación de TypeScript y genera `dist/` |
| `npm run lint` | Ejecuta `tsc --noEmit` |
| `npm run preview` | Sirve localmente la compilación de producción |

## Estructura del proyecto

```text
.
├── index.html
├── package.json
├── vite.config.ts
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.ts          Punto de entrada de la experiencia
    ├── loader.ts        Pantalla de carga inicial
    ├── blackhole.ts     Renderizado WebGL y transición del agujero negro
    ├── cosmos.ts        Universo Three.js, navegación, landmarks y chunks
    ├── starfield.ts     Campo estelar, nebulosas y streaks de velocidad
    ├── milkyway.ts      Representación y transición hacia la Vía Láctea
    ├── audio.ts         Motor de audio ambiental Web Audio
    ├── style.css        Estilos generales y de la interfaz
    ├── shaders/
    │   └── blackhole.frag
    └── assets/
```

## Arquitectura general

- `main.ts` inicializa la pantalla de carga, el agujero negro y la escena cósmica.
- `blackhole.ts` dibuja un quad a pantalla completa con WebGL y controla zoom, orientación y transición hacia Three.js mediante uniforms del fragment shader.
- `cosmos.ts` crea la escena 360°, genera regiones por chunks y administra navegación, landmarks, agujeros negros, wormholes, combustible y eventos gravitacionales.
- `starfield.ts` mantiene varias capas de estrellas con parallax, nebulosas distantes y estelas asociadas a la velocidad.
- `milkyway.ts` dibuja el destino lejano y adapta su representación según la posición y distancia de la cámara.
- `audio.ts` crea los osciladores, ruido, filtros y reverberación del ambiente sonoro.

## Rendimiento

La experiencia puede requerir una GPU y CPU modernas debido a la cantidad de objetos, partículas y efectos de pantalla completa.

- Ajusta `renderer.setPixelRatio` en `src/cosmos.ts` para cambiar la resolución de renderizado.
- Reduce los tamaños de las capas y los counts de objetos dentro de `src/starfield.ts` y `src/cosmos.ts`.
- Desactiva o limita el uso de `Shift` si el hardware no mantiene una tasa estable de fotogramas.
- Usa el modo gran angular o reduce la pestaña gráfica del navegador para evaluar escenas con menos presión visual.

La simulación usa cantidades ilustrativas y no representa distancias, tamaños o distribuciones astronómicas a escala física.

## Licencia

No se ha definido una licencia en el repositorio actualmente.
