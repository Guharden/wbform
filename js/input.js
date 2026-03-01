export class InputController {
  constructor(game) {
    this.game = game;
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
}