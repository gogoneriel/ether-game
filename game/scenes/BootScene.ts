import * as Phaser from 'phaser';
import {
  attachNormalMap,
  PLAYER_FRAME,
  registerWalkAnims,
} from '@/game/playerAnims';

const FRAME = PLAYER_FRAME;

/** Legacy sheets preloaded at boot; variant matrix loads on demand. */
const PLAYER_SHEETS = [
  'player-base',
  'player-skin-medium',
  'player-skin-dark',
  'player-outfit-scout',
  'player-geared',
] as const;

const NPC_SHEETS = ['npc-herald', 'npc-altar', 'npc-scout'] as const;

/** Preloads HD-2D assets (64px + normals) and registers walk / idle animations. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Image + normal pair (Phaser Light2D)
    this.load.image('liber-town', [
      '/game/tilesets/liber-town.png',
      '/game/tilesets/liber-town-n.png',
    ]);
    this.load.image('sonetto-town', [
      '/game/tilesets/sonetto-town.png',
      '/game/tilesets/sonetto-town-n.png',
    ]);
    this.load.tilemapTiledJSON('map-town', '/game/maps/town.json');
    this.load.tilemapTiledJSON('map-forest', '/game/maps/forest.json');

    for (const key of PLAYER_SHEETS) {
      this.load.spritesheet(key, `/game/sprites/${key}.png`, {
        frameWidth: FRAME,
        frameHeight: FRAME,
      });
      this.load.image(`${key}-n`, `/game/sprites/${key}-n.png`);
    }
    for (const key of NPC_SHEETS) {
      this.load.spritesheet(key, `/game/sprites/${key}.png`, {
        frameWidth: FRAME,
        frameHeight: FRAME,
      });
      this.load.image(`${key}-n`, `/game/sprites/${key}-n.png`);
    }

    this.load.image('companion-drone', [
      '/game/sprites/companion-drone.png',
      '/game/sprites/companion-drone-n.png',
    ]);
    this.load.image('portrait-herald', '/game/sprites/portraits/herald.png');
    this.load.image('portrait-altar', '/game/sprites/portraits/altar.png');
    this.load.image('portrait-scout', '/game/sprites/portraits/scout.png');

    this.load.image('fx-soft', '/game/sprites/fx/soft.png');
    this.load.image('fx-firefly', '/game/sprites/fx/firefly.png');
    this.load.image('fx-leaf', '/game/sprites/fx/leaf.png');
    this.load.image('fx-cloud', '/game/sprites/fx/cloud.png');

    this.load.audio('music-town', '/game/audio/music-town.wav');
    this.load.audio('music-forest', '/game/audio/music-forest.wav');
    this.load.audio('sfx-step', '/game/audio/sfx-step.wav');
    this.load.audio('sfx-interact', '/game/audio/sfx-interact.wav');
    this.load.audio('sfx-ui', '/game/audio/sfx-ui.wav');
  }

  create() {
    for (const key of [...PLAYER_SHEETS, ...NPC_SHEETS]) {
      attachNormalMap(this, key);
    }

    for (const key of PLAYER_SHEETS) {
      registerWalkAnims(this, key);
    }
    for (const key of NPC_SHEETS) {
      if (!this.anims.exists(`${key}-idle`)) {
        this.anims.create({
          key: `${key}-idle`,
          frames: this.anims.generateFrameNumbers(key, { start: 0, end: 3 }),
          frameRate: 4,
          repeat: -1,
        });
      }
    }

    const startMap =
      (this.registry.get('startMap') as 'town' | 'forest' | undefined) ?? 'town';
    this.scene.start('World', { mapKey: startMap, spawnName: 'player' });
  }
}
