// =========================================
// Game State Management
// =========================================

import { PLAYER_PARAMS, RESTART_LOCKOUT, stageConfigs } from '../config.js';
import { Player } from '../classes/Player.js';
import { Star } from '../classes/Star.js';
import { playSfx } from './audio.js';

const HIGH_SCORE_STORAGE_KEY = 'orbitBloomHighScore';

function loadHighScore() {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_STORAGE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}

// Game State Object
export const gameState = {
  state: 'title', // 'title', 'playing', 'paused', 'gameover'
  score: 0,
  highScore: loadHighScore(),
  isNewRecord: false,
  timeLeft: 0,
  elapsedTime: 0,
  lives: PLAYER_PARAMS.initialLives,
  stageIndex: 0,
  powerLevel: 0, // Progressive difficulty level (increments every wave)
  powerUpTimer: 0, // Timer for power-up animation
  gameoverAt: 0, // performance.now() timestamp of the last game over
  shakeTimer: 0, // Screen shake remaining seconds
  player: null,
  enemies: [],
  bullets: [],
  particles: [],
  stars: [],
  spawnAccumulator: 0,
  keys: {},
  touchMove: { x: 0, y: 0 }, // Touch joystick input (-1 to 1 for x and y)
};

/**
 * Initialize game - create background stars and set title screen
 */
export function init() {
  // Create background stars
  for (let i = 0; i < 100; i++) {
    gameState.stars.push(new Star());
  }

  // Show title screen
  gameState.state = 'title';
}

/**
 * Start/restart the game
 */
export function startGame() {
  gameState.state = 'playing';
  gameState.score = 0;
  gameState.isNewRecord = false;
  gameState.lives = PLAYER_PARAMS.initialLives;
  gameState.stageIndex = 0;
  gameState.elapsedTime = 0;
  gameState.timeLeft = stageConfigs[0].duration;
  gameState.spawnAccumulator = 0;
  gameState.powerLevel = 0;
  gameState.powerUpTimer = 0;
  gameState.shakeTimer = 0;
  gameState.keys = {};
  gameState.touchMove = { x: 0, y: 0 };

  gameState.player = new Player(gameState);
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.particles = [];
}

/**
 * End the run: record the high score and stamp the game-over time
 * (used to lock out accidental instant restarts)
 */
export function endGame() {
  gameState.state = 'gameover';
  gameState.gameoverAt = performance.now();
  playSfx('gameOver');

  if (gameState.score > gameState.highScore) {
    gameState.highScore = gameState.score;
    gameState.isNewRecord = true;
    try {
      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(gameState.score));
    } catch (e) {
      // persistence unavailable; the in-memory high score still shows this session
    }
  }
}

/**
 * Whether restart input is currently accepted. False during the short
 * lockout after a game over; the game-over screen's retry hint uses the
 * same check so the UI always matches what input accepts.
 */
export function canRestart() {
  return performance.now() - gameState.gameoverAt > RESTART_LOCKOUT * 1000;
}

/**
 * Get current phase based on elapsed time
 */
export function getCurrentPhase() {
  const stage = stageConfigs[gameState.stageIndex];
  const time = gameState.elapsedTime;

  for (const phase of stage.phases) {
    if (time >= phase.startTime && time < phase.endTime) {
      return phase;
    }
  }
  return stage.phases[stage.phases.length - 1];
}
