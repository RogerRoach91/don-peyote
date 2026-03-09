<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Super Platformer Adventure - Sprite Edition</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: #5c94fc;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        #game-container {
            position: relative;
            width: 100%;
            height: 100%;
            max-width: 800px;
            max-height: 600px;
            background: #5c94fc;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            overflow: hidden;
            border: 4px solid #333;
        }

        canvas {
            display: block;
        }

        #ui-overlay {
            position: absolute;
            top: 20px;
            left: 20px;
            color: white;
            font-size: 24px;
            text-shadow: 2px 2px 0 #000;
            pointer-events: none;
        }

        #message-box {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 40px;
            border-radius: 15px;
            text-align: center;
            display: none;
            z-index: 10;
        }

        #message-box h2 { margin-top: 0; }
        #message-box button {
            background: #ff4757;
            border: none;
            color: white;
            padding: 10px 20px;
            font-size: 18px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 10px;
        }

        #controls-hint {
            position: absolute;
            bottom: 20px;
            left: 20px;
            color: white;
            background: rgba(0,0,0,0.3);
            padding: 10px;
            border-radius: 5px;
            font-size: 14px;
        }

        #loading-screen {
            position: absolute;
            inset: 0;
            background: #333;
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20;
        }
    </style>
</head>
<body>

<div id="game-container">
    <div id="loading-screen">Loading Assets...</div>
    <canvas id="gameCanvas"></canvas>
    <div id="ui-overlay">
        Score: <span id="score-val">0</span>
    </div>
    <div id="controls-hint">
        ARROWS / WASD to Move & Jump
    </div>
    <div id="message-box">
        <h2 id="msg-title">Game Over!</h2>
        <p id="msg-body">You fell or touched an enemy.</p>
        <button onclick="resetGame()">Try Again</button>
    </div>
</div>

