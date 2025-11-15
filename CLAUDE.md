# CLAUDE.md - AI Assistant Guide for Orbit-Bloom

This document provides comprehensive guidance for AI assistants working with the Orbit-Bloom codebase.

## Project Overview

**Orbit-Bloom** (オービット・ブルーム) is a minimalist survival shooter game built with pure HTML5 Canvas and vanilla JavaScript. The game features simple geometric shapes in a space-themed environment where players must survive waves of enemies.

- **Type**: Browser-based HTML5 Canvas game
- **Genre**: Survival shooter / Bullet hell lite
- **Target Audience**: Casual players, beginner-friendly
- **Hosting**: GitHub Pages (static site)
- **License**: Boost Software License 1.0

## Repository Structure

```
Orbit-Bloom/
├── src/                # Source code directory
│   ├── index.html      # Main HTML entry point
│   ├── style.css       # Styling and layout (~49 lines)
│   └── js/             # Modular JavaScript files (ES6 modules)
│       ├── config.js   # Configuration constants and parameters
│       ├── main.js     # Entry point and game loop
│       ├── classes/    # Entity class definitions
│       │   ├── Player.js   # Player class with movement, shooting, dash
│       │   ├── Enemy.js    # Enemy class with multiple types
│       │   ├── Bullet.js   # Bullet class for player and enemy bullets
│       │   ├── Particle.js # Particle effects
│       │   └── Star.js     # Background stars
│       └── game/       # Game logic modules
│           ├── state.js    # Game state management
│           ├── input.js    # Input handling (keyboard, mouse, touch)
│           ├── touch.js    # Touch controls for mobile devices
│           ├── collision.js # Collision detection
│           ├── spawn.js    # Enemy spawning logic
│           ├── ui.js       # UI updates
│           └── render.js   # Rendering pipeline
├── LICENSE             # Boost Software License 1.0
├── README.md           # Project README (Japanese)
├── docs/
│   └── spec-orbit-bloom.md  # Comprehensive technical spec (Japanese, ~400 lines)
└── CLAUDE.md           # This file
```

### File Purposes

