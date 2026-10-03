# CLAUDE.md - AI Assistant Guide for Orbit-Bloom

## NOVA edition: current implementation

The game now uses 45-second survival sectors followed by a telegraphed two-phase boss. Defeating the boss advances `gameState.wave` (uncapped); `stageIndex` only selects one of four enemy phase tables. Do not use `stageIndex + 1` as the displayed sector number. The older descriptions below document the original game and are historical where they conflict with this section.

- `game/evolution.js`: XP pickups, 3-choice level upgrades, combo rewards, shields, orbit drones, NOVA and effects. `upgrading` freezes simulation until an explicit card/key choice. Upgrade ranks reset per run.
- `classes/Boss.js`: guardian movement, entry protection, telegraphed radial/aimed attacks, enraged phase, collision interface.
- `game/ui.js` and `src/index.html`: DOM title, HUD, accessible buttons, upgrade/pause/result panels; Canvas handles the world. UI updates in every game state.
- `tests/smoke.cjs`: browser functional checks. Serve `src/` with the README command, then `node tests/smoke.cjs`. Requires development-only Playwright and Chromium, supplied by the cloud image; no game runtime dependencies or build step.
- Keep gameplay changes modular and preserve desktop/touch parity. Test state transitions, reset behavior, and boss/upgrade edge cases with the browser suite.


This document provides comprehensive guidance for AI assistants working with the Orbit-Bloom codebase.

## Project Overview

**Orbit-Bloom** (オービット・ブルーム) is a minimalist survival shooter game built with pure HTML5 Canvas and vanilla JavaScript. The game features simple geometric shapes in a space-themed environment where players must survive escalating waves of enemies while both sides grow stronger through a progressive power system.

- **Type**: Browser-based HTML5 Canvas game
- **Genre**: Survival shooter / Bullet hell lite
- **Target Audience**: Casual players, beginner-friendly
- **Hosting**: GitHub Pages (static site)
- **License**: Boost Software License 1.0

## Repository Structure

```
Orbit-Bloom/
├── index.html          # GitHub Pages redirect stub (meta refresh → src/)
├── src/                # Source code directory
│   ├── index.html      # Main HTML entry point (canvas + HUD overlay)
│   ├── style.css       # Styling and layout (~120 lines)
│   └── js/             # Modular JavaScript files (ES6 modules)
│       ├── config.js   # Configuration constants and parameters
│       ├── main.js     # Entry point, canvas/DPR setup, game loop
│       ├── classes/    # Entity class definitions
│       │   ├── Player.js   # Player class with movement, auto-fire, dash
│       │   ├── Enemy.js    # Enemy class with 9 enemy types
│       │   ├── Bullet.js   # Bullet class for player and enemy bullets
│       │   ├── Particle.js # Particle effects
│       │   └── Star.js     # Background stars (twinkle + parallax scroll)
│       └── game/       # Game logic modules
│           ├── state.js    # Game state, start/end game, high score
│           ├── input.js    # Keyboard/mouse/touch input, pause, mute
│           ├── touch.js    # Virtual joystick and dash button
│           ├── collision.js # Collision detection
│           ├── spawn.js    # Enemy spawning logic
│           ├── power.js    # Progressive power scaling + wave-clear power-up
│           ├── audio.js    # WebAudio oscillator sound effects
│           ├── ui.js       # HUD (score / wave+time / lives) updates
│           └── render.js   # Rendering pipeline and screen overlays
├── LICENSE             # Boost Software License 1.0
├── README.md           # Project README (Japanese)
├── docs/
│   └── spec-orbit-bloom.md  # Technical spec (Japanese, ~400 lines)
└── CLAUDE.md           # This file
```

### File Purposes

