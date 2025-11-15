// =========================================
// Enemy Class
// =========================================

import { GAME_WIDTH, GAME_HEIGHT, ENEMY_PARAMS } from '../config.js';
import { Bullet } from './Bullet.js';
import { Particle } from './Particle.js';
import { getEnemyPowerMultipliers } from '../game/power.js';

export class Enemy {
  constructor(type, x, y, speedMultiplier = 1.0, gameState) {
    this.gameState = gameState;
    this.type = type;
    this.x = x;
    this.y = y;
    this.params = ENEMY_PARAMS[type];
    this.radius = this.params.radius;

    // Apply power multiplier to HP
    const powerMult = getEnemyPowerMultipliers();
    this.hp = Math.round(this.params.hp * powerMult.hp);
    this.color = this.params.color;

    // Combine phase speed multiplier with power multiplier
    this.speedMultiplier = speedMultiplier * powerMult.speed;

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
        const dx = this.gameState.player.x - this.x;
        const dy = this.gameState.player.y - this.y;
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
      if (this.shotTimer <= 0 && this.gameState.player) {
        // Shoot at player
        const dx = this.gameState.player.x - this.x;
        const dy = this.gameState.player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const bullet = new Bullet(this.x, this.y, dx / dist, dy / dist, 'enemy', bulletSpeed);
          this.gameState.bullets.push(bullet);
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
    this.gameState.score += this.params.score;

    // Create explosion particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 80;
      this.gameState.particles.push(new Particle(
        this.x, this.y, this.color, 0.6, 2 + Math.random() * 2,
        Math.cos(angle) * speed, Math.sin(angle) * speed
      ));
    }
  }

  isOffScreen() {
    return this.y > GAME_HEIGHT + 50 || this.y < -50 || this.x < -50 || this.x > GAME_WIDTH + 50;
  }

  draw(ctx) {
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
