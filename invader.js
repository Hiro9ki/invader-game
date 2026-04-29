const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const clearModal = document.getElementById('clearModal');
const overModal = document.getElementById('overModal');

// --- Audio System (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'explosion') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.5);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'clear') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.2); // C#
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.4); // E
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.6); // A
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 1.5);
    }
}

// --- Game Variables ---
let score = 0;
let isGameOver = false;
let isGameClear = false;
let animationId;

// --- Entities ---
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 50,
    width: 50,
    height: 20,
    speed: 5,
    dx: 0,
    color: '#00ffff'
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const particles = [];

const enemyRows = 4;
const enemyCols = 8;
const enemyWidth = 40;
const enemyHeight = 30;
const enemyPadding = 20;
const enemyOffsetTop = 50;
const enemyOffsetLeft = 60;

let alienDirection = 1;
let alienSpeed = 1;
let alienDrop = false;

// Create enemies
for (let r = 0; r < enemyRows; r++) {
    for (let c = 0; c < enemyCols; c++) {
        enemies.push({
            x: c * (enemyWidth + enemyPadding) + enemyOffsetLeft,
            y: r * (enemyHeight + enemyPadding) + enemyOffsetTop,
            width: enemyWidth,
            height: enemyHeight,
            status: 1,
            color: r % 2 === 0 ? '#ff00ff' : '#ff00aa'
        });
    }
}

// --- Input Handling ---
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = true;
    if (e.code === 'ArrowRight') keys.ArrowRight = true;
    if (e.code === 'Space') {
        if (!keys.Space) fireBullet();
        keys.Space = true;
    }
    // Prevent default scrolling for space and arrows
    if(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) > -1) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') keys.ArrowLeft = false;
    if (e.code === 'ArrowRight') keys.ArrowRight = false;
    if (e.code === 'Space') keys.Space = false;
});

// Touch Controls
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const btnFire = document.getElementById('btnFire');

// Left Button
btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowLeft = true; });
btnLeft.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowLeft = false; });
btnLeft.addEventListener('mousedown', () => keys.ArrowLeft = true);
btnLeft.addEventListener('mouseup', () => keys.ArrowLeft = false);
btnLeft.addEventListener('mouseleave', () => keys.ArrowLeft = false);

// Right Button
btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowRight = true; });
btnRight.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowRight = false; });
btnRight.addEventListener('mousedown', () => keys.ArrowRight = true);
btnRight.addEventListener('mouseup', () => keys.ArrowRight = false);
btnRight.addEventListener('mouseleave', () => keys.ArrowRight = false);

// Fire Button
btnFire.addEventListener('touchstart', (e) => { 
    e.preventDefault(); 
    fireBullet(); 
});
btnFire.addEventListener('mousedown', (e) => { 
    e.preventDefault(); 
    fireBullet(); 
});


function fireBullet() {
    if (isGameOver || isGameClear) return;
    
    // Allow max 3 bullets on screen
    if (bullets.length < 3) {
        bullets.push({
            x: player.x + player.width / 2 - 2.5,
            y: player.y,
            width: 5,
            height: 15,
            speed: 7,
            color: '#00ffff'
        });
        playSound('shoot');
    }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            color: color
        });
    }
}

// --- Logic Update ---
function update() {
    if (isGameOver || isGameClear) return;

    // Player Movement
    if (keys.ArrowLeft) {
        player.x -= player.speed;
    }
    if (keys.ArrowRight) {
        player.x += player.speed;
    }

    // Boundary check
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Update Player Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.y -= b.speed;
        if (b.y < 0) {
            bullets.splice(i, 1);
        }
    }

    // Update Enemy Bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let eb = enemyBullets[i];
        eb.y += eb.speed;
        
        // Check collision with player
        if (eb.x < player.x + player.width &&
            eb.x + eb.width > player.x &&
            eb.y < player.y + player.height &&
            eb.y + eb.height > player.y) {
            
            // Hit!
            createParticles(player.x + player.width/2, player.y + player.height/2, player.color);
            playSound('explosion');
            gameOver();
            return;
        }

        if (eb.y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }

    // Update Enemies
    let edgeHit = false;
    let bottomHit = false;
    let activeEnemies = 0;

    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (e.status === 1) {
            activeEnemies++;
            e.x += alienSpeed * alienDirection;

            if (e.x + e.width > canvas.width - 10 || e.x < 10) {
                edgeHit = true;
            }
            if (e.y + e.height > player.y) {
                bottomHit = true;
            }

            // Random firing
            if (Math.random() < 0.001 * (score/100 + 1)) {
                enemyBullets.push({
                    x: e.x + e.width / 2 - 2.5,
                    y: e.y + e.height,
                    width: 5,
                    height: 15,
                    speed: 4,
                    color: '#ff00ff'
                });
            }
        }
    }

    if (activeEnemies === 0) {
        gameClear();
        return;
    }

    if (edgeHit) {
        alienDirection *= -1;
        alienSpeed += 0.2; // Increase speed slightly
        for (let i = 0; i < enemies.length; i++) {
            if (enemies[i].status === 1) {
                enemies[i].y += 20;
            }
        }
    }

    if (bottomHit) {
        playSound('explosion');
        gameOver();
        return;
    }

    // Collision Detection (Player bullets vs Enemies)
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        let bulletHit = false;

        for (let j = 0; j < enemies.length; j++) {
            let e = enemies[j];
            if (e.status === 1) {
                if (b.x < e.x + e.width &&
                    b.x + b.width > e.x &&
                    b.y < e.y + e.height &&
                    b.y + b.height > e.y) {
                    
                    // Hit Enemy
                    e.status = 0;
                    bulletHit = true;
                    score += 10;
                    scoreElement.innerText = score;
                    createParticles(e.x + e.width/2, e.y + e.height/2, e.color);
                    playSound('hit');
                    break;
                }
            }
        }
        if (bulletHit) {
            bullets.splice(i, 1);
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// --- Drawing ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Player
    if (!isGameOver) {
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = player.color;
        // Ship shape
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.fill();
        ctx.shadowBlur = 0; // reset
    }

    // Draw Enemies
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        if (e.status === 1) {
            ctx.fillStyle = e.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = e.color;
            ctx.fillRect(e.x, e.y, e.width, e.height);
            
            // Draw alien eyes
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            ctx.fillRect(e.x + 8, e.y + 8, 6, 6);
            ctx.fillRect(e.x + 26, e.y + 8, 6, 6);
        }
    }

    // Draw Player Bullets
    for (let i = 0; i < bullets.length; i++) {
        let b = bullets[i];
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    }
    ctx.shadowBlur = 0;

    // Draw Enemy Bullets
    for (let i = 0; i < enemyBullets.length; i++) {
        let eb = enemyBullets[i];
        ctx.fillStyle = eb.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = eb.color;
        ctx.fillRect(eb.x, eb.y, eb.width, eb.height);
    }
    ctx.shadowBlur = 0;

    // Draw Particles
    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}

// --- Game Loop ---
function loop() {
    update();
    draw();
    
    if (!isGameOver && !isGameClear) {
        animationId = requestAnimationFrame(loop);
    }
}

// --- State Handlers ---
function gameOver() {
    isGameOver = true;
    setTimeout(() => {
        overModal.classList.remove('hidden');
    }, 500);
}

function gameClear() {
    isGameClear = true;
    playSound('clear');
    setTimeout(() => {
        clearModal.classList.remove('hidden');
    }, 500);
}

// Start game
// Need user interaction to start AudioContext usually, 
// so we wait for first interaction to resume it in playSound.
loop();
