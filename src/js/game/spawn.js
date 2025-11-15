// =========================================
// Enemy Spawning
// =========================================

import { GAME_WIDTH } from '../config.js';
import { gameState, getCurrentPhase } from './state.js';
import { Enemy } from '../classes/Enemy.js';
import { getEnemyPowerMultipliers } from './power.js';

/**
 * Spawn enemies based on current phase
 * @param {number} dt - Delta time in seconds
 */
export function spawnEnemies(dt) {
  const phase = getCurrentPhase();
  if (!phase) return;

  // Apply power multiplier to spawn rate
  const powerMult = getEnemyPowerMultipliers();
  const effectiveSpawnRate = phase.spawnRate * powerMult.spawnRate;

  gameState.spawnAccumulator += effectiveSpawnRate * dt;

  while (gameState.spawnAccumulator >= 1 && gameState.enemies.length < phase.maxEnemies) {
    gameState.spawnAccumulator -= 1;

    // Pick random enemy type from allowed types
    const type = phase.allowedTypes[Math.floor(Math.random() * phase.allowedTypes.length)];

    // Spawn at random x position, above screen
    const x = Math.random() * GAME_WIDTH;
    const y = -20;

    gameState.enemies.push(new Enemy(type, x, y, phase.enemySpeedMultiplier, gameState));
  }
}
