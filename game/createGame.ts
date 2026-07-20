import * as Phaser from 'phaser';
import { BootScene } from '@/game/scenes/BootScene';
import { WorldScene } from '@/game/scenes/WorldScene';
import { UIOverlayScene } from '@/game/scenes/UIOverlayScene';
import { DialogueScene } from '@/game/scenes/DialogueScene';

export type CreateLiberGameOptions = {
  parent: string | HTMLElement;
  width?: number;
  height?: number;
};

export function createLiberGame(options: CreateLiberGameOptions): Phaser.Game {
  const width = options.width ?? 800;
  const height = options.height ?? 480;

  return new Phaser.Game({
    // Prefer WebGL for Light2D / Post FX; AUTO falls back to Canvas.
    type: Phaser.AUTO,
    parent: options.parent,
    width,
    height,
    backgroundColor: '#1a2f1e',
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, WorldScene, UIOverlayScene, DialogueScene],
    audio: {
      disableWebAudio: false,
    },
    render: {
      antialias: false,
      pixelArt: true,
      powerPreference: 'high-performance',
    },
  });
}
