// =========================================
// Rendering
// =========================================

import { gameState, canRestart } from './state.js';
import { drawTouchControls, touchControls } from './touch.js';
import { isMuted } from './audio.js';

/**
 * Draw title screen overlay
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w - View width (CSS pixels)
 * @param {number} h - View height (CSS pixels)
 */
function drawTitleScreen(ctx, w, h) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, w, h);

  // Title with the game's signature glow
  ctx.save();
  ctx.shadowColor = '#40E0FF';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#40E0FF';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Orbit-Bloom', w / 2, h / 2 - 60);
  ctx.restore();

  if (gameState.highScore > 0) {
    ctx.fillStyle = '#FFD95A';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`BEST: ${gameState.highScore}`, w / 2, h / 2 - 10);
  }

  // Pulsing start prompt
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 400);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(touchControls.enabled ? 'Tap to Start' : 'Click or Press Any Key to Start', w / 2, h / 2 + 40);
  ctx.restore();

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#AAAAAA';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (touchControls.enabled) {
    ctx.fillText('Left: Virtual Stick | Right Button: Dash', w / 2, h / 2 + 100);
  } else {
    ctx.fillText('WASD/Arrow Keys: Move | Shift/Space: Dash', w / 2, h / 2 + 100);
    ctx.fillText(`P: Pause | M: Sound ${isMuted() ? 'OFF' : 'ON'}`, w / 2, h / 2 + 125);
  }
}

/**
 * Draw game over screen overlay
 */
function drawGameOverScreen(ctx, w, h) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#FF5A5A';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Game Over', w / 2, h / 2 - 110);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '32px sans-serif';
  ctx.fillText(`Score: ${gameState.score}`, w / 2, h / 2 - 45);

  if (gameState.isNewRecord) {
    // Flashing celebration
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 150);
    ctx.fillStyle = '#FFD95A';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('NEW RECORD!', w / 2, h / 2 - 5);
    ctx.restore();
  } else {
    ctx.fillStyle = '#FFD95A';
    ctx.font = '20px sans-serif';
    ctx.fillText(`BEST: ${gameState.highScore}`, w / 2, h / 2 - 5);
  }

  ctx.fillStyle = '#40E0FF';
  ctx.font = '28px sans-serif';
  ctx.fillText(`Reached Wave ${gameState.stageIndex + 1}`, w / 2, h / 2 + 40);

  // Retry hint appears only after the restart lockout so the UI
  // matches what the input layer actually accepts
  if (canRestart()) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px sans-serif';
    ctx.fillText(touchControls.enabled ? 'Tap to Retry' : 'Click or Press Any Key to Retry', w / 2, h / 2 + 95);
  }
}

/**
 * Draw pause screen overlay
 */
function drawPauseScreen(ctx, w, h) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#40E0FF';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', w / 2, h / 2 - 30);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '20px sans-serif';
  ctx.fillText(touchControls.enabled ? 'Tap to Resume' : 'P/Esc or Click to Resume', w / 2, h / 2 + 30);
}

/**
 * Draw power-up notification
 */
function drawPowerUpNotification(ctx, w, h) {
  if (gameState.powerUpTimer <= 0) return;

  // Calculate fade and scale based on timer
  const progress = gameState.powerUpTimer / 2.0; // 2.0 is max timer
  const alpha = Math.min(1, progress * 2); // Fade in quickly, stay visible
  const scale = 1 + (1 - progress) * 0.3; // Scale up slightly

  ctx.save();
  ctx.globalAlpha = alpha;

  // Brief, capped flash so live bullets stay readable underneath
  const flashAlpha = progress > 0.9 ? (1 - (progress - 0.9) / 0.1) * 0.15 : 0;
  ctx.fillStyle = `rgba(255, 217, 90, ${flashAlpha})`;
  ctx.fillRect(0, 0, w, h);

  // Banner sits in the upper third, out of the dodging zone
  const bannerY = h * 0.28;

  // Draw main text
  ctx.fillStyle = '#FFD95A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.font = `bold ${Math.round(56 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Show "Wave X" message if just advanced a wave, otherwise "Power Up!"
  const text = gameState.powerLevel > 0 && gameState.powerUpTimer > 1.5 ? `WAVE ${gameState.stageIndex + 1}` : 'POWER UP!';
  ctx.strokeText(text, w / 2, bannerY - 30);
  ctx.fillText(text, w / 2, bannerY - 30);

  // Draw level text
  ctx.fillStyle = '#40E0FF';
  ctx.font = `bold ${Math.round(36 * scale)}px sans-serif`;
  const levelText = `LEVEL ${gameState.powerLevel}`;
  ctx.strokeText(levelText, w / 2, bannerY + 25);
  ctx.fillText(levelText, w / 2, bannerY + 25);

  ctx.restore();
}

/**
 * Main render function
 * @param {CanvasRenderingContext2D} ctx
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale - Canvas scale factor (CSS px per game unit)
 * @param {number} offsetX - Canvas X offset (CSS px)
 * @param {number} offsetY - Canvas Y offset (CSS px)
 * @param {number} dpr - Device pixel ratio of the backing store
 */
export function render(ctx, canvas, scale, offsetX, offsetY, dpr) {
  // Everything below works in CSS pixels on top of the dpr transform
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const viewWidth = canvas.width / dpr;
  const viewHeight = canvas.height / dpr;

  // Clear with gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, viewHeight);
  gradient.addColorStop(0, '#000428');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // Apply game coordinate transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Screen shake while the timer runs (decays via gameLoop)
  if (gameState.shakeTimer > 0) {
    const magnitude = gameState.shakeTimer * 24;
    ctx.translate((Math.random() * 2 - 1) * magnitude, (Math.random() * 2 - 1) * magnitude);
  }

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

  // Draw touch controls (in CSS-pixel screen coordinates)
  drawTouchControls(ctx, viewWidth, viewHeight);

  // Draw power-up notification (if active)
  if (gameState.state === 'playing') {
    drawPowerUpNotification(ctx, viewWidth, viewHeight);
  }

  // Draw UI overlays (in CSS-pixel screen coordinates, not game coordinates)
  if (gameState.state === 'title') {
    drawTitleScreen(ctx, viewWidth, viewHeight);
  } else if (gameState.state === 'gameover') {
    drawGameOverScreen(ctx, viewWidth, viewHeight);
  } else if (gameState.state === 'paused') {
    drawPauseScreen(ctx, viewWidth, viewHeight);
  }
}
