// =========================================
// Game State Management
// =========================================

import { GAME_WIDTH, GAME_HEIGHT, PLAYER_PARAMS, stageConfigs } from '../config.js';
import { Player } from '../classes/Player.js';
import { Star } from '../classes/Star.js';

// Game State Object
export const gameState = {
  state: 'title', // 'title', 'playing', 'gameover'
  score: 0,
  timeLeft: 0,
  elapsedTime: 0,
  lives: PLAYER_PARAMS.initialLives,
  stageIndex: 0,
  player: null,
  enemies: [],
  bullets: [],
  particles: [],
  stars: [],
  spawnAccumulator: 0,
  keys: {},
  mouse: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
  touch: null,
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
  gameState.lives = PLAYER_PARAMS.initialLives;
  gameState.stageIndex = 0;
  gameState.elapsedTime = 0;
  gameState.timeLeft = stageConfigs[0].duration;
  gameState.spawnAccumulator = 0;

  gameState.player = new Player(gameState);
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.particles = [];
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
