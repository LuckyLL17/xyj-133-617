import type { InputState } from './types';

export class InputManager {
  stateP1: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
    shift: false,
  };

  stateP2: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    space: false,
    shift: false,
  };

  get state(): InputState {
    return this.stateP1;
  }

  private spacePressedP1 = false;
  private shiftPressedP1 = false;
  private spacePressedP2 = false;
  private shiftPressedP2 = false;

  onSpacePress?: (playerIdx: 0 | 1) => void;
  onShiftPress?: (playerIdx: 0 | 1) => void;

  constructor() {
    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.stateP1.up = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.stateP1.down = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.stateP1.left = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.stateP1.right = true;
        break;
      case 'Space':
        if (!this.spacePressedP1) {
          this.spacePressedP1 = true;
          this.onSpacePress?.(0);
        }
        this.stateP1.space = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
        if (!this.shiftPressedP1) {
          this.shiftPressedP1 = true;
          this.onShiftPress?.(0);
        }
        this.stateP1.shift = true;
        break;
      case 'KeyI':
        this.stateP2.up = true;
        break;
      case 'KeyK':
        this.stateP2.down = true;
        break;
      case 'KeyJ':
        this.stateP2.left = true;
        break;
      case 'KeyL':
        this.stateP2.right = true;
        break;
      case 'Enter':
        if (!this.spacePressedP2) {
          this.spacePressedP2 = true;
          this.onSpacePress?.(1);
        }
        this.stateP2.space = true;
        e.preventDefault();
        break;
      case 'ShiftRight':
        if (!this.shiftPressedP2) {
          this.shiftPressedP2 = true;
          this.onShiftPress?.(1);
        }
        this.stateP2.shift = true;
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    switch (e.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.stateP1.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.stateP1.down = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.stateP1.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.stateP1.right = false;
        break;
      case 'Space':
        this.spacePressedP1 = false;
        this.stateP1.space = false;
        break;
      case 'ShiftLeft':
        this.shiftPressedP1 = false;
        this.stateP1.shift = false;
        break;
      case 'KeyI':
        this.stateP2.up = false;
        break;
      case 'KeyK':
        this.stateP2.down = false;
        break;
      case 'KeyJ':
        this.stateP2.left = false;
        break;
      case 'KeyL':
        this.stateP2.right = false;
        break;
      case 'Enter':
        this.spacePressedP2 = false;
        this.stateP2.space = false;
        break;
      case 'ShiftRight':
        this.shiftPressedP2 = false;
        this.stateP2.shift = false;
        break;
    }
  };
}
