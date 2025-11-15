// =========================================
// Touch Controls for Mobile
// =========================================

import { gameState } from './state.js';

// Touch control state
export const touchControls = {
  enabled: false,
  joystick: {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    radius: 60, // Joystick base radius
    maxDistance: 40, // Max joystick displacement
  },
  dashButton: {
    x: 0, // Will be set on init
    y: 0, // Will be set on init
    radius: 40,
    active: false,
    cooldown: 0,
  },
  activeTouches: new Map(), // Track multiple touches by identifier
};

/**
 * Detect if device should use touch controls
 */
export function shouldUseTouchControls() {
  // Check for touch capability and small screen
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;
  return hasTouchScreen && isSmallScreen;
}

/**
 * Initialize touch controls
 */
export function initTouchControls(canvas) {
  touchControls.enabled = shouldUseTouchControls();

  if (!touchControls.enabled) {
    return; // Don't set up touch controls for desktop
  }

  // Position dash button (bottom right)
  const rect = canvas.getBoundingClientRect();
  touchControls.dashButton.x = rect.width - 80;
  touchControls.dashButton.y = rect.height - 80;

  // Joystick is positioned bottom left (drawn dynamically)
}

/**
 * Handle touch start event
 */
export function handleTouchStart(e, canvas) {
  if (!touchControls.enabled) return;

  e.preventDefault();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;

    // Check if touching dash button
    const dashDist = Math.sqrt(
      Math.pow(touchX - touchControls.dashButton.x, 2) +
      Math.pow(touchY - touchControls.dashButton.y, 2)
    );

    if (dashDist < touchControls.dashButton.radius) {
      // Dash button pressed
      touchControls.activeTouches.set(touch.identifier, 'dash');
      if (gameState.player && touchControls.dashButton.cooldown <= 0) {
        gameState.player.dash();
        touchControls.dashButton.cooldown = 0.3; // Visual cooldown
      }
    } else if (touchX < rect.width / 2) {
      // Left side of screen - joystick area
      touchControls.activeTouches.set(touch.identifier, 'joystick');
      touchControls.joystick.active = true;
      touchControls.joystick.startX = touchX;
      touchControls.joystick.startY = touchY;
      touchControls.joystick.currentX = touchX;
      touchControls.joystick.currentY = touchY;
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
    const touchType = touchControls.activeTouches.get(touch.identifier);

    if (touchType === 'joystick') {
      const rect = canvas.getBoundingClientRect();
      touchControls.joystick.currentX = touch.clientX - rect.left;
      touchControls.joystick.currentY = touch.clientY - rect.top;

      // Calculate delta from start position
      let deltaX = touchControls.joystick.currentX - touchControls.joystick.startX;
      let deltaY = touchControls.joystick.currentY - touchControls.joystick.startY;

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

  e.preventDefault();

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const touchType = touchControls.activeTouches.get(touch.identifier);

    if (touchType === 'joystick') {
      touchControls.joystick.active = false;
      touchControls.joystick.deltaX = 0;
      touchControls.joystick.deltaY = 0;
    }

    touchControls.activeTouches.delete(touch.identifier);
  }
}

/**
 * Update touch controls (called each frame)
 */
export function updateTouchControls(dt) {
  if (!touchControls.enabled) return;

  // Update dash button cooldown
  if (touchControls.dashButton.cooldown > 0) {
    touchControls.dashButton.cooldown -= dt;
  }

  // Apply joystick input to player movement
  if (touchControls.joystick.active && gameState.player) {
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
export function drawTouchControls(ctx, canvas) {
  if (!touchControls.enabled || gameState.state !== 'playing') return;

  // Save context
  ctx.save();
  ctx.globalAlpha = 0.4;

  // Draw joystick base (if active)
  if (touchControls.joystick.active) {
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
    ctx.arc(80, canvas.height - 80, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Draw arrows hint
    ctx.fillStyle = '#40E0FF';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↕', 80, canvas.height - 80);
  }

  // Draw dash button
  const dashAlpha = touchControls.dashButton.cooldown > 0 ? 0.2 : 0.4;
  ctx.globalAlpha = dashAlpha;
  ctx.fillStyle = '#FFD95A';
  ctx.beginPath();
  ctx.arc(
    touchControls.dashButton.x,
    touchControls.dashButton.y,
    touchControls.dashButton.radius,
    0, Math.PI * 2
  );
  ctx.fill();

  // Dash button text
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DASH', touchControls.dashButton.x, touchControls.dashButton.y);

  // Restore context
  ctx.restore();
}