- **index.html** (root): Redirect stub so GitHub Pages serves `src/` as the game
- **src/index.html**: Canvas element plus HTML HUD overlay (SCORE / TIME / LIVES)
- **src/style.css**: Fullscreen canvas, HUD overlay styling, mobile media query
- **src/js/config.js**: All constants (PLAYER_PARAMS, ENEMY_PARAMS, BULLET_PARAMS, POWER_PARAMS, RESTART_LOCKOUT, stageConfigs)
- **src/js/main.js**: Entry point, devicePixelRatio-aware canvas sizing, game loop, wave progression
- **src/js/classes/***: Individual entity class files (Single Responsibility)
- **src/js/game/***: Game logic modules organized by functionality
- **src/js/game/power.js**: Power-level multipliers for player and enemies; wave-clear power-up
- **src/js/game/audio.js**: Oscillator-only sound effects with persisted mute toggle
- **docs/spec-orbit-bloom.md**: Original design specification (implementation has evolved beyond it)

## Technology Stack

### Core Technologies
- **HTML5 Canvas 2D Context**: All graphics rendering
- **Vanilla JavaScript (ES6)**: No frameworks or libraries
- **CSS3**: Basic styling and layout
- **WebAudio API**: Synthesized sound effects (no audio files)
- **localStorage**: High score and mute preference persistence

### Key Constraints
- ✅ No external libraries or frameworks
- ✅ No image or audio assets (canvas primitives + oscillator SFX only)
- ✅ No build process required
- ✅ Pure client-side, no backend

## Code Architecture

### Modular Architecture

**IMPORTANT**: The codebase follows a modular architecture to improve maintainability and scalability.

**Key Principles**:
1. **Single Responsibility**: Each file has one clear purpose
2. **ES6 Modules**: Using import/export for dependency management
3. **Separation of Concerns**: Classes, game logic, and configuration are separated
4. **No Monolithic Files**: Avoid putting everything in one file

**Module Organization**:
- **js/config.js**: All configuration constants exported as named exports
- **js/classes/**: Each entity class in its own file
- **js/game/**: Game logic organized by functionality (state, input, power, audio, etc.)
- **js/main.js**: Entry point that imports and coordinates all modules

### Game Loop Pattern

The game uses `requestAnimationFrame` for smooth rendering:

```javascript
// In js/main.js
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // seconds
    lastTime = currentTime;

    if (gameState.state === 'playing') {
        updateGame(deltaTime); // clamps dt to 0.05s internally
    } else {
        // Starfield keeps animating on title / pause / game-over screens
        for (const star of gameState.stars) star.update(Math.min(deltaTime, 0.05));
    }

    // Screen shake decays in every state
    gameState.shakeTimer = Math.max(0, gameState.shakeTimer - deltaTime);

    render(ctx, canvas, scale, offsetX, offsetY, dpr);
    requestAnimationFrame(gameLoop);
}
```

**Key Points**:
- Delta time is in seconds and clamped to 0.05s to avoid huge jumps
- All movement/timers use delta time for frame-rate independence
- The starfield and screen-shake decay run in every state, not just 'playing'
- The canvas backing store is scaled by `devicePixelRatio`; `resizeCanvas()` in main.js recomputes `dpr`, `scale`, `offsetX/Y` and re-evaluates touch controls on every `resize`/`orientationchange`

### Core Components

#### 1. Configuration Module (js/config.js)
```javascript
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

export const PLAYER_PARAMS = {
    moveSpeed: 200,
    radius: 10,
    hitRadius: 6,
    shotInterval: 0.2,
    dashSpeedMultiplier: 2.5,
    dashDuration: 0.2,
    dashCooldown: 1.5,
    invincibleDurationOnHit: 1.0,
    initialLives: 3,
};

export const ENEMY_PARAMS = { /* 9 types, see Enemy Class below */ };
export const BULLET_PARAMS = { /* player and enemy bullet params */ };
export const POWER_PARAMS = { /* per-level scaling, see Power Scaling */ };
export const RESTART_LOCKOUT = 0.8; // seconds before restart input works after game over
export const stageConfigs = [ /* 4 wave configs, see Wave Progression */ ];
```

**Convention**: All tunable parameters are exported from config.js for easy balancing.

#### 2. Game State Module (js/game/state.js)
Central state management object and functions:
- `gameState` object containing all mutable game state, including `state` ('title' | 'playing' | 'paused' | 'gameover'), `score`, `highScore`, `isNewRecord`, `stageIndex`, `powerLevel`, `powerUpTimer`, `gameoverAt`, `shakeTimer`, `spawnAccumulator`, entity arrays, `keys`, and `touchMove`
- `init()`: creates 100 background stars, sets title screen
- `startGame()`: resets score/lives/wave/power/timers/inputs and rebuilds entities
- `endGame()`: sets 'gameover', stamps `gameoverAt` (for the restart lockout), plays the gameOver SFX, and saves a new high score to localStorage key `'orbitBloomHighScore'` (setting `isNewRecord` when beaten)
- `getCurrentPhase()`: returns the current phase of the current wave by elapsed time

**Convention**: All mutable game state lives in the exported `gameState` object.

#### 3. Entity Classes (js/classes/)

**Player Class** (js/classes/Player.js):
- Constructor takes `gameState` reference
- `update(dt)`: movement (keyboard + touch), timers, auto-fire with power-scaled fire rate, trail particles
- `draw(ctx)`: circle body + wing triangle, glow, invincibility blink, and a yellow **dash cooldown arc** around the ship while the cooldown runs
- `shoot()`: fires straight up with power-scaled bullet speed
- `dash()`: **returns a boolean** — true only when the dash actually started, so UI layers reflect the real cooldown. Dashing with no directional input travels along the last movement direction (`lastMoveX/Y`, defaults to up). Player is invincible during the dash. Cooldown is 1.5s.
- `hit()`: decrements lives, 1s invincibility, 0.25s screen shake, explosion particles, calls `endGame()` at 0 lives
- `isInvincible()`: returns invincibility status

**Enemy Class** (js/classes/Enemy.js):
- Constructor takes type, position, phase speed multiplier, and `gameState`. HP and speed are scaled by the enemy power multipliers **for all types** at construction; HP is rounded.
- `update(dt, bulletSpeed)`: type-specific movement and shooting
- `hit(damage)`: subtracts damage; non-lethal hits trigger a white flash (`flashTimer = 0.08`), spark particles, and the enemyHit SFX; returns true when destroyed
- `destroy()`: adds score, explosion particles, explosion SFX
- `isOffScreen()`: bounds check with an extra horizontal margin for spiral enemies so they are not culled mid-pattern

There are **9 enemy types**:

| Type | Shape | Movement | Shooting |
|---|---|---|---|
| `basic` | Circle | Straight down | None |
| `zigzag` | Diamond | Sine sway around spawn x (ampX 30, freq 2) while descending | None |
| `wave` | Rounded diamond | Wider, slower sine sway (ampX 50, freq 1.5) | None |
| `spiral` | 5-pointed star | Descends while swinging sideways; swing radius grows with descent, capped by `spiralSpeed` | None |
| `homing` | Triangle rotated to heading | Turns toward the player every 0.25s by up to 0.3 rad | None |
| `shooter` | Circle + white inner circle | Straight down | Single aimed shot every 2.0s |
| `shooter_spread` | Pentagon + white inner circle | Straight down | 3-way aimed spread (±0.3 rad) every 2.5s |
| `shooter_radial` | Hexagon + rotating inner triangle | Straight down | 6-way slowly-rotating radial ring every 3.5s at 0.8× bullet speed |
| `shooter_spiral` | Rotating square + counter-rotating inner square | Straight down | 2 opposite bullets every 0.3s, angle advancing 22.5°/shot, at 0.7× bullet speed |

**Bullet Class** (js/classes/Bullet.js):
- Constructor takes position, direction, owner ('player' or 'enemy'), and optional speed
- `update(dt)`: moves in calculated direction
- `draw(ctx)`: renders with shadow/trail effect
- `isOffScreen()`: bounds checking for cleanup

**Particle Class** (js/classes/Particle.js):
- Constructor takes position, color, lifetime, size, and velocity
- `update(dt)`: position, lifetime, velocity damping
- `draw(ctx)`: alpha fade; `isDead()` when lifetime expires

**Star Class** (js/classes/Star.js):
- Background star with twinkling and downward parallax scroll (30–80 px/s), wrapping to the top with a new random x

**Convention**: All entities have `update(dt)` and `draw(ctx)` methods.

### Game Systems

#### State Machine and Game Flow
- States: `'title'` → `'playing'` ⇄ `'paused'` → `'gameover'` → (restart) `'playing'`
- **Pause**: P or Escape toggles pause; clicking/tapping the canvas while paused resumes. The HUD stays visible while paused.
- **Auto-pause**: on window `blur`, `gameState.keys` is cleared (held keys would never fire keyup) and a running game pauses automatically.
- **Restart lockout**: after game over, restart input is ignored for `RESTART_LOCKOUT` (0.8s) so panic taps/held keys can't skip the score screen. The "Retry" hint only renders after the lockout. Keyboard, click, **and** tap all restart from game over (and start from title) via the same `tryStart()` path, which also initializes audio and resets touch controls.
- **High score**: persisted in localStorage `'orbitBloomHighScore'`; shown on the title screen ("BEST") and on game over ("BEST" or a flashing "NEW RECORD!").

#### Wave Progression (js/config.js + js/main.js)
- `stageConfigs` holds **4 wave configs**. Each wave lasts **60 seconds** and has **3 phases** (0–20s / 20–40s / 40–60s) with their own `spawnRate`, `maxEnemies`, `allowedTypes`, `enemySpeedMultiplier`, and `bulletSpeed`.
- When the wave timer hits 0: `triggerPowerUp()` fires and `stageIndex` advances. The **last wave repeats infinitely** — difficulty then comes from power scaling.
- `triggerPowerUp()` (js/game/power.js): increments `powerLevel`, pops **all enemy bullets** with white particle bursts (clean screen for the new wave), plays the powerUp SFX, fires a center burst + ring of particles, and starts a 2-second banner (`powerUpTimer`).
- **Duplicated entries in `allowedTypes` act as spawn weights** (e.g., wave 1 phase 3 lists `'basic'` twice to keep shooters a minority).
- The HUD TIME cell shows both wave and countdown, e.g., `W2 43s`.

#### Power Scaling (js/config.js POWER_PARAMS + js/game/power.js)
Both sides grow with `gameState.powerLevel` (which increments on every wave clear):
- **Player** (`getPlayerPowerMultipliers()`): moveSpeed +10%/level **capped at 1.5×**, fireRate +15%/level, bulletSpeed +10%/level, bullet damage +1 every 3 levels
- **Enemy** (`getEnemyPowerMultipliers()` / `getEffectiveMaxEnemies()`): hp +18%/level, speed +8%/level, spawnRate +5%/level, and maxEnemies +1/level **capped at 30 total**

Applied in: Player.update/shoot (speed/fire rate/bullet speed), collision.js (bullet damage), Enemy constructor (hp/speed), spawn.js (spawn rate/cap).

#### Audio (js/game/audio.js)
- **WebAudio oscillator one-shots only** — no audio files. Each SFX is a waveform + frequency sweep + decay envelope: `shoot`, `enemyHit`, `explosion`, `playerHit`, `dash`, `powerUp`, `gameOver`.
- The AudioContext is created **lazily by `initAudio()` on the first user gesture** (called from `tryStart()` in input.js) to satisfy browser autoplay policy; a suspended context is resumed.
- **M toggles mute** in any state; the choice is persisted in localStorage `'orbitBloomMuted'`. `playSfx(name)` silently no-ops when muted or before audio init.

#### Input Handling (js/game/input.js)
- **Keyboard**: WASD or arrow keys move (`gameState.keys`), Shift/Space dashes, P/Escape toggles pause, M toggles mute, and any other key starts/restarts from title or game over.
- **Mouse**: click only **starts (title), retries (game over, post-lockout), or resumes (paused)**. There is no mouse aiming and no mouse-position tracking.
- **Touch**: taps on title/game-over/paused screens start/retry/resume; during play, touches feed the virtual controls. `touchend`/`touchcancel` are **always processed regardless of state** so a joystick held at the moment of death can't leak into the next run.
- **Function**: `initInputHandlers(canvas)` sets up all listeners.

#### Touch Controls (js/game/touch.js)
- **Detection is capability-based**: `'ontouchstart' in window || navigator.maxTouchPoints > 0` — **no screen-width gate**, so tablets get the overlay too. Keyboard keeps working regardless. Re-evaluated by `initTouchControls()` on every resize/orientation change.
- **Virtual Joystick**: claims only the **lower-left area** (x < half the canvas width AND y > 35% of its height, keeping the HUD/incoming-enemy zone free). Single-owner via `touchId` — other touches are ignored. Displacement clamped to 40px and normalized to -1..1 into `gameState.touchMove`.
- **Dash Button**: bottom-right; its position is **computed dynamically from canvas size** (width−80, height−80) so it survives resize/rotation. It dims during the **real** player cooldown (`player.dashCooldownTimer`) and draws a clockwise **arc sweep** until the dash is ready. Pressing it calls `player.dash()`, which enforces the cooldown.
- `resetTouchControls()` clears all transient touch state and runs on **every game start**.
- The overlay only renders while `gameState.state === 'playing'`.

#### Enemy Spawning (js/game/spawn.js)
- Phase-based accumulator pattern: `spawnAccumulator += spawnRate * powerMult.spawnRate * dt`; one enemy spawns per whole unit while under the cap.
- Effective cap: `min(phase.maxEnemies + powerLevel, 30)` via `getEffectiveMaxEnemies()`.
- **While the screen is at the cap, the accumulator is clamped to 1** so kills aren't instantly replaced by a burst backlog.
- Type is picked at random from `allowedTypes` (duplicates = weights); enemies spawn at random x, just above the screen.

#### Shooting Mechanic
- **Player**: auto-fire straight up at `shotInterval / fireRateMultiplier` (js/classes/Player.js)
- **Enemies**: the four shooter types fire aimed / spread / radial / spiral patterns using the phase's `bulletSpeed` (see enemy table)

#### Collision Detection (js/game/collision.js)
- **Player bullet vs enemy**: circle collision; removes the bullet and applies **power-scaled damage** (`getPlayerPowerMultipliers().damage`); enemy removed when `hit()` returns true
- **Enemy bullet vs player**: circle collision against the player's `hitRadius`
- **Enemy vs player**: circle collision, skipped while invincible; at most one body hit per frame
- Uses distance formula: `sqrt(dx² + dy²)`; `checkCollisions()` handles all cases

#### Rendering Pipeline (js/game/render.js)
1. `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` — the backing store is devicePixelRatio-scaled; **all drawing happens in CSS pixels**
2. Clear with gradient background
3. Apply game coordinate transform (translate offset, scale)
4. Apply **screen shake** translation while `gameState.shakeTimer > 0` (magnitude = timer × 24)
5. Draw stars → particles → bullets → enemies → player (player includes the dash cooldown arc; enemies flash white via `flashTimer`)
6. Restore transform; draw touch controls overlay (screen coordinates)
7. Draw the **power-up banner** (playing state only): "WAVE X" / "POWER UP!" + "LEVEL N" in the upper third, with a brief screen flash capped at 0.15 alpha so live bullets stay readable
8. Draw state overlays: title (glowing logo, BEST score, pulsing start prompt, control hints incl. mute state), game over (score, BEST or flashing NEW RECORD!, wave reached, retry hint only after the lockout), or pause

## Development Conventions

### Code Style

1. **Naming Conventions**:
   - `camelCase` for variables and functions
   - `PascalCase` for classes
   - `UPPER_CASE` for exported constants in config.js

2. **Comments**:
   - Section headers for major game systems
   - Inline comments for non-obvious logic (several functions use short JSDoc blocks)

3. **Organization** (within modules):
   - Imports first, then constants/state, then exported functions/classes

### Canvas Drawing Patterns

```javascript
// Standard drawing pattern
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();

// Glow effect pattern
ctx.strokeStyle = 'rgba(r, g, b, alpha)';
ctx.lineWidth = width;
ctx.beginPath();
ctx.arc(x, y, radius + offset, 0, Math.PI * 2);
ctx.stroke();
```

**Convention**: All graphics use canvas primitives only (no images).

### Performance Patterns

1. **Array Cleanup**: Iterate backwards when removing items
   ```javascript
   for (let i = array.length - 1; i >= 0; i--) {
       if (shouldRemove) array.splice(i, 1);
   }
   ```

2. **Delta Time**: Always multiply speeds by `deltaTime` for frame independence

3. **Bounds Checking**: Remove off-screen entities to prevent memory leaks

## Task Management and Development Workflow

### CRITICAL: Task Breakdown Philosophy

**DO NOT** attempt to implement everything at once. Complex features must be broken down into manageable tasks.

**Why Task Management is Essential**:
1. **Prevents Overwhelming Changes**: Large refactors/features should be split into phases
2. **Enables Progress Tracking**: Each subtask can be marked complete
3. **Improves Code Quality**: Smaller changes are easier to test and debug
4. **Maintains Focus**: Work on one thing at a time

### Task Breakdown Strategy

When receiving a complex request, follow this process:

1. **Analyze the Request**:
   - Identify all components that need changes
   - List dependencies between tasks
   - Estimate complexity of each subtask

2. **Create a Task List** using TodoWrite tool:
   - Break down into 5-15 tasks (if more, group into phases)
   - Each task should be completable in one focused session
   - Order tasks by dependencies (prerequisites first)

3. **Execute Tasks Sequentially**:
   - Mark current task as `in_progress`
   - Complete the task fully
   - Test the change
   - Mark as `completed` immediately
   - Move to next task

4. **Commit and Push**:
   - Commit after completing related tasks
   - Push to the feature branch
   - Clear commit messages describing what was done

### Example Task Breakdown

**Bad Approach** ❌:
```
User: "Add a new enemy type with special behavior"
Assistant: [Immediately starts writing 500 lines of code without planning]
```

**Good Approach** ✅:
```
User: "Add a new enemy type with special behavior"
Assistant:
1. Creates task list:
   - Read spec for enemy type definition
   - Add enemy parameters to config.js
   - Implement enemy class behavior
   - Add enemy to stageConfigs allowedTypes
   - Test enemy spawning and behavior
   - Commit changes
