import * as Phaser from 'phaser';
import { EventBus, type GameMapKey } from '@/game/EventBus';

/** Lightweight map label only — React GameHud owns the rest of the UI. */
export class UIOverlayScene extends Phaser.Scene {
  private mapLabel!: Phaser.GameObjects.Text;

  constructor() {
    super('UIOverlay');
  }

  create() {
    this.mapLabel = this.add
      .text(this.scale.width - 8, 8, 'Magnolia', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#a7f3d0',
        backgroundColor: '#052e1688',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)
      .setAlpha(0.55);

    EventBus.on('world:ready', this.onMap);
    EventBus.on('world:map-change', this.onMap);
    this.scale.on('resize', this.onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('world:ready', this.onMap);
      EventBus.off('world:map-change', this.onMap);
      this.scale.off('resize', this.onResize);
    });
  }

  private onResize = () => {
    this.mapLabel?.setPosition(this.scale.width - 8, 8);
  };

  private onMap = (payload: { map: GameMapKey }) => {
    this.mapLabel.setText(payload.map === 'forest' ? 'Forest' : 'Magnolia');
  };
}
