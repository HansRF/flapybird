import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const canvas = document.getElementById("flappyCanvas");
const ctx = canvas.getContext("2d");

const restartBtn = document.getElementById("restartBtn");
const gameScreen = document.getElementById("gameScreen");
const leaderboardScreen = document.getElementById("leaderboardScreen");
const showLeaderboardBtn = document.getElementById("showLeaderboardBtn");
const backToGameBtn = document.getElementById("backToGameBtn");
const leaderboardList = document.getElementById("leaderboardList");
const leaderboardEmpty = document.getElementById("leaderboardEmpty");
const leaderboardStatus = document.getElementById("leaderboardStatus");
const scoreForm = document.getElementById("scoreForm");
const playerNameInput = document.getElementById("playerName");
const scoreSaveStatus = document.getElementById("scoreSaveStatus");
const bucinPopup = document.getElementById("bucinPopup");
const bucinMessage = document.getElementById("bucinMessage");
const closePopupBtn = document.getElementById("closePopupBtn");
const playerNameStorageKey = "flappyBotPlayerName";
const blockedNameTerms = [
  "anjing", "anjir", "asu", "bangsat", "bajingan", "brengsek",
  "goblok", "tolol", "kampret", "kontol", "memek", "ngentot",
  "jancuk", "jancok", "fuck", "shit", "bitch", "bastard",
  "asshole", "dick", "pussy"
];
let db = null;
let leaderboardEntries = [];

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
const initialPipeSpacing = 250;
const spacingIncreasePerSpeed = 60;
let pipes = [];
let score = 0;
let gameOver = false;
let gameStarted = false;
let gamePaused = false;
let animationFrameId = null;
let birdFrame = 0;
const pipeGap = 150;
let jumpCooldown = false;
let distanceSincePipeSpawn = 0;

// Fungsi utama melompat
function handleJump() {
  if (jumpCooldown) return;
  jumpCooldown = true;

  if (!gameStarted) {
    gameStarted = true;
    pipes = [];
    spawnPipe();
    distanceSincePipeSpawn = 0;
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
  if (gameOver) {
    bucinPopup.classList.add("show");
  } else {
    scheduleUpdate();
  }
}

function scheduleUpdate() {
  if (animationFrameId !== null) return;
  animationFrameId = requestAnimationFrame(() => {
    animationFrameId = null;
    update();
  });
}

function renderLeaderboard() {
  const entries = leaderboardEntries
    .sort((first, second) => second.score - first.score || first.createdAt - second.createdAt);

  leaderboardList.replaceChildren();
  leaderboardEmpty.hidden = entries.length > 0;

  entries.forEach((entry, index) => {
    const item = document.createElement("li");
    const player = document.createElement("span");
    const points = document.createElement("strong");
    const displayedName = containsBlockedNameTerm(entry.name) ? "Pemain" : entry.name;
    player.textContent = `${index + 1}. ${displayedName}`;
    points.textContent = `${entry.score} POIN`;
    item.append(player, points);
    leaderboardList.append(item);
  });
}

function containsBlockedNameTerm(name) {
  const normalizedName = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[013457@$!]/g, (character) => ({
      "0": "o",
      "1": "i",
      "3": "e",
      "4": "a",
      "5": "s",
      "7": "t",
      "@": "a",
      "$": "s",
      "!": "i"
    })[character])
    .replace(/[^a-z0-9]/g, "");

  return blockedNameTerms.some((term) => normalizedName.includes(term));
}

async function saveScore(event) {
  event.preventDefault();

  const name = playerNameInput.value.trim();
  if (!name) {
    scoreSaveStatus.textContent = "Masukkan nama pemain terlebih dahulu.";
    return;
  }

  if (containsBlockedNameTerm(name)) {
    scoreSaveStatus.textContent = "Nama pemain mengandung kata yang tidak pantas. Silakan pilih nama lain.";
    return;
  }

  if (!db) {
    scoreSaveStatus.textContent = "Firestore belum siap. Periksa konfigurasi Firebase.";
    return;
  }

  if (!Number.isInteger(score) || score < 0 || score > 100000) {
    scoreSaveStatus.textContent = "Skor tidak valid.";
    return;
  }

  const submitButton = scoreForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    await addDoc(collection(db, "scores"), {
      name: name,
      score: score,
      createdAt: Date.now()
    });

    scoreSaveStatus.textContent = "Skor berhasil disimpan!";

    try {
      localStorage.setItem(playerNameStorageKey, name);
    } catch (error) {
      console.error("Nama pemain tidak dapat disimpan di browser.", error);
    }
  } catch (error) {
    console.error("Skor tidak dapat disimpan.", error);
    scoreSaveStatus.textContent = `Skor gagal disimpan: ${error.message}`;
  } finally {
    submitButton.disabled = false;
  }
}

function connectFirebase() {
  const configValues = [
    firebaseConfig.apiKey,
    firebaseConfig.projectId,
    firebaseConfig.appId
  ];

  if (configValues.some((value) =>
    !value || /YOUR_|PASTE_|GANTI_/i.test(value)
  )) {
    leaderboardStatus.textContent =
      "Isi konfigurasi Firebase asli di firebase-config.js.";
    return;
  }

  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    const scoresQuery = query(
      collection(db, "scores"),
      orderBy("score", "desc")
    );

    onSnapshot(
      scoresQuery,
      (snapshot) => {
        leaderboardEntries = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }))
          .filter((entry) =>
            typeof entry.name === "string" &&
            Number.isInteger(entry.score) &&
            entry.score >= 0 &&
            Number.isFinite(entry.createdAt)
          );

        leaderboardStatus.textContent =
          "skor diperbarui langsung.";
        renderLeaderboard();
      },
      (error) => {
        console.error("Leaderboard Firestore tidak dapat dibaca.", error);
        leaderboardStatus.textContent =
          `Leaderboard gagal dimuat: ${error.message}`;
      }
    );
  } catch (error) {
    console.error("Firebase gagal diinisialisasi.", error);
    leaderboardStatus.textContent =
      `Firebase gagal terhubung: ${error.message}`;
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
    const pipeSpeed = Math.min(initialPipeSpeed + score * 0.12, maxPipeSpeed);
    const pipeSpacing = initialPipeSpacing + (pipeSpeed - initialPipeSpeed) * spacingIncreasePerSpeed;
    distanceSincePipeSpawn += pipeSpeed;
    if (distanceSincePipeSpawn >= pipeSpacing) {
      spawnPipe();
      distanceSincePipeSpawn = 0;
    }

    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i];
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
  if (!gamePaused) scheduleUpdate();
}

function resetGame() {
  birdY = 150;
  birdVelocity = 0;
  pipes = [];
  score = 0;
  gameOver = false;
  gameStarted = false;
  birdFrame = 0;
  gamePaused = false;
  distanceSincePipeSpawn = 0;
  bucinPopup.classList.remove("show");
  scoreSaveStatus.textContent = "";
  restartBtn.style.display = "none";
  scheduleUpdate();
}

scheduleUpdate();
connectFirebase();