2. Marks "Read spec" as in_progress
3. Completes each task one by one
4. Marks each completed before moving to next
```

### When to Use Task Management

**Always use TodoWrite for**:
- Refactoring multiple files
- Adding new features (3+ steps)
- Bug fixes affecting multiple systems
- Following spec implementation
- Multi-phase work

**Skip task management for**:
- Single-line config changes
- Trivial typo fixes
- Adding simple comments
- Single-function updates

## Working with This Codebase

### Modular Development Workflow

1. **Adding a New Class**:
   - Create new file in `js/classes/`
   - Export the class: `export class ClassName { }`
   - Import where needed: `import { ClassName } from '../classes/ClassName.js'`

2. **Adding a New Game System**:
   - Create new file in `js/game/`
   - Export functions: `export function systemUpdate(dt) { }`
   - Import in js/main.js and call from the appropriate place in the game loop

3. **Modifying Configuration**:
   - Edit js/config.js only
   - Use named exports: `export const NEW_PARAM = { }`
   - Import where needed: `import { NEW_PARAM } from '../config.js'`

4. **Testing Module Changes**:
   - Serve `src/` over a local static server and open it in a browser
   - Check browser console for import errors
   - Verify functionality works as expected

### Common Tasks

#### Adding a New Enemy Type

1. **Add to config** (js/config.js):
   ```javascript
   export const ENEMY_PARAMS = {
     // ... existing 9 types
     newType: { speedY: 100, radius: 10, hp: 2, score: 20, color: '#FF00FF' }
   };
   ```

2. **Implement behavior** (js/classes/Enemy.js):
   - Add type-specific initialization in the constructor (remember: speed must use `this.speedMultiplier`, which already includes power scaling)
   - Add type-specific update logic in `update()` and rendering in `draw()`
   - Check `isOffScreen()` margins if the type moves far sideways (see the spiral case)

3. **Enable spawning** (js/config.js):
   - Add to `allowedTypes` in the desired wave phases; duplicate an entry to increase its spawn weight:
   ```javascript
   allowedTypes: ['basic', 'basic', 'zigzag', 'newType']
   ```

4. **Test**: verify it spawns in the right wave/phase, and check movement, rendering, hit flash, and collisions

#### Adjusting Game Difficulty

Modify values in **js/config.js**:

**Player**:
- `PLAYER_PARAMS.moveSpeed` / `shotInterval` / `dashCooldown` (currently 1.5s) / `initialLives`

**Enemy**:
- `ENEMY_PARAMS.{type}.speedY` / `hp` / `score` / `shotInterval`

**Wave phases** (in `stageConfigs`):
- `spawnRate`, `maxEnemies`, `enemySpeedMultiplier`, `bulletSpeed`, `allowedTypes` (with duplicates as weights)

**Long-run scaling** (in `POWER_PARAMS`):
- `player.*PerLevel` and `moveSpeedCap` / `damageEveryLevels`
- `enemy.hpPerLevel` / `speedPerLevel` / `spawnRatePerLevel` / `maxEnemiesCap`

#### Adding New Controls

1. **Add handling in the keydown listener** (js/game/input.js, inside `initInputHandlers`) — follow the existing M (mute) and P/Escape (pause) patterns, including `return` for keys that must not also start the game
2. **Store state** if continuous (`gameState.keys[key]`), or call a method directly for one-shot actions (like dash)
3. **Process in update**: check state in `Player.update()` or the relevant module
4. Remember every start/restart path goes through `tryStart()`; keep new global keys out of it if they shouldn't trigger a restart

#### Implementing New Features

**Currently Implemented**:
- ✅ Auto-fire shooting (no click-to-shoot; mouse is not used for aiming)
- ✅ Dash mechanic (Shift/Space or touch button; 1.5s cooldown with arc indicators)
- ✅ 9 enemy types (basic, zigzag, wave, spiral, homing, shooter, shooter_spread, shooter_radial, shooter_spiral)
- ✅ Wave progression (4 wave configs × 3 phases; last wave repeats infinitely)
- ✅ Progressive power scaling for player and enemies (POWER_PARAMS + game/power.js)
- ✅ Life system with invincibility frames, screen shake, enemy hit flash
- ✅ Particle effects (trail, explosion, sparks, power-up bursts)
- ✅ Pause (P/Escape, auto-pause on window blur)
- ✅ WebAudio sound effects with persisted mute toggle (M)
- ✅ High score persistence (localStorage)
- ✅ Mobile touch controls (virtual joystick + dash button with real cooldown display)
- ✅ devicePixelRatio-aware rendering

**Planned / Not Yet Implemented**:
- ⏳ Background music (only one-shot SFX exist)
- ⏳ Multiple distinct stage themes (a single `stageConfigs` track exists; no visual/thematic variety per stage)
- ⏳ More enemy types

**When Implementing New Features**:
1. Create task breakdown using TodoWrite
2. Check the spec for design intent (noting the code has evolved beyond it)
3. Start with config.js additions
4. Implement class/module changes
5. Test incrementally, commit and push when complete

### Testing Approach

**No formal test framework** - manual testing workflow:

1. **Local Testing**: serve `src/` with any static server (e.g., `python3 -m http.server`) — ES modules generally do not load from `file://`
2. **Manual checklist**:
   - Title screen: starfield animates; any key / click / tap starts the game
   - Movement (WASD/arrows), auto-fire, dash (Shift/Space) with the cooldown arc around the ship
   - Pause with P/Escape; resume via key, click, or tap; HUD stays visible; window blur auto-pauses
   - M toggles sound and persists across reload
   - Wave transition at 60s: banner appears, enemy bullets pop into particles, HUD shows `W2`
   - Game over: restart input blocked for ~0.8s, then keyboard/click/tap all retry; high score persists and "NEW RECORD!" flashes when beaten
   - Touch (DevTools device emulation): joystick appears only in the lower-left area, dash button bottom-right shows a cooldown sweep, rotating/resizing mid-game keeps controls positioned correctly
