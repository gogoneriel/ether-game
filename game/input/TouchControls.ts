import * as Phaser from 'phaser';

export type TouchVector = { x: number; y: number };

function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    return coarse || navigator.maxTouchPoints > 0;
  } catch {
    return false;
  }
}

/**
 * Virtual joystick (left half) + interact button (bottom-right) for mobile.
 * Keyboard still works alongside.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private enabled: boolean;
  private vector: TouchVector = { x: 0, y: 0 };
  private joyBase?: Phaser.GameObjects.Image;
  private joyThumb?: Phaser.GameObjects.Image;
  private interactBtn?: Phaser.GameObjects.Container;
  private joyPointerId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private onInteract: () => void;
  private readonly radius = 56;

  constructor(scene: Phaser.Scene, onInteract: () => void) {
    this.scene = scene;
    this.onInteract = onInteract;
    this.enabled = isTouchDevice();
    if (!this.enabled) return;

    scene.input.addPointer(2);

    const soft = scene.textures.exists('fx-soft') ? 'fx-soft' : '__DEFAULT';
    this.joyBase = scene.add
      .image(0, 0, soft)
      .setScrollFactor(0)
      .setDepth(2000)
      .setAlpha(0.35)
      .setTint(0xffffff)
      .setDisplaySize(this.radius * 2, this.radius * 2)
      .setVisible(false);
    this.joyThumb = scene.add
      .image(0, 0, soft)
      .setScrollFactor(0)
      .setDepth(2001)
      .setAlpha(0.65)
      .setTint(0x19c37d)
      .setDisplaySize(36, 36)
      .setVisible(false);

    const btnX = scene.scale.width - 56;
    const btnY = scene.scale.height - 72;
    const circle = scene.add
      .image(0, 0, soft)
      .setDisplaySize(72, 72)
      .setTint(0x19c37d)
      .setAlpha(0.75);
    const label = scene.add
      .text(0, 0, 'E', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#052e16',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.interactBtn = scene.add
      .container(btnX, btnY, [circle, label])
      .setScrollFactor(0)
      .setDepth(2000)
      .setSize(72, 72)
      .setInteractive(
        new Phaser.Geom.Circle(0, 0, 36),
        Phaser.Geom.Circle.Contains,
      );

    this.interactBtn.on('pointerdown', (p: Phaser.Input.Pointer) => {
      p.event?.preventDefault?.();
      this.onInteract();
    });

    scene.input.on('pointerdown', this.onPointerDown);
    scene.input.on('pointermove', this.onPointerMove);
    scene.input.on('pointerup', this.onPointerUp);
    scene.scale.on('resize', this.onResize);
  }

  destroy() {
    if (!this.enabled) return;
    this.scene.input.off('pointerdown', this.onPointerDown);
    this.scene.input.off('pointermove', this.onPointerMove);
    this.scene.input.off('pointerup', this.onPointerUp);
    this.scene.scale.off('resize', this.onResize);
    this.joyBase?.destroy();
    this.joyThumb?.destroy();
    this.interactBtn?.destroy();
  }

  getVector(): TouchVector {
    return this.vector;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isActive(): boolean {
    return this.enabled && this.joyPointerId !== null;
  }

  private onResize = () => {
    if (!this.interactBtn) return;
    this.interactBtn.setPosition(
      this.scene.scale.width - 56,
      this.scene.scale.height - 72,
    );
  };

  private onPointerDown = (pointer: Phaser.Input.Pointer) => {
    if (!this.enabled || this.joyPointerId !== null) return;
    // Left half only for joystick; skip if hitting interact button
    if (pointer.x > this.scene.scale.width * 0.45) return;
    if (this.interactBtn && Phaser.Geom.Rectangle.Contains(
      this.interactBtn.getBounds(),
      pointer.x,
      pointer.y,
    )) {
      return;
    }
    this.joyPointerId = pointer.id;
    this.joyOrigin = { x: pointer.x, y: pointer.y };
    this.joyBase?.setPosition(pointer.x, pointer.y).setVisible(true);
    this.joyThumb?.setPosition(pointer.x, pointer.y).setVisible(true);
    this.vector = { x: 0, y: 0 };
  };

  private onPointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.enabled || pointer.id !== this.joyPointerId) return;
    const dx = pointer.x - this.joyOrigin.x;
    const dy = pointer.y - this.joyOrigin.y;
    const dist = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(dist, this.radius);
    const nx = (dx / dist) * clamped;
    const ny = (dy / dist) * clamped;
    this.joyThumb?.setPosition(this.joyOrigin.x + nx, this.joyOrigin.y + ny);
    this.vector = {
      x: nx / this.radius,
      y: ny / this.radius,
    };
  };

  private onPointerUp = (pointer: Phaser.Input.Pointer) => {
    if (!this.enabled || pointer.id !== this.joyPointerId) return;
    this.joyPointerId = null;
    this.vector = { x: 0, y: 0 };
    this.joyBase?.setVisible(false);
    this.joyThumb?.setVisible(false);
  };
}
