const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");

const restartBtn = document.getElementById("restartBtn");
const gameScreen = document.getElementById("gameScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const backToGameBtn = document.getElementById("backToGameBtn");
const leaderboardList = document.getElementById("leaderboardList");
const leaderboardEmpty = document.getElementById("leaderboardEmpty");
const scoreForm = document.getElementById("scoreForm");
const playerNameInput = document.getElementById("playerName");
const scoreSaveStatus = document.getElementById("scoreSaveStatus");
const bucinPopup = document.getElementById("bucinPopup");
const bucinMessage = document.getElementById("bucinMessage");
const closePopupBtn = document.getElementById("closePopupBtn");
const leaderboardStorageKey = "flappyBotLeaderboard";
const playerNameStorageKey = "flappyBotPlayerName";

// Load images
const bg = new Image();
bg.src = "assets/sprites/background-day.png";

const base = new Image();
base.src = "assets/sprites/base.png";

const birdFrames = [
  "assets/sprites/redbird/redbird-upflap.png",
  "assets/sprites/redbird/redbird-midflap.png",
  "assets/sprites/redbird/redbird-downflap.png"
];
const birdImgs = birdFrames.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const pipeTop = new Image();
pipeTop.src = "assets/sprites/pipe-green/pipe-green-inverted.png";

const pipeBottom = new Image();
pipeBottom.src = "assets/sprites/pipe-green/pipe-green.png";

const gameOverImg = new Image();
gameOverImg.src = "assets/sprites/gameover.png";

const messageImg = new Image();
messageImg.src = "assets/sprites/message.png";

const numbers = [];
for (let i = 0; i < 10; i++) {
  const img = new Image();
  img.src = `assets/sprites/numbers/${i}.png`;
  numbers.push(img);
}

// Load audio
const audioWing = new Audio("assets/audio/wing.wav");
const audioPoint = new Audio("assets/audio/point.wav");
const audioHit = new Audio("assets/audio/hit.wav");
const audioDie = new Audio("assets/audio/die.wav");

// Game state
let birdY = 150;
let birdVelocity = 0;
const gravity = 0.3;
const jump = -5;
const initialPipeSpeed = 2;
const maxPipeSpeed = 5;
let pipes = [];
let score = 0;
let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let animationFrameId = null;
let birdFrame = 0;
const pipeGap = 150;
let pipeInterval = 0;
let jumpCooldown = false;

// Fungsi utama melompat
function handleJump() {
  if (jumpCooldown) return;
  jumpCooldown = true;

  if (!gameStarted) {
    gameStarted = true;
    pipes = [];
    spawnPipe();
  }
  if (!gameOver) {
    birdVelocity = jump;
    audioWing.currentTime = 0;
    audioWing.play();
  }
}

// Event input
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  handleJump();
});
canvas.addEventListener("mousedown", (e) => {
  e.preventDefault();
  handleJump();
});
document.addEventListener("keydown", function (e) {
  if (e.code === "Space") {
    e.preventDefault();
    handleJump();
  }
});

restartBtn.addEventListener("click", resetGame);
closePopupBtn.addEventListener("click", resetGame);
showLeaderboardBtn.addEventListener("click", showLeaderboard);
backToGameBtn.addEventListener("click", showGame);
scoreForm.addEventListener("submit", saveScore);

window.addEventListener("storage", (event) => {
  if (event.key === leaderboardStorageKey) {
    renderLeaderboard();
  }
});

function showBucinText() {
  bucinMessage.textContent = `Skor kamu: ${score}`;
  scoreSaveStatus.textContent = "";
  bucinPopup.classList.add("show");
  restartBtn.style.display = "block";
  try {
    playerNameInput.value = localStorage.getItem(playerNameStorageKey) || "";
  } catch (error) {
    console.error("Nama pemain tidak dapat dimuat.", error);
  }
}

function showLeaderboard() {
  gamePaused = true;
  gameScreen.hidden = true;
  leaderboardScreen.hidden = false;
  bucinPopup.classList.remove("show");
  renderLeaderboard();
}

function showGame() {
  leaderboardScreen.hidden = true;
  gameScreen.hidden = false;
  gamePaused = false;
  if (gameOver) bucinPopup.classList.add("show");
  scheduleUpdate();
}

function scheduleUpdate() {
  if (animationFrameId !== null) return;
  animationFrameId = requestAnimationFrame(() => {
    animationFrameId = null;
    update();
  });
}

function readLeaderboard() {
  try {
    const storedScores = localStorage.getItem(leaderboardStorageKey);
    if (!storedScores) return [];

    const parsedScores = JSON.parse(storedScores);
    if (!Array.isArray(parsedScores)) {
      throw new Error("Format data leaderboard tidak valid.");
    }

    return parsedScores.filter((entry) =>
      entry &&
      typeof entry.name === "string" &&
      Number.isFinite(entry.score) &&
      typeof entry.date === "string"
    );
  } catch (error) {
    console.error("Leaderboard tidak dapat dibaca.", error);
    leaderboardEmpty.textContent = "Data leaderboard tidak dapat dibaca. Coba bersihkan data browser untuk situs ini.";
    return [];
  }
}

