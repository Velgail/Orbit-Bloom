// Game configuration
const config = {
    canvasWidth: 800,
    canvasHeight: 600,
    targetFPS: 60,
    playerSpeed: 200, // pixels per second
    enemySpeed: 50,
    enemySpawnRate: 2000, // milliseconds
};

// Game state
const gameState = {
    player: {
        x: 400,
        y: 300,
        size: 20,
        color: '#00ff88',
    },
    enemies: [],
    bullets: [],
    score: 0,
    lastEnemySpawn: 0,
    keys: {},
    mouse: { x: 0, y: 0 },
    lastShot: 0,
    shootCooldown: 200, // milliseconds
};

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = config.canvasWidth;
canvas.height = config.canvasHeight;

// UI elements
const scoreElement = document.getElementById('score');
const fpsElement = document.getElementById('fps');

// Input handling
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    gameState.mouse.x = e.clientX - rect.left;
    gameState.mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', () => {
    shoot();
});

// Game entities
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.color = '#ff4444';
        this.vx = (Math.random() - 0.5) * config.enemySpeed;
        this.vy = (Math.random() - 0.5) * config.enemySpeed;
    }

    update(deltaTime) {
        // Move towards player
        const dx = gameState.player.x - this.x;
        const dy = gameState.player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * config.enemySpeed * deltaTime;
            this.y += (dy / distance) * config.enemySpeed * deltaTime;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
        ctx.stroke();
    }
}

class Bullet {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.size = 5;
        this.color = '#ffff00';
        this.speed = 400; // pixels per second
        
        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        this.vx = (dx / distance) * this.speed;
        this.vy = (dy / distance) * this.speed;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Trail effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    isOffScreen() {
        return this.x < 0 || this.x > config.canvasWidth ||
               this.y < 0 || this.y > config.canvasHeight;
    }
}

// Game functions
function updatePlayer(deltaTime) {
    // Movement with WASD or arrow keys
    if (gameState.keys['w'] || gameState.keys['arrowup']) {
        gameState.player.y -= config.playerSpeed * deltaTime;
    }
    if (gameState.keys['s'] || gameState.keys['arrowdown']) {
        gameState.player.y += config.playerSpeed * deltaTime;
    }
    if (gameState.keys['a'] || gameState.keys['arrowleft']) {
        gameState.player.x -= config.playerSpeed * deltaTime;
    }
    if (gameState.keys['d'] || gameState.keys['arrowright']) {
        gameState.player.x += config.playerSpeed * deltaTime;
    }

    // Keep player within bounds
    gameState.player.x = Math.max(gameState.player.size, Math.min(config.canvasWidth - gameState.player.size, gameState.player.x));
    gameState.player.y = Math.max(gameState.player.size, Math.min(config.canvasHeight - gameState.player.size, gameState.player.y));
}

function drawPlayer() {
    ctx.fillStyle = gameState.player.color;
    ctx.beginPath();
    ctx.arc(gameState.player.x, gameState.player.y, gameState.player.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Glow effect
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(gameState.player.x, gameState.player.y, gameState.player.size + 5, 0, Math.PI * 2);
    ctx.stroke();
}

function spawnEnemy(currentTime) {
    if (currentTime - gameState.lastEnemySpawn > config.enemySpawnRate) {
        // Spawn from random edge
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        
        switch (edge) {
            case 0: // top
                x = Math.random() * config.canvasWidth;
                y = 0;
                break;
            case 1: // right
                x = config.canvasWidth;
                y = Math.random() * config.canvasHeight;
                break;
            case 2: // bottom
                x = Math.random() * config.canvasWidth;
                y = config.canvasHeight;
                break;
            case 3: // left
                x = 0;
                y = Math.random() * config.canvasHeight;
                break;
        }
        
        gameState.enemies.push(new Enemy(x, y));
        gameState.lastEnemySpawn = currentTime;
    }
}

function shoot() {
    const currentTime = performance.now();
    if (currentTime - gameState.lastShot > gameState.shootCooldown) {
        const bullet = new Bullet(
            gameState.player.x,
            gameState.player.y,
            gameState.mouse.x,
            gameState.mouse.y
        );
        gameState.bullets.push(bullet);
        gameState.lastShot = currentTime;
    }
}

function checkCollisions() {
    // Check bullet-enemy collisions
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        for (let j = gameState.enemies.length - 1; j >= 0; j--) {
            const enemy = gameState.enemies[j];
            const dx = bullet.x - enemy.x;
            const dy = bullet.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < bullet.size + enemy.size) {
                gameState.enemies.splice(j, 1);
                gameState.bullets.splice(i, 1);
                gameState.score += 10;
                scoreElement.textContent = gameState.score;
                break;
            }
        }
    }
    
    // Check player-enemy collisions
    for (const enemy of gameState.enemies) {
        const dx = gameState.player.x - enemy.x;
        const dy = gameState.player.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < gameState.player.size + enemy.size) {
            // Game over logic could be added here
            // For now, just reset score
            gameState.score = Math.max(0, gameState.score - 50);
            scoreElement.textContent = gameState.score;
        }
    }
}

// Game loop with fixed timestep
let lastTime = performance.now();
let fpsCounter = 0;
let fpsTime = 0;

function gameLoop(currentTime) {
    // Calculate deltaTime in seconds
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    
    // FPS counter
    fpsCounter++;
    fpsTime += deltaTime;
    if (fpsTime >= 1) {
        fpsElement.textContent = fpsCounter;
        fpsCounter = 0;
        fpsTime = 0;
    }
    
    // Update
    updatePlayer(deltaTime);
    spawnEnemy(currentTime);
    
    // Update enemies
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        gameState.enemies[i].update(deltaTime);
    }
    
    // Update bullets
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        gameState.bullets[i].update(deltaTime);
        if (gameState.bullets[i].isOffScreen()) {
            gameState.bullets.splice(i, 1);
        }
    }
    
    checkCollisions();
    
    // Draw
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // Draw starfield background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 50; i++) {
        const x = (i * 123) % config.canvasWidth;
        const y = (i * 456) % config.canvasHeight;
        ctx.fillRect(x, y, 2, 2);
    }
    
    drawPlayer();
    
    gameState.enemies.forEach(enemy => enemy.draw());
    gameState.bullets.forEach(bullet => bullet.draw());
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame(gameLoop);
