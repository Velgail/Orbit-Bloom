// =========================================
// Bullet Class
// =========================================

import { GAME_WIDTH, GAME_HEIGHT, BULLET_PARAMS } from '../config.js';

export class Bullet {
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

  draw(ctx) {
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
