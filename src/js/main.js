// =========================================
// Orbit-Bloom - Main Entry Point
// =========================================

import { Boss } from './classes/Boss.js';
import { updateEvolution } from './game/evolution.js';
import { GAME_WIDTH, GAME_HEIGHT, stageConfigs } from './config.js';
import { gameState, init, getCurrentPhase } from './game/state.js';
import { initInputHandlers } from './game/input.js';
import { initTouchControls, updateTouchControls } from './game/touch.js';
import { triggerPowerUp, updatePowerTimer } from './game/power.js';
import { checkCollisions } from './game/collision.js';
import { spawnEnemies } from './game/spawn.js';
import { updateUI } from './game/ui.js';
import { render } from './game/render.js';

// =========================================
// Canvas Setup and Scaling
// =========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let dpr = 1;
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
  // Render at device resolution for crisp output on high-DPI screens;
  // all game/UI code keeps working in CSS pixels via the dpr transform
  dpr = window.devicePixelRatio || 1;
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  canvas.width = viewWidth * dpr;
  canvas.height = viewHeight * dpr;
  canvas.style.width = viewWidth + 'px';
  canvas.style.height = viewHeight + 'px';

  // Calculate scale to fit game area (in CSS pixels)
  const scaleX = viewWidth / GAME_WIDTH;
  const fieldTop = 140;
  const scaleY = Math.max(150, viewHeight - fieldTop - 40) / GAME_HEIGHT;
  scale = Math.min(scaleX, scaleY);

  // Calculate offset to center the game (in CSS pixels)
  offsetX = (viewWidth - GAME_WIDTH * scale) / 2;
  offsetY = fieldTop + Math.max(0, (viewHeight - fieldTop - 40 - GAME_HEIGHT * scale) / 2);

  // Touch controls depend on the viewport: re-evaluate on every resize
  initTouchControls();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
resizeCanvas();

// =========================================
// Game Update Logic
// =========================================

function updateGame(dt) {
  // Clamp deltaTime to avoid huge jumps
  dt = Math.min(dt, 0.05);

  // Update timer
  gameState.elapsedTime += dt;
  gameState.timeLeft = stageConfigs[gameState.stageIndex].duration - gameState.elapsedTime;

  // Each sector culminates in a boss. Its defeat, rather than a timer,
  // opens the next sector (including endless waves beyond wave four).
  if (gameState.elapsedTime >= 45 && !gameState.bossSpawned) {
    gameState.bossSpawned = true;
    gameState.boss = new Boss(gameState);
    gameState.enemies = [gameState.boss];
    gameState.bullets = gameState.bullets.filter(b => b.owner === 'player');
  }
  if (gameState.bossSpawned && gameState.boss?.hp <= 0) {
    triggerPowerUp();
    gameState.wave++;
    gameState.stageIndex = Math.min(gameState.wave - 1, stageConfigs.length - 1);
    gameState.elapsedTime = 0;
    gameState.timeLeft = 60;
    gameState.boss = null;
    gameState.bossSpawned = false;
    gameState.lives = Math.min(5, gameState.lives + 1);
  }

  // Update power-up timer
  updatePowerTimer(dt);

  // Update touch controls
  updateTouchControls();

  // Update player
  if (gameState.player) {
    gameState.player.update(dt);
  }

  // Spawn enemies
  const phase = getCurrentPhase();
  spawnEnemies(dt);

  // Update enemies
  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    enemy.update(dt, phase ? phase.bulletSpeed : 150);

    if (enemy.isOffScreen()) {
      gameState.enemies.splice(i, 1);
    }
  }

  // Update bullets
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    bullet.update(dt);

    if (bullet.isOffScreen()) {
      gameState.bullets.splice(i, 1);
    }
  }

  // Update particles
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const particle = gameState.particles[i];
    particle.update(dt);

    if (particle.isDead()) {
      gameState.particles.splice(i, 1);
    }
  }

  // Update stars
  for (const star of gameState.stars) {
    star.update(dt);
  }

  // Check collisions
  checkCollisions();

  updateEvolution(dt);
}

// =========================================
// Game Loop
// =========================================

let lastTime = performance.now();

function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  lastTime = currentTime;

  if (gameState.state === 'playing') {
    updateGame(deltaTime);
  } else {
    // Keep the starfield alive on title / pause / game-over screens
    const dt = Math.min(deltaTime, 0.05);
    for (const star of gameState.stars) {
      star.update(dt);
    }
  }

  // Screen shake decays in every state so the game-over screen settles
  gameState.shakeTimer = Math.max(0, gameState.shakeTimer - deltaTime);

  updateUI();
  render(ctx, canvas, scale, offsetX, offsetY, dpr);

  requestAnimationFrame(gameLoop);
}

// =========================================
// Initialize and Start
// =========================================

init();
initInputHandlers(canvas);
updateUI();
requestAnimationFrame(gameLoop);
