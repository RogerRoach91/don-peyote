<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Retro Platformer Creator</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {
            margin: 0;
            overflow: hidden;
            background: #222;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            touch-action: none;
        }
        canvas {
            display: block;
            image-rendering: pixelated;
            background: #87CEEB; /* Sky Blue */
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            max-width: 100%;
            height: auto;
        }
        .ui-panel {
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            pointer-events: auto;
        }
        .touch-btn {
            width: 60px;
            height: 60px;
            background: rgba(255, 255, 255, 0.2);
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
        }
        .touch-btn:active {
            background: rgba(255, 255, 255, 0.5);
        }
    </style>
</head>
<body class="flex flex-col items-center justify-center h-screen">

    <div id="game-container" class="relative">
        <canvas id="gameCanvas"></canvas>
        
        <!-- UI Overlay -->
        <div class="absolute top-4 left-4 ui-panel flex flex-col gap-2">
            <div class="text-xl font-bold">Retro Builder</div>
            <div class="text-sm opacity-80">ARROWS to Move & Jump</div>
            <div class="text-sm opacity-80">E to toggle Edit Mode</div>
            <div id="mode-indicator" class="text-yellow-400 font-bold">PLAY MODE</div>
        </div>

        <!-- Edit Palette (Hidden in Play Mode) -->
        <div id="palette" class="absolute top-4 right-4 ui-panel hidden">
            <div class="text-xs mb-2">TILE PALETTE</div>
            <div class="flex gap-2">
                <button onclick="setTileType(1)" class="w-8 h-8 bg-orange-700 border-2 border-white" title="Brick"></button>
                <button onclick="setTileType(2)" class="w-8 h-8 bg-green-600 border-2 border-transparent" title="Grass"></button>
                <button onclick="setTileType(3)" class="w-8 h-8 bg-yellow-400 border-2 border-transparent" title="Coin Block"></button>
                <button onclick="setTileType(0)" class="w-8 h-8 bg-sky-300 border-2 border-transparent" title="Eraser"></button>
            </div>
        </div>

        <!-- Mobile Controls (Only visible on touch) -->
        <div id="touch-controls" class="absolute bottom-8 left-0 right-0 flex justify-between px-8 pointer-events-none opacity-0 md:hidden">
            <div class="flex gap-4 pointer-events-auto">
                <div id="btn-left" class="touch-btn">⬅️</div>
                <div id="btn-right" class="touch-btn">➡️</div>
            </div>
            <div class="pointer-events-auto">
                <div id="btn-jump" class="touch-btn">JUMP</div>
            </div>
        </div>
    </div>

    <script>
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const modeIndicator = document.getElementById('mode-indicator');
        const palette = document.getElementById('palette');

        // Game Constants
        const TILE_SIZE = 40;
        const GRAVITY = 0.6;
        const FRICTION = 0.8;
        const JUMP_FORCE = -12;
        const SPEED = 0.8;
        const MAX_SPEED = 6;

        // Viewport
        canvas.width = 800;
        canvas.height = 480;

        // Game State
        let isEditMode = false;
        let selectedTileType = 1;
        let cameraX = 0;

        const player = {
            x: 100,
            y: 100,
            width: 30,
            height: 40,
            vx: 0,
            vy: 0,
            onGround: false,
            coyoteTime: 0,
            color: '#FF3B30'
        };

        const keys = {};
        const world = [];
        const ROWS = canvas.height / TILE_SIZE;
        const COLS = 100; // Large level width

        // Initialize World (Simple flat ground)
        function initWorld() {
            for (let r = 0; r < ROWS; r++) {
                world[r] = [];
                for (let c = 0; c < COLS; c++) {
                    if (r === ROWS - 1) world[r][c] = 1; // Floor
                    else if (r === ROWS - 4 && c % 10 === 0) world[r][c] = 3; // Floating blocks
                    else world[r][c] = 0;
                }
            }
        }

        // Input Handling
        window.addEventListener('keydown', e => {
            keys[e.code] = true;
            if (e.code === 'KeyE') toggleEditMode();
        });
        window.addEventListener('keyup', e => keys[e.code] = false);

        // Edit Mode Interaction
        canvas.addEventListener('mousedown', handleInteraction);
        canvas.addEventListener('mousemove', (e) => {
            if (e.buttons === 1) handleInteraction(e);
        });

        function handleInteraction(e) {
            if (!isEditMode) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width) + cameraX;
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            
            const col = Math.floor(x / TILE_SIZE);
            const row = Math.floor(y / TILE_SIZE);

            if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
                world[row][col] = selectedTileType;
            }
        }

        function setTileType(type) {
            selectedTileType = type;
            const buttons = document.querySelectorAll('#palette button');
            buttons.forEach((btn, i) => {
                btn.style.borderColor = (i === (3 - type + (type === 0 ? 0 : 0))) ? 'white' : 'transparent'; // Logic slightly off for simple toggle
            });
            // Update visual border feedback
            Array.from(palette.querySelectorAll('button')).forEach(b => b.classList.remove('border-white'));
        }

        function toggleEditMode() {
            isEditMode = !isEditMode;
            modeIndicator.innerText = isEditMode ? 'EDIT MODE' : 'PLAY MODE';
            modeIndicator.className = isEditMode ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold';
            palette.classList.toggle('hidden', !isEditMode);
        }

        function getTile(r, c) {
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return 0;
            return world[r][c];
        }

        function update() {
            if (isEditMode) return;

            // Horizontal Movement
            if (keys['ArrowLeft']) player.vx -= SPEED;
            if (keys['ArrowRight']) player.vx += SPEED;
            
            player.vx *= FRICTION;
            if (Math.abs(player.vx) < 0.1) player.vx = 0;
            player.vx = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, player.vx));

            // Vertical Movement
            player.vy += GRAVITY;

            // Collision Detection (Simple AABB)
            // Move X
            player.x += player.vx;
            checkCollision(true);

            // Move Y
            player.y += player.vy;
            player.onGround = false;
            checkCollision(false);

            // Coyote Time for better feel
            if (player.onGround) player.coyoteTime = 10;
            else player.coyoteTime--;

            // Jumping
            if (keys['ArrowUp'] || keys['Space']) {
                if (player.coyoteTime > 0) {
                    player.vy = JUMP_FORCE;
                    player.coyoteTime = 0;
                }
            }

            // Camera follow
            let targetCam = player.x - canvas.width / 2;
            cameraX += (targetCam - cameraX) * 0.1;
            cameraX = Math.max(0, Math.min(cameraX, COLS * TILE_SIZE - canvas.width));

            // Out of bounds
            if (player.y > canvas.height + 100) {
                player.x = 100;
                player.y = 100;
                player.vy = 0;
            }
        }

        function checkCollision(isHorizontal) {
            const left = Math.floor(player.x / TILE_SIZE);
            const right = Math.floor((player.x + player.width) / TILE_SIZE);
            const top = Math.floor(player.y / TILE_SIZE);
            const bottom = Math.floor((player.y + player.height) / TILE_SIZE);

            for (let r = top; r <= bottom; r++) {
                for (let c = left; c <= right; c++) {
                    const tile = getTile(r, c);
                    if (tile > 0) {
                        if (isHorizontal) {
                            if (player.vx > 0) player.x = c * TILE_SIZE - player.width;
                            else if (player.vx < 0) player.x = (c + 1) * TILE_SIZE;
                            player.vx = 0;
                        } else {
                            if (player.vy > 0) {
                                player.y = r * TILE_SIZE - player.height;
                                player.onGround = true;
                            } else if (player.vy < 0) {
                                player.y = (r + 1) * TILE_SIZE;
                            }
                            player.vy = 0;
                        }
                    }
                }
            }
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.save();
            ctx.translate(-cameraX, 0);

            // Draw Level
            const startCol = Math.floor(cameraX / TILE_SIZE);
            const endCol = startCol + Math.floor(canvas.width / TILE_SIZE) + 2;

            for (let r = 0; r < ROWS; r++) {
                for (let c = startCol; c < endCol; c++) {
                    const tile = getTile(r, c);
                    if (tile === 0) continue;

                    const x = c * TILE_SIZE;
                    const y = r * TILE_SIZE;

                    if (tile === 1) ctx.fillStyle = '#8B4513'; // Brick
                    if (tile === 2) ctx.fillStyle = '#228B22'; // Grass
                    if (tile === 3) ctx.fillStyle = '#FFD700'; // Coin block

                    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
                    
                    // Highlights/Detail
                    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                    ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
                }
            }

            // Draw Player
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.width, player.height);
            
            // Eyes
            ctx.fillStyle = 'white';
            const eyeDir = player.vx >= 0 ? 5 : -5;
            ctx.fillRect(player.x + player.width/2 + eyeDir, player.y + 10, 5, 5);

            ctx.restore();

            // Mobile Hint
            if (isEditMode) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.font = '16px sans-serif';
                ctx.fillText("Click/Drag to build the world", 20, canvas.height - 20);
            }

            requestAnimationFrame(() => {
                update();
                draw();
            });
        }

        // Handle Window Resize
        function resize() {
            const container = document.getElementById('game-container');
            const ratio = canvas.width / canvas.height;
            let w = window.innerWidth * 0.9;
            let h = w / ratio;
            
            if (h > window.innerHeight * 0.7) {
                h = window.innerHeight * 0.7;
                w = h * ratio;
            }
            
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
        }

        window.addEventListener('resize', resize);
        
        // Touch events for mobile
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnJump = document.getElementById('btn-jump');

        if ('ontouchstart' in window) {
            document.getElementById('touch-controls').style.opacity = "1";
            const setKey = (code, val) => keys[code] = val;
            btnLeft.ontouchstart = () => setKey('ArrowLeft', true);
            btnLeft.ontouchend = () => setKey('ArrowLeft', false);
            btnRight.ontouchstart = () => setKey('ArrowRight', true);
            btnRight.ontouchend = () => setKey('ArrowRight', false);
            btnJump.ontouchstart = () => setKey('ArrowUp', true);
            btnJump.ontouchend = () => setKey('ArrowUp', false);
        }

        window.onload = () => {
            initWorld();
            resize();
            draw();
        };
    </script>
</body>
</html>
