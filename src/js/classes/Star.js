// =========================================
// Star Class (Background)
// =========================================

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class Star {
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

  draw(ctx) {
    ctx.globalAlpha = this.brightness * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1.0;
  }
}
