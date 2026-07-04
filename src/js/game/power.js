// =========================================
// Progressive Power System
// =========================================

import { gameState } from './state.js';
import { Particle, spawnBurst } from '../classes/Particle.js';
import { GAME_WIDTH, GAME_HEIGHT, POWER_PARAMS } from '../config.js';
import { playSfx } from './audio.js';

/**
 * Get player power scaling multipliers based on current power level
 */
export function getPlayerPowerMultipliers() {
  const level = gameState.powerLevel;
  const p = POWER_PARAMS.player;
  return {
    moveSpeed: Math.min(1 + level * p.moveSpeedPerLevel, p.moveSpeedCap),
    fireRate: 1 + level * p.fireRatePerLevel,
    bulletSpeed: 1 + level * p.bulletSpeedPerLevel,
    damage: 1 + Math.floor(level / p.damageEveryLevels),
  };
}

/**
 * Get enemy power scaling multipliers based on current power level
 */
export function getEnemyPowerMultipliers() {
  const level = gameState.powerLevel;
  const e = POWER_PARAMS.enemy;
  return {
    hp: 1 + level * e.hpPerLevel,
    speed: 1 + level * e.speedPerLevel,
    spawnRate: 1 + level * e.spawnRatePerLevel,
  };
}

/**
 * On-screen enemy cap grows +1 per power level (sustained late-game
 * pressure), capped at maxEnemiesCap total
 */
export function getEffectiveMaxEnemies(phaseMaxEnemies) {
  return Math.min(phaseMaxEnemies + gameState.powerLevel, POWER_PARAMS.enemy.maxEnemiesCap);
}

/**
 * Trigger a power-up when a wave is cleared
 */
export function triggerPowerUp() {
  gameState.powerLevel++;
  gameState.powerUpTimer = 2.0; // 2 second animation
  playSfx('powerUp');

  // Reward beat: pop all enemy bullets so the new wave starts on a clean screen
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const b = gameState.bullets[i];
    if (b.owner !== 'enemy') continue;
    spawnBurst(gameState.particles, b.x, b.y, {
      count: 3, color: '#FFFFFF', lifetime: 0.4, size: 2, minSpeed: 30, maxSpeed: 90,
    });
    gameState.bullets.splice(i, 1);
  }

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
