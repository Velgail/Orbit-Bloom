// =========================================
// Enemy Spawning
// =========================================

import { GAME_WIDTH } from '../config.js';
import { gameState, getCurrentPhase } from './state.js';
import { Enemy } from '../classes/Enemy.js';
import { getEnemyPowerMultipliers, getEffectiveMaxEnemies } from './power.js';

/**
 * Spawn enemies based on current phase
 * @param {number} dt - Delta time in seconds
 */
export function spawnEnemies(dt) {
  const phase = getCurrentPhase();
  if (!phase || gameState.bossSpawned) return;

  // Apply power multiplier to spawn rate; the on-screen cap also grows with power level
  const powerMult = getEnemyPowerMultipliers();
  const effectiveSpawnRate = (phase.spawnRate * 2.4 + 0.6) * powerMult.spawnRate;
  const maxEnemies = getEffectiveMaxEnemies(phase.maxEnemies);

  gameState.spawnAccumulator += effectiveSpawnRate * dt;

  while (gameState.spawnAccumulator >= 1 && gameState.enemies.length < maxEnemies) {
    gameState.spawnAccumulator -= 1;

    // Pick random enemy type from allowed types (duplicated entries act as weights)
    const type = phase.allowedTypes[Math.floor(Math.random() * phase.allowedTypes.length)];

    // Spawn at random x position, above screen
    const x = Math.random() * GAME_WIDTH;
    const y = -20;

    gameState.enemies.push(new Enemy(type, x, y, phase.enemySpeedMultiplier, gameState));
  }

  // While the screen is saturated the accumulator must not build a backlog,
  // or every kill would be replaced the same frame in a burst
  gameState.spawnAccumulator = Math.min(gameState.spawnAccumulator, 1);
}
