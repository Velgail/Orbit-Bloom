import { Bullet } from './Bullet.js';
import { spawnBurst } from './Particle.js';
import { rewardKill } from '../game/evolution.js';
import { playSfx } from '../game/audio.js';

/** A telegraphed two-phase sector guardian; shares the enemy collision interface. */
export class Boss {
  constructor(state) {
    this.gameState = state;
    this.isBoss = true;
    this.x = 180; this.y = -40; this.radius = 30;
    this.maxHp = 80 + state.wave * 35;
    this.hp = this.maxHp;
    this.color = '#ff648c';
    this.params = {score: 500 * state.wave};
    this.time = 0; this.shotTimer = 2.8; this.volley = 0;
    this.flashTimer = 0; this.aim = Math.PI / 2;
  }
  update(dt) {
    this.time += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.y = Math.min(115, this.y + 65 * dt);
    this.x = 180 + Math.sin(this.time * 0.75) * 105;
    if (this.y < 115) return;
    const enraged = this.hp < this.maxHp / 2;
    this.shotTimer -= dt;
    if (this.shotTimer > 0.8) {
      const p = this.gameState.player;
      this.aim = Math.atan2(p.y - this.y, p.x - this.x);
    }
    if (this.shotTimer <= 0) {
      if (this.volley % 2 === 0) {
        const n = enraged ? 16 : 12;
        for (let i = 0; i < n; i++) this.fire(i / n * Math.PI * 2 + this.volley * 0.21, enraged ? 125 : 95);
      } else {
        for (let i = -2; i <= 2; i++) this.fire(this.aim + i * 0.16, enraged ? 170 : 135);
      }
      this.volley++;
      this.shotTimer = enraged ? 1.6 : 2.4;
      playSfx('enemyHit');
    }
  }
  fire(angle, speed) {
    this.gameState.bullets.push(new Bullet(this.x, this.y, Math.cos(angle), Math.sin(angle), 'enemy', speed));
  }
  hit(damage = 1) {
    if (this.hp <= 0) return true;
    // Entry is protected so the warning and arrival cannot be skipped by a nova.
    if (this.y < 115) return false;
    this.hp -= damage;
    this.flashTimer = 0.08;
    if (this.hp <= 0) {
      this.hp = 0;
      rewardKill(this);
      spawnBurst(this.gameState.particles, this.x, this.y, {count: 65, color: this.color, lifetime: 1, size: 4, minSpeed: 40, maxSpeed: 220});
      playSfx('explosion');
      return true;
    }
    playSfx('enemyHit');
    return false;
  }
  isOffScreen() { return false; }
  draw(ctx) {
    ctx.save();
    if (this.y >= 115 && this.shotTimer < 0.8) {
      ctx.strokeStyle = '#ff648c'; ctx.globalAlpha = 0.25; ctx.lineWidth = 1;
      ctx.setLineDash([5, 7]);
      const angles = this.volley % 2 === 0 ? Array.from({length: this.hp < this.maxHp / 2 ? 16 : 12}, (_, i) => i / (this.hp < this.maxHp / 2 ? 16 : 12) * Math.PI * 2 + this.volley * 0.21) : [-2,-1,0,1,2].map(i => this.aim + i * 0.16);
      for (const a of angles) {ctx.beginPath();ctx.moveTo(this.x, this.y);ctx.lineTo(this.x + Math.cos(a) * 750, this.y + Math.sin(a) * 750);ctx.stroke();}
      ctx.setLineDash([]);ctx.globalAlpha = 1;
    }
    ctx.translate(this.x, this.y);ctx.rotate(this.time * 0.5);
    ctx.strokeStyle = this.flashTimer ? '#fff' : this.color;
    ctx.fillStyle = '#28172e';ctx.lineWidth = 2.5;ctx.shadowColor = this.color;ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6, r = i % 2 ? 19 : 36;
      if (!i) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r); else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.rotate(-this.time);ctx.strokeRect(-12, -12, 24, 24);
    ctx.fillStyle = this.flashTimer ? '#fff' : '#ff648c';ctx.beginPath();ctx.arc(0, 0, 7, 0, Math.PI * 2);ctx.fill();
    ctx.restore();
  }
}
