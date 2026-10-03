import { gameState as s } from './state.js';
import { Bullet } from '../classes/Bullet.js';
import { playSfx } from './audio.js';
import { resetTouchControls } from './touch.js';
import { spawnBurst } from '../classes/Particle.js';

export const upgrades = [
  {id: 'spread', icon: '⋔', name: 'プリズム・バレル', tag: 'WEAPON', description: '射線を2本追加。扇状の弾幕で敵の群れを一掃する。', max: 2},
  {id: 'rapid', icon: 'ϟ', name: 'オーバークロック', tag: 'FIRE RATE', description: '連射速度 +20%。途切れない光の雨を降らせる。', max: 5},
  {id: 'damage', icon: '✦', name: 'コア・アンプリファイア', tag: 'DAMAGE', description: 'すべての弾のダメージ +1。ボスの装甲を貫け。', max: 5},
  {id: 'drone', icon: '◈', name: 'オービット・ドローン', tag: 'SUPPORT', description: '衛星が自機を周回し、自動で援護射撃。最大3機。', max: 3},
  {id: 'magnet', icon: '◎', name: 'グラビティ・ウェル', tag: 'COLLECTION', description: '経験値の吸引範囲 +55。危険な回収を減らす。', max: 3},
  {id: 'shield', icon: '⬡', name: 'フォトン・シールド', tag: 'DEFENSE', description: '被弾を1回防ぐシールドを獲得。3枚まで保持。', max: 99},
  {id: 'dash', icon: '»', name: 'ブリンク・ドライブ', tag: 'MOBILITY', description: 'ダッシュの再使用が速くなる。弾幕の隙間を駆け抜けろ。', max: 3},
];

export function emitRing(x, y, color, radius = 100) {
  s.rings.push({x, y, color, radius, age: 0, life: 0.55});
}

export function rewardKill(enemy) {
  s.kills++;
  s.combo++;
  s.comboTimer = 5;
  s.bestCombo = Math.max(s.bestCombo, s.combo);
  const multiplier = 1 + Math.min(4, Math.floor(s.combo / 5));
  const score = enemy.params.score * multiplier;
  s.score += score;
  s.nova = Math.min(100, s.nova + (enemy.isBoss ? 25 : 5));
  s.messages.push({x: enemy.x, y: enemy.y, text: `+${score}`, life: 0.8});
  s.pickups.push({x: enemy.x, y: enemy.y, value: enemy.isBoss ? 12 : 1, age: 0});
  emitRing(enemy.x, enemy.y, enemy.color, enemy.isBoss ? 230 : 35);
  if (enemy.isBoss) s.shakeTimer = 0.5;
}

export function activateNova() {
  if (s.state !== 'playing' || s.nova < 100) return false;
  s.nova = 0;
  s.novaTimer = 0.65;
  s.shakeTimer = 0.3;
  s.player.invincibleTimer = Math.max(s.player.invincibleTimer, 0.8);
  s.bullets = s.bullets.filter(b => b.owner === 'player');
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    if (s.enemies[i].hit(18 + (s.upgrades.damage || 0) * 3)) s.enemies.splice(i, 1);
  }
  emitRing(s.player.x, s.player.y, '#b9fff5', 750);
  playSfx('powerUp');
  return true;
}

export function chooseUpgrade(index) {
  if (s.state !== 'upgrading' || !s.choices[index]) return;
  const choice = s.choices[index];
  s.upgrades[choice.id] = (s.upgrades[choice.id] || 0) + 1;
  if (choice.id === 'shield') s.shield = Math.min(3, s.shield + 1);
  s.choices = [];
  s.keys = {};
  resetTouchControls();
  s.state = document.hidden ? 'paused' : 'playing';
  s.player.invincibleTimer = Math.max(s.player.invincibleTimer, 0.7);
  emitRing(s.player.x, s.player.y, '#b6ff76', 100);
  playSfx('powerUp');
}

