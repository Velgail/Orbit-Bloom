// =========================================
// Rendering
// =========================================

import { gameState } from './state.js';

/**
 * Draw title screen overlay
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
function drawTitleScreen(ctx, canvas) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#40E0FF';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Orbit-Bloom', canvas.width / 2, canvas.height / 2 - 40);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '24px sans-serif';
  ctx.fillText('Click or Press Any Key to Start', canvas.width / 2, canvas.height / 2 + 40);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#AAAAAA';
  ctx.fillText('WASD/Arrow Keys: Move | Shift/Space: Dash', canvas.width / 2, canvas.height / 2 + 100);
}

/**
 * Draw game over screen overlay
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
function drawGameOverScreen(ctx, canvas) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FF5A5A';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 60);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '32px sans-serif';
  ctx.fillText(`Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2);

  ctx.font = '24px sans-serif';
  ctx.fillText('Click or Press Any Key to Retry', canvas.width / 2, canvas.height / 2 + 60);
}

/**
 * Main render function
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale - Canvas scale factor
 * @param {number} offsetX - Canvas X offset
 * @param {number} offsetY - Canvas Y offset
 */
export function render(ctx, canvas, scale, offsetX, offsetY) {
  // Clear with gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#000428');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply game coordinate transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Draw stars
  for (const star of gameState.stars) {
    star.draw(ctx);
  }

  // Draw particles (background layer)
  for (const particle of gameState.particles) {
    particle.draw(ctx);
  }

  // Draw bullets
  for (const bullet of gameState.bullets) {
    bullet.draw(ctx);
  }

  // Draw enemies
  for (const enemy of gameState.enemies) {
    enemy.draw(ctx);
  }

  // Draw player
  if (gameState.player) {
    gameState.player.draw(ctx);
  }

  ctx.restore();

  // Draw UI overlays (in screen coordinates, not game coordinates)
  if (gameState.state === 'title') {
    drawTitleScreen(ctx, canvas);
  } else if (gameState.state === 'gameover') {
    drawGameOverScreen(ctx, canvas);
  }
}
