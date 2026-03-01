(() => {
  const BOARD_COLS = 12;
  const BOARD_ROWS = 16;

  const SCORE_TABLE = {
    1: 100,
    2: 300,
    3: 500,
    4: 800,
  };

  const VICTORY_SCORE = 5000;

  const PIECE_COLORS = {
    I: "#bde4ff",
    O: "#f9cae3",
    T: "#e2c7ff",
    L: "#ffc6a3",
    J: "#c5d0ff",
    S: "#c3f1dc",
    Z: "#ffbcc3",
    U: "#aee5ff",
    P: "#ffd8b0",
    X: "#d7ffbf",
  };

  const DROP_CONFIG = {
    cellsPerSecond: 26,
    levelGain: 1.35,
    maxCellsPerSecond: 42,
  };

  const CLEAR_ANIMATION_MS = 260;
  const CONTROL_FEEDBACK_MS = 130;
  const PIECE_PREP_MS = 15000;

  const PIECES = {
    I: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
    O: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
    T: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    L: [
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    J: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    S: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
    Z: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
    U: [
      [0, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    P: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    X: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
    V: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    W: [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    Y: [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [1, 3],
    ],
    F: [
      [1, 0],
      [0, 1],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    N: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ],
  };

  Object.assign(PIECE_COLORS, {
    V: "#cbe7ff",
    W: "#ffc9dc",
    Y: "#d8ccff",
    F: "#ffd4ad",
    N: "#bfeedd",
  });

  const PIECE_TYPES = Object.keys(PIECES);

  function randomPieceType() {
    const index = Math.floor(Math.random() * PIECE_TYPES.length);
    return PIECE_TYPES[index];
  }

  function rotateCell(cell, steps) {
    let [x, y] = cell;
    for (let i = 0; i < steps; i += 1) {
      const nextX = 3 - y;
      const nextY = x;
      x = nextX;
      y = nextY;
    }
    return [x, y];
  }

  function getPieceCells(type, rotation = 0) {
    const base = PIECES[type];
    const turns = ((rotation % 4) + 4) % 4;
    if (type === "O" || turns === 0) {
      return base;
    }
    return base.map((cell) => rotateCell(cell, turns));
  }

  function createEmptyBoard() {
    return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(null));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function randomBlockColor() {
    const colorKeys = Object.keys(PIECE_COLORS);
    return PIECE_COLORS[colorKeys[randomInt(0, colorKeys.length - 1)]];
  }

  class TetrisGame {
    constructor() {
      this.startLevel = 1;
      this.maxLevel = 10;
      this.reset();
    }

    setStartLevel(level) {
      const normalized = Number.isFinite(level) ? Math.floor(level) : 1;
      this.startLevel = Math.min(this.maxLevel, Math.max(1, normalized));
      if (!this.isStarted || this.isGameOver) {
        this.level = this.startLevel;
      }
    }

    reset() {
      this.board = createEmptyBoard();
      this.activePiece = null;
      this.dropPreviewPiece = null;
      this.pieceCountdownMs = PIECE_PREP_MS;
      this.pendingGarbageRows = 0;
      this.nextType = randomPieceType();

      this.isStarted = false;
      this.isPaused = false;
      this.isGameOver = false;
      this.victoryAchieved = false;
      this.isDropping = false;

      this.score = 0;
      this.lines = 0;
      this.level = this.startLevel;

      this.dropMotion = null;
      this.controlFeedbackMs = 0;
      this.clearAnimation = null;
    }

    start() {
      if (this.isStarted && !this.isGameOver) {
        return;
      }
      this.reset();
      this.isStarted = true;
      this.seedBottomBlocksForLevel(this.level);
      this.spawnPiece();
    }

    restart() {
      this.reset();
      this.isStarted = true;
      this.seedBottomBlocksForLevel(this.level);
      this.spawnPiece();
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
      if (this.dropPreviewPiece) {
        this.updateDropPreview();
      }
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
          if (this.dropPreviewPiece) {
            this.updateDropPreview();
          }
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

      this.clearDropPreview();
      const candidate = this.getLandingPiece(this.activePiece);
      if (!candidate) {
        return false;
      }

      const fallDistance = candidate.y - this.activePiece.y;
      if (fallDistance <= 0) {
        this.lockPiece();
        return true;
      }

      const speed = Math.min(
        DROP_CONFIG.maxCellsPerSecond,
        DROP_CONFIG.cellsPerSecond + (this.level - 1) * DROP_CONFIG.levelGain,
      );

      this.isDropping = true;
      this.dropMotion = {
        startY: this.activePiece.y,
        targetY: candidate.y,
        currentY: this.activePiece.y,
        speed,
      };
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
      }

      if (this.canControl()) {
        this.pieceCountdownMs = Math.max(0, this.pieceCountdownMs - dtMs);
        if (this.pieceCountdownMs === 0) {
          this.triggerDrop();
        }
      }

      if (this.isDropping && this.activePiece && this.dropMotion) {
        const nextY = this.dropMotion.currentY + (this.dropMotion.speed * dtMs) / 1000;
        this.dropMotion.currentY = Math.min(this.dropMotion.targetY, nextY);
        this.activePiece.y = this.dropMotion.currentY;

        if (this.dropMotion.currentY >= this.dropMotion.targetY) {
          this.activePiece.y = this.dropMotion.targetY;
          this.dropMotion = null;
          this.lockPiece();
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

    getLandingPiece(piece) {
      if (!piece) {
        return null;
      }

      const landing = {
        ...piece,
        y: Math.round(piece.y),
      };

      while (!this.collides({ ...landing, y: landing.y + 1 })) {
        landing.y += 1;
      }

      return landing;
    }

    updateDropPreview() {
      if (!this.canControl() || !this.activePiece) {
        this.dropPreviewPiece = null;
        return false;
      }

      this.dropPreviewPiece = this.getLandingPiece(this.activePiece);
      return Boolean(this.dropPreviewPiece);
    }

    clearDropPreview() {
      this.dropPreviewPiece = null;
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
        const cellX = Math.round(cell.x);
        const cellY = Math.round(cell.y);
        if (cellY < 0 || cellY >= BOARD_ROWS || cellX < 0 || cellX >= BOARD_COLS) {
          continue;
        }
        this.board[cellY][cellX] = PIECE_COLORS[this.activePiece.type];
      }

      this.activePiece = null;
      this.clearDropPreview();
      this.isDropping = false;
      this.dropMotion = null;
      this.pieceCountdownMs = PIECE_PREP_MS;

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
      const oldLevel = this.level;
      const growth = Math.floor(this.lines / 8);
      this.level = Math.min(this.maxLevel, this.startLevel + growth);

      if (this.level > oldLevel) {
        this.pendingGarbageRows += this.getSeedRowsForLevel(this.level);
      }

      if (!this.victoryAchieved && this.score >= VICTORY_SCORE) {
        this.victoryAchieved = true;
      }
    }

    updateClearAnimation(dtMs) {
      this.clearAnimation.elapsed += dtMs;
      const progress = Math.min(1, this.clearAnimation.elapsed / this.clearAnimation.duration);
      this.clearAnimation.progress = progress;
      this.clearAnimation.beamPhase = easeOutCubic(progress);

      const gravity = 0.0025;
      for (const particle of this.clearAnimation.particles) {
        particle.x += particle.vx * dtMs;
        particle.y += particle.vy * dtMs;
        particle.vy += gravity * dtMs;
        particle.angle += particle.spin * dtMs;
        particle.life -= dtMs;
      }

      for (const wave of this.clearAnimation.waves) {
        wave.radius += wave.speed * dtMs;
        wave.life -= 0.0026 * dtMs;
      }

      this.clearAnimation.particles = this.clearAnimation.particles.filter((p) => p.life > 0);
      this.clearAnimation.waves = this.clearAnimation.waves.filter((wave) => wave.life > 0);

      if (progress >= 1) {
        this.board = this.clearAnimation.finalBoard;
        this.clearAnimation = null;
        this.applyPendingGarbageRows();
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
      this.pieceCountdownMs = PIECE_PREP_MS;

      if (this.collides(this.activePiece)) {
        this.activePiece = null;
        this.clearDropPreview();
        this.isGameOver = true;
        this.isDropping = false;
      }
    }

    getSeedRowsForLevel(level) {
      return Math.min(4, 1 + Math.floor((level - 1) / 3));
    }

    buildGarbageRow() {
      const row = Array(BOARD_COLS).fill(null);
      const holes = new Set();
      const holeCount = randomInt(2, 3);
      while (holes.size < holeCount) {
        holes.add(randomInt(0, BOARD_COLS - 1));
      }

      for (let x = 0; x < BOARD_COLS; x += 1) {
        if (!holes.has(x)) {
          row[x] = randomBlockColor();
        }
      }
      return row;
    }

    seedBottomBlocksForLevel(level) {
      const rows = this.getSeedRowsForLevel(level);
      for (let y = BOARD_ROWS - rows; y < BOARD_ROWS; y += 1) {
        this.board[y] = this.buildGarbageRow();
      }
    }

    applyPendingGarbageRows() {
      if (this.pendingGarbageRows <= 0) {
        return;
      }

      for (let i = 0; i < this.pendingGarbageRows; i += 1) {
        this.board.shift();
        this.board.push(this.buildGarbageRow());
      }

      this.pendingGarbageRows = 0;
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
        waves: this.createShockwaves(fullRows),
        intensity: Math.min(2, 0.8 + fullRows.length * 0.3),
        beamPhase: 0,
        elapsed: 0,
        duration: CLEAR_ANIMATION_MS + fullRows.length * 50,
        progress: 0,
      };
    }

    createShatterParticles(clearedCells) {
      const particles = [];
      for (const cell of clearedCells) {
        const count = 8 + Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i += 1) {
          particles.push({
            x: cell.x + 0.5,
            y: cell.y + 0.5,
            vx: (Math.random() - 0.5) * 0.02,
            vy: -0.005 - Math.random() * 0.02,
            life: 280 + Math.random() * 220,
            size: 0.08 + Math.random() * 0.2,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.03,
            color: cell.color,
          });
        }
      }
      return particles;
    }

    createShockwaves(fullRows) {
      const centerY = fullRows.reduce((sum, y) => sum + y, 0) / fullRows.length + 0.5;
      const waves = [
        {
          x: BOARD_COLS / 2,
          y: centerY,
          radius: 0.4,
          maxRadius: Math.max(BOARD_COLS, BOARD_ROWS) * 0.95,
          life: 1,
          speed: 0.024,
        },
      ];

      if (fullRows.length >= 2) {
        waves.push({
          x: BOARD_COLS / 2,
          y: centerY,
          radius: 0.2,
          maxRadius: Math.max(BOARD_COLS, BOARD_ROWS) * 0.78,
          life: 0.86,
          speed: 0.018,
        });
      }
      return waves;
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

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    const clamped = Math.max(0, Math.min(1, t));
    return 1 - (1 - clamped) ** 3;
  }

  class Renderer {
    constructor(gameCanvas, nextCanvas, game) {
      this.game = game;
      this.canvas = gameCanvas;
      this.ctx = gameCanvas.getContext("2d");

      this.nextCanvas = nextCanvas;
      this.nextCtx = nextCanvas.getContext("2d");

      this.cellSize = 30;

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

    clientToBoard(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left - this.offsetX) / this.cellSize;
      const y = (clientY - rect.top - this.offsetY) / this.cellSize;
      return { x, y };
    }

    render() {
      const { ctx } = this;
      const width = this.canvas.getBoundingClientRect().width;
      const height = this.canvas.getBoundingClientRect().height;

      ctx.clearRect(0, 0, width, height);

      const animation = this.game.clearAnimation;
      const shake = animation ? (1 - animation.progress) * 4.2 * animation.intensity : 0;
      const shakeX = shake ? (Math.random() - 0.5) * shake : 0;
      const shakeY = shake ? (Math.random() - 0.5) * shake : 0;

      ctx.save();
      ctx.translate(this.offsetX + shakeX, this.offsetY + shakeY);

      this.drawBoardBackground();
      this.drawGrid();
      this.drawSettledBlocks();
      this.drawDropPreview();
      this.drawActivePiece();
      this.drawShatterParticles();
      this.drawBoardHud();

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
        const drawY = lerp(moved.fromY, moved.toY, easeOutCubic(animation.progress));
        this.drawBlock(moved.x, drawY, moved.color, 1);
      }

      if (animation.progress < 0.45) {
        const flashAlpha = (0.45 - animation.progress) * 0.9;
        this.ctx.fillStyle = `rgba(255,255,255,${flashAlpha.toFixed(3)})`;
        for (const y of animation.fullRows) {
          this.ctx.fillRect(0, y * this.cellSize, this.boardWidth, this.cellSize);
        }
      }

      const beamX = this.boardWidth * (animation.beamPhase * 1.35 - 0.2);
      for (const row of animation.fullRows) {
        const y = row * this.cellSize;
        const beam = this.ctx.createLinearGradient(beamX - 120, y, beamX + 120, y + this.cellSize);
        beam.addColorStop(0, "rgba(255,255,255,0)");
        beam.addColorStop(0.5, "rgba(255,255,255,0.45)");
        beam.addColorStop(1, "rgba(255,255,255,0)");
        this.ctx.fillStyle = beam;
        this.ctx.fillRect(0, y, this.boardWidth, this.cellSize);
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

    drawDropPreview() {
      const previewPiece = this.game.dropPreviewPiece;
      const activePiece = this.game.activePiece;
      if (!previewPiece || !activePiece || this.game.isDropping || this.game.clearAnimation) {
        return;
      }

      if (
        Math.round(previewPiece.x) === Math.round(activePiece.x) &&
        Math.round(previewPiece.y) === Math.round(activePiece.y) &&
        previewPiece.rotation === activePiece.rotation
      ) {
        return;
      }

      const cells = getPieceCells(previewPiece.type, previewPiece.rotation);
      const color = this.getPieceColor(previewPiece.type);
      for (const [x, y] of cells) {
        const boardX = Math.round(previewPiece.x + x);
        const boardY = Math.round(previewPiece.y + y);
        this.drawGhostBlock(boardX, boardY, color);
      }
    }

    drawShatterParticles() {
      const animation = this.game.clearAnimation;
      if (!animation) {
        return;
      }

      for (const wave of animation.waves) {
        const alpha = Math.max(0, wave.life * 0.35);
        this.ctx.save();
        this.ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        this.ctx.lineWidth = Math.max(1, this.cellSize * 0.08);
        this.ctx.beginPath();
        this.ctx.arc(
          wave.x * this.cellSize,
          wave.y * this.cellSize,
          Math.min(wave.radius, wave.maxRadius) * this.cellSize,
          0,
          Math.PI * 2,
        );
        this.ctx.stroke();
        this.ctx.restore();
      }

      for (const particle of animation.particles) {
        const px = particle.x * this.cellSize;
        const py = particle.y * this.cellSize;
        const size = particle.size * this.cellSize;
        const alpha = Math.max(0, particle.life / 360);

        this.ctx.save();
        this.ctx.translate(px, py);
        this.ctx.rotate(particle.angle);
        this.ctx.fillStyle = this.hexToRgba(particle.color, alpha);
        this.ctx.fillRect(-size / 2, -size / 2, size, size);
        this.ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.35).toFixed(3)})`;
        this.ctx.fillRect(-size / 2, -size / 2, size, Math.max(1, size * 0.28));
        this.ctx.restore();
      }
    }

    drawBoardHud() {
      if (!this.game.isStarted || this.game.isGameOver) {
        return;
      }

      const progress = Math.max(0, Math.min(1, this.game.pieceCountdownMs / PIECE_PREP_MS));
      const seconds = (this.game.pieceCountdownMs / 1000).toFixed(1);
      const warning = this.game.canControl() && this.game.pieceCountdownMs <= 5000;

      const panelX = this.cellSize * 0.35;
      const panelY = this.cellSize * 0.28;
      const panelW = this.cellSize * 4.9;
      const panelH = this.cellSize * 1.08;
      const radius = Math.max(5, this.cellSize * 0.22);

      this.ctx.save();
      this.roundRect(panelX, panelY, panelW, panelH, radius);
      this.ctx.fillStyle = warning ? "rgba(150,60,75,0.68)" : "rgba(34,57,114,0.62)";
      this.ctx.fill();

      const barX = panelX + this.cellSize * 0.22;
      const barY = panelY + this.cellSize * 0.62;
      const barW = panelW - this.cellSize * 0.44;
      const barH = Math.max(6, this.cellSize * 0.2);

      this.roundRect(barX, barY, barW, barH, barH / 2);
      this.ctx.fillStyle = "rgba(255,255,255,0.2)";
      this.ctx.fill();

      const fillW = barW * progress;
      if (fillW > 0) {
        this.roundRect(barX, barY, fillW, barH, barH / 2);
        this.ctx.fillStyle = warning ? "rgba(255,180,190,0.95)" : "rgba(182,233,255,0.95)";
        this.ctx.fill();
      }

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = `600 ${Math.max(12, this.cellSize * 0.33)}px "Segoe UI", "Microsoft YaHei", sans-serif`;
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(`计时 ${this.game.canControl() ? `${seconds}s` : "--"}`, panelX + this.cellSize * 0.22, panelY + this.cellSize * 0.35);

      this.ctx.restore();
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

    drawGhostBlock(gridX, gridY, color) {
      const x = gridX * this.cellSize;
      const y = gridY * this.cellSize;
      if (y < 0 || y >= this.boardHeight) {
        return;
      }

      const size = this.cellSize;
      const inset = Math.max(1, Math.floor(size * 0.11));
      const radius = Math.max(3, Math.floor(size * 0.16));

      this.ctx.save();
      this.ctx.globalAlpha = 0.32;
      this.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      this.ctx.globalAlpha = 0.78;
      this.ctx.setLineDash([Math.max(3, size * 0.18), Math.max(2, size * 0.12)]);
      this.ctx.lineWidth = Math.max(1, size * 0.06);
      this.ctx.strokeStyle = "rgba(255,255,255,0.9)";
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
      return PIECE_COLORS[type] || "#f7c6df";
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

  class InputController {
    constructor(game) {
      this.game = game;
      this.canvasTouchState = null;
    }

    bindKeyboard() {
      window.addEventListener("keydown", (event) => {
        const key = event.code;
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyZ", "KeyP"].includes(key)) {
          event.preventDefault();
        }

        if (key === "ArrowLeft") {
          this.game.move(-1);
        } else if (key === "ArrowRight") {
          this.game.move(1);
        } else if (key === "ArrowUp") {
          this.game.rotate(1);
        } else if (key === "KeyA") {
          this.game.rotate(2);
        } else if (key === "KeyZ") {
          this.game.rotate(3);
        } else if (key === "Space") {
          this.game.triggerDrop();
        } else if (key === "KeyP") {
          this.game.togglePause();
        }
      });
    }

    bindTouchButtons(root) {
      root.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const action = target.dataset.action;
        if (!action) {
          return;
        }

        if (action === "left") {
          this.game.move(-1);
        } else if (action === "right") {
          this.game.move(1);
        } else if (action === "rot90") {
          this.game.rotate(1);
        } else if (action === "rot180") {
          this.game.rotate(2);
        } else if (action === "rot270") {
          this.game.rotate(3);
        } else if (action === "drop") {
          this.game.triggerDrop();
        }
      });
    }

    bindCanvasTouch(canvas, renderer) {
      const clearState = () => {
        this.game.clearDropPreview();
        this.canvasTouchState = null;
      };

      const finishTapOrDrag = (event) => {
        if (!this.canvasTouchState || event.pointerId !== this.canvasTouchState.pointerId) {
          return;
        }

        if (canvas.hasPointerCapture(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }

        const snapshot = this.canvasTouchState;
        clearState();

        if (!this.game.canControl()) {
          this.game.clearDropPreview();
          return;
        }

        if (snapshot.startedOnPiece) {
          if (snapshot.previewDrop) {
            return;
          }
          if (!snapshot.dragging && !snapshot.hasMoved) {
            this.game.rotate(1);
          }
        } else if (!snapshot.hasMoved) {
          this.game.triggerDrop();
        }
      };

      canvas.addEventListener("pointerdown", (event) => {
        if ((event.pointerType === "mouse" && event.button !== 0) || !this.game.canControl()) {
          return;
        }

        canvas.setPointerCapture(event.pointerId);

        const startedOnPiece = this.isOnActivePiece(event, renderer);

        const state = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          hasMoved: false,
          dragging: false,
          startedOnPiece,
          dragAccumulator: 0,
          previewDrop: false,
        };

        this.canvasTouchState = state;
      });

      canvas.addEventListener("pointermove", (event) => {
        const state = this.canvasTouchState;
        if (!state || event.pointerId !== state.pointerId) {
          return;
        }

        const totalDx = event.clientX - state.startX;
        const totalDy = event.clientY - state.startY;
        if (Math.abs(totalDx) > 8 || Math.abs(totalDy) > 8) {
          state.hasMoved = true;
        }

        const dx = event.clientX - state.lastX;
        state.lastX = event.clientX;
        state.lastY = event.clientY;

        if (!state.startedOnPiece || !this.game.canControl()) {
          return;
        }

        if (
          !state.previewDrop &&
          totalDy >= Math.max(8, renderer.cellSize * 0.24) &&
          totalDy >= Math.abs(totalDx) * 0.4
        ) {
          state.previewDrop = true;
          this.game.updateDropPreview();
        }

        if (Math.abs(totalDx) >= 3) {
          state.dragging = true;
        }

        if (!state.dragging) {
          return;
        }

        state.dragAccumulator += dx / Math.max(1, renderer.cellSize);

        while (state.dragAccumulator >= 0.28) {
          this.game.move(1);
          state.dragAccumulator -= 1;
        }
        while (state.dragAccumulator <= -0.28) {
          this.game.move(-1);
          state.dragAccumulator += 1;
        }

        if (state.previewDrop) {
          this.game.updateDropPreview();
        }
      });

      canvas.addEventListener("pointerup", finishTapOrDrag);
      canvas.addEventListener("pointercancel", finishTapOrDrag);
      canvas.addEventListener("pointerleave", (event) => {
        const state = this.canvasTouchState;
        if (!state || event.pointerId !== state.pointerId) {
          return;
        }
        if (state.dragging) {
          finishTapOrDrag(event);
        } else {
          clearState();
        }
      });
    }

    isOnActivePiece(event, renderer) {
      const piece = this.game.activePiece;
      if (!piece) {
        return false;
      }

      const point = renderer.clientToBoard(event.clientX, event.clientY);
      const boardX = Math.floor(point.x);
      const boardY = Math.floor(point.y);
      if (boardX < 0 || boardX >= BOARD_COLS || boardY < 0 || boardY >= BOARD_ROWS) {
        return false;
      }

      const cells = getPieceCells(piece.type, piece.rotation);
      for (const [x, y] of cells) {
        const cellX = Math.round(piece.x + x);
        const cellY = Math.round(piece.y + y);
        if (cellX === boardX && cellY === boardY) {
          return true;
        }
      }
      return false;
    }
  }

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
  const stageSelect = document.getElementById("stageSelect");

  if (!gameCanvas || !nextCanvas || !startBtn || !pauseBtn || !restartBtn || !dropBtn || !stageSelect) {
    return;
  }

  const game = new TetrisGame();
  const renderer = new Renderer(gameCanvas, nextCanvas, game);
  const input = new InputController(game);
  let startChoiceOpen = false;

  input.bindKeyboard();
  input.bindTouchButtons(document.body);
  input.bindCanvasTouch(gameCanvas, renderer);

  stageSelect.value = String(game.startLevel);
  stageSelect.addEventListener("change", () => {
    game.setStartLevel(Number(stageSelect.value));
    updateUI();
  });

  startBtn.addEventListener("click", () => {
    startChoiceOpen = false;
    game.setStartLevel(Number(stageSelect.value));
    game.start();
  });
  pauseBtn.addEventListener("click", () => game.togglePause());
  restartBtn.addEventListener("click", () => {
    startChoiceOpen = false;
    stageSelect.value = "1";
    game.setStartLevel(1);
    game.restart();
  });
  dropBtn.addEventListener("click", () => game.triggerDrop());

  statusOverlay.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.overlayAction;
    if (!action) {
      return;
    }

    if (action === "open-start-choice") {
      startChoiceOpen = true;
      updateOverlay();
      return;
    }

    if (action === "start-fresh") {
      startChoiceOpen = false;
      stageSelect.value = "1";
      game.setStartLevel(1);
      game.start();
      return;
    }

    if (action === "start-stage") {
      startChoiceOpen = false;
      game.setStartLevel(Number(stageSelect.value));
      game.start();
      return;
    }

    if (action === "close-start-choice") {
      startChoiceOpen = false;
      updateOverlay();
    }
  });

  let lastTime = performance.now();

  function updateOverlay() {
    let html = "";

    if (!game.isStarted) {
      if (startChoiceOpen) {
        html = `
          <div class="overlay-stack">
            <p>请选择开局方式</p>
            <div class="overlay-actions">
              <button class="btn small primary" data-overlay-action="start-fresh">从头开始</button>
              <button class="btn small accent" data-overlay-action="start-stage">按所选关卡开始</button>
            </div>
            <button class="btn small" data-overlay-action="close-start-choice">返回</button>
          </div>
        `;
      } else {
        html = `点击“<button class="overlay-link" data-overlay-action="open-start-choice">开始游戏</button>”后，先摆位再掉落`;
      }
    } else if (game.isGameOver) {
      html = "游戏结束：堆叠触顶，无法生成新方块";
    } else if (game.isPaused) {
      html = "已暂停";
    } else if (game.victoryAchieved) {
      html = "胜利达成：5000 分！可继续挑战";
    }

    if (html) {
      statusOverlay.innerHTML = html;
      statusOverlay.classList.remove("hidden");
    } else {
      statusOverlay.innerHTML = "";
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
    pauseBtn.textContent = game.isPaused ? "继续" : "暂停";
    dropBtn.disabled = !game.canControl();
    startBtn.disabled = game.isStarted && !game.isGameOver;
    stageSelect.disabled = game.isStarted && !game.isGameOver;
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
})();