- **src/index.html**: Minimal HTML structure with canvas element and game info display
- **src/style.css**: Simple styling with dark gradient background and centered layout
- **src/js/config.js**: All configuration constants (PLAYER_PARAMS, ENEMY_PARAMS, etc.)
- **src/js/main.js**: Entry point, canvas setup, game loop, and update logic
- **src/js/classes/***: Individual class files following Single Responsibility Principle
- **src/js/game/***: Game logic modules organized by functionality
- **src/js/game/touch.js**: Touch control system for mobile devices (virtual joystick and dash button)
- **docs/spec-orbit-bloom.md**: Detailed technical specification and implementation guide

## Technology Stack

### Core Technologies
- **HTML5 Canvas 2D Context**: All graphics rendering
- **Vanilla JavaScript (ES6)**: No frameworks or libraries
- **CSS3**: Basic styling and layout

### Key Constraints
- ✅ No external libraries or frameworks
- ✅ No image assets (all graphics are canvas primitives)
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
- **js/game/**: Game logic organized by functionality (state, input, collision, etc.)
- **js/main.js**: Minimal entry point that imports and coordinates all modules

### Game Loop Pattern

The game uses `requestAnimationFrame` for smooth rendering:

```javascript
// In js/main.js
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    if (gameState.state === 'playing') {
        updateGame(deltaTime);
    }
    render(ctx, canvas, scale, offsetX, offsetY);
    requestAnimationFrame(gameLoop);
}
```

**Key Points**:
- Delta time is calculated in seconds for frame-rate independence
- All movement/timers use delta time for consistency
- Update and render are separated for clarity

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
    dashCooldown: 2.0,
    invincibleDurationOnHit: 1.0,
    initialLives: 3,
};

export const ENEMY_PARAMS = { /* ... */ };
export const BULLET_PARAMS = { /* ... */ };
export const stageConfigs = [ /* ... */ ];
```

**Convention**: All tunable parameters are exported from config.js for easy balancing.

#### 2. Game State Module (js/game/state.js)
Central state management object and functions:
- `gameState` object containing all mutable game state
- `init()` function for initialization
- `startGame()` function to start/restart
- `getCurrentPhase()` function for stage management

**Convention**: All mutable game state lives in the exported `gameState` object.

#### 3. Entity Classes (js/classes/)

**Player Class** (js/classes/Player.js):
- Constructor takes `gameState` reference
- `update(dt)`: Handles movement, shooting, dash, timers
- `draw(ctx)`: Renders player with glow effects
- `shoot()`: Creates bullets
- `dash()`: Triggers dash mechanic
- `hit()`: Handles damage and invincibility
- `isInvincible()`: Returns invincibility status

**Enemy Class** (js/classes/Enemy.js):
- Constructor takes type, position, speed multiplier, and `gameState`
- Supports multiple enemy types: basic, zigzag, homing, shooter
- `update(dt, bulletSpeed)`: Type-specific movement and shooting
- `draw(ctx)`: Type-specific rendering (circle, diamond, triangle)
- `hit(damage)`: Damage handling
- `destroy()`: Explosion particles and score
- `isOffScreen()`: Bounds checking

**Bullet Class** (js/classes/Bullet.js):
- Constructor takes position, direction, owner ('player' or 'enemy'), and optional speed
- `update(dt)`: Moves in calculated direction
- `draw(ctx)`: Renders with shadow/trail effect
- `isOffScreen()`: Bounds checking for cleanup

**Particle Class** (js/classes/Particle.js):
- Constructor takes position, color, lifetime, size, and velocity
- `update(dt)`: Updates position and lifetime
- `draw(ctx)`: Renders with alpha fade
- `isDead()`: Returns true when lifetime expires

**Star Class** (js/classes/Star.js):
- Background star with twinkling effect
- `update(dt)`: Updates brightness animation
- `draw(ctx)`: Renders star with current brightness

**Convention**: All entities have `update(dt)` and `draw(ctx)` methods.

### Game Systems

#### Input Handling (js/game/input.js)
- **Keyboard**: WASD or arrow keys for movement, Shift/Space for dash
- **Mouse**: Track position for aiming
- **Touch**: Full touch control support for mobile devices
- **Pattern**: Event listeners update `gameState.keys`, `gameState.mouse`, and `gameState.touchMove`
- **Function**: `initInputHandlers(canvas, getScaleAndOffset)` sets up all input listeners

#### Touch Controls (js/game/touch.js)
- **Virtual Joystick**: Bottom-left circular touch area for movement
  - Appears when touched, shows direction and distance
  - Normalized output (-1 to 1) for x and y directions
  - Maximum displacement clamped for consistent control
- **Dash Button**: Bottom-right circular button
  - Visual feedback with cooldown indicator
  - Triggers player dash ability
- **Auto-detection**: Automatically enables on touch-capable devices with screens ≤768px
- **Functions**:
  - `shouldUseTouchControls()`: Detects if touch controls should be used
  - `initTouchControls(canvas)`: Initializes touch control positions
  - `updateTouchControls(dt)`: Updates touch state and applies to gameState
  - `drawTouchControls(ctx, canvas)`: Renders virtual controls overlay

#### Player Movement (js/classes/Player.js)
- Immediate response (no inertia)
- Speed modified by deltaTime
- Diagonal movement normalized
- Dash mechanic with speed multiplier and cooldown
- Clamped to canvas boundaries

#### Enemy Spawning (js/game/spawn.js)
- Phase-based spawning controlled by `stageConfigs`
- Accumulator pattern for smooth spawning
- `spawnEnemies(dt)` function handles all spawning logic
- Respects `maxEnemies` limit per phase
- Random enemy types from `allowedTypes` array

#### Shooting Mechanic
- **Player**: Auto-fire at fixed interval (js/classes/Player.js)
- **Enemies**: Type-specific shooting (shooter enemies only)
- Bullets calculate direction on creation
- Support for both player and enemy bullets

#### Collision Detection (js/game/collision.js)
- **Bullet-Enemy**: Circle collision, removes bullet, damages enemy, adds score
- **Bullet-Player**: Circle collision from enemy bullets
- **Enemy-Player**: Circle collision with invincibility check
- Uses distance formula: `sqrt(dx² + dy²)`
- `checkCollisions()` function handles all collision logic

#### Rendering Pipeline (js/game/render.js)
1. Clear canvas with gradient background
2. Apply game coordinate transform
3. Draw stars (background layer)
4. Draw particles
5. Draw bullets
6. Draw enemies
7. Draw player
8. Restore transform
9. Draw UI overlays (title/game over screens)

## Development Conventions

### Code Style

1. **Naming Conventions**:
   - `camelCase` for variables and functions
   - `PascalCase` for classes
   - `UPPER_CASE` for constants (should be in `config` object)

2. **Comments**:
   - Section headers for major game systems
   - Inline comments for complex calculations
   - No JSDoc currently (can be added)

3. **Organization**:
   - Configuration first
   - State definitions
   - Setup code (canvas, event listeners)
   - Entity classes
   - Game logic functions
   - Main game loop

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
   - Add enemy to spawn.js allowed types
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

When working with the modular codebase structure:

1. **Adding a New Class**:
   - Create new file in `js/classes/`
   - Export the class: `export class ClassName { }`
   - Import in files that need it: `import { ClassName } from '../classes/ClassName.js'`
   - Update js/main.js if needed for initialization

2. **Adding a New Game System**:
   - Create new file in `js/game/`
   - Export functions: `export function systemUpdate(dt) { }`
   - Import in js/main.js: `import { systemUpdate } from './game/system.js'`
   - Call from appropriate place in game loop

3. **Modifying Configuration**:
   - Edit js/config.js only
   - Use named exports: `export const NEW_PARAM = { }`
   - Import where needed: `import { NEW_PARAM } from '../config.js'`

4. **Testing Module Changes**:
   - Open index.html in browser
   - Check browser console for import errors
   - Verify functionality works as expected
   - Use browser DevTools to debug module loading

### Common Tasks

#### Adding a New Enemy Type

1. **Add to config** (js/config.js):
   ```javascript
   export const ENEMY_PARAMS = {
     // ... existing types
     newType: { speedY: 100, radius: 10, hp: 2, score: 20, color: '#FF00FF' }
   };
   ```

2. **Implement behavior** (js/classes/Enemy.js):
   - Add type-specific initialization in constructor
   - Add type-specific update logic in `update()` method
   - Add type-specific rendering in `draw()` method

3. **Enable spawning** (js/config.js):
   - Add to `allowedTypes` array in desired phase(s):
   ```javascript
   allowedTypes: ['basic', 'zigzag', 'newType']
   ```

4. **Test**:
   - Open index.html in browser
   - Verify enemy spawns at appropriate time
   - Check movement, rendering, and collision behavior

#### Adjusting Game Difficulty

Modify values in **js/config.js**:

**Player Difficulty**:
- `PLAYER_PARAMS.moveSpeed`: Higher = easier dodging
- `PLAYER_PARAMS.shotInterval`: Lower = more firepower
- `PLAYER_PARAMS.dashCooldown`: Lower = more frequent dashing
- `PLAYER_PARAMS.initialLives`: More lives = easier

**Enemy Difficulty**:
- `ENEMY_PARAMS.{type}.speedY`: Higher = more challenging
- `ENEMY_PARAMS.{type}.hp`: More HP = harder to kill
- `ENEMY_PARAMS.{type}.score`: Balance risk/reward

**Phase Difficulty** (in `stageConfigs`):
- `spawnRate`: Higher = more enemies spawn
- `maxEnemies`: Higher = more enemies on screen
- `enemySpeedMultiplier`: Multiplies all enemy speeds
- `bulletSpeed`: Higher = faster enemy bullets
- `allowedTypes`: Add more difficult enemy types

#### Adding New Controls

1. **Add event listener** (js/game/input.js):
   ```javascript
   document.addEventListener('keydown', (e) => {
     if (e.key === 'YourKey') {
       // Handle key press
     }
   });
   ```

2. **Store state** (if needed):
   - For continuous input: `gameState.keys[key] = true`
   - For one-time actions: Call method directly

3. **Process in update**:
   - Check state in Player.update() or relevant class
   - Apply game logic

4. **Example - Adding a special move**:
   - Add key listener in js/game/input.js
   - Add cooldown timer to Player class
   - Implement special move method in Player class
   - Call method when key pressed and cooldown ready

#### Implementing New Features

Reference `docs/spec-orbit-bloom.md` for planned features.

**Currently Implemented**:
- ✅ Dash mechanic (Shift/Space key)
- ✅ Multiple enemy types (basic, zigzag, homing, shooter)
- ✅ Stage/phase system with configurable parameters
- ✅ Particle effects (trail, explosion)
- ✅ Life system with invincibility frames
- ✅ Auto-fire shooting
- ✅ Modular code architecture
- ✅ Mobile touch controls (virtual joystick and dash button)

**Planned / Not Yet Implemented**:
- ⏳ Multiple stages (infrastructure exists, only stage 1 implemented)
- ⏳ Sound effects and music
- ⏳ High score persistence
- ⏳ More enemy types beyond spec

**When Implementing New Features**:
1. Create task breakdown using TodoWrite
2. Check spec for design requirements
3. Start with config.js additions
4. Implement class/module changes
5. Test incrementally
6. Commit and push when complete

### Testing Approach

**No formal test framework** - manual testing workflow:

1. **Local Testing**: Open `index.html` in browser
2. **Verify**:
   - Player movement (WASD/arrows)
   - Mouse tracking and shooting
   - Enemy spawning and movement
   - Collision detection
   - Score updates
   - FPS counter accuracy
3. **Performance**: Check FPS stays near 60
4. **Edge Cases**:
   - Rapid clicking
   - Boundary collisions
   - Many entities on screen

### Debugging Tips

1. **Module Loading Errors**:
   - Check browser console for import/export errors
   - Verify file paths are correct (case-sensitive)
   - Ensure all imports use `.js` extension
   - Check that index.html uses `type="module"` in script tag

2. **Game State Issues**:
   - Log `gameState` object: `console.log(gameState)`
   - Check gameState.state value: 'title', 'playing', or 'gameover'
   - Verify arrays (enemies, bullets, particles) for unexpected values

3. **Collision Problems**:
   - Add console.log in `checkCollisions()` (js/game/collision.js)
   - Log distances and radii to verify collision math
   - Check if entities have correct hitRadius/radius values

4. **Spawning Issues**:
   - Log `gameState.enemies.length` and current phase
   - Check `spawnAccumulator` value in js/game/spawn.js
   - Verify `stageConfigs` has correct `allowedTypes`

5. **Movement Bugs**:
   - Log player position in `Player.update()` (js/classes/Player.js)
   - Check deltaTime value (should be ~0.016 for 60fps)
   - Verify speed calculations include deltaTime multiplier

6. **Rendering Issues**:
   - Check canvas transform (scale, offsetX, offsetY)
   - Verify ctx.restore() is called after ctx.save()
   - Log entity positions to ensure they're within GAME_WIDTH/GAME_HEIGHT

7. **Performance Issues**:
   - Check number of particles: `gameState.particles.length`
   - Monitor array sizes in browser DevTools
   - Verify off-screen entities are being removed

## GitHub Pages Deployment

The game is deployed as a static site on GitHub Pages.

**Deployment Process**:
1. Push changes to main branch
2. GitHub Pages serves from root, redirects to src/
3. No build step required
4. Access at: `https://velgail.github.io/Orbit-Bloom/`

