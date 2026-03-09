<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Super Platformer Adventure - Boss Edition</title>
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
            right: 20px;
            color: white;
            font-size: 24px;
            text-shadow: 2px 2px 0 #000;
            pointer-events: none;
            display: flex;
            justify-content: space-between;
        }

        #boss-ui {
            position: absolute;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            width: 300px;
            display: none;
        }

        #boss-health-bg {
            width: 100%;
            height: 15px;
            background: #333;
            border: 2px solid white;
            border-radius: 10px;
        }

        #boss-health-bar {
            width: 100%;
            height: 100%;
            background: #ff4757;
            border-radius: 8px;
            transition: width 0.3s;
        }

        #message-box, #start-screen {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 30px 50px;
            border-radius: 15px;
            text-align: center;
            z-index: 10;
        }

        #start-screen { display: flex; flex-direction: column; align-items: center; }

        #message-box h2, #start-screen h2 { margin-top: 0; color: #ffeb3b; }
        
        button {
            background: #ff4757;
            border: none;
            color: white;
            padding: 12px 25px;
            font-size: 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 15px;
            transition: transform 0.1s;
        }

        button:active { transform: scale(0.95); }

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

        #audio-toggle {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(0,0,0,0.5);
            color: white;
            border: none;
            padding: 8px;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
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
    <div id="loading-screen">Loading Game Assets...</div>
    
    <div id="start-screen">
        <h2>Super Adventure</h2>
        <p>A great journey (and a big fight) awaits!</p>
        <button onclick="startGame()">START GAME</button>
    </div>

    <canvas id="gameCanvas"></canvas>
    
    <div id="ui-overlay">
        <div>Level: <span id="level-val">1</span></div>
        <div>Score: <span id="score-val">0</span></div>
    </div>

    <div id="boss-ui">
        <div style="color: white; text-align: center; margin-bottom: 5px; font-weight: bold; text-shadow: 1px 1px #000;">BOSS</div>
        <div id="boss-health-bg">
            <div id="boss-health-bar"></div>
        </div>
    </div>

    <button id="audio-toggle" onclick="toggleAudio()">🎵</button>

    <div id="controls-hint">
        ARROWS / WASD to Move & Jump
    </div>

    <div id="message-box" style="display:none">
        <h2 id="msg-title">Game Over!</h2>
        <p id="msg-body">You fell or touched an enemy.</p>
        <button id="msg-btn">Action</button>
    </div>
</div>

