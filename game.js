const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game state
const game = {
    homeScore: 0,
    awayScore: 0,
    time: 90 * 60,
    running: true
};

// Ball
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    vx: 0,
    vy: 0,
    friction: 0.98
};

// Player
const player = {
    x: canvas.width / 4,
    y: canvas.height / 2,
    radius: 15,
    speed: 3,
    color: '#3b82f6'
};

// AI Player
const ai = {
    x: canvas.width * 3 / 4,
    y: canvas.height / 2,
    radius: 15,
    speed: 2,
    color: '#ef4444'
};

// Controls
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === 'r') resetGame();
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function drawField() {
    // Grass
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Field lines
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Border
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 10);
    ctx.lineTo(canvas.width / 2, canvas.height - 10);
    ctx.stroke();
    
    // Center circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();
    
    // Goals
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(0, canvas.height / 2 - 60, 10, 120);
    ctx.fillRect(canvas.width - 10, canvas.height / 2 - 60, 10, 120);
}

function drawPlayer(p, number) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, p.x, p.y);
}

function drawBall() {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function updatePlayer() {
    if (keys['w']) player.y -= player.speed;
    if (keys['s']) player.y += player.speed;
    if (keys['a']) player.x -= player.speed;
    if (keys['d']) player.x += player.speed;
    
    // Keep player in bounds
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
    
    // Kick ball
    if (keys[' ']) {
        const dx = ball.x - player.x;
        const dy = ball.y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < player.radius + ball.radius + 10) {
            const angle = Math.atan2(dy, dx);
            ball.vx = Math.cos(angle) * 15;
            ball.vy = Math.sin(angle) * 15;
        }
    }
}

function updateAI() {
    // Simple AI: chase the ball
    const dx = ball.x - ai.x;
    const dy = ball.y - ai.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
        ai.x += (dx / dist) * ai.speed;
        ai.y += (dy / dist) * ai.speed;
    }
    
    // AI kicks ball
    if (dist < ai.radius + ball.radius + 10) {
        const angle = Math.atan2(ball.y - ai.y, ball.x - ai.x);
        ball.vx = Math.cos(angle) * 12;
        ball.vy = Math.sin(angle) * 12;
    }
}

function updateBall() {
    ball.x += ball.vx;
    ball.y += ball.vy;
    
    ball.vx *= ball.friction;
    ball.vy *= ball.friction;
    
    // Stop if too slow
    if (Math.abs(ball.vx) < 0.1) ball.vx = 0;
    if (Math.abs(ball.vy) < 0.1) ball.vy = 0;
    
    // Wall collision
    if (ball.y - ball.radius < 10 || ball.y + ball.radius > canvas.height - 10) {
        ball.vy *= -0.8;
        ball.y = ball.y < canvas.height / 2 ? 10 + ball.radius : canvas.height - 10 - ball.radius;
    }
    
    // Goal detection
    if (ball.x - ball.radius < 10) {
        if (ball.y > canvas.height / 2 - 60 && ball.y < canvas.height / 2 + 60) {
            game.awayScore++;
            updateScore();
            resetBall();
        } else {
            ball.vx *= -0.8;
            ball.x = 10 + ball.radius;
        }
    }
    
    if (ball.x + ball.radius > canvas.width - 10) {
        if (ball.y > canvas.height / 2 - 60 && ball.y < canvas.height / 2 + 60) {
            game.homeScore++;
            updateScore();
            resetBall();
        } else {
            ball.vx *= -0.8;
            ball.x = canvas.width - 10 - ball.radius;
        }
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.vx = 0;
    ball.vy = 0;
}

function resetGame() {
    game.homeScore = 0;
    game.awayScore = 0;
    game.time = 90 * 60;
    resetBall();
    player.x = canvas.width / 4;
    player.y = canvas.height / 2;
    ai.x = canvas.width * 3 / 4;
    ai.y = canvas.height / 2;
    updateScore();
}

function updateScore() {
    document.getElementById('homeScore').textContent = game.homeScore;
    document.getElementById('awayScore').textContent = game.awayScore;
}

function updateTimer() {
    if (game.time > 0) {
        game.time--;
        const minutes = Math.floor(game.time / 60);
        const seconds = game.time % 60;
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawField();
    updatePlayer();
    updateAI();
    updateBall();
    drawBall();
    drawPlayer(player, '10');
    drawPlayer(ai, '9');
    
    requestAnimationFrame(gameLoop);
}

// Update timer every second
setInterval(updateTimer, 1000);

gameLoop();
