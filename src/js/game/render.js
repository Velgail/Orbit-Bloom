// =========================================
// Rendering
// =========================================

import { gameState } from './state.js';
import { drawTouchControls } from './touch.js';

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
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 80);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '32px sans-serif';
  ctx.fillText(`Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 - 20);

  ctx.fillStyle = '#40E0FF';
  ctx.font = '28px sans-serif';
  ctx.fillText(`Reached Wave ${gameState.stageIndex + 1}`, canvas.width / 2, canvas.height / 2 + 20);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '24px sans-serif';
  ctx.fillText('Click or Press Any Key to Retry', canvas.width / 2, canvas.height / 2 + 70);
}

/**
 * Draw power-up notification
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 */
function drawPowerUpNotification(ctx, canvas) {
  if (gameState.powerUpTimer <= 0) return;

  // Calculate fade and scale based on timer
  const progress = gameState.powerUpTimer / 2.0; // 2.0 is max timer
  const alpha = Math.min(1, progress * 2); // Fade in quickly, stay visible
  const scale = 1 + (1 - progress) * 0.3; // Scale up slightly

  ctx.save();
  ctx.globalAlpha = alpha;

  // Flash background
  const flashAlpha = progress > 0.9 ? (1 - (progress - 0.9) / 0.1) * 0.3 : 0;
  ctx.fillStyle = `rgba(255, 217, 90, ${flashAlpha})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw main text
  ctx.fillStyle = '#FFD95A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.font = `bold ${Math.round(56 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Show "Wave X" message if just advanced a wave, otherwise "Power Up!"
  const text = gameState.powerLevel > 0 && gameState.powerUpTimer > 1.5 ? `WAVE ${gameState.stageIndex + 1}` : 'POWER UP!';
  ctx.strokeText(text, canvas.width / 2, canvas.height / 2 - 40);
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 40);

  // Draw level text
  ctx.fillStyle = '#40E0FF';
  ctx.font = `bold ${Math.round(36 * scale)}px sans-serif`;
  const levelText = `LEVEL ${gameState.powerLevel}`;
  ctx.strokeText(levelText, canvas.width / 2, canvas.height / 2 + 20);
  ctx.fillText(levelText, canvas.width / 2, canvas.height / 2 + 20);

  ctx.restore();
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

  // Draw touch controls (in screen coordinates)
  drawTouchControls(ctx, canvas);

  // Draw power-up notification (if active)
  if (gameState.state === 'playing') {
    drawPowerUpNotification(ctx, canvas);
  }

  // Draw UI overlays (in screen coordinates, not game coordinates)
  if (gameState.state === 'title') {
    drawTitleScreen(ctx, canvas);
  } else if (gameState.state === 'gameover') {
    drawGameOverScreen(ctx, canvas);
  }
}
