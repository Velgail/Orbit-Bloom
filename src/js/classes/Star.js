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
    // Scrolling speed (parallax effect - stars move slower than enemies)
    this.scrollSpeed = 30 + Math.random() * 50; // 30-80 pixels per second
  }

  update(dt) {
    // Twinkle effect
    this.brightness += this.fadeDirection * this.fadeSpeed * dt;
    if (this.brightness >= 1.0) {
      this.brightness = 1.0;
      this.fadeDirection = -1;
    } else if (this.brightness <= 0.0) {
      this.brightness = 0.0;
      this.fadeDirection = 1;
    }

    // Scrolling background (move downward)
    this.y += this.scrollSpeed * dt;

    // Wrap around when off-screen
    if (this.y > GAME_HEIGHT + 10) {
      this.y = -10;
      this.x = Math.random() * GAME_WIDTH; // Randomize x position on reset
    }
  }

  draw(ctx) {
    ctx.globalAlpha = this.brightness * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1.0;
  }
}
