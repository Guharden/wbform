export const PIECES = {
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
};

export const PIECE_TYPES = Object.keys(PIECES);

export function randomPieceType() {
  const index = Math.floor(Math.random() * PIECE_TYPES.length);
  return PIECE_TYPES[index];
}

export function rotateCell(cell, steps) {
  let [x, y] = cell;
  for (let i = 0; i < steps; i += 1) {
    const nextX = 3 - y;
    const nextY = x;
    x = nextX;
    y = nextY;
  }
  return [x, y];
}

export function getPieceCells(type, rotation = 0) {
  const base = PIECES[type];
  const turns = ((rotation % 4) + 4) % 4;
  if (type === "O" || turns === 0) {
    return base;
  }
  return base.map((cell) => rotateCell(cell, turns));
}