<script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score-val');
    const messageBox = document.getElementById('message-box');
    const msgTitle = document.getElementById('msg-title');
    const loadingScreen = document.getElementById('loading-screen');

    // Game Constants
    const GRAVITY = 0.5;
    const FRICTION = 0.8;
    const JUMP_FORCE = -12;
    const MOVE_SPEED = 5;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    // Sprite Asset Configuration
    // Replace these URLs with your own sprite links!
    const assets = {
        player: 'https://img.icons8.com/color/96/super-mario.png',
        enemy: 'https://img.icons8.com/color/96/goomba.png',
        coin: 'https://img.icons8.com/color/96/coin.png',
        grass: 'https://img.icons8.com/color/96/grass.png'
    };

    const images = {};
    let assetsLoaded = 0;
    const totalAssets = Object.keys(assets).length;

    function loadAssets(callback) {
        for (let key in assets) {
            images[key] = new Image();
            images[key].src = assets[key];
            images[key].onload = () => {
                assetsLoaded++;
                if (assetsLoaded === totalAssets) {
                    loadingScreen.style.display = 'none';
                    callback();
                }
            };
            images[key].onerror = () => {
                console.error("Failed to load image: " + key);
                // Create a fallback colored square if image fails
                assetsLoaded++;
                if (assetsLoaded === totalAssets) {
                    loadingScreen.style.display = 'none';
                    callback();
                }
            };
        }
    }

    // Game State
    let score = 0;
    let gameActive = true;
    let cameraX = 0;
    const keys = {};

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    class Player {
        constructor() {
            this.width = 44;
            this.height = 44;
            this.reset();
        }

        reset() {
            this.x = 100;
            this.y = 300;
            this.vx = 0;
            this.vy = 0;
            this.grounded = false;
            this.facingLeft = false;
        }

        update() {
            if (keys['ArrowLeft'] || keys['a']) {
                if (this.vx > -MOVE_SPEED) this.vx--;
                this.facingLeft = true;
            }
            if (keys['ArrowRight'] || keys['d']) {
                if (this.vx < MOVE_SPEED) this.vx++;
                this.facingLeft = false;
            }
            if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && this.grounded) {
                this.vy = JUMP_FORCE;
                this.grounded = false;
            }

            this.vy += GRAVITY;
            this.x += this.vx;
            this.y += this.vy;
            this.vx *= FRICTION;

            if (this.y + this.height > CANVAS_HEIGHT + 100) {
                gameOver("Game Over!", "You fell into the abyss.");
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x - cameraX + (this.facingLeft ? this.width : 0), this.y);
            if (this.facingLeft) ctx.scale(-1, 1);
            
            if (images.player.complete && images.player.naturalWidth !== 0) {
                ctx.drawImage(images.player, 0, 0, this.width, this.height);
            } else {
                ctx.fillStyle = "#ff4757";
                ctx.fillRect(0, 0, this.width, this.height);
            }
            ctx.restore();
        }
    }

    class Platform {
        constructor(x, y, w, h, type = 'normal') {
            this.x = x;
            this.y = y;
            this.w = w;
            this.h = h;
            this.type = type;
        }

        draw() {
            // Check if it's a "floor" to tile grass
            if (this.h >= 50 && images.grass.complete) {
                const pattern = ctx.createPattern(images.grass, 'repeat');
                ctx.save();
                ctx.translate(this.x - cameraX, this.y);
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, this.w, this.h);
                ctx.restore();
            } else {
                ctx.fillStyle = this.type === 'hazard' ? '#e74c3c' : '#2ecc71';
                ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
            }
            
            // Add top border
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fillRect(this.x - cameraX, this.y, this.w, 6);
        }
    }

    class Coin {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.size = 30;
            this.collected = false;
            this.bob = Math.random() * Math.PI * 2;
        }

        draw() {
            if (this.collected) return;
            this.bob += 0.1;
            const bobY = Math.sin(this.bob) * 5;

            if (images.coin.complete && images.coin.naturalWidth !== 0) {
                ctx.drawImage(images.coin, this.x - cameraX - this.size/2, this.y + bobY - this.size/2, this.size, this.size);
            } else {
                ctx.beginPath();
                ctx.arc(this.x - cameraX, this.y + bobY, 12, 0, Math.PI * 2);
                ctx.fillStyle = "#f1c40f";
                ctx.fill();
            }
        }
    }

    class Enemy {
        constructor(x, y, range) {
            this.startX = x;
            this.x = x;
            this.y = y;
            this.range = range;
            this.width = 40;
            this.height = 40;
            this.speed = 2;
            this.dir = 1;
        }

        update() {
            this.x += this.speed * this.dir;
            if (Math.abs(this.x - this.startX) > this.range) {
                this.dir *= -1;
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x - cameraX + (this.dir > 0 ? this.width : 0), this.y);
            if (this.dir > 0) ctx.scale(-1, 1);
            
            if (images.enemy.complete && images.enemy.naturalWidth !== 0) {
                ctx.drawImage(images.enemy, 0, 0, this.width, this.height);
            } else {
                ctx.fillStyle = "#8e44ad";
                ctx.fillRect(0, 0, this.width, this.height);
            }
            ctx.restore();
        }
    }

    const player = new Player();
    let platforms = [];
    let coins = [];
    let enemies = [];

    function initLevel() {
        score = 0;
        scoreEl.innerText = score;
        cameraX = 0;
        player.reset();
        
        platforms = [
            new Platform(0, 500, 800, 100),
            new Platform(300, 400, 150, 20),
            new Platform(550, 320, 200, 20),
            new Platform(850, 450, 300, 150),
            new Platform(1250, 400, 200, 20),
            new Platform(1550, 500, 1000, 100),
        ];

        coins = [
            new Coin(375, 360),
            new Coin(600, 280),
            new Coin(650, 280),
            new Coin(700, 280),
            new Coin(950, 410),
            new Coin(1350, 350),
            new Coin(1800, 460),
        ];

        enemies = [
            new Enemy(900, 410, 80),
            new Enemy(1650, 460, 150),
            new Enemy(2000, 460, 200),
        ];
    }

    function checkCollisions() {
        player.grounded = false;

        platforms.forEach(p => {
            if (player.x < p.x + p.w &&
                player.x + player.width > p.x &&
                player.y < p.y + p.h &&
                player.y + player.height > p.y) {
                
                let overlapX = Math.min(player.x + player.width - p.x, p.x + p.w - player.x);
                let overlapY = Math.min(player.y + player.height - p.y, p.y + p.h - player.y);

                if (overlapX > overlapY) {
                    if (player.vy > 0 && player.y < p.y) {
                        player.y = p.y - player.height;
                        player.vy = 0;
                        player.grounded = true;
                    } else if (player.vy < 0 && player.y > p.y) {
                        player.y = p.y + p.h;
                        player.vy = 0;
                    }
                } else {
                    if (player.vx > 0 && player.x < p.x) player.x = p.x - player.width;
                    if (player.vx < 0 && player.x > p.x) player.x = p.x + p.w;
                }
            }
        });

        coins.forEach(c => {
            if (!c.collected) {
                let dx = player.x + player.width/2 - c.x;
                let dy = player.y + player.height/2 - c.y;
                let dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < player.width/2 + 15) {
                    c.collected = true;
                    score += 10;
                    scoreEl.innerText = score;
                }
            }
        });

        enemies.forEach(e => {
            if (player.x < e.x + e.width &&
                player.x + player.width > e.x &&
                player.y < e.y + e.height &&
                player.y + player.height > e.y) {
                
                if (player.vy > 0 && player.y + player.height < e.y + 20) {
                    enemies = enemies.filter(item => item !== e);
                    player.vy = JUMP_FORCE / 1.5;
                    score += 50;
                    scoreEl.innerText = score;
                } else {
                    gameOver("Ouch!", "You bumped into an enemy.");
                }
            }
        });

        if (player.x > 2400) {
            gameOver("You Win!", "Score: " + score);
        }
    }

    function gameOver(title, body) {
        gameActive = false;
        msgTitle.innerText = title;
        document.getElementById('msg-body').innerText = body;
        messageBox.style.display = "block";
    }

    function resetGame() {
        messageBox.style.display = "none";
        gameActive = true;
        initLevel();
        requestAnimationFrame(gameLoop);
    }

    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    function gameLoop() {
        if (!gameActive) return;

        player.update();
        enemies.forEach(e => e.update());
        checkCollisions();

        let targetCameraX = player.x - CANVAS_WIDTH / 2 + player.width / 2;
        cameraX += (targetCameraX - cameraX) * 0.1;
        if (cameraX < 0) cameraX = 0;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        for(let i=0; i<10; i++) {
            ctx.beginPath();
            ctx.arc((i * 400) - (cameraX * 0.2), 100 + (i % 3 * 50), 40, 0, Math.PI*2);
            ctx.fill();
        }

        platforms.forEach(p => p.draw());
        coins.forEach(c => c.draw());
        enemies.forEach(e => e.draw());
        player.draw();

        requestAnimationFrame(gameLoop);
    }

    // Initialize after loading images
    loadAssets(() => {
        initLevel();
        gameLoop();
    });
</script>

</body>
</html>
