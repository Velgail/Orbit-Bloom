// =========================================
// Orbit-Bloom - Pure HTML5 Canvas Shooting Game
// =========================================

// Game Dimensions (Logical Coordinates)
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

// Player Parameters
const PLAYER_PARAMS = {
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
const ENEMY_PARAMS = {
  basic: { speedY: 80, radius: 8, hp: 1, score: 10, color: '#FFD95A' },
  zigzag: { speedY: 90, radius: 10, ampX: 30, freq: 2, hp: 1, score: 15, color: '#FF5AF2' },
  homing: { speed: 100, radius: 9, turnInterval: 0.25, turnAngle: 0.2, hp: 2, score: 25, color: '#7CFF5A' },
  shooter: { speedY: 60, radius: 12, shotInterval: 1.2, hp: 3, score: 30, color: '#FFA05A' },
};

// Bullet Parameters
const BULLET_PARAMS = {
  player: { speedY: -300, radius: 3, color: '#40E0FF' },
  enemy: { radius: 3, color: '#FF5A5A' },
};

// Stage Configuration
const stageConfigs = [
  {
    duration: 60,
    phases: [
      {
        startTime: 0,
        endTime: 10,
        spawnRate: 0.5,
        maxEnemies: 10,
        allowedTypes: ['basic'],
        enemySpeedMultiplier: 1.0,
        bulletSpeed: 160,
      },
      {
        startTime: 10,
        endTime: 30,
        spawnRate: 0.8,
        maxEnemies: 15,
        allowedTypes: ['basic', 'zigzag'],
        enemySpeedMultiplier: 1.1,
        bulletSpeed: 180,
      },
      {
        startTime: 30,
        endTime: 60,
        spawnRate: 1.0,
        maxEnemies: 20,
        allowedTypes: ['basic', 'zigzag', 'shooter'],
        enemySpeedMultiplier: 1.2,
        bulletSpeed: 200,
      },
    ],
  },
];

// =========================================
// Game State
// =========================================

const gameState = {
  state: 'title', // 'title', 'playing', 'stageclear', 'gameover'
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
  touch: {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    startTime: 0,
    targetX: GAME_WIDTH / 2,
    targetY: GAME_HEIGHT - 80,
  },
};

// =========================================
// Canvas Setup and Scaling
// =========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let scale = 1;
let offsetX = 0;
let offsetY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Calculate scale to fit game area
  const scaleX = canvas.width / GAME_WIDTH;
  const scaleY = canvas.height / GAME_HEIGHT;
  scale = Math.min(scaleX, scaleY);

  // Calculate offset to center the game
  offsetX = (canvas.width - GAME_WIDTH * scale) / 2;
  offsetY = (canvas.height - GAME_HEIGHT * scale) / 2;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// =========================================
// Classes
// =========================================

class Player {
  constructor() {
    this.x = GAME_WIDTH / 2;
    this.y = GAME_HEIGHT - 80;
    this.vx = 0;
    this.vy = 0;
    this.radius = PLAYER_PARAMS.radius;
    this.hitRadius = PLAYER_PARAMS.hitRadius;
    this.color = '#40E0FF';

    // Shooting
    this.shotTimer = 0;

    // Dash
    this.dashTimer = 0;
    this.dashCooldownTimer = 0;
    this.isDashing = false;

    // Invincibility
    this.invincibleTimer = 0;
  }

  update(dt) {
    // Handle input and movement
    let moveX = 0;
    let moveY = 0;

    // Check if touch control is active
    if (gameState.touch.active) {
      // Touch control: interpolate to target position
      const TOUCH_FOLLOW_RATE = 0.25; // Follow rate (0.2-0.3 as per spec)
      const dx = gameState.touch.targetX - this.x;
      const dy = gameState.touch.targetY - this.y;

      // Move towards target with interpolation
      this.x += dx * TOUCH_FOLLOW_RATE;
      this.y += dy * TOUCH_FOLLOW_RATE;
    } else {
      // Keyboard control
      if (gameState.keys['w'] || gameState.keys['arrowup']) moveY -= 1;
      if (gameState.keys['s'] || gameState.keys['arrowdown']) moveY += 1;
      if (gameState.keys['a'] || gameState.keys['arrowleft']) moveX -= 1;
      if (gameState.keys['d'] || gameState.keys['arrowright']) moveX += 1;

      // Normalize diagonal movement
      const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
      if (magnitude > 0) {
        moveX /= magnitude;
        moveY /= magnitude;
      }

      // Apply dash multiplier
      let speed = PLAYER_PARAMS.moveSpeed;
      if (this.isDashing) {
        speed *= PLAYER_PARAMS.dashSpeedMultiplier;
      }

      // Update position
      this.x += moveX * speed * dt;
      this.y += moveY * speed * dt;
    }

    // Clamp to screen bounds
    this.x = Math.max(this.radius, Math.min(GAME_WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(GAME_HEIGHT - this.radius, this.y));

    // Update timers
    this.shotTimer -= dt;
    this.dashCooldownTimer -= dt;
    this.invincibleTimer -= dt;

    if (this.isDashing) {
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    }

    // Auto-fire
    if (this.shotTimer <= 0) {
      this.shoot();
      this.shotTimer = PLAYER_PARAMS.shotInterval;
    }

    // Create trail particles when moving (for keyboard control)
    if (!gameState.touch.active) {
      const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
      if (magnitude > 0.1 && Math.random() < 0.3) {
        gameState.particles.push(new Particle(this.x, this.y, '#40E0FF', 0.5, 2));
      }
    } else {
      // Create trail particles for touch control (based on movement)
      if (Math.random() < 0.3) {
        gameState.particles.push(new Particle(this.x, this.y, '#40E0FF', 0.5, 2));
      }
    }
  }

  shoot() {
    const bullet = new Bullet(this.x, this.y, 0, -1, 'player');
    gameState.bullets.push(bullet);
  }

  dash() {
    if (this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = PLAYER_PARAMS.dashDuration;
      this.dashCooldownTimer = PLAYER_PARAMS.dashCooldown;
      this.invincibleTimer = PLAYER_PARAMS.dashDuration; // Invincible during dash
    }
  }

  hit() {
    if (this.invincibleTimer <= 0) {
      gameState.lives--;
      this.invincibleTimer = PLAYER_PARAMS.invincibleDurationOnHit;

      // Create explosion particles
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        gameState.particles.push(new Particle(
          this.x, this.y, '#40E0FF', 0.8, 3,
          Math.cos(angle) * speed, Math.sin(angle) * speed
        ));
      }

      if (gameState.lives <= 0) {
        gameState.state = 'gameover';
      }
    }
  }

  isInvincible() {
    return this.invincibleTimer > 0;
  }

  draw() {
    const alpha = this.isInvincible() && Math.floor(Date.now() / 100) % 2 === 0 ? 0.3 : 1.0;

    // Glow effect
    if (!this.isInvincible() || alpha > 0.5) {
      ctx.strokeStyle = `rgba(64, 224, 255, ${0.5 * alpha})`;
      ctx.lineWidth = this.isDashing ? 5 : 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + (this.isDashing ? 8 : 5), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body (circle)
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.isDashing ? '#80F0FF' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (this.isDashing ? 1.2 : 1), 0, Math.PI * 2);
    ctx.fill();

    // Wing (triangle below)
    ctx.fillStyle = this.isDashing ? '#80F0FF' : this.color;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.radius);
    ctx.lineTo(this.x - this.radius * 0.6, this.y + this.radius * 1.8);
    ctx.lineTo(this.x + this.radius * 0.6, this.y + this.radius * 1.8);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 1.0;
  }
}

