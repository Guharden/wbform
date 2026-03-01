import { BOARD_COLS, BOARD_ROWS } from "./constants.js";
import { getPieceCells } from "./pieces.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export class Renderer {
  constructor(gameCanvas, nextCanvas, game) {
    this.game = game;
    this.canvas = gameCanvas;
    this.ctx = gameCanvas.getContext("2d");

    this.nextCanvas = nextCanvas;
    this.nextCtx = nextCanvas.getContext("2d");

    this.cellSize = 30;
    this.lastShake = 0;

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.cellSize = Math.floor(Math.min(rect.width / BOARD_COLS, rect.height / BOARD_ROWS));
    this.boardWidth = this.cellSize * BOARD_COLS;
    this.boardHeight = this.cellSize * BOARD_ROWS;

    this.offsetX = Math.floor((rect.width - this.boardWidth) / 2);
    this.offsetY = Math.floor((rect.height - this.boardHeight) / 2);
  }

  render() {
    const { ctx } = this;
    const width = this.canvas.getBoundingClientRect().width;
    const height = this.canvas.getBoundingClientRect().height;

    ctx.clearRect(0, 0, width, height);

    const animation = this.game.clearAnimation;
    const shake = animation ? (1 - animation.progress) * 2.4 : 0;
    const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
    const shakeY = shake ? (Math.random() - 0.5) * shake : 0;

    ctx.save();
    ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);

    this.drawBoardBackground();
    this.drawGrid();
    this.drawSettledBlocks();
    this.drawActivePiece();
    this.drawShatterParticles();

    ctx.restore();
    this.drawNextPiece();
  }

  drawBoardBackground() {
    const { ctx } = this;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.boardHeight);
    gradient.addColorStop(0, "rgba(134, 180, 255, 0.38)");
    gradient.addColorStop(1, "rgba(64, 105, 198, 0.4)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);
  }

  drawGrid() {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    for (let x = 0; x <= BOARD_COLS; x += 1) {
      const px = x * this.cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, this.boardHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= BOARD_ROWS; y += 1) {
      const py = y * this.cellSize + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(this.boardWidth, py);
      ctx.stroke();
    }
  }

  drawSettledBlocks() {
    const animation = this.game.clearAnimation;

    if (!animation) {
      for (let y = 0; y < BOARD_ROWS; y += 1) {
        for (let x = 0; x < BOARD_COLS; x += 1) {
          const color = this.game.board[y][x];
          if (color) {
            this.drawBlock(x, y, color, 1);
          }
        }
      }
      return;
    }

    const hideRows = new Set(animation.fullRows);
    const movingSources = new Set(animation.movedCells.map((cell) => `${cell.x}:${cell.fromY}`));

    for (let y = 0; y < BOARD_ROWS; y += 1) {
      for (let x = 0; x < BOARD_COLS; x += 1) {
        const color = animation.oldBoard[y][x];
        if (!color) {
          continue;
        }

        if (hideRows.has(y)) {
          const alpha = Math.max(0, 1 - animation.progress * 2.5);
          this.drawBlock(x, y, color, alpha);
          continue;
        }

        if (movingSources.has(`${x}:${y}`)) {
          continue;
        }

        this.drawBlock(x, y, color, 1);
      }
    }

    for (const moved of animation.movedCells) {
      const drawY = lerp(moved.fromY, moved.toY, animation.progress);
      this.drawBlock(moved.x, drawY, moved.color, 1);
    }

    if (animation.progress < 0.4) {
      const flashAlpha = (0.4 - animation.progress) * 0.55;
      this.ctx.fillStyle = `rgba(255,255,255,${flashAlpha.toFixed(3)})`;
      for (const y of animation.fullRows) {
        this.ctx.fillRect(0, y * this.cellSize, this.boardWidth, this.cellSize);
      }
    }
  }

  drawActivePiece() {
    const piece = this.game.activePiece;
    if (!piece) {
      return;
    }

    const cells = getPieceCells(piece.type, piece.rotation);
    const glow = this.game.controlFeedbackMs > 0 ? 1.22 : 1;
    const alpha = this.game.isDropping ? 1 : 0.98;

    for (const [x, y] of cells) {
      const boardX = piece.x + x;
      const boardY = piece.y + y;
      this.drawBlock(boardX, boardY, this.getPieceColor(piece.type), alpha, glow);
    }
  }

  drawShatterParticles() {
    const animation = this.game.clearAnimation;
    if (!animation) {
      return;
    }

    for (const particle of animation.particles) {
      const px = particle.x * this.cellSize;
      const py = particle.y * this.cellSize;
      const size = particle.size * this.cellSize;
      const alpha = Math.max(0, particle.life / 360);

      this.ctx.fillStyle = this.hexToRgba(particle.color, alpha);
      this.ctx.fillRect(px - size / 2, py - size / 2, size, size);
    }
  }

  drawBlock(gridX, gridY, color, alpha = 1, glow = 1) {
    const x = gridX * this.cellSize;
    const y = gridY * this.cellSize;
    if (y < 0 || y >= this.boardHeight) {
      return;
    }

    const size = this.cellSize;
    const inset = Math.max(1, Math.floor(size * 0.06));
    const radius = Math.max(3, Math.floor(size * 0.16));

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.shadowColor = this.hexToRgba(color, 0.4);
    this.ctx.shadowBlur = glow > 1 ? 12 : 7;
    this.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    const gloss = this.ctx.createLinearGradient(x, y, x, y + size);
    gloss.addColorStop(0, "rgba(255,255,255,0.35)");
    gloss.addColorStop(0.5, "rgba(255,255,255,0.08)");
    gloss.addColorStop(1, "rgba(0,0,0,0.2)");
    this.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
    this.ctx.fillStyle = gloss;
    this.ctx.fill();

    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "rgba(255,255,255,0.25)";
    this.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawNextPiece() {
    const ctx = this.nextCtx;
    const width = this.nextCanvas.width;
    const height = this.nextCanvas.height;
    ctx.clearRect(0, 0, width, height);

    const type = this.game.nextType;
    if (!type) {
      return;
    }

    const cells = getPieceCells(type, 0);
    const minX = Math.min(...cells.map((item) => item[0]));
    const maxX = Math.max(...cells.map((item) => item[0]));
    const minY = Math.min(...cells.map((item) => item[1]));
    const maxY = Math.max(...cells.map((item) => item[1]));

    const pieceWidth = maxX - minX + 1;
    const pieceHeight = maxY - minY + 1;
    const cell = Math.floor(Math.min(width / (pieceWidth + 1), height / (pieceHeight + 1)));

    const offsetX = Math.floor((width - pieceWidth * cell) / 2 - minX * cell);
    const offsetY = Math.floor((height - pieceHeight * cell) / 2 - minY * cell);

    for (const [x, y] of cells) {
      this.drawPreviewBlock(offsetX + x * cell, offsetY + y * cell, cell, this.getPieceColor(type));
    }
  }

  drawPreviewBlock(x, y, size, color) {
    const inset = Math.max(1, Math.floor(size * 0.06));
    const radius = Math.max(3, Math.floor(size * 0.18));

    this.nextCtx.save();
    this.roundRectFor(this.nextCtx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
    this.nextCtx.fillStyle = color;
    this.nextCtx.fill();

    const gloss = this.nextCtx.createLinearGradient(x, y, x, y + size);
    gloss.addColorStop(0, "rgba(255,255,255,0.36)");
    gloss.addColorStop(1, "rgba(0,0,0,0.18)");
    this.roundRectFor(this.nextCtx, x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
    this.nextCtx.fillStyle = gloss;
    this.nextCtx.fill();
    this.nextCtx.restore();
  }

  getPieceColor(type) {
    const probePiece = {
      I: "#bde4ff",
      O: "#f9cae3",
      T: "#e2c7ff",
      L: "#ffc6a3",
      J: "#c5d0ff",
      S: "#c3f1dc",
      Z: "#ffbcc3",
    };
    return probePiece[type] || "#f7c6df";
  }

  hexToRgba(hex, alpha) {
    const safe = hex.replace("#", "");
    const value = Number.parseInt(safe, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  }

  roundRect(x, y, width, height, radius) {
    this.roundRectFor(this.ctx, x, y, width, height, radius);
  }

  roundRectFor(ctx, x, y, width, height, radius) {
    const rounded = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + rounded, y);
    ctx.arcTo(x + width, y, x + width, y + height, rounded);
    ctx.arcTo(x + width, y + height, x, y + height, rounded);
    ctx.arcTo(x, y + height, x, y, rounded);
    ctx.arcTo(x, y, x + width, y, rounded);
    ctx.closePath();
  }
}