3. **Performance**: watch for slowdown with many entities/particles on screen (there is no built-in FPS counter)
4. **Scripted testing**: the repo is Playwright-driveable — `gameState` is an ES module singleton, so a test can `import('/js/game/state.js')` from the served origin inside `page.evaluate()` and read/manipulate the same live state the game uses

### Debugging Tips

1. **Module Loading Errors**:
   - Check browser console for import/export errors; serve over HTTP, not `file://`
   - Verify file paths are correct (case-sensitive) and all imports use `.js` extensions
   - index.html loads js/main.js with `type="module"`

2. **Game State Issues**:
   - Log `gameState`; `state` is one of 'title', 'playing', 'paused', 'gameover'
   - Check `powerLevel`, `stageIndex`, and `elapsedTime` for wave/difficulty issues

3. **Collision Problems**:
   - Add console.log in `checkCollisions()` (js/game/collision.js)
   - Remember player-bullet damage scales with power level (`getPlayerPowerMultipliers().damage`)
   - Player body hits use `hitRadius` (6), not the visual `radius` (10)

4. **Spawning Issues**:
   - Log `gameState.enemies.length` vs `getEffectiveMaxEnemies(phase.maxEnemies)`
   - `spawnAccumulator` is intentionally clamped to 1 while the cap is reached
   - Verify the current phase's `allowedTypes` (duplicates are weights)