**Project Structure**:
- Game files are in `src/` directory
- Root `index.html` redirects to `src/index.html`
- This separates source code from documentation files

**Important**: All paths must be relative for GitHub Pages to work correctly.

## Future Development Roadmap

See `docs/spec-orbit-bloom.md` for the complete vision. Key planned features:

### Phase 1 (Current Implementation - Partially Complete)
- ✅ Basic player movement
- ✅ Click-to-shoot mechanic
- ✅ Simple enemy spawning
- ✅ Collision detection
- ✅ Score tracking
- ❌ Auto-firing (currently click-to-shoot)

### Phase 2 (Planned)
- [ ] Dash mechanic with cooldown
- [ ] Multiple enemy types (zigzag, homing, shooter)
- [ ] Life system with invincibility frames
- [ ] Enemy bullets
- [ ] Particle effects

### Phase 3 (Planned)
- [ ] Stage system with phases
- [ ] Mobile touch controls
- [ ] Game over / retry UI
- [ ] Time-based survival mode
- [ ] Proper coordinate scaling system

### Phase 4 (Optional)
- [ ] Sound effects
- [ ] Background music
- [ ] Highscore persistence
- [ ] Multiple stages

## Spec Document Reference

The `docs/spec-orbit-bloom.md` file is the authoritative design document (written in Japanese). It contains:

- Detailed game mechanics specifications
- Entity behavior definitions
- Stage configuration system
- Input handling for PC and mobile
- Parameter tables for tuning
- Code structure recommendations
- Class and function organization

**When making significant changes**, consult this spec to ensure alignment with the intended design.

## Key Design Principles

1. **Simplicity First**: Keep code readable and maintainable
2. **No Dependencies**: Pure vanilla JS/HTML/CSS only
3. **Visual = Code**: All graphics rendered via canvas primitives
4. **Parameterized**: Easy difficulty tuning via config objects
5. **Frame Independent**: All timing uses delta time
6. **Beginner Friendly**: Game should be accessible to casual players

## Common Pitfalls to Avoid

1. **Don't** add external libraries without discussing first
2. **Don't** use image files for graphics
3. **Don't** hardcode magic numbers - use config object
4. **Don't** forget delta time in movement calculations
5. **Don't** mutate arrays while iterating forward
6. **Don't** assume 60 FPS - always use deltaTime

## Working with AI Assistants

### Best Practices for AI Development

1. **Reference the Spec**: Always check `docs/spec-orbit-bloom.md` for intended behavior
2. **Maintain Patterns**: Follow existing code structure and naming
3. **Test Incrementally**: Make small changes and verify in browser
4. **Preserve Simplicity**: Don't over-engineer solutions
5. **Document Changes**: Add comments for non-obvious code