export function updateEvolution(dt) {
  if (s.state !== 'playing') return;
  s.comboTimer = Math.max(0, s.comboTimer - dt);
  if (!s.comboTimer) s.combo = 0;
  s.novaTimer = Math.max(0, s.novaTimer - dt);
  for (const ring of s.rings) ring.age += dt;
  s.rings = s.rings.filter(r => r.age < r.life);
  for (const msg of s.messages) { msg.life -= dt; msg.y -= 28 * dt; }
  s.messages = s.messages.filter(m => m.life > 0);
  for (let i = s.pickups.length - 1; i >= 0; i--) {
    const orb = s.pickups[i];
    orb.age += dt;
    const dx = s.player.x - orb.x, dy = s.player.y - orb.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 65 + (s.upgrades.magnet || 0) * 55 || orb.value > 1 || orb.age > 8) {
      const step = Math.min(dist, (180 + orb.age * 40) * dt);
      if (dist > 0) { orb.x += dx / dist * step; orb.y += dy / dist * step; }
    } else orb.y += 15 * dt;
    if (Math.hypot(s.player.x - orb.x, s.player.y - orb.y) < 18) {
      s.xp += orb.value;
      s.pickups.splice(i, 1);
      spawnBurst(s.particles, orb.x, orb.y, {count: 4, color: '#b6ff76', lifetime: 0.25, size: 2, minSpeed: 20, maxSpeed: 50});
    } else if (orb.y > 670 || orb.age > 25) s.pickups.splice(i, 1);
  }
  s.droneTimer -= dt;
  if (s.droneTimer <= 0 && s.upgrades.drone) {
    for (const drone of dronePositions()) s.bullets.push(new Bullet(drone.x, drone.y, 0, -1, 'player', 380));
    s.droneTimer = 0.35;
  }
  if (s.xp >= s.xpNext) {
    s.xp -= s.xpNext;
    s.level++;
    s.xpNext = 6 + (s.level - 1) * 3;
    const pool = upgrades.filter(u => (s.upgrades[u.id] || 0) < u.max && (u.id !== 'shield' || s.shield < 3));
    // Fisher–Yates: distinct, evenly sampled choices without a random sort comparator.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    s.choices = pool.slice(0, 3);
    if (s.choices.length) {
      s.state = 'upgrading';
      s.keys = {};
      resetTouchControls();
      playSfx('powerUp');
    }
  }
}

export function dronePositions() {
  return Array.from({length: s.upgrades.drone || 0}, (_, i) => {
    const a = performance.now() / 700 + i * Math.PI * 2 / s.upgrades.drone;
    return {x: s.player.x + Math.cos(a) * 27, y: s.player.y + Math.sin(a) * 27};
  });
}

export function drawEvolution(ctx) {
  ctx.save();
  for (const orb of s.pickups) {
    ctx.fillStyle = '#b6ff76'; ctx.shadowColor = '#b6ff76'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(orb.x, orb.y - 5); ctx.lineTo(orb.x + 4, orb.y);
    ctx.lineTo(orb.x, orb.y + 5); ctx.lineTo(orb.x - 4, orb.y); ctx.closePath(); ctx.fill();
  }
  ctx.shadowBlur = 0;
  for (const ring of s.rings) {
    const t = ring.age / ring.life;
    ctx.globalAlpha = (1 - t) * 0.7; ctx.strokeStyle = ring.color; ctx.lineWidth = (1 - t) * 3;
    ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius * t, 0, Math.PI * 2); ctx.stroke();
  }
  for (const msg of s.messages) {
    ctx.globalAlpha = Math.min(1, msg.life * 3); ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.fillText(msg.text, msg.x, msg.y);
  }
  ctx.globalAlpha = 1;
  if (s.player) {
    for (const d of dronePositions()) {
      ctx.strokeStyle = '#b6ff76'; ctx.lineWidth = 1.5;
      ctx.beginPath();ctx.moveTo(d.x, d.y - 6);ctx.lineTo(d.x + 5, d.y + 4);
      ctx.lineTo(d.x - 5, d.y + 4);ctx.closePath();ctx.stroke();
    }
    if (s.shield) {
      ctx.strokeStyle = '#a9ffce'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      ctx.beginPath();ctx.arc(s.player.x, s.player.y, 21, 0, Math.PI * 2);ctx.stroke();
    }
  }
  ctx.restore();
}
