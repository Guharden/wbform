import {
  BOARD_COLS,
  BOARD_ROWS,
  CLEAR_ANIMATION_MS,
  CONTROL_FEEDBACK_MS,
  DROP_CONFIG,
  PIECE_COLORS,
  SCORE_TABLE,
  VICTORY_SCORE,
} from "./constants.js";
import { getPieceCells, randomPieceType } from "./pieces.js";

function createEmptyBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

export class TetrisGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = createEmptyBoard();
    this.activePiece = null;
    this.nextType = randomPieceType();

    this.isStarted = false;
    this.isPaused = false;
    this.isGameOver = false;
    this.victoryAchieved = false;
    this.isDropping = false;

    this.score = 0;
    this.lines = 0;
    this.level = 1;

    this.dropAccumulator = 0;
    this.controlFeedbackMs = 0;
    this.clearAnimation = null;
  }

  start() {
    if (this.isStarted && !this.isGameOver) {
      return;
    }
    this.reset();
    this.isStarted = true;
    this.spawnPiece();
  }

  restart() {
    this.start();
  }

  togglePause() {
    if (!this.isStarted || this.isGameOver) {
      return;
    }
    this.isPaused = !this.isPaused;
  }

  move(dx) {
    if (!this.canControl()) {
      return false;
    }
    const candidate = { ...this.activePiece, x: this.activePiece.x + dx };
    if (this.collides(candidate)) {
      return false;
    }
    this.activePiece = candidate;
    this.controlFeedbackMs = CONTROL_FEEDBACK_MS;
    return true;
  }

  rotate(step) {
    if (!this.canControl()) {
      return false;
    }

    const nextRotation = (this.activePiece.rotation + step + 4) % 4;
    const offsets = [0, -1, 1, -2, 2];
    for (const offset of offsets) {
      const candidate = {
        ...this.activePiece,
        rotation: nextRotation,
        x: this.activePiece.x + offset,
      };
      if (!this.collides(candidate)) {
        this.activePiece = candidate;
        this.controlFeedbackMs = CONTROL_FEEDBACK_MS;
        return true;
      }
    }
    return false;
  }

  triggerDrop() {
    if (!this.canControl()) {
      return false;
    }
    this.isDropping = true;
    this.dropAccumulator = 0;
    return true;
  }

  update(dtMs) {
    if (!this.isStarted || this.isPaused || this.isGameOver) {
      return;
    }

    if (this.controlFeedbackMs > 0) {
      this.controlFeedbackMs = Math.max(0, this.controlFeedbackMs - dtMs);
    }

    if (this.clearAnimation) {
      this.updateClearAnimation(dtMs);
      return;
    }

    if (!this.isDropping || !this.activePiece) {
      return;
    }

    const interval = Math.max(
      DROP_CONFIG.minMs,
      DROP_CONFIG.baseMs - (this.level - 1) * DROP_CONFIG.levelStepMs,
    );

    this.dropAccumulator += dtMs;
    while (this.dropAccumulator >= interval) {
      this.dropAccumulator -= interval;
      const moved = this.tryMoveDown();
      if (!moved) {
        break;
      }
    }
  }

  getGhostCellsForPiece(piece) {
    if (!piece) {
      return [];
    }
    const cells = getPieceCells(piece.type, piece.rotation);
    return cells.map(([x, y]) => ({ x: piece.x + x, y: piece.y + y }));
  }

  canControl() {
    return (
      this.isStarted &&
      !this.isPaused &&
      !this.isGameOver &&
      !this.isDropping &&
      !this.clearAnimation &&
      Boolean(this.activePiece)
    );
  }

  tryMoveDown() {
    const candidate = { ...this.activePiece, y: this.activePiece.y + 1 };
    if (!this.collides(candidate)) {
      this.activePiece = candidate;
      return true;
    }

    this.lockPiece();
    return false;
  }

  lockPiece() {
    const cells = this.getGhostCellsForPiece(this.activePiece);
    for (const cell of cells) {
      if (cell.y < 0 || cell.y >= BOARD_ROWS || cell.x < 0 || cell.x >= BOARD_COLS) {
        continue;
      }
      this.board[cell.y][cell.x] = PIECE_COLORS[this.activePiece.type];
    }

    this.activePiece = null;
    this.isDropping = false;
    this.dropAccumulator = 0;

    const fullRows = this.findFullRows();
    if (fullRows.length > 0) {
      this.applyScore(fullRows.length);
      this.prepareClearAnimation(fullRows);
      return;
    }

    this.spawnPiece();
  }

  applyScore(clearedCount) {
    this.score += SCORE_TABLE[clearedCount] || 0;
    this.lines += clearedCount;
    this.level = 1 + Math.floor(this.lines / 10);
    if (!this.victoryAchieved && this.score >= VICTORY_SCORE) {
      this.victoryAchieved = true;
    }
  }

  updateClearAnimation(dtMs) {
    this.clearAnimation.elapsed += dtMs;
    const progress = Math.min(1, this.clearAnimation.elapsed / this.clearAnimation.duration);
    this.clearAnimation.progress = progress;

    const gravity = 0.0025;
    for (const particle of this.clearAnimation.particles) {
      particle.x += particle.vx * dtMs;
      particle.y += particle.vy * dtMs;
      particle.vy += gravity * dtMs;
      particle.life -= dtMs;
    }

    this.clearAnimation.particles = this.clearAnimation.particles.filter((p) => p.life > 0);

    if (progress >= 1) {
      this.board = this.clearAnimation.finalBoard;
      this.clearAnimation = null;
      this.spawnPiece();
    }
  }

  spawnPiece() {
    const type = this.nextType;
    this.nextType = randomPieceType();
    this.activePiece = {
      type,
      rotation: 0,
      x: Math.floor((BOARD_COLS - 4) / 2),
      y: 0,
    };

    if (this.collides(this.activePiece)) {
      this.activePiece = null;
      this.isGameOver = true;
      this.isDropping = false;
    }
  }

  findFullRows() {
    const rows = [];
    for (let y = 0; y < BOARD_ROWS; y += 1) {
      if (this.board[y].every(Boolean)) {
        rows.push(y);
      }
    }
    return rows;
  }

  prepareClearAnimation(fullRows) {
    const oldBoard = cloneBoard(this.board);
    const clearSet = new Set(fullRows);
    const finalBoard = createEmptyBoard();
    const movedCells = [];
    const clearedCells = [];

    for (const y of fullRows) {
      for (let x = 0; x < BOARD_COLS; x += 1) {
        const color = oldBoard[y][x];
        if (color) {
          clearedCells.push({ x, y, color });
        }
      }
    }

    let writeY = BOARD_ROWS - 1;
    for (let y = BOARD_ROWS - 1; y >= 0; y -= 1) {
      if (clearSet.has(y)) {
        continue;
      }

      for (let x = 0; x < BOARD_COLS; x += 1) {
        const color = oldBoard[y][x];
        finalBoard[writeY][x] = color;
        if (color && writeY !== y) {
          movedCells.push({ x, fromY: y, toY: writeY, color });
        }
      }

      writeY -= 1;
    }

    this.clearAnimation = {
      oldBoard,
      finalBoard,
      fullRows,
      movedCells,
      particles: this.createShatterParticles(clearedCells),
      elapsed: 0,
      duration: CLEAR_ANIMATION_MS,
      progress: 0,
    };
  }

  createShatterParticles(clearedCells) {
    const particles = [];
    for (const cell of clearedCells) {
      const count = 4;
      for (let i = 0; i < count; i += 1) {
        particles.push({
          x: cell.x + 0.5,
          y: cell.y + 0.5,
          vx: (Math.random() - 0.5) * 0.012,
          vy: -Math.random() * 0.014,
          life: 220 + Math.random() * 160,
          size: 0.14 + Math.random() * 0.16,
          color: cell.color,
        });
      }
    }
    return particles;
  }

  collides(piece) {
    const cells = getPieceCells(piece.type, piece.rotation);
    for (const [x, y] of cells) {
      const boardX = piece.x + x;
      const boardY = piece.y + y;

      if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) {
        return true;
      }

      if (boardY >= 0 && this.board[boardY][boardX]) {
        return true;
      }
    }
    return false;
  }
}