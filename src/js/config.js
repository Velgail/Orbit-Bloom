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
  basic: { speedY: 60, radius: 8, hp: 1, score: 10, color: '#FFD95A' },
  zigzag: { speedY: 70, radius: 10, ampX: 30, freq: 2, hp: 1, score: 15, color: '#FF5AF2' },
  wave: { speedY: 65, radius: 9, ampX: 50, freq: 1.5, hp: 1, score: 18, color: '#FFB3E6' }, // Smooth wave pattern
  spiral: { speedY: 55, radius: 10, spiralSpeed: 120, freq: 2, hp: 2, score: 22, color: '#B3E6FF' }, // Spiral pattern
  homing: { speed: 80, radius: 9, turnInterval: 0.25, turnAngle: 0.2, hp: 2, score: 25, color: '#7CFF5A' },
  shooter: { speedY: 50, radius: 12, shotInterval: 2.0, hp: 2, score: 30, color: '#FFA05A' }, // Single aimed shot
  shooter_spread: { speedY: 45, radius: 12, shotInterval: 2.5, hp: 3, score: 35, color: '#FF8AC9' }, // 3-way spread shot
  shooter_radial: { speedY: 40, radius: 14, shotInterval: 3.5, hp: 3, score: 45, color: '#8AFFEF' }, // Beautiful 6-way radial pattern
  shooter_spiral: { speedY: 40, radius: 14, shotInterval: 0.15, hp: 4, score: 60, color: '#FFEF8A' }, // Continuous spiral pattern
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
        spawnRate: 0.3,
        maxEnemies: 5,
        allowedTypes: ['basic'],
        enemySpeedMultiplier: 0.9,
        bulletSpeed: 120,
      },
      {
        startTime: 20,
        endTime: 40,
        spawnRate: 0.5,
        maxEnemies: 8,
        allowedTypes: ['basic', 'zigzag', 'wave'],
        enemySpeedMultiplier: 1.0,
        bulletSpeed: 130,
      },
      {
        startTime: 40,
        endTime: 60,
        spawnRate: 0.7,
        maxEnemies: 12,
        allowedTypes: ['basic', 'zigzag', 'wave', 'shooter', 'shooter_radial'],
        enemySpeedMultiplier: 1.0,
        bulletSpeed: 140,
      },
    ],
  },
];
