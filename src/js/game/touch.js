// =========================================
// Touch Controls for Mobile
// =========================================

import { gameState } from './state.js';

// Touch control state
export const touchControls = {
  enabled: false,
  joystick: {
    touchId: null, // Owner touch identifier; null = inactive, other touches are ignored
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0,
    radius: 60, // Joystick base radius
    maxDistance: 40, // Max joystick displacement
  },
  dashButton: {
    radius: 40,
  },
};

/**
 * Dash button position, derived from the current canvas size so it
 * survives resize and orientation changes
 */
function getDashButtonPosition(rect) {
  return { x: rect.width - 80, y: rect.height - 80 };
}

/**
 * Detect if device should use touch controls.
 * Capability-based: any touch-capable device gets the overlay, so
 * tablets and large phones are playable too. Keyboard input keeps
 * working regardless.
 */
export function shouldUseTouchControls() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * (Re-)evaluate whether touch controls are enabled.
 * Called at startup and on resize/orientation change.
 */
export function initTouchControls() {
  touchControls.enabled = shouldUseTouchControls();
}

/**
 * Reset all transient touch state. Called on every game start so a
 * joystick held at the moment of death cannot leak phantom movement
 * into the next run.
 */
export function resetTouchControls() {
  touchControls.joystick.touchId = null;
  touchControls.joystick.deltaX = 0;
  touchControls.joystick.deltaY = 0;
  gameState.touchMove = { x: 0, y: 0 };
}

/**
 * Handle touch start event
 */
export function handleTouchStart(e, canvas) {
  if (!touchControls.enabled) return;

  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const dashPos = getDashButtonPosition(rect);

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // Check if touching dash button
    const dashDist = Math.sqrt(
      Math.pow(touchX - dashPos.x, 2) +
      Math.pow(touchY - dashPos.y, 2)
    );

    if (dashDist < touchControls.dashButton.radius) {
      if (gameState.player) {
        gameState.player.dash(); // Player enforces the real cooldown
      }
    } else if (
      touchX < rect.width / 2 &&
      touchY > rect.height * 0.35 && // Keep the HUD / incoming-enemy zone free
      touchControls.joystick.touchId === null
    ) {
      // Lower-left area: claim the joystick (single owner)
      touchControls.joystick.touchId = touch.identifier;
      touchControls.joystick.startX = touchX;
      touchControls.joystick.startY = touchY;
      touchControls.joystick.deltaX = 0;
      touchControls.joystick.deltaY = 0;
    }
  }
}

/**
 * Handle touch move event
 */
export function handleTouchMove(e, canvas) {
  if (!touchControls.enabled) return;

  e.preventDefault();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    if (touch.identifier === touchControls.joystick.touchId) {
      const rect = canvas.getBoundingClientRect();

      // Calculate delta from start position
      let deltaX = (touch.clientX - rect.left) - touchControls.joystick.startX;
      let deltaY = (touch.clientY - rect.top) - touchControls.joystick.startY;

      // Clamp to max distance
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (distance > touchControls.joystick.maxDistance) {
        const angle = Math.atan2(deltaY, deltaX);
        deltaX = Math.cos(angle) * touchControls.joystick.maxDistance;
        deltaY = Math.sin(angle) * touchControls.joystick.maxDistance;
      }

      touchControls.joystick.deltaX = deltaX;
      touchControls.joystick.deltaY = deltaY;
    }
  }
}

/**
 * Handle touch end event
 */
export function handleTouchEnd(e) {
  if (!touchControls.enabled) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === touchControls.joystick.touchId) {
      touchControls.joystick.touchId = null;
      touchControls.joystick.deltaX = 0;
      touchControls.joystick.deltaY = 0;
    }
  }
}

/**
 * Update touch controls (called each frame)
 */
export function updateTouchControls() {
  if (!touchControls.enabled) return;

  // Apply joystick input to player movement
  if (touchControls.joystick.touchId !== null && gameState.player) {
    const maxDist = touchControls.joystick.maxDistance;
    const moveX = touchControls.joystick.deltaX / maxDist;
    const moveY = touchControls.joystick.deltaY / maxDist;

    // Store in gameState for player to use
    gameState.touchMove = { x: moveX, y: moveY };
  } else {
    gameState.touchMove = { x: 0, y: 0 };
  }
}

/**
 * Draw touch controls overlay
 */
export function drawTouchControls(ctx, viewWidth, viewHeight) {
  if (!touchControls.enabled || gameState.state !== 'playing') return;

  const dashPos = getDashButtonPosition({ width: viewWidth, height: viewHeight });

  // Save context
  ctx.save();
  ctx.globalAlpha = 0.4;

  // Draw joystick base (if active)
  if (touchControls.joystick.touchId !== null) {
    // Base circle
    ctx.strokeStyle = '#40E0FF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(
      touchControls.joystick.startX,
      touchControls.joystick.startY,
      touchControls.joystick.radius,
      0, Math.PI * 2
    );
    ctx.stroke();

    // Joystick stick
    ctx.fillStyle = '#40E0FF';
    ctx.beginPath();
    ctx.arc(
      touchControls.joystick.startX + touchControls.joystick.deltaX,
      touchControls.joystick.startY + touchControls.joystick.deltaY,
      20,
      0, Math.PI * 2
    );
    ctx.fill();
  } else {
    // Draw hint for joystick location (bottom left)
    ctx.strokeStyle = '#40E0FF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(80, viewHeight - 80, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Draw arrows hint
    ctx.fillStyle = '#40E0FF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↕', 80, viewHeight - 80);
  }

  // Draw dash button, dimmed while the REAL dash cooldown is running
  const cooldownRatio = gameState.player ? gameState.player.dashCooldownRatio() : 0;
  ctx.globalAlpha = cooldownRatio > 0 ? 0.2 : 0.4;
  ctx.fillStyle = '#FFD95A';
  ctx.beginPath();
  ctx.arc(dashPos.x, dashPos.y, touchControls.dashButton.radius, 0, Math.PI * 2);
  ctx.fill();

  // Cooldown sweep: arc grows clockwise until the dash is ready again
  if (cooldownRatio > 0) {
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = '#FFD95A';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(
      dashPos.x, dashPos.y,
      touchControls.dashButton.radius + 5,
      -Math.PI / 2,
      -Math.PI / 2 + (1 - cooldownRatio) * Math.PI * 2
    );
    ctx.stroke();
  }

  // Dash button text
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DASH', dashPos.x, dashPos.y);

  // Restore context
  ctx.restore();
}
