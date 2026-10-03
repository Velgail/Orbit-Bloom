// =========================================
// Rendering
// =========================================

import { gameState } from './state.js';
import { drawTouchControls } from './touch.js';
import { drawEvolution } from './evolution.js';

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
  gradient.addColorStop(0, '#0b1426');
  gradient.addColorStop(1, '#070b15');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  // Apply game coordinate transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // A bounded star corridor makes the playfield readable on wide displays.
  const glow = ctx.createRadialGradient(180, 200, 10, 180, 280, 420);
  glow.addColorStop(0, '#142e3833'); glow.addColorStop(1, '#070b1500');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 360, 640);
  ctx.strokeStyle = '#64e4e814'; ctx.lineWidth = 0.5;
  ctx.strokeRect(0, 0, 360, 640);
  if (gameState.state !== 'title') {
    ctx.strokeStyle = '#64e4e808';
    const scroll = gameState.elapsedTime * 10 % 40;
    for (let y = scroll; y < 640; y += 40) {ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(360,y);ctx.stroke();}
  }

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

  drawEvolution(ctx);
  ctx.restore();

  // Draw touch controls (in CSS-pixel screen coordinates)
  drawTouchControls(ctx, viewWidth, viewHeight);

  if (gameState.novaTimer > 0) {
    ctx.fillStyle = `rgba(100, 228, 232, ${gameState.novaTimer * 0.12})`;
    ctx.fillRect(0, 0, viewWidth, viewHeight);
  }
  if (gameState.powerUpTimer > 0 && gameState.state === 'playing') {
    ctx.save();ctx.globalAlpha = Math.min(1, gameState.powerUpTimer);
    ctx.textAlign = 'center';ctx.fillStyle = '#c5ff78';
    ctx.font = `bold ${Math.min(28, viewWidth / 14)}px monospace`;
    ctx.fillText(`SECTOR ${String(gameState.wave).padStart(2, '0')} / HULL +1`, viewWidth / 2, viewHeight * 0.3);
    ctx.restore();
  }
}
