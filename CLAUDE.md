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
├── index.html          # Main HTML entry point
├── main.js             # Core game logic (~312 lines)
├── style.css           # Styling and layout (~49 lines)
├── LICENSE             # Boost Software License 1.0
├── README.md           # Project README (Japanese)
├── docs/
│   └── spec-orbit-bloom.md  # Comprehensive technical spec (Japanese, ~400 lines)
└── CLAUDE.md           # This file
```

### File Purposes

- **index.html**: Minimal HTML structure with canvas element and game info display
- **main.js**: Contains all game logic including game loop, entities, collision detection
- **style.css**: Simple styling with dark gradient background and centered layout
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

### Game Loop Pattern

The game uses `requestAnimationFrame` for smooth rendering:

```javascript
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
    // Update game state
    // Render frame
    requestAnimationFrame(gameLoop);
}
```

**Key Points**:
- Delta time is calculated in seconds for frame-rate independence
- FPS counter updates every second
- All movement/timers use delta time for consistency

### Core Components

#### 1. Configuration Object (main.js:2-9)
```javascript
const config = {
    canvasWidth: 800,
    canvasHeight: 600,
    targetFPS: 60,
    playerSpeed: 200,
    enemySpeed: 50,
    enemySpawnRate: 2000,
};
```

**Convention**: All tunable parameters should be in the `config` object for easy balancing.

#### 2. Game State Object (main.js:12-27)
Central state management object containing:
- Player position, size, color
- Arrays of enemies and bullets
- Score tracking
- Input state (keys, mouse position)
- Timing data (last shot, last enemy spawn)

**Convention**: All mutable game state lives in `gameState` object.

#### 3. Entity Classes

**Enemy Class** (main.js:59-94):
- Constructor takes spawn position (x, y)
- `update(deltaTime)`: Moves toward player
- `draw()`: Renders circle with glow effect

**Bullet Class** (main.js:96-134):
- Constructor takes start position and target
- `update(deltaTime)`: Moves in calculated direction
- `draw()`: Renders with shadow/trail effect
- `isOffScreen()`: Bounds checking for cleanup

**Convention**: All entities have `update(deltaTime)` and `draw()` methods.

### Game Systems

#### Input Handling (main.js:39-56)
- **Keyboard**: WASD or arrow keys for movement
- **Mouse**: Track position and click to shoot
- **Pattern**: Event listeners update `gameState.keys` and `gameState.mouse`

#### Player Movement (main.js:137-155)
- Immediate response (no inertia)
- Speed modified by deltaTime
- Clamped to canvas boundaries

#### Enemy Spawning (main.js:171-199)
- Time-based spawning (every 2000ms by default)
- Random edge selection (top, right, bottom, left)
- Enemies added to `gameState.enemies` array

#### Shooting Mechanic (main.js:201-213)
- Cooldown-based (200ms default)
- Click-to-shoot at mouse cursor
- Bullets calculate direction on creation

#### Collision Detection (main.js:215-249)
- **Bullet-Enemy**: Circle collision, removes both, adds score
- **Player-Enemy**: Circle collision, reduces score (placeholder for damage)
- Uses distance formula: `sqrt(dx² + dy²)`

#### Rendering Pipeline (main.js:289-304)
1. Clear canvas (black background)
2. Draw starfield (static pattern)
3. Draw player with glow
4. Draw all enemies
5. Draw all bullets

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

## Working with This Codebase

### Common Tasks

#### Adding a New Enemy Type

1. Extend or create new class similar to `Enemy`
2. Add type-specific behavior in `update()` method
3. Customize `draw()` for visual distinction
4. Modify `spawnEnemy()` to include new type

#### Adjusting Game Difficulty

Modify values in `config` object:
- `playerSpeed`: Higher = easier dodging
- `enemySpeed`: Higher = more challenging
- `enemySpawnRate`: Lower = more enemies
- `shootCooldown`: Lower = more firepower

#### Adding New Controls

1. Add event listener in input handling section
2. Store state in `gameState.keys` or similar
3. Process in update functions
4. Example: Adding dash mechanic would need:
   - Key listener for dash button
   - Cooldown timer in `gameState`
   - Speed multiplier in `updatePlayer()`

#### Implementing New Features

Reference `docs/spec-orbit-bloom.md` for planned features:
- Dash mechanic (Shift/Space key)
- Multiple enemy types (zigzag, homing, shooter)
- Stage/phase system
- Particle effects
- Mobile touch controls
- Life system with invincibility frames

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

1. **FPS Issues**: Check FPS counter on screen
2. **Collision Problems**: Add console.log in `checkCollisions()`
3. **Spawning Issues**: Log `gameState.enemies.length`
4. **Movement Bugs**: Log player position in `updatePlayer()`

## GitHub Pages Deployment

The game is deployed as a static site on GitHub Pages.

**Deployment Process**:
1. Push changes to main branch
2. GitHub Pages automatically serves from root
3. No build step required
4. Access at: `https://velgail.github.io/Orbit-Bloom/`

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
- **Start at**: `main.js` game loop (line 256)
- **Trace flow**: loop → update → render
- **Entity lifecycle**: spawn → update → draw → collision → remove
- **State flow**: input → state mutation → rendering

## Version Information

- **Current State**: MVP with basic shooting mechanics
- **Spec Version**: Draft v1 (see docs/spec-orbit-bloom.md)
- **Last Updated**: 2025-11-14

## Questions to Ask Before Making Changes

1. Does this align with the spec document?
2. Does this maintain the "no dependencies" principle?
3. Will this require changes to the config object?
4. Does this preserve frame-rate independence?
5. Is this testable by simply opening index.html?
6. Does this maintain code simplicity?

---

**Remember**: Orbit-Bloom is designed to be a simple, accessible game with clean, understandable code. When in doubt, favor simplicity and clarity over clever optimizations.
