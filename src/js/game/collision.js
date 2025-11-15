// =========================================
// Collision Detection
// =========================================

import { gameState } from './state.js';

/**
 * Check all collisions in the game
 */
export function checkCollisions() {
  if (!gameState.player) return;

  // Player bullets vs enemies
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    if (bullet.owner !== 'player') continue;

    for (let j = gameState.enemies.length - 1; j >= 0; j--) {
      const enemy = gameState.enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bullet.radius + enemy.radius) {
        gameState.bullets.splice(i, 1);
        if (enemy.hit(1)) {
          gameState.enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // Enemy bullets vs player
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    if (bullet.owner !== 'enemy') continue;

    const dx = bullet.x - gameState.player.x;
    const dy = bullet.y - gameState.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bullet.radius + gameState.player.hitRadius) {
      gameState.bullets.splice(i, 1);
      gameState.player.hit();
    }
  }

  // Enemies vs player
  if (!gameState.player.isInvincible()) {
    for (const enemy of gameState.enemies) {
      const dx = enemy.x - gameState.player.x;
      const dy = enemy.y - gameState.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.radius + gameState.player.hitRadius) {
        gameState.player.hit();
        break; // Only one hit per frame
      }
    }
  }
}
