// =========================================
// UI Updates
// =========================================

import { gameState } from './state.js';

/**
 * Update UI elements based on game state
 */
export function updateUI() {
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('lives').textContent = gameState.lives;
  document.getElementById('time').textContent = Math.ceil(Math.max(0, gameState.timeLeft));

  // Show/hide UI based on game state
  const gameInfo = document.getElementById('gameInfo');
  if (gameState.state === 'playing') {
    gameInfo.style.display = 'block';
  } else {
    gameInfo.style.display = 'none';
  }
}
