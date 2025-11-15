// =========================================
// Orbit-Bloom - Main Entry Point
// =========================================

import { GAME_WIDTH, GAME_HEIGHT, stageConfigs } from './config.js';
import { gameState, init, getCurrentPhase } from './game/state.js';
import { initInputHandlers } from './game/input.js';
import { updateTouchControls } from './game/touch.js';
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
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Calculate scale to fit game area
  const scaleX = canvas.width / GAME_WIDTH;
  const scaleY = canvas.height / GAME_HEIGHT;
  scale = Math.min(scaleX, scaleY);

  // Calculate offset to center the game
  offsetX = (canvas.width - GAME_WIDTH * scale) / 2;
  offsetY = (canvas.height - GAME_HEIGHT * scale) / 2;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Helper function for input handlers
function getScaleAndOffset() {
  return { scale, offsetX, offsetY };
}

// =========================================
// Game Update Logic
// =========================================

function updateGame(dt) {
  // Clamp deltaTime to avoid huge jumps
  dt = Math.min(dt, 0.05);

  // Update timer
  gameState.elapsedTime += dt;
  gameState.timeLeft = stageConfigs[gameState.stageIndex].duration - gameState.elapsedTime;

  if (gameState.timeLeft <= 0) {
    // Stage cleared! Trigger power-up
    triggerPowerUp();
    gameState.elapsedTime = 0;
  }

  // Update power-up timer
  updatePowerTimer(dt);

  // Update touch controls
  updateTouchControls(dt);

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

  // Update UI
  updateUI();
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
  }

  render(ctx, canvas, scale, offsetX, offsetY);

  requestAnimationFrame(gameLoop);
}

// =========================================
// Initialize and Start
// =========================================

init();
initInputHandlers(canvas, getScaleAndOffset);
updateUI();
requestAnimationFrame(gameLoop);
