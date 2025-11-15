// =========================================
// Progressive Power System
// =========================================

import { gameState } from './state.js';
import { Particle } from '../classes/Particle.js';
import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

/**
 * Get player power scaling multipliers based on current power level
 */
export function getPlayerPowerMultipliers() {
  const level = gameState.powerLevel;
  return {
    moveSpeed: 1 + (level * 0.1), // 10% increase per level
    fireRate: 1 + (level * 0.15), // 15% faster shooting per level
    bulletSpeed: 1 + (level * 0.1), // 10% faster bullets per level
  };
}

/**
 * Get enemy power scaling multipliers based on current power level
 */
export function getEnemyPowerMultipliers() {
  const level = gameState.powerLevel;
  return {
    hp: 1 + (level * 0.3), // 30% more HP per level
    speed: 1 + (level * 0.12), // 12% faster per level
    spawnRate: 1 + (level * 0.15), // 15% faster spawning per level
  };
}

/**
 * Trigger a power-up when timer completes
 */
export function triggerPowerUp() {
  gameState.powerLevel++;
  gameState.powerUpTimer = 2.0; // 2 second animation

  // Create explosion of particles from center
  const centerX = GAME_WIDTH / 2;
  const centerY = GAME_HEIGHT / 2;

  // Create colorful burst
  for (let i = 0; i < 50; i++) {
    const angle = (Math.PI * 2 * i) / 50;
    const speed = 100 + Math.random() * 150;
    const colors = ['#FFD95A', '#40E0FF', '#FF5AF2', '#7CFF5A'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    gameState.particles.push(new Particle(
      centerX, centerY,
      color,
      1.0, // lifetime
      4,   // size
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    ));
  }

  // Create ring explosion
  for (let i = 0; i < 30; i++) {
    const angle = (Math.PI * 2 * i) / 30;
    const speed = 200 + Math.random() * 100;

    gameState.particles.push(new Particle(
      centerX, centerY,
      '#FFFFFF',
      0.8,
      3,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    ));
  }
}

/**
 * Update power-up timer
 */
export function updatePowerTimer(dt) {
  if (gameState.powerUpTimer > 0) {
    gameState.powerUpTimer -= dt;
  }
}
