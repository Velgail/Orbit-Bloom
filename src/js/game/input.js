// =========================================
// Input Handling
// =========================================

import { gameState, startGame, canRestart } from './state.js';
import { chooseUpgrade, activateNova } from './evolution.js';
import { initAudio, toggleMute } from './audio.js';
import {
  initTouchControls,
  resetTouchControls,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd
} from './touch.js';

/**
 * Start (or restart) the game from the title or game-over screen.
 * After a game over, input is ignored for a short lockout so panic
 * taps / held keys cannot skip the score screen.
 */
function tryStart() {
  if (gameState.state === 'gameover') {
    if (!canRestart()) return;
  } else if (gameState.state !== 'title') {
    return;
  }
  initAudio(); // First user gesture: safe point to create the AudioContext
  resetTouchControls();
  startGame();
}

function togglePause() {
  if (gameState.state === 'playing') {
    gameState.state = 'paused';
  } else if (gameState.state === 'paused') {
    gameState.state = 'playing';
  }
}

/**
 * Initialize input event listeners
 * @param {HTMLCanvasElement} canvas
 */
export function initInputHandlers(canvas) {
  document.getElementById('startButton').addEventListener('click', tryStart);
  document.getElementById('resumeButton').addEventListener('click', togglePause);
  document.getElementById('retryButton').addEventListener('click', tryStart);
  document.getElementById('pauseButton').addEventListener('click', togglePause);
  document.getElementById('soundButton').addEventListener('click', () => { initAudio(); toggleMute(); });
  document.getElementById('novaButton').addEventListener('click', activateNova);
  document.querySelectorAll('[data-choice]').forEach(button => {
    button.addEventListener('click', () => chooseUpgrade(Number(button.dataset.choice)));
  });
  // Keyboard input
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (gameState.state === 'upgrading') {
      if (!e.repeat && ['1', '2', '3'].includes(key)) chooseUpgrade(Number(key) - 1);
      e.preventDefault();
      return;
    }
    if (key === 'e' && gameState.state === 'playing') {
      if (!e.repeat) activateNova();
      return;
    }

    // Mute toggle (works in any state, never starts the game)
    if (key === 'm') {
      if (!e.repeat) toggleMute();
      return;
    }

    // Pause toggle
    if (key === 'escape' || key === 'p') {
      if (!e.repeat) togglePause();
      return;
    }

    gameState.keys[key] = true;

    // Dash on Shift or Space
    if ((e.key === 'Shift' || e.key === ' ') && gameState.state === 'playing' && gameState.player) {
      gameState.player.dash();
      e.preventDefault();
    }

    // Start game on any key from the title or game-over screen
    // (tryStart no-ops in other states). e.repeat is ignored so a
    // movement key still held from before death cannot auto-restart
    // the moment the lockout expires.
    if (!e.repeat) {
      tryStart();
    }
  });

  document.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
  });

  // Keys released while the window is unfocused never fire keyup here;
  // clear everything so the ship doesn't drift on its own, and pause
  // the run since the player is gone
  window.addEventListener('blur', () => {
    gameState.keys = {};
    if (gameState.state === 'playing') {
      gameState.state = 'paused';
    }
  });

  // Mouse input
  canvas.addEventListener('click', () => {
    if (gameState.state === 'title' || gameState.state === 'gameover') {
      tryStart();
    } else if (gameState.state === 'paused') {
      togglePause();
    }
  });

  // Initialize touch controls
  initTouchControls();

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    if (gameState.state === 'title' || gameState.state === 'gameover') {
      e.preventDefault();
      tryStart();
    } else if (gameState.state === 'paused') {
      e.preventDefault();
      togglePause();
    } else if (gameState.state === 'playing') {
      handleTouchStart(e, canvas);
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (gameState.state === 'playing') {
      handleTouchMove(e, canvas);
    }
  }, { passive: false });

  // Ending a touch is always safe — never gate these on game state,
  // or a joystick held at the moment of death leaks into the next run
  canvas.addEventListener('touchend', (e) => {
    handleTouchEnd(e);
  }, { passive: false });

  canvas.addEventListener('touchcancel', (e) => {
    handleTouchEnd(e);
  }, { passive: false });
}