5. **Movement Bugs**:
   - Log player position in `Player.update()`; deltaTime should be ~0.016 at 60fps (clamped at 0.05)
   - Touch input overrides keyboard when the joystick deflection exceeds 0.1

6. **Rendering Issues**:
   - render.js starts with `setTransform(dpr, ...)` — all drawing is in CSS pixels; game entities additionally sit under the translate/scale game transform
   - Verify ctx.restore() pairs with ctx.save(); check `shakeTimer` if the scene jitters

7. **Audio Issues**:
   - `playSfx()` is silent until `initAudio()` has run from a user gesture and the context is 'running'
   - Check the persisted mute flag: localStorage `'orbitBloomMuted'`

## GitHub Pages Deployment

The game is deployed as a static site on GitHub Pages.

**Deployment Process**:
1. Push changes to main branch
2. GitHub Pages serves from root; the root `index.html` meta-refreshes to `src/`
3. No build step required
4. Access at: `https://velgail.github.io/Orbit-Bloom/`

**Project Structure**:
- Game files are in `src/` directory
- Root `index.html` redirects to `src/`
- This separates source code from documentation files

**Important**: All paths must be relative for GitHub Pages to work correctly.

## Future Development Roadmap

The original phased roadmap from `docs/spec-orbit-bloom.md` is essentially complete:

### Phase 1 (Complete)
- ✅ Player movement, auto-firing, enemy spawning, collision detection, score tracking

### Phase 2 (Complete)
- ✅ Dash mechanic with cooldown, multiple enemy types, life system with invincibility frames, enemy bullets, particle effects

### Phase 3 (Complete)
- ✅ Wave/phase system, mobile touch controls, game over / retry UI (with restart lockout), time-based waves, coordinate scaling + devicePixelRatio rendering

### Phase 4 (Partially Complete)
- ✅ Sound effects (WebAudio oscillators) with mute
- ✅ High score persistence
- [ ] Background music
- [ ] Multiple distinct stage themes (beyond the single repeating wave track)
- [ ] Additional enemy types

## Spec Document Reference

The `docs/spec-orbit-bloom.md` file is the original design document (written in Japanese). It contains game mechanics specifications, entity behavior definitions, stage configuration design, input handling for PC and mobile, parameter tables, and code structure recommendations.

**Note**: the implementation has evolved beyond the spec (extra enemy types, power scaling, audio, pause, high score). Consult the spec for original design intent, but **the code is the source of truth** where they disagree.

## Key Design Principles

1. **Simplicity First**: Keep code readable and maintainable
2. **No Dependencies**: Pure vanilla JS/HTML/CSS only
3. **Visual = Code**: All graphics rendered via canvas primitives; all audio synthesized
4. **Parameterized**: Easy difficulty tuning via config objects
5. **Frame Independent**: All timing uses delta time
6. **Beginner Friendly**: Game should be accessible to casual players

## Common Pitfalls to Avoid

1. **Don't** add external libraries without discussing first
2. **Don't** use image or audio files for assets
3. **Don't** hardcode magic numbers - put them in config.js
4. **Don't** forget delta time in movement calculations
5. **Don't** mutate arrays while iterating forward
6. **Don't** assume 60 FPS - always use deltaTime
7. **Don't** bypass `tryStart()` / `resetTouchControls()` when adding restart paths — stale input state leaks into the next run
8. **Don't** gate `touchend`/`touchcancel` handling on game state

## Working with AI Assistants

### Best Practices for AI Development

1. **Reference the Spec**: Check `docs/spec-orbit-bloom.md` for original intent; trust the code for current behavior
2. **Maintain Patterns**: Follow existing code structure and naming
3. **Test Incrementally**: Make small changes and verify in browser
4. **Preserve Simplicity**: Don't over-engineer solutions
5. **Document Changes**: Add comments for non-obvious code

### Typical Request Patterns

**Good Request**:
> "Add a new shooter variant that fires a 4-way radial pattern, following the shooter_radial structure in Enemy.js and ENEMY_PARAMS"

**Less Ideal Request**:
> "Make the game better" (too vague)

**Good Request**:
> "Retune POWER_PARAMS so enemy HP scales slower after wave 4"

**Less Ideal Request**:
> "Add some NPM packages for game physics" (violates no-dependency principle)

## Git Workflow

### Branch Strategy
- **Main branch**: Production-ready code
- **Feature branches**: Use `claude/*` prefix for AI assistant work
- **Naming**: Descriptive names like `claude/add-dash-mechanic`

### Commit Messages
Follow the pattern observed in git history:
- Clear, descriptive messages
- Reference pull requests when merging
- Example: "Add draft specification for Orbit Bloom game"
- Example: "Implement Orbit-Bloom game with HTML5 Canvas and requestAnimationFrame"

