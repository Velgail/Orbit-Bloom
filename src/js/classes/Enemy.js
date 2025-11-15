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
    this.spiralAngle = 0; // For spiral bullet pattern

    // Initial velocity
    if (type === 'basic') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
    } else if (type === 'zigzag') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
      this.startX = x;
    } else if (type === 'wave') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
      this.startX = x;
    } else if (type === 'spiral') {
      this.vy = this.params.speedY * speedMultiplier;
      this.vx = 0;
      this.startX = x;
      this.startY = y;
    } else if (type === 'homing') {
      const speed = this.params.speed * speedMultiplier;
      this.vx = 0;
      this.vy = speed;
    } else if (type === 'shooter' || type === 'shooter_spread' || type === 'shooter_radial' || type === 'shooter_spiral') {
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
    } else if (this.type === 'wave') {
      // Smooth wave pattern (sine wave with cosine velocity for smooth transitions)
      this.y += this.vy * dt;
      const wavePhase = this.time * this.params.freq;
      this.x = this.startX + Math.sin(wavePhase) * this.params.ampX;
    } else if (this.type === 'spiral') {
      // Spiral pattern (circular motion while descending)
      this.y += this.vy * dt;
      const spiralPhase = this.time * this.params.freq;
      const radius = (this.y - this.startY) * 0.2; // Spiral radius increases with descent
      this.x = this.startX + Math.cos(spiralPhase) * Math.min(radius, this.params.spiralSpeed);
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
    } else if (this.type === 'shooter_spread') {
      this.y += this.vy * dt;
      this.shotTimer -= dt;
      if (this.shotTimer <= 0 && this.gameState.player) {
        // Shoot 3-way spread at player
        const dx = this.gameState.player.x - this.x;
        const dy = this.gameState.player.y - this.y;
        const baseAngle = Math.atan2(dy, dx);
        const spreadAngles = [-0.3, 0, 0.3]; // -17°, 0°, +17° in radians

        for (const angleOffset of spreadAngles) {
          const angle = baseAngle + angleOffset;
          const bullet = new Bullet(
            this.x, this.y,
            Math.cos(angle), Math.sin(angle),
            'enemy', bulletSpeed
          );
          this.gameState.bullets.push(bullet);
        }
        this.shotTimer = this.params.shotInterval;
      }
    } else if (this.type === 'shooter_radial') {
      this.y += this.vy * dt;
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        // Shoot beautiful 6-way radial pattern
        const numBullets = 6;
        for (let i = 0; i < numBullets; i++) {
          const angle = (Math.PI * 2 * i) / numBullets + this.time * 0.5; // Slowly rotating pattern
          const bullet = new Bullet(
            this.x, this.y,
            Math.cos(angle), Math.sin(angle),
            'enemy', bulletSpeed * 0.8 // Slower bullets for aesthetic
          );
          this.gameState.bullets.push(bullet);
        }
        this.shotTimer = this.params.shotInterval;
      }
    } else if (this.type === 'shooter_spiral') {
      this.y += this.vy * dt;
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        // Continuous spiral pattern (2 bullets per shot, opposite directions)
        const bullet1 = new Bullet(
          this.x, this.y,
          Math.cos(this.spiralAngle), Math.sin(this.spiralAngle),
          'enemy', bulletSpeed * 0.7 // Even slower for aesthetic spiral
        );
        const bullet2 = new Bullet(
          this.x, this.y,
          Math.cos(this.spiralAngle + Math.PI), Math.sin(this.spiralAngle + Math.PI),
          'enemy', bulletSpeed * 0.7
        );
        this.gameState.bullets.push(bullet1);
        this.gameState.bullets.push(bullet2);

        this.spiralAngle += Math.PI / 8; // 22.5 degrees per shot
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
    } else if (this.type === 'wave') {
      // Rounded diamond (softer edges)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - this.radius);
      ctx.quadraticCurveTo(this.x + this.radius * 0.7, this.y - this.radius * 0.3, this.x + this.radius, this.y);
      ctx.quadraticCurveTo(this.x + this.radius * 0.7, this.y + this.radius * 0.3, this.x, this.y + this.radius);
      ctx.quadraticCurveTo(this.x - this.radius * 0.7, this.y + this.radius * 0.3, this.x - this.radius, this.y);
      ctx.quadraticCurveTo(this.x - this.radius * 0.7, this.y - this.radius * 0.3, this.x, this.y - this.radius);
      ctx.fill();
    } else if (this.type === 'spiral') {
      // Star shape (5-pointed)
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
        const radius = i % 2 === 0 ? this.radius : this.radius * 0.5;
        const x = this.x + Math.cos(angle) * radius;
        const y = this.y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
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
    } else if (this.type === 'shooter_spread') {
      // Pentagon with inner circle
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const x = this.x + Math.cos(angle) * this.radius;
        const y = this.y + Math.sin(angle) * this.radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'shooter_radial') {
      // Hexagon (6-sided) with rotating inner pattern
      ctx.fillStyle = this.color;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
        const x = this.x + Math.cos(angle) * this.radius;
        const y = this.y + Math.sin(angle) * this.radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();

      // Rotating inner triangle
      ctx.fillStyle = '#FFFFFF';
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.time * 2);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i) / 3;
        const x = Math.cos(angle) * this.radius * 0.5;
        const y = Math.sin(angle) * this.radius * 0.5;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (this.type === 'shooter_spiral') {
      // Square with rotating inner square
      ctx.fillStyle = this.color;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.time);
      ctx.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

      // Inner rotating square
      ctx.fillStyle = '#FFFFFF';
      ctx.rotate(this.time * -2);
      ctx.fillRect(-this.radius * 0.5, -this.radius * 0.5, this.radius, this.radius);
      ctx.restore();
    }

    // Glow effect
    ctx.strokeStyle = this.color + '80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
}
