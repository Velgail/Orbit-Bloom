// =========================================
// Player Class
// =========================================

import { GAME_WIDTH, GAME_HEIGHT, PLAYER_PARAMS } from '../config.js';
import { Bullet } from './Bullet.js';
import { Particle } from './Particle.js';
import { getPlayerPowerMultipliers } from '../game/power.js';

export class Player {
  constructor(gameState) {
    this.gameState = gameState;
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

    // Keyboard input
    if (this.gameState.keys['w'] || this.gameState.keys['arrowup']) moveY -= 1;
    if (this.gameState.keys['s'] || this.gameState.keys['arrowdown']) moveY += 1;
    if (this.gameState.keys['a'] || this.gameState.keys['arrowleft']) moveX -= 1;
    if (this.gameState.keys['d'] || this.gameState.keys['arrowright']) moveX += 1;

    // Touch input (overrides keyboard if active)
    if (this.gameState.touchMove) {
      const touchX = this.gameState.touchMove.x;
      const touchY = this.gameState.touchMove.y;
      if (Math.abs(touchX) > 0.1 || Math.abs(touchY) > 0.1) {
        moveX = touchX;
        moveY = touchY;
      }
    }

    // Normalize diagonal movement
    const magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > 0) {
      moveX /= magnitude;
      moveY /= magnitude;
    }

    // Apply power multiplier and dash multiplier
    const powerMult = getPlayerPowerMultipliers();
    let speed = PLAYER_PARAMS.moveSpeed * powerMult.moveSpeed;
    if (this.isDashing) {
      speed *= PLAYER_PARAMS.dashSpeedMultiplier;
    }

    // Update position
    this.x += moveX * speed * dt;
    this.y += moveY * speed * dt;

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

    // Auto-fire (with power scaling for fire rate)
    if (this.shotTimer <= 0) {
      this.shoot();
      const powerMult = getPlayerPowerMultipliers();
      this.shotTimer = PLAYER_PARAMS.shotInterval / powerMult.fireRate;
    }

    // Create trail particles when moving
    if (magnitude > 0.1 && Math.random() < 0.3) {
      this.gameState.particles.push(new Particle(this.x, this.y, '#40E0FF', 0.5, 2));
    }
  }

  shoot() {
    const powerMult = getPlayerPowerMultipliers();
    const bulletSpeed = 300 * powerMult.bulletSpeed;
    const bullet = new Bullet(this.x, this.y, 0, -1, 'player', bulletSpeed);
    this.gameState.bullets.push(bullet);
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
      this.gameState.lives--;
      this.invincibleTimer = PLAYER_PARAMS.invincibleDurationOnHit;

      // Create explosion particles
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 100;
        this.gameState.particles.push(new Particle(
          this.x, this.y, '#40E0FF', 0.8, 3,
          Math.cos(angle) * speed, Math.sin(angle) * speed
        ));
      }

      if (this.gameState.lives <= 0) {
        this.gameState.state = 'gameover';
      }
    }
  }

  isInvincible() {
    return this.invincibleTimer > 0;
  }

  draw(ctx) {
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
