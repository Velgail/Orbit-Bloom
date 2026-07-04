// =========================================
// Particle Class
// =========================================

/**
 * Push `count` particles flying in random directions from (x, y)
 * into `particles` — the shared burst idiom for hits and explosions.
 */
export function spawnBurst(particles, x, y, { count, color, lifetime, size, minSpeed, maxSpeed, sizeJitter = 0 }) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    particles.push(new Particle(
      x, y, color, lifetime, size + Math.random() * sizeJitter,
      Math.cos(angle) * speed, Math.sin(angle) * speed
    ));
  }
}

export class Particle {
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

  draw(ctx) {
    const alpha = this.lifetime / this.maxLifetime;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}
