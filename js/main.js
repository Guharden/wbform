import { TetrisGame } from "./game.js";
import { InputController } from "./input.js";
import { Renderer } from "./renderer.js";

const gameCanvas = document.getElementById("gameCanvas");
const nextCanvas = document.getElementById("nextCanvas");

const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const levelEl = document.getElementById("level");
const stateLabelEl = document.getElementById("stateLabel");
const statusOverlay = document.getElementById("statusOverlay");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");
const dropBtn = document.getElementById("dropBtn");

const game = new TetrisGame();
const renderer = new Renderer(gameCanvas, nextCanvas, game);
const input = new InputController(game);

input.bindKeyboard();
input.bindTouchButtons(document.body);

startBtn.addEventListener("click", () => game.start());
pauseBtn.addEventListener("click", () => game.togglePause());
restartBtn.addEventListener("click", () => game.restart());
dropBtn.addEventListener("click", () => game.triggerDrop());

let lastTime = performance.now();

function updateOverlay() {
  let message = "";

  if (!game.isStarted) {
    message = "点击【开始游戏】后，先摆位再掉落";
  } else if (game.isGameOver) {
    message = "游戏结束：堆叠触顶，无法生成新方块";
  } else if (game.isPaused) {
    message = "已暂停";
  } else if (game.victoryAchieved) {
    message = "胜利达成：5000 分！可继续挑战";
  }

  if (message) {
    statusOverlay.textContent = message;
    statusOverlay.classList.remove("hidden");
  } else {
    statusOverlay.textContent = "";
    statusOverlay.classList.add("hidden");
  }
}

function resolveStateLabel() {
  if (!game.isStarted) {
    return "未开始";
  }
  if (game.isGameOver) {
    return "游戏结束";
  }
  if (game.isPaused) {
    return "暂停中";
  }
  if (game.clearAnimation) {
    return "消除动画";
  }
  if (game.isDropping) {
    return "下落中";
  }
  return "预摆中";
}

function updateUI() {
  scoreEl.textContent = String(game.score);
  linesEl.textContent = String(game.lines);
  levelEl.textContent = String(game.level);
  stateLabelEl.textContent = resolveStateLabel();

  pauseBtn.disabled = !game.isStarted || game.isGameOver;
  dropBtn.disabled = !game.canControl();
  updateOverlay();
}

function frame(now) {
  const dt = Math.min(50, now - lastTime);
  lastTime = now;

  game.update(dt);
  renderer.render();
  updateUI();

  requestAnimationFrame(frame);
}

updateUI();
requestAnimationFrame(frame);