function renderLeaderboard() {
  const entries = readLeaderboard()
    .sort((first, second) => second.score - first.score || first.date.localeCompare(second.date))
    .slice(0, 10);

  leaderboardList.replaceChildren();
  leaderboardEmpty.hidden = entries.length > 0;

  entries.forEach((entry) => {
    const item = document.createElement("li");
    const player = document.createElement("span");
    const points = document.createElement("strong");
    player.textContent = entry.name;
    points.textContent = `${entry.score} POIN`;
    item.append(player, points);
    leaderboardList.append(item);
  });
}

function saveScore(event) {
  event.preventDefault();
  const name = playerNameInput.value.trim();
  if (!name) {
    scoreSaveStatus.textContent = "Masukkan nama pemain terlebih dahulu.";
    return;
  }

  try {
    const entries = readLeaderboard();
    const existingEntry = entries.find(
      (entry) => entry.name.toLocaleLowerCase() === name.toLocaleLowerCase()
    );

    if (existingEntry) {
      existingEntry.score = Math.max(existingEntry.score, score);
      if (existingEntry.score === score) {
        existingEntry.date = new Date().toISOString();
      }
    } else {
      entries.push({ name, score, date: new Date().toISOString() });
    }

    localStorage.setItem(leaderboardStorageKey, JSON.stringify(entries));
    localStorage.setItem(playerNameStorageKey, name);
    scoreSaveStatus.textContent = "Skor berhasil disimpan!";
    renderLeaderboard();
  } catch (error) {
    console.error("Skor tidak dapat disimpan.", error);
    scoreSaveStatus.textContent = "Skor gagal disimpan. Periksa pengaturan penyimpanan browser.";
  }
}

// Spawn pipes
function spawnPipe() {
  const topY = Math.floor(Math.random() * -150) - 50;
  pipes.push({ x: canvas.width, y: topY, passed: false });
}

function drawScore(x, y, score) {
  const digits = score.toString().split("");
  digits.forEach((digit, i) => {
    const num = parseInt(digit);
    ctx.drawImage(numbers[num], x + i * 20, y);
  });
}

function update() {
  ctx.drawImage(bg, 0, 0);

  // Pipes
  if (gameStarted && !gamePaused) {
    pipeInterval++;
    const spawnInterval = Math.max(60, 100 - score * 2);
    if (pipeInterval >= spawnInterval && (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 250)) {
      spawnPipe();
      pipeInterval = 0;
    }

    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i];
      const pipeSpeed = Math.min(initialPipeSpeed + score * 0.12, maxPipeSpeed);
      pipe.x -= pipeSpeed;

      ctx.drawImage(pipeTop, pipe.x, pipe.y);
      ctx.drawImage(pipeBottom, pipe.x, pipe.y + pipeTop.height + pipeGap);

      // Score
      if (!pipe.passed && pipe.x + pipeTop.width < 50) {
        pipe.passed = true;
        score++;
        audioPoint.currentTime = 0;
        audioPoint.play();
      }

      // Collision
      if (
        50 + 34 > pipe.x &&
        50 < pipe.x + pipeTop.width &&
        (birdY < pipe.y + pipeTop.height ||
         birdY + 24 > pipe.y + pipeTop.height + pipeGap)
      ) {
        if (!gameOver) {
          audioHit.play();
          setTimeout(() => audioDie.play(), 200);
        }
        gameOver = true;
      }

      // Remove pipe offscreen
      if (pipe.x + pipeTop.width < 0) {
        pipes.splice(i, 1);
        i--;
      }
    }
  }

  // Bird physics
  if (gameStarted && !gameOver && !gamePaused) {
    birdVelocity += gravity;
    birdY += birdVelocity;
  }

  // Ground collision
  if (!gamePaused && birdY + 24 >= canvas.height - base.height) {
    if (!gameOver) {
      audioHit.play();
      setTimeout(() => audioDie.play(), 200);
    }
    gameOver = true;
  }

  // Draw base and bird
  ctx.drawImage(base, 0, canvas.height - base.height);

  birdFrame += 0.2;
  if (birdFrame >= birdImgs.length) birdFrame = 0;
  ctx.drawImage(birdImgs[Math.floor(birdFrame)], 50, birdY);

  drawScore(canvas.width / 2 - 20, 20, score);

  if (gameOver) {
    ctx.drawImage(gameOverImg, canvas.width / 2 - gameOverImg.width / 2, 100);
    drawScore(canvas.width / 2 - 20, 300, score);
    restartBtn.style.display = "block";
    showBucinText();
    return;
  }

  if (!gameStarted) {
    ctx.drawImage(messageImg, canvas.width / 2 - messageImg.width / 2, 180);
  }

  jumpCooldown = false; // reset input flag tiap frame
  scheduleUpdate();
}

function resetGame() {
  birdY = 150;
  birdVelocity = 0;
  pipes = [];
  score = 0;
  gameOver = false;
  gameStarted = false;
  birdFrame = 0;
  pipeInterval = 0;
  gamePaused = false;
  bucinPopup.classList.remove("show");
  scoreSaveStatus.textContent = "";
  restartBtn.style.display = "none";
  scheduleUpdate();
}

scheduleUpdate();
