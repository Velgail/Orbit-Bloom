// =========================================
// Player Class
// =========================================

import { GAME_WIDTH, GAME_HEIGHT, PLAYER_PARAMS } from '../config.js';
import { Bullet } from './Bullet.js';
import { Particle, spawnBurst } from './Particle.js';
import { getPlayerPowerMultipliers } from '../game/power.js';
import { endGame } from '../game/state.js';
import { emitRing } from '../game/evolution.js';
import { playSfx } from '../game/audio.js';

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
    // Last non-zero movement direction; dashing while stationary uses it
    this.lastMoveX = 0;
    this.lastMoveY = -1;

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
    let magnitude = Math.sqrt(moveX * moveX + moveY * moveY);
    if (magnitude > 0) {
      moveX /= magnitude;
      moveY /= magnitude;
      this.lastMoveX = moveX;
      this.lastMoveY = moveY;
    } else if (this.isDashing) {
      // Dash with no directional input travels along the last movement direction
      moveX = this.lastMoveX;
      moveY = this.lastMoveY;
      magnitude = 1;
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
      this.shotTimer = PLAYER_PARAMS.shotInterval / (powerMult.fireRate * (1 + (this.gameState.upgrades.rapid || 0) * 0.2));
    }

    // Create trail particles when moving
    if (magnitude > 0.1 && Math.random() < 0.3) {
      this.gameState.particles.push(new Particle(this.x, this.y, '#40E0FF', 0.5, 2));
    }
  }

  shoot() {
    const powerMult = getPlayerPowerMultipliers();
    const bulletSpeed = 300 * powerMult.bulletSpeed;
    const spread = this.gameState.upgrades.spread || 0;
    for (let i = -spread; i <= spread; i++) {
      const angle = -Math.PI / 2 + i * 0.12;
      this.gameState.bullets.push(new Bullet(this.x, this.y - 12, Math.cos(angle), Math.sin(angle), 'player', bulletSpeed));
    }
    playSfx('shoot');
  }

  /**
   * Trigger a dash. Returns true when the dash actually started,
   * so UI layers can reflect the real cooldown.
   */
  dash() {
    if (this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashTimer = PLAYER_PARAMS.dashDuration;
      this.dashCooldownTimer = PLAYER_PARAMS.dashCooldown / (1 + (this.gameState.upgrades.dash || 0) * 0.25);
      emitRing(this.x, this.y, '#40E0FF', 50);
      this.invincibleTimer = Math.max(this.invincibleTimer, PLAYER_PARAMS.dashDuration); // Preserve longer NOVA/shield protection
      playSfx('dash');
      return true;
    }
    return false;
  }

  hit() {
    if (this.invincibleTimer <= 0) {
      if (this.gameState.shield > 0) {
        this.gameState.shield--;
        this.invincibleTimer = 1;
        emitRing(this.x, this.y, '#a9ffce', 80);
        playSfx('dash');
        return;
      }
      this.gameState.combo = 0;
      this.gameState.comboTimer = 0;
      this.gameState.lives--;
      this.invincibleTimer = PLAYER_PARAMS.invincibleDurationOnHit;
      this.gameState.shakeTimer = 0.25;
      playSfx('playerHit');

      // Create explosion particles
      spawnBurst(this.gameState.particles, this.x, this.y, {
        count: 20, color: '#40E0FF', lifetime: 0.8, size: 3, minSpeed: 50, maxSpeed: 150,
      });

      if (this.gameState.lives <= 0) {
        endGame();
      }
    }
  }

  isInvincible() {
    return this.invincibleTimer > 0;
  }

  /**
   * 0 = dash ready, 1 = cooldown just started. Shared by the on-ship
   * arc and the touch dash button so the two indicators never disagree.
   */
  dashCooldownRatio() {
    return Math.max(0, this.dashCooldownTimer) / (PLAYER_PARAMS.dashCooldown / (1 + (this.gameState.upgrades.dash || 0) * 0.25));
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

    // Faceted photon ship with a bright hitbox core.
    ctx.save();ctx.translate(this.x, this.y);ctx.globalAlpha = alpha;
    ctx.fillStyle = '#123d51';ctx.strokeStyle = this.isDashing ? '#fff' : '#64e4e8';ctx.lineWidth = 1.5;
    ctx.beginPath();ctx.moveTo(0, -15);ctx.lineTo(12, 12);ctx.lineTo(0, 7);ctx.lineTo(-12, 12);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle = '#f1f4ec';ctx.beginPath();ctx.arc(0, 0, 3, 0, Math.PI * 2);ctx.fill();
    ctx.fillStyle = '#c5ff78';ctx.beginPath();ctx.moveTo(-4, 11);ctx.lineTo(0, 19 + Math.sin(performance.now()/45) * 4);ctx.lineTo(4, 11);ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1.0;

    // Dash cooldown arc: fills clockwise, disappears when the dash is ready
    if (this.dashCooldownTimer > 0 && !this.isDashing) {
      const progress = 1 - this.dashCooldownRatio();
      ctx.strokeStyle = 'rgba(255, 217, 90, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 8, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
    }
  }
}
