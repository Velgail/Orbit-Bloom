import { gameState as s, canRestart } from './state.js';
import { isMuted } from './audio.js';

const el = id => document.getElementById(id);
let choiceKey = '';
export function updateUI() {
  el('titleScreen').hidden = s.state !== 'title';
  el('upgradeScreen').hidden = s.state !== 'upgrading';
  el('pauseScreen').hidden = s.state !== 'paused';
  el('gameoverScreen').hidden = s.state !== 'gameover';
  el('pauseButton').hidden = !['playing', 'paused'].includes(s.state);
  el('soundButton').textContent = `SOUND ${isMuted() ? 'OFF' : 'ON'}`;
  el('soundButton').setAttribute('aria-pressed', String(!isMuted()));
  el('titleBest').textContent = String(s.highScore).padStart(6, '0');
  el('score').textContent = String(s.score).padStart(6, '0');
  el('lives').textContent = '◆'.repeat(Math.max(0, s.lives));
  el('shield').textContent = s.shield ? `+${s.shield} SHIELD` : '';
  el('time').textContent = `${String(s.wave).padStart(2, '0')} / ${s.bossSpawned ? 'BOSS' : Math.ceil(Math.max(0, 45 - s.elapsedTime)) + 's'}`;
  el('combo').textContent = s.combo >= 2 ? `${s.combo} CHAIN ×${1 + Math.min(4, Math.floor(s.combo / 5))}` : '';
  el('level').textContent = `LV.${String(s.level).padStart(2, '0')}`;
  el('xpText').textContent = `${s.xp} / ${s.xpNext}`;
  el('xpFill').style.width = `${Math.min(100, s.xp / s.xpNext * 100)}%`;
  el('bossHud').hidden = !s.boss || s.boss.hp <= 0;
  if (s.boss) {
    el('bossFill').style.width = `${s.boss.hp / s.boss.maxHp * 100}%`;
    el('bossPhase').textContent = s.boss.hp < s.boss.maxHp / 2 ? 'PHASE 02 / ENRAGED' : 'PHASE 01';
  }
  el('gameInfo').style.display = ['playing', 'paused', 'upgrading'].includes(s.state) ? 'block' : 'none';
  el('novaButton').disabled = s.nova < 100 || s.state !== 'playing';
  el('novaButton').classList.toggle('ready', s.nova >= 100);
  el('novaText').textContent = s.nova >= 100 ? 'READY [E]' : `${Math.floor(s.nova)}%`;
  el('novaFill').style.width = `${s.nova}%`;
  el('buildInfo').textContent = Object.entries(s.upgrades).map(([id,n]) => `${id.toUpperCase()} ${n}`).join(' / ') || 'CORE SYSTEM ONLINE';
  if (s.state === 'upgrading') {
    const key = `${s.level}:${s.choices.map(c => c.id).join(',')}`;
    if (key !== choiceKey) {
      choiceKey = key;
      document.querySelectorAll('[data-choice]').forEach((button, i) => {
        const c = s.choices[i];
        button.hidden = !c;
        if (!c) return;
        // All content comes from the fixed local upgrade catalog.
        button.innerHTML = `<span class="card-meta"><span>${c.tag}</span><span>0${i + 1} ↗</span></span><span class="card-icon" aria-hidden="true">${c.icon}</span><span class="card-name">${c.name}</span><span class="card-description">${c.description}</span><span class="card-rank">UPGRADE ${(s.upgrades[c.id] || 0) + 1}</span>`;
      });
      document.querySelector('[data-choice="0"]').focus({preventScroll: true});
    }
  }
  if (s.state === 'gameover') {
    el('resultLabel').textContent = s.isNewRecord ? 'NEW PERSONAL BEST' : 'RUN COMPLETE';
    el('resultScore').textContent = String(s.score).padStart(6, '0');
    el('resultWave').textContent = s.wave;
    el('resultKills').textContent = s.kills;
    el('resultCombo').textContent = s.bestCombo;
    el('resultBest').textContent = `PERSONAL BEST / ${s.highScore}`;
    el('retryButton').disabled = !canRestart();
  }
}
