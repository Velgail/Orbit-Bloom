// =========================================
// Input Handling
// =========================================

import { gameState, startGame } from './state.js';
import {
  initTouchControls,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd
} from './touch.js';

/**
 * Initialize input event listeners
 * @param {HTMLCanvasElement} canvas
 * @param {number} scale - Canvas scale factor
 * @param {number} offsetX - Canvas X offset
 * @param {number} offsetY - Canvas Y offset
 */
export function initInputHandlers(canvas, getScaleAndOffset) {
  // Keyboard input
  document.addEventListener('keydown', (e) => {
    gameState.keys[e.key.toLowerCase()] = true;

    // Dash on Shift or Space
    if ((e.key === 'Shift' || e.key === ' ') && gameState.state === 'playing' && gameState.player) {
      gameState.player.dash();
      e.preventDefault();
    }

    // Start game on any key in title screen
    if (gameState.state === 'title') {
      startGame();
    }
  });

  document.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
  });

  // Mouse/Touch input
  canvas.addEventListener('click', () => {
    if (gameState.state === 'title') {
      startGame();
    } else if (gameState.state === 'gameover') {
      startGame();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const { scale, offsetX, offsetY } = getScaleAndOffset();
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    // Convert to game coordinates
    gameState.mouse.x = (canvasX - offsetX) / scale;
    gameState.mouse.y = (canvasY - offsetY) / scale;
  });

  // Initialize touch controls
  initTouchControls(canvas);

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    if (gameState.state === 'title') {
      e.preventDefault();
      startGame();
    } else if (gameState.state === 'gameover') {
      e.preventDefault();
      startGame();
    } else if (gameState.state === 'playing') {
      handleTouchStart(e, canvas);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (gameState.state === 'playing') {
      handleTouchMove(e, canvas);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (gameState.state === 'playing') {
      handleTouchEnd(e);
    }
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    if (gameState.state === 'playing') {
      handleTouchEnd(e);
    }
  }, { passive: false });
}