### Typical Request Patterns

**Good Request**:
> "Add a dash mechanic as described in docs/spec-orbit-bloom.md section 4.3, using the PLAYER_PARAMS structure recommended in section 8"

**Less Ideal Request**:
> "Make the game better" (too vague)

**Good Request**:
> "Implement the zigzag enemy type from the spec with configurable amplitude and frequency"

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
1. Test in browser
2. Verify no console errors
3. Check FPS stays stable
4. Verify all features work
5. Ensure code follows existing patterns

## Getting Help

### Documentation Priority
1. This file (CLAUDE.md) - High-level guidance
2. `docs/spec-orbit-bloom.md` - Detailed specifications
3. Code comments in `main.js` - Implementation details
4. README.md - Project overview

### Understanding the Codebase

**Entry Point**:
- **Start at**: js/main.js
- **Initialize**: `init()` from js/game/state.js
- **Input setup**: `initInputHandlers()` from js/game/input.js
- **Game loop**: `gameLoop()` in js/main.js

**Code Flow**:
1. **Game loop** → `updateGame(dt)` → `render()`
2. **Update phase**:
   - Player.update()
   - spawnEnemies() from js/game/spawn.js
   - Enemy.update() for all enemies
   - Bullet.update() for all bullets
   - Particle.update() for all particles
   - checkCollisions() from js/game/collision.js
   - updateUI() from js/game/ui.js
3. **Render phase**: render() from js/game/render.js

**Entity Lifecycle**:
- **Spawn**: Created in spawn.js or class method
- **Update**: `update(dt)` called each frame
- **Draw**: `draw(ctx)` called each frame
- **Collision**: Checked in collision.js
- **Remove**: Array.splice() when off-screen or destroyed

**State Flow**:
- **Input** (js/game/input.js) → **gameState** (js/game/state.js) → **Class updates** → **Rendering** (js/game/render.js)

**Module Dependencies**:
```
config.js (no dependencies, exports constants)
   ↓
classes/* (import from config.js)
   ↓
game/* (import from config.js and classes/*)
   ↓
main.js (imports from all modules)
```

## Version Information

- **Current State**: Feature-complete implementation with mobile support
- **Architecture**: Modular ES6 modules in src/ directory
- **Spec Version**: Draft v1 (see docs/spec-orbit-bloom.md)
- **Last Updated**: 2025-11-15

**Major Changes**:
- 2025-11-15 (latest):
  - Reorganized project structure (moved code to src/ directory)
  - Implemented full mobile touch controls (virtual joystick + dash button)
  - Added js/game/touch.js module for touch control system
  - Auto-detection for mobile devices (touch + screen size ≤768px)
- 2025-11-15 (initial):
  - Refactored from monolithic main.js (~900 lines) to modular architecture
  - Separated code into js/config.js, js/classes/*, and js/game/*
  - Implemented all Phase 1 and Phase 2 features from spec
  - Added comprehensive task management guidelines

## Questions to Ask Before Making Changes

1. Does this align with the spec document?
2. Does this maintain the "no dependencies" principle?
3. Will this require changes to the config object?
4. Does this preserve frame-rate independence?
5. Is this testable by simply opening index.html?
6. Does this maintain code simplicity?

---

**Remember**: Orbit-Bloom is designed to be a simple, accessible game with clean, understandable code. When in doubt, favor simplicity and clarity over clever optimizations.
