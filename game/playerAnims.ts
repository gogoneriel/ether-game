import type * as Phaser from 'phaser';

const FRAME = 64;

const DIRS = [
  { name: 'down', row: 0 },
  { name: 'left', row: 1 },
  { name: 'right', row: 2 },
  { name: 'up', row: 3 },
] as const;

const inflight = new Map<string, Promise<string>>();

/** Register walk + idle animations for a 4×4 walk sheet. */
export function registerWalkAnims(
  scene: Phaser.Scene,
  sheet: string,
): void {
  for (const d of DIRS) {
    const walkKey = `${sheet}-walk-${d.name}`;
    const idleKey = `${sheet}-idle-${d.name}`;
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: scene.anims.generateFrameNumbers(sheet, {
          start: d.row * 4,
          end: d.row * 4 + 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: [{ key: sheet, frame: d.row * 4 }],
        frameRate: 1,
      });
    }
  }
}

/** Link normal-map image as the texture data source for Light2D. */
export function attachNormalMap(
  scene: Phaser.Scene,
  sheetKey: string,
): void {
  const normalKey = `${sheetKey}-n`;
  if (!scene.textures.exists(sheetKey) || !scene.textures.exists(normalKey)) {
    return;
  }
  try {
    const texture = scene.textures.get(sheetKey);
    const normal = scene.textures.get(normalKey);
    const src = normal.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    texture.setDataSource(src);
  } catch (err) {
    console.warn('[hd2d] normal attach failed', sheetKey, err);
  }
}

export const PLAYER_FRAME = FRAME;

/**
 * Ensure a player spritesheet (+ normal) is loaded and anims registered.
 * Resolves immediately if already loaded; otherwise loads at runtime.
 * Concurrent callers for the same key share one in-flight promise.
 */
export function ensurePlayerSheet(
  scene: Phaser.Scene,
  sheetKey: string,
): Promise<string> {
  if (scene.textures.exists(sheetKey)) {
    registerWalkAnims(scene, sheetKey);
    attachNormalMap(scene, sheetKey);
    return Promise.resolve(sheetKey);
  }

  const existing = inflight.get(sheetKey);
  if (existing) return existing;

  const promise = new Promise<string>((resolve) => {
    const finish = (key: string) => {
      inflight.delete(sheetKey);
      if (scene.textures.exists(key)) {
        registerWalkAnims(scene, key);
        attachNormalMap(scene, key);
      }
      resolve(key);
    };

    const onComplete = (key: string) => {
      if (key !== sheetKey) return;
      scene.load.off('filecomplete-spritesheet-' + sheetKey, onComplete);
      scene.load.off('loaderror', onError);
      finish(sheetKey);
    };
    const onError = (file: { key?: string }) => {
      if (file?.key !== sheetKey && file?.key !== `${sheetKey}-n`) return;
      scene.load.off('filecomplete-spritesheet-' + sheetKey, onComplete);
      scene.load.off('loaderror', onError);
      finish(scene.textures.exists('player-base') ? 'player-base' : sheetKey);
    };

    scene.load.once('filecomplete-spritesheet-' + sheetKey, onComplete);
    scene.load.on('loaderror', onError);
    scene.load.spritesheet(sheetKey, `/game/sprites/${sheetKey}.png`, {
      frameWidth: FRAME,
      frameHeight: FRAME,
    });
    if (!scene.textures.exists(`${sheetKey}-n`)) {
      scene.load.image(`${sheetKey}-n`, `/game/sprites/${sheetKey}-n.png`);
    }
    scene.load.start();
  });

  inflight.set(sheetKey, promise);
  return promise;
}