<script>
    // Helper to check if image is safely drawable
    function isDrawable(img) {
        return img && img.complete && img.naturalWidth !== 0;
    }

    // --- AUDIO SYSTEM ---
    const AudioEngine = (() => {
        let ctx = null;
        let masterGain = null;
        let isMuted = false;
        let isStarted = false;

        const init = () => {
            if (isStarted) return;
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.connect(ctx.destination);
            masterGain.gain.value = 0.15;
            isStarted = true;
            playMusic();
        };

        const playTone = (freq, type, duration, volume = 0.1, slide = 0) => {
            if (!isStarted || isMuted) return;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            if (slide) osc.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + duration);
            g.gain.setValueAtTime(volume, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            osc.connect(g);
            g.connect(masterGain);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        };

        const sfx = {
            jump: () => playTone(150, 'triangle', 0.2, 0.2, 400),
            coin: () => {
                playTone(800, 'sine', 0.1, 0.1);
                setTimeout(() => playTone(1200, 'sine', 0.2, 0.1), 50);
            },
            hit: () => playTone(100, 'sawtooth', 0.3, 0.2, 10),
            stomp: () => playTone(200, 'square', 0.1, 0.2, 50),
            bossHit: () => {
                playTone(100, 'sawtooth', 0.2, 0.3, 20);
                setTimeout(() => playTone(50, 'sawtooth', 0.2, 0.3), 100);
            },
            fire: () => playTone(400, 'triangle', 0.1, 0.05, 100),
            win: () => {
                [440, 554, 659, 880, 1108, 1318].forEach((f, i) => {
                    setTimeout(() => playTone(f, 'square', 0.5, 0.1), i * 150);
                });
            }
        };

        const playMusic = () => {
            const tempo = 140;
            const stepTime = 60 / tempo / 2;
            const scale = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
            const melody = [4, 4, 5, 4, 7, 6, 4, 2, 3, 3, 4, 3, 5, 4, 2, 0];
            const bass = [0, 0, 3, 3, 4, 4, 0, 0];
            let step = 0;
            setInterval(() => {
                if (isMuted || !isStarted) return;
                if (step % 2 === 0) {
                    const note = melody[Math.floor(step / 2) % melody.length];
                    playTone(scale[note] * (currentLevelIndex === 3 ? 1.5 : 2), 'triangle', 0.2, 0.05);
                }
                if (step % 4 === 0) {
                    const bNote = bass[Math.floor(step / 4) % bass.length];
                    playTone(scale[bNote] / 2, 'square', 0.3, 0.04);
                }
                step++;
            }, stepTime * 1000);
        };

        return { init, sfx, toggle: () => (isMuted = !isMuted) };
    })();

    // --- GAME ENGINE ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score-val');
    const levelEl = document.getElementById('level-val');
    const messageBox = document.getElementById('message-box');
    const msgTitle = document.getElementById('msg-title');
    const msgBtn = document.getElementById('msg-btn');
    const loadingScreen = document.getElementById('loading-screen');
    const startScreen = document.getElementById('start-screen');
    const bossUi = document.getElementById('boss-ui');
    const bossHealthBar = document.getElementById('boss-health-bar');

    const GRAVITY = 0.5;
    const FRICTION = 0.8;
    const JUMP_FORCE = -12;
    const MOVE_SPEED = 5;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;

    const assets = {
        player: 'https://img.icons8.com/fluency/96/mario.png',
        enemy: 'https://img.icons8.com/color/96/mushroom-man.png',
        boss: 'https://img.icons8.com/color/144/dragon.png',
        coin: 'https://img.icons8.com/fluency/96/coin-scaling.png',
        grass: 'https://img.icons8.com/color/96/grass.png',
        flag: 'https://img.icons8.com/color/96/flag-2.png'
    };

    const images = {};
    let assetsLoaded = 0;
    const totalAssets = Object.keys(assets).length;

    function loadAssets(callback) {
        for (let key in assets) {
            images[key] = new Image();
            images[key].crossOrigin = "anonymous";
            images[key].src = assets[key];
            images[key].onload = () => { if (++assetsLoaded === totalAssets) { loadingScreen.style.display = 'none'; callback(); } };
            images[key].onerror = () => { if (++assetsLoaded === totalAssets) { loadingScreen.style.display = 'none'; callback(); } };
        }
    }

    let currentLevelIndex = 0;
    let totalScore = 0;
    let gameActive = false;
    let cameraX = 0;
    const keys = {};

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    class Player {
        constructor() { this.width = 44; this.height = 44; this.reset(); }
        reset() { this.x = 100; this.y = 300; this.vx = 0; this.vy = 0; this.grounded = false; this.facingLeft = false; }
        update() {
            if (keys['ArrowLeft'] || keys['a']) { if (this.vx > -MOVE_SPEED) this.vx -= 1; this.facingLeft = true; }
            if (keys['ArrowRight'] || keys['d']) { if (this.vx < MOVE_SPEED) this.vx += 1; this.facingLeft = false; }
            if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && this.grounded) { this.vy = JUMP_FORCE; this.grounded = false; AudioEngine.sfx.jump(); }
            this.vy += GRAVITY; this.x += this.vx; this.y += this.vy; this.vx *= FRICTION;
            if (this.y + this.height > CANVAS_HEIGHT + 200) gameOver("Game Over!", "Watch your step!");
        }
        draw() {
            ctx.save();
            ctx.translate(this.x - cameraX + (this.facingLeft ? this.width : 0), this.y);
            if (this.facingLeft) ctx.scale(-1, 1);
            if (isDrawable(images.player)) {
                ctx.drawImage(images.player, 0, 0, this.width, this.height);
            } else {
                ctx.fillStyle = "#ff4757";
                ctx.fillRect(0, 0, this.width, this.height);
            }
            ctx.restore();
        }
    }

    class Projectile {
        constructor(x, y, vx, vy) { this.x = x; this.y = y; this.vx = vx; this.vy = vy; this.radius = 8; this.alive = true; }
        update() { this.x += this.vx; this.y += this.vy; if (this.x < cameraX || this.x > cameraX + CANVAS_WIDTH) this.alive = false; }
        draw() {
            ctx.beginPath(); ctx.arc(this.x - cameraX, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = "#f0932b"; ctx.fill();
            ctx.shadowBlur = 10; ctx.shadowColor = "orange"; ctx.fill(); ctx.shadowBlur = 0;
        }
    }

    class Boss {
        constructor(x, y) {
            this.x = x; this.y = y; this.width = 100; this.height = 100;
            this.maxHp = 3; this.hp = 3; this.dir = 1; this.speed = 2;
            this.timer = 0; this.state = 'move';
        }
        update() {
            this.timer++;
            if (this.state === 'move') {
                this.x += this.speed * this.dir;
                if (this.timer > 100) { this.dir *= -1; this.timer = 0; }
                if (this.timer % 60 === 0) {
                    const dx = player.x - this.x;
                    const dy = (player.y + 20) - (this.y + 50);
                    const angle = Math.atan2(dy, dx);
                    projectiles.push(new Projectile(this.x + 50, this.y + 50, Math.cos(angle) * 6, Math.sin(angle) * 6));
                    AudioEngine.sfx.fire();
                }
            }
        }
        draw() {
            ctx.save();
            if (this.dir > 0) { ctx.translate(this.x - cameraX + this.width, this.y); ctx.scale(-1, 1); }
            else { ctx.translate(this.x - cameraX, this.y); }
            if (isDrawable(images.boss)) {
                ctx.drawImage(images.boss, 0, 0, this.width, this.height);
            } else {
                ctx.fillStyle = "#686de0";
                ctx.fillRect(0, 0, this.width, this.height);
            }
            ctx.restore();
        }
    }

    class Platform {
        constructor(x, y, w, h, type = 'normal') { this.x = x; this.y = y; this.w = w; this.h = h; this.type = type; }
        draw() {
            if (this.h >= 40 && isDrawable(images.grass)) {
                try {
                    const pattern = ctx.createPattern(images.grass, 'repeat');
                    ctx.save(); ctx.translate(this.x - cameraX, this.y); ctx.fillStyle = pattern; ctx.fillRect(0, 0, this.w, this.h); ctx.restore();
                } catch(e) { ctx.fillStyle = '#2ecc71'; ctx.fillRect(this.x - cameraX, this.y, this.w, this.h); }
            } else {
                ctx.fillStyle = this.type === 'hazard' ? '#eb4d4b' : '#2ecc71';
                ctx.fillRect(this.x - cameraX, this.y, this.w, this.h);
            }
        }
    }

    class Coin {
        constructor(x, y) { this.x = x; this.y = y; this.collected = false; this.bob = Math.random() * 6; }
        draw() {
            if (this.collected) return;
            this.bob += 0.1; const bobY = Math.sin(this.bob) * 5;
            if (isDrawable(images.coin)) {
                ctx.drawImage(images.coin, this.x - cameraX - 15, this.y + bobY - 15, 30, 30);
            } else {
                ctx.beginPath(); ctx.arc(this.x - cameraX, this.y + bobY, 12, 0, Math.PI * 2);
                ctx.fillStyle = "#f1c40f"; ctx.fill();
            }
        }
    }

    class Enemy {
        constructor(x, y, range, speed = 2) { this.startX = x; this.x = x; this.y = y; this.range = range; this.width = 40; this.height = 40; this.speed = speed; this.dir = 1; }
        update() { this.x += this.speed * this.dir; if (Math.abs(this.x - this.startX) > this.range) this.dir *= -1; }
        draw() {
            ctx.save(); ctx.translate(this.x - cameraX + (this.dir > 0 ? this.width : 0), this.y); if (this.dir > 0) ctx.scale(-1, 1);
            if (isDrawable(images.enemy)) {
                ctx.drawImage(images.enemy, 0, 0, this.width, this.height);
            } else {
                ctx.fillStyle = "#8e44ad";
                ctx.fillRect(0, 0, this.width, this.height);
            }
            ctx.restore();
        }
    }

    const levelBlueprints = [
        { platforms: [[0, 500, 800, 100], [300, 400, 150, 20], [550, 320, 200, 20], [850, 450, 400, 150], [1400, 450, 600, 150]], coins: [[375, 360], [600, 280], [1000, 410], [1600, 410]], enemies: [[900, 410, 100, 2], [1500, 410, 150, 3]], goal: [1900, 450] },
        { platforms: [[0, 500, 400, 100], [500, 450, 200, 20], [800, 380, 200, 20], [1100, 320, 200, 20], [1400, 250, 100, 20], [1600, 450, 500, 150]], coins: [[550, 410], [850, 340], [1420, 210]], enemies: [[1650, 410, 100, 4]], goal: [2000, 450] },
        { platforms: [[0, 500, 300, 100], [400, 400, 80, 20], [600, 350, 80, 20], [800, 400, 80, 20], [1000, 300, 300, 20], [1600, 500, 600, 100]], coins: [[420, 360], [1100, 260], [1200, 260]], enemies: [[1050, 260, 100, 3]], goal: [2100, 500] },
        { // BOSS LEVEL
            platforms: [[0, 500, 1200, 100]], coins: [], enemies: [], boss: [800, 400], goal: [1100, 500]
        }
    ];

    const player = new Player();
    let platforms = [], coins = [], enemies = [], projectiles = [], boss = null, goal = null;

    function startGame() { startScreen.style.display = 'none'; AudioEngine.init(); loadLevel(0); }
    function toggleAudio() { const muted = AudioEngine.toggle(); document.getElementById('audio-toggle').innerText = muted ? '🔇' : '🎵'; }

    function loadLevel(index) {
        if (index >= levelBlueprints.length) {
            AudioEngine.sfx.win();
            gameOver("SAVIOR OF THE LAND!", "The dragon is defeated! Total Score: " + totalScore, true);
            return;
        }
        currentLevelIndex = index;
        levelEl.innerText = index + 1;
        cameraX = 0; projectiles = []; player.reset();
        const data = levelBlueprints[index];
        platforms = data.platforms.map(p => new Platform(...p));
        coins = (data.coins || []).map(c => new Coin(...c));
        enemies = (data.enemies || []).map(e => new Enemy(...e));
        boss = data.boss ? new Boss(...data.boss) : null;
        goal = data.goal ? { x: data.goal[0], y: data.goal[1], draw: function() {
            if (currentLevelIndex === 3 && boss && boss.hp > 0) return; // Hide exit until boss dies
            if (isDrawable(images.flag)) {
                ctx.drawImage(images.flag, this.x - cameraX, this.y - 80, 50, 80);
            } else {
                ctx.fillStyle = "#ffeb3b";
                ctx.fillRect(this.x - cameraX, this.y - 80, 50, 80);
            }
        }} : null;
        
        bossUi.style.display = boss ? "block" : "none";
        if (boss) bossHealthBar.style.width = "100%";
        
        messageBox.style.display = "none";
        gameActive = true;
        requestAnimationFrame(gameLoop);
    }

    function checkCollisions() {
        player.grounded = false;
        platforms.forEach(p => {
            if (player.x < p.x + p.w && player.x + player.width > p.x && player.y < p.y + p.h && player.y + player.height > p.y) {
                let overlapX = Math.min(player.x + player.width - p.x, p.x + p.w - player.x);
                let overlapY = Math.min(player.y + player.height - p.y, p.y + p.h - player.y);
                if (overlapX > overlapY) {
                    if (player.vy > 0 && player.y < p.y) { player.y = p.y - player.height; player.vy = 0; player.grounded = true; }
                    else if (player.vy < 0 && player.y > p.y) { player.y = p.y + p.h; player.vy = 0; }
                } else {
                    if (player.vx > 0 && player.x < p.x) player.x = p.x - player.width;
                    if (player.vx < 0 && player.x > p.x) player.x = p.x + p.w;
                }
            }
        });

        coins.forEach(c => {
            if (!c.collected && Math.hypot(player.x + 22 - c.x, player.y + 22 - c.y) < 30) {
                c.collected = true; totalScore += 10; scoreEl.innerText = totalScore; AudioEngine.sfx.coin();
            }
        });

        enemies.forEach(e => {
            if (player.x < e.x + e.width && player.x + player.width > e.x && player.y < e.y + e.height && player.y + player.height > e.y) {
                if (player.vy > 0 && player.y + player.height < e.y + 20) {
                    enemies = enemies.filter(item => item !== e); player.vy = JUMP_FORCE / 1.2;
                    totalScore += 50; scoreEl.innerText = totalScore; AudioEngine.sfx.stomp();
                } else { AudioEngine.sfx.hit(); gameOver("Ouch!", "You bumped into an enemy."); }
            }
        });

        projectiles.forEach(p => {
            if (p.alive && Math.hypot(player.x + 22 - p.x, player.y + 22 - p.y) < 25) {
                AudioEngine.sfx.hit(); gameOver("Burn!", "Dodge the boss fireballs!");
            }
        });

        if (boss && boss.hp > 0 && player.x < boss.x + boss.width && player.x + player.width > boss.x && player.y < boss.y + boss.height && player.y + player.height > boss.y) {
            if (player.vy > 0 && player.y + player.height < boss.y + 30) {
                boss.hp--; player.vy = JUMP_FORCE; bossHealthBar.style.width = (boss.hp / boss.maxHp * 100) + "%";
                AudioEngine.sfx.bossHit();
                if (boss.hp <= 0) { totalScore += 500; scoreEl.innerText = totalScore; }
            } else { AudioEngine.sfx.hit(); gameOver("Dragon Fire!", "The boss is too strong!"); }
        }

        if (goal && player.x + 44 > goal.x && player.x < goal.x + 50 && player.y + 44 > goal.y - 80 && player.y < goal.y) {
            if (currentLevelIndex === 3 && boss && boss.hp > 0) return;
            AudioEngine.sfx.win(); nextLevel();
        }
    }

    function nextLevel() {
        gameActive = false; msgTitle.innerText = "Level Complete!";
        document.getElementById('msg-body').innerText = currentLevelIndex === 2 ? "THE FINAL BOSS AWAITS..." : "Ready for more?";
        msgBtn.innerText = "Continue"; msgBtn.onclick = () => loadLevel(currentLevelIndex + 1); messageBox.style.display = "block";
    }

    function gameOver(title, body, isWin = false) {
        gameActive = false; msgTitle.innerText = title; document.getElementById('msg-body').innerText = body;
        msgBtn.innerText = isWin ? "Restart" : "Try Again";
        msgBtn.onclick = () => { if (isWin) totalScore = 0; loadLevel(isWin ? 0 : currentLevelIndex); }; messageBox.style.display = "block";
    }

    window.addEventListener('keydown', e => keys[e.key] = true);
    window.addEventListener('keyup', e => keys[e.key] = false);

    function gameLoop() {
        if (!gameActive) return;
        player.update();
        if (boss) boss.update();
        projectiles.forEach(p => p.update());
        projectiles = projectiles.filter(p => p.alive);
        checkCollisions();
        
        let targetCam = player.x - CANVAS_WIDTH / 2;
        cameraX += (Math.max(0, targetCam) - cameraX) * 0.1;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        for(let i=0; i<15; i++) { ctx.beginPath(); ctx.arc((i * 450) - (cameraX * 0.15), 80 + (i % 4 * 60), 50, 0, Math.PI*2); ctx.fill(); }

        platforms.forEach(p => p.draw());
        coins.forEach(c => c.draw());
        enemies.forEach(e => e.draw());
        projectiles.forEach(p => p.draw());
        if (boss && boss.hp > 0) boss.draw();
        if (goal) goal.draw();
        player.draw();
        requestAnimationFrame(gameLoop);
    }

    loadAssets(() => {});
</script>

</body>
</html>