### Before Committing
1. Test in browser (served over HTTP)
2. Verify no console errors
3. Check the game stays smooth with many entities on screen
4. Run through the manual checklist for anything you touched
5. Ensure code follows existing patterns

## Getting Help

### Documentation Priority
1. This file (CLAUDE.md) - High-level guidance
2. `docs/spec-orbit-bloom.md` - Original design specifications
3. Code comments in the modules - Implementation details
4. README.md - Project overview

### Understanding the Codebase

**Entry Point**:
- **Start at**: js/main.js
- **Initialize**: `init()` from js/game/state.js, `initInputHandlers(canvas)` from js/game/input.js
- **Game loop**: `gameLoop()` in js/main.js

**Code Flow**:
1. **Game loop** → `updateGame(dt)` (when playing) → `render()` (always)
2. **Update phase** (js/main.js `updateGame`):
   - Wave timer → `triggerPowerUp()` + wave advance on wave clear
   - `updatePowerTimer(dt)`, `updateTouchControls()`
   - Player.update(), `spawnEnemies(dt)`, Enemy/Bullet/Particle/Star updates with off-screen/dead cleanup
   - `checkCollisions()`, `updateUI()`
3. **Render phase**: render() from js/game/render.js

**Entity Lifecycle**:
- **Spawn**: Created in spawn.js or class methods
- **Update**: `update(dt)` called each frame
- **Draw**: `draw(ctx)` called each frame
- **Collision**: Checked in collision.js
- **Remove**: Array.splice() when off-screen, dead, or destroyed

**State Flow**:
- **Input** (input.js / touch.js) → **gameState** (state.js) → **Class updates** → **Rendering** (render.js)

**Module Dependencies** (honest picture — classes and game modules are cross-dependent):
```
config.js   ← constants only, imports nothing
audio.js    ← imports nothing (localStorage + WebAudio)

classes/Bullet.js, Particle.js, Star.js → config.js
game/power.js     → config.js, game/state.js, classes/Particle.js, game/audio.js
classes/Player.js → config.js, Bullet, Particle, game/power.js, game/state.js, game/audio.js
classes/Enemy.js  → config.js, Bullet, Particle, game/power.js, game/audio.js
game/state.js     → config.js, classes/Player.js, classes/Star.js, game/audio.js
game/touch.js     → config.js, game/state.js
game/input.js     → config.js, game/state.js, game/audio.js, game/touch.js
game/spawn.js     → config.js, game/state.js, classes/Enemy.js, game/power.js
game/collision.js → game/state.js, game/power.js
game/ui.js        → game/state.js
game/render.js    → config.js, game/state.js, game/touch.js, game/audio.js
main.js           → imports and coordinates everything
```
Note the import cycle state.js ↔ Player.js (Player calls `endGame()`; state.js constructs Player). It works because usage is deferred to runtime — if you add new cycles, keep them function-level, never at module top level.

## Version Information

- **Current State**: Feature-complete implementation with waves, power scaling, audio, pause, high scores, and mobile support
- **Architecture**: Modular ES6 modules in src/ directory
- **Spec Version**: Draft v1 (see docs/spec-orbit-bloom.md; code has evolved beyond it)
- **Last Updated**: 2026-07-03

**Major Changes**:
- 2026-07-03 (latest):
  - Bug fixes: unified restart paths (keyboard/click/tap) behind `tryStart()` with a 0.8s restart lockout; touch-state leaks fixed (reset on every start, touchend/touchcancel always processed); touch controls and canvas now handle resize/rotation (dynamic dash-button position, DPR re-init); spawn accumulator clamped at the enemy cap; enemy speed power scaling applied to all types at construction; spiral enemies no longer culled mid-pattern
  - Features: pause state (P/Escape, click/tap resume, auto-pause on window blur), WebAudio SFX module with persisted mute (M), high score persistence, screen shake, enemy white hit-flash, dash cooldown indicators (arc around ship + touch-button sweep), devicePixelRatio-scaled rendering
  - Balance: enemy hp/speed/spawn power scaling retuned (+18%/+8%/+5% per level), shooter_spiral nerfed, dash cooldown 2.0s → 1.5s, weighted wave-1 spawns via duplicated allowedTypes
- 2025-11-15:
  - Reorganized project structure (moved code to src/ directory)
  - Implemented mobile touch controls (virtual joystick + dash button)
  - Refactored from monolithic main.js (~900 lines) to modular architecture (js/config.js, js/classes/*, js/game/*)
  - Implemented all Phase 1 and Phase 2 features from spec; added task management guidelines

## Questions to Ask Before Making Changes

1. Does this align with the design intent (spec + current code)?
2. Does this maintain the "no dependencies" principle?
3. Will this require changes to config.js?
4. Does this preserve frame-rate independence?
5. Is this testable by serving src/ and playing in a browser?
6. Does this maintain code simplicity?

---

**Remember**: Orbit-Bloom is designed to be a simple, accessible game with clean, understandable code. When in doubt, favor simplicity and clarity over clever optimizations.