class Enemy {
  constructor(type, x, y, speedMultiplier = 1.0) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.params = ENEMY_PARAMS[type];
    this.radius = this.params.radius;
    this.hp = this.params.hp;
    this.color = this.params.color;
    this.speedMultiplier = speedMultiplier;

    // Type-specific properties
    this.time = 0;
    this.shotTimer = this.params.shotInterval || 0;
    this.turnTimer = 0;
    this.angle = Math.PI / 2; // Start moving down

    // Initial velocity
    if (type === 'basic') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
    } else if (type === 'zigzag') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
      this.startX = x;
    } else if (type === 'homing') {
      const speed = this.params.speed * speedMultiplier;
      this.vx = 0;
      this.vy = speed;
    } else if (type === 'shooter') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
    }
  }

  update(dt, bulletSpeed) {
    this.time += dt;

    if (this.type === 'basic') {
      this.y += this.vy * dt;
    } else if (this.type === 'zigzag') {
      this.y += this.vy * dt;
      this.x = this.startX + Math.sin(this.time * this.params.freq) * this.params.ampX;
    } else if (this.type === 'homing') {
      this.turnTimer += dt;
      if (this.turnTimer >= this.params.turnInterval) {
        this.turnTimer = 0;
        // Adjust angle slightly toward player
        const dx = gameState.player.x - this.x;
        const dy = gameState.player.y - this.y;
        const targetAngle = Math.atan2(dy, dx);
        const angleDiff = targetAngle - this.angle;
        // Normalize angle difference
        let normalizedDiff = angleDiff;
        while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
        while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
        this.angle += Math.sign(normalizedDiff) * Math.min(Math.abs(normalizedDiff), this.params.turnAngle);
      }
      const speed = this.params.speed * this.speedMultiplier;
      this.vx = Math.cos(this.angle) * speed;
      this.vy = Math.sin(this.angle) * speed;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    } else if (this.type === 'shooter') {
      this.y += this.vy * dt;
      this.shotTimer -= dt;
      if (this.shotTimer <= 0 && gameState.player) {
        // Shoot at player
        const dx = gameState.player.x - this.x;
        const dy = gameState.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const bullet = new Bullet(this.x, this.y, dx / dist, dy / dist, 'enemy', bulletSpeed);
          gameState.bullets.push(bullet);
        }
        this.shotTimer = this.params.shotInterval;
      }
    }
  }

  hit(damage = 1) {
    this.hp -= damage;
    if (this.hp <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    gameState.score += this.params.score;

    // Create explosion particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      gameState.particles.push(new Particle(
        this.x, this.y, this.color, 0.6, 2 + Math.random() * 2,
        Math.cos(angle) * speed, Math.sin(angle) * speed
      ));
    }
  }

  isOffScreen() {
    return this.y > GAME_HEIGHT + 50 || this.y < -50 || this.x < -50 || this.x > GAME_WIDTH + 50;
  }

  draw() {
    if (this.type === 'basic') {
      // Circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'zigzag') {
      // Diamond
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.lineTo(this.x + this.radius, this.y);
      ctx.lineTo(this.x, this.y + this.radius);
      ctx.lineTo(this.x - this.radius, this.y);
      ctx.closePath();
      ctx.fill();
    } else if (this.type === 'homing') {
      // Triangle pointing in movement direction
      ctx.fillStyle = this.color;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.beginPath();
      ctx.moveTo(this.radius, 0);
      ctx.lineTo(-this.radius * 0.6, -this.radius * 0.8);
      ctx.lineTo(-this.radius * 0.6, this.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (this.type === 'shooter') {
      // Larger circle with inner circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glow effect
    ctx.strokeStyle = this.color + '80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}

class Bullet {
  constructor(x, y, dirX, dirY, owner, speed = null) {
    this.x = x;
    this.y = y;
    this.owner = owner; // 'player' or 'enemy'

    const params = BULLET_PARAMS[owner];
    this.radius = params.radius;
    this.color = params.color;

    if (owner === 'player') {
      this.vx = dirX * Math.abs(params.speedY);
      this.vy = dirY * Math.abs(params.speedY);
    } else {
      const bulletSpeed = speed || 150;
      this.vx = dirX * bulletSpeed;
      this.vy = dirY * bulletSpeed;
    }
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  isOffScreen() {
    return this.x < -10 || this.x > GAME_WIDTH + 10 || this.y < -10 || this.y > GAME_HEIGHT + 10;
  }

  draw() {
    // Shadow/trail effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}

class Particle {
  constructor(x, y, color, lifetime, size, vx = 0, vy = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.size = size;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.lifetime -= dt;

    // Slow down
    this.vx *= 0.95;
    this.vy *= 0.95;
  }

  isDead() {
    return this.lifetime <= 0;
  }

  draw() {
    const alpha = this.lifetime / this.maxLifetime;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

class Star {
  constructor() {
    this.x = Math.random() * GAME_WIDTH;
    this.y = Math.random() * GAME_HEIGHT;
    this.size = 0.5 + Math.random() * 1.5;
    this.brightness = Math.random();
    this.fadeSpeed = 0.5 + Math.random() * 1.5;
    this.fadeDirection = Math.random() < 0.5 ? 1 : -1;
  }

  update(dt) {
    this.brightness += this.fadeDirection * this.fadeSpeed * dt;
    if (this.brightness >= 1.0) {
      this.brightness = 1.0;
      this.fadeDirection = -1;
    } else if (this.brightness <= 0.0) {
      this.brightness = 0.0;
      this.fadeDirection = 1;
    }
  }

  draw() {
    ctx.globalAlpha = this.brightness * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1.0;
  }
}

// =========================================
// Input Handling
// =========================================

document.addEventListener('keydown', (e) => {
  gameState.keys[e.key.toLowerCase()] = true;

  // Dash on Shift or Space
  if ((e.key === 'Shift' || e.key === ' ') && gameState.state === 'playing' && gameState.player) {
    gameState.player.dash();
    e.preventDefault();
  }

  // Handle menu navigation
  if (gameState.state === 'title') {
    startGame();
  } else if (gameState.state === 'stageclear') {
    nextStage();
  } else if (gameState.state === 'gameover') {
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
  } else if (gameState.state === 'stageclear') {
    nextStage();
  } else if (gameState.state === 'gameover') {
    startGame();
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;
  // Convert to game coordinates
  gameState.mouse.x = (canvasX - offsetX) / scale;
  gameState.mouse.y = (canvasY - offsetY) / scale;
});

// Touch support
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();

  // Handle menu screens
  if (gameState.state === 'title') {
    startGame();
    return;
  } else if (gameState.state === 'stageclear') {
    nextStage();
    return;
  } else if (gameState.state === 'gameover') {
    startGame();
    return;
  }

  // Handle gameplay touch
  if (gameState.state === 'playing' && e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const canvasX = touch.clientX - rect.left;
    const canvasY = touch.clientY - rect.top;

    // Convert to game coordinates
    const gameX = (canvasX - offsetX) / scale;
    const gameY = (canvasY - offsetY) / scale;

    gameState.touch.active = true;
    gameState.touch.startX = gameX;
    gameState.touch.startY = gameY;
    gameState.touch.currentX = gameX;
    gameState.touch.currentY = gameY;
    gameState.touch.targetX = gameX;
    gameState.touch.targetY = gameY;
    gameState.touch.startTime = performance.now();
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();

  if (gameState.state === 'playing' && gameState.touch.active && e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const canvasX = touch.clientX - rect.left;
    const canvasY = touch.clientY - rect.top;

    // Convert to game coordinates
    const gameX = (canvasX - offsetX) / scale;
    const gameY = (canvasY - offsetY) / scale;

    gameState.touch.currentX = gameX;
    gameState.touch.currentY = gameY;
    gameState.touch.targetX = gameX;
    gameState.touch.targetY = gameY;
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();

  if (gameState.state === 'playing' && gameState.touch.active) {
    // Check for flick gesture
    const dx = gameState.touch.currentX - gameState.touch.startX;
    const dy = gameState.touch.currentY - gameState.touch.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = performance.now() - gameState.touch.startTime;

    // Flick detection: distance > 50 pixels in < 200ms
    const FLICK_DISTANCE_THRESHOLD = 50;
    const FLICK_TIME_THRESHOLD = 200;

    if (distance > FLICK_DISTANCE_THRESHOLD && duration < FLICK_TIME_THRESHOLD && gameState.player) {
      // Trigger dash in flick direction
      gameState.player.dash();
    }

    gameState.touch.active = false;
  }
}, { passive: false });

// =========================================
// Game Functions
// =========================================

function init() {
  // Create background stars
  for (let i = 0; i < 100; i++) {
    gameState.stars.push(new Star());
  }

  // Show title screen
  gameState.state = 'title';
  updateUI();
}

function startGame() {
  gameState.state = 'playing';
  gameState.score = 0;
  gameState.lives = PLAYER_PARAMS.initialLives;
  gameState.stageIndex = 0;
  gameState.elapsedTime = 0;
  gameState.timeLeft = stageConfigs[0].duration;
  gameState.spawnAccumulator = 0;

  gameState.player = new Player();
  gameState.enemies = [];
  gameState.bullets = [];
  gameState.particles = [];

  updateUI();
}

function nextStage() {
  gameState.stageIndex++;

  // Check if there are more stages
  if (gameState.stageIndex >= stageConfigs.length) {
    // No more stages - game complete (for now, loop back to stage 0)
    gameState.stageIndex = 0;
  }

  gameState.state = 'playing';
  gameState.elapsedTime = 0;
  gameState.timeLeft = stageConfigs[gameState.stageIndex].duration;
  gameState.spawnAccumulator = 0;

  gameState.enemies = [];
  gameState.bullets = [];
  gameState.particles = [];

  // Reset player position but keep lives and score
  if (gameState.player) {
    gameState.player.x = GAME_WIDTH / 2;
    gameState.player.y = GAME_HEIGHT - 80;
  }

  updateUI();
}

function getCurrentPhase() {
  const stage = stageConfigs[gameState.stageIndex];
  const time = gameState.elapsedTime;

  for (const phase of stage.phases) {
    if (time >= phase.startTime && time < phase.endTime) {
      return phase;
    }
  }
  return stage.phases[stage.phases.length - 1];
}

function spawnEnemies(dt) {
  const phase = getCurrentPhase();
  if (!phase) return;

  gameState.spawnAccumulator += phase.spawnRate * dt;

  while (gameState.spawnAccumulator >= 1 && gameState.enemies.length < phase.maxEnemies) {
    gameState.spawnAccumulator -= 1;

    // Pick random enemy type from allowed types
    const type = phase.allowedTypes[Math.floor(Math.random() * phase.allowedTypes.length)];

    // Spawn at random x position, above screen
    const x = Math.random() * GAME_WIDTH;
    const y = -20;

    gameState.enemies.push(new Enemy(type, x, y, phase.enemySpeedMultiplier));
  }
}

function updateEnemies(dt) {
  const phase = getCurrentPhase();
  const bulletSpeed = phase ? phase.bulletSpeed : 150;

  for (let i = gameState.enemies.length - 1; i >= 0; i--) {
    const enemy = gameState.enemies[i];
    enemy.update(dt, bulletSpeed);

    if (enemy.isOffScreen()) {
      gameState.enemies.splice(i, 1);
    }
  }
}

function updateBullets(dt) {
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    bullet.update(dt);

    if (bullet.isOffScreen()) {
      gameState.bullets.splice(i, 1);
    }
  }
}

function updateGame(dt) {
  // Clamp deltaTime to avoid huge jumps
  dt = Math.min(dt, 0.05);

  // Update timer
  gameState.elapsedTime += dt;
  gameState.timeLeft = stageConfigs[gameState.stageIndex].duration - gameState.elapsedTime;

  if (gameState.timeLeft <= 0) {
    // Stage cleared!
    gameState.state = 'stageclear';
    return;
  }

  // Update player
  if (gameState.player) {
    gameState.player.update(dt);
  }

  // Spawn enemies
  spawnEnemies(dt);

  // Update enemies
  updateEnemies(dt);

  // Update bullets
  updateBullets(dt);

  // Update particles
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const particle = gameState.particles[i];
    particle.update(dt);

    if (particle.isDead()) {
      gameState.particles.splice(i, 1);
    }
  }

  // Update stars
  for (const star of gameState.stars) {
    star.update(dt);
  }

  // Check collisions
  checkCollisions();

  // Update UI
  updateUI();
}

function checkCollisions() {
  if (!gameState.player) return;

  // Player bullets vs enemies
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    if (bullet.owner !== 'player') continue;

    for (let j = gameState.enemies.length - 1; j >= 0; j--) {
      const enemy = gameState.enemies[j];
      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < bullet.radius + enemy.radius) {
        gameState.bullets.splice(i, 1);
        if (enemy.hit(1)) {
          gameState.enemies.splice(j, 1);
        }
        break;
      }
    }
  }

  // Enemy bullets vs player
  for (let i = gameState.bullets.length - 1; i >= 0; i--) {
    const bullet = gameState.bullets[i];
    if (bullet.owner !== 'enemy') continue;

    const dx = bullet.x - gameState.player.x;
    const dy = bullet.y - gameState.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < bullet.radius + gameState.player.hitRadius) {
      gameState.bullets.splice(i, 1);
      gameState.player.hit();
    }
  }

  // Enemies vs player
  if (!gameState.player.isInvincible()) {
    for (const enemy of gameState.enemies) {
      const dx = enemy.x - gameState.player.x;
      const dy = enemy.y - gameState.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < enemy.radius + gameState.player.hitRadius) {
        gameState.player.hit();
        break; // Only one hit per frame
      }
    }
  }
}

function render() {
  // Clear with gradient background
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#000428');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Apply game coordinate transform
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Draw stars
  for (const star of gameState.stars) {
    star.draw();
  }

  // Draw particles (background layer)
  for (const particle of gameState.particles) {
    particle.draw();
  }

  // Draw bullets
  for (const bullet of gameState.bullets) {
    bullet.draw();
  }

  // Draw enemies
  for (const enemy of gameState.enemies) {
    enemy.draw();
  }

  // Draw player
  if (gameState.player) {
    gameState.player.draw();
  }

  ctx.restore();
}

function updateUI() {
  // Update game info displays
  document.getElementById('score').textContent = gameState.score;
  document.getElementById('lives').textContent = gameState.lives;
  document.getElementById('time').textContent = Math.ceil(Math.max(0, gameState.timeLeft));

  // Get overlay elements
  const gameInfo = document.getElementById('gameInfo');
  const titleScreen = document.getElementById('titleScreen');
  const stageClearScreen = document.getElementById('stageClearScreen');
  const gameOverScreen = document.getElementById('gameOverScreen');

  // Hide all overlays first
  titleScreen.style.display = 'none';
  stageClearScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  gameInfo.style.display = 'none';

  // Show appropriate screen based on game state
  if (gameState.state === 'title') {
    titleScreen.style.display = 'flex';
  } else if (gameState.state === 'playing') {
    gameInfo.style.display = 'block';
  } else if (gameState.state === 'stageclear') {
    stageClearScreen.style.display = 'flex';
    document.getElementById('stageClearScore').textContent = gameState.score;
  } else if (gameState.state === 'gameover') {
    gameOverScreen.style.display = 'flex';
    document.getElementById('gameOverScore').textContent = gameState.score;
  }
}

// =========================================
// Game Loop
// =========================================

let lastTime = performance.now();

function gameLoop(currentTime) {
  const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  lastTime = currentTime;

  if (gameState.state === 'playing') {
    updateGame(deltaTime);
  }

  render();

  requestAnimationFrame(gameLoop);
}

// =========================================
// Initialize and Start
// =========================================

init();
requestAnimationFrame(gameLoop);
