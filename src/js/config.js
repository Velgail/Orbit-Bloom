// =========================================
// Orbit-Bloom - Configuration
// =========================================

// Game Dimensions (Logical Coordinates)
export const GAME_WIDTH = 360;
export const GAME_HEIGHT = 640;

// Player Parameters
export const PLAYER_PARAMS = {
  moveSpeed: 200,
  radius: 10,
  hitRadius: 6,
  shotInterval: 0.2,
  dashSpeedMultiplier: 2.5,
  dashDuration: 0.2,
  dashCooldown: 2.0,
  invincibleDurationOnHit: 1.0,
  initialLives: 3,
};

// Enemy Parameters
export const ENEMY_PARAMS = {
  basic: { speedY: 80, radius: 8, hp: 1, score: 10, color: '#FFD95A' },
  zigzag: { speedY: 90, radius: 10, ampX: 30, freq: 2, hp: 1, score: 15, color: '#FF5AF2' },
  wave: { speedY: 85, radius: 9, ampX: 50, freq: 1.5, hp: 1, score: 18, color: '#FFB3E6' }, // Smooth wave pattern
  spiral: { speedY: 70, radius: 10, spiralSpeed: 120, freq: 2, hp: 2, score: 22, color: '#B3E6FF' }, // Spiral pattern
  homing: { speed: 100, radius: 9, turnInterval: 0.25, turnAngle: 0.2, hp: 2, score: 25, color: '#7CFF5A' },
  shooter: { speedY: 60, radius: 12, shotInterval: 1.2, hp: 3, score: 30, color: '#FFA05A' },
  shooter_spread: { speedY: 60, radius: 12, shotInterval: 1.5, hp: 3, score: 35, color: '#FF8AC9' }, // 3-way spread shot
  shooter_burst: { speedY: 50, radius: 14, shotInterval: 2.5, hp: 4, score: 50, color: '#8AFFEF' }, // 8-way circular burst
};

// Bullet Parameters
export const BULLET_PARAMS = {
  player: { speedY: -300, radius: 3, color: '#40E0FF' },
  enemy: { radius: 3, color: '#FF5A5A' },
};

// Stage Configuration
export const stageConfigs = [
  {
    duration: 60,
    phases: [
      {
        startTime: 0,
        endTime: 20,
        spawnRate: 0.5,
        maxEnemies: 10,
        allowedTypes: ['basic'],
        enemySpeedMultiplier: 1.0,
        bulletSpeed: 160,
      },
      {
        startTime: 20,
        endTime: 40,
        spawnRate: 0.8,
        maxEnemies: 15,
        allowedTypes: ['basic', 'zigzag', 'wave', 'shooter_spread'],
        enemySpeedMultiplier: 1.1,
        bulletSpeed: 180,
      },
      {
        startTime: 40,
        endTime: 60,
        spawnRate: 1.0,
        maxEnemies: 20,
        allowedTypes: ['basic', 'zigzag', 'wave', 'spiral', 'shooter', 'shooter_spread', 'shooter_burst'],
        enemySpeedMultiplier: 1.2,
        bulletSpeed: 200,
      },
    ],
  },
];
