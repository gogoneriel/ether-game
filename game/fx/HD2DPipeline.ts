import * as Phaser from 'phaser';
import type { QualityTier } from '@/game/fx/quality';
import type { GameMapKey } from '@/game/EventBus';

/** Apply camera Post FX for HD-2D diorama look. */
export function applyWorldFX(
  scene: Phaser.Scene,
  camera: Phaser.Cameras.Scene2D.Camera,
  quality: QualityTier,
) {
  try {
    camera.postFX.clear();
  } catch {
    /* older / unavailable */
  }

  try {
    if (quality === 'high') {
      camera.postFX.addBloom(0xffffff, 1, 1, 0.65, 1.1, 3);
      camera.postFX.addTiltShift(0.45, 0.18, 0.55, 0.5, 0.5, 0.55);
      camera.postFX.addVignette(0.5, 0.5, 0.72, 0.28);
    } else {
      camera.postFX.addVignette(0.5, 0.5, 0.78, 0.18);
    }
  } catch (err) {
    console.warn('[hd2d] postFX unavailable', err);
  }

  void scene;
}

export type AmbientHandles = {
  destroy: () => void;
  setNight: (night: number) => void;
};

/** Dust / leaves / fireflies. */
export function createAmbientParticles(
  scene: Phaser.Scene,
  mapKey: GameMapKey,
  quality: QualityTier,
): AmbientHandles {
  const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  const scale = quality === 'high' ? 1 : 0.5;

  if (mapKey === 'town' && scene.textures.exists('fx-soft')) {
    const dust = scene.add.particles(0, 0, 'fx-soft', {
      x: { min: 0, max: scene.physics.world.bounds.width },
      y: { min: 0, max: scene.physics.world.bounds.height },
      lifespan: 4000,
      speedY: { min: -8, max: -2 },
      speedX: { min: -4, max: 4 },
      scale: { start: 0.15, end: 0.05 },
      alpha: { start: 0.25, end: 0 },
      quantity: 1,
      frequency: quality === 'high' ? 220 : 480,
      blendMode: 'ADD',
      tint: 0xe8f5e9,
    });
    dust.setDepth(40);
    emitters.push(dust);
  }

  if (mapKey === 'forest' && scene.textures.exists('fx-leaf')) {
    const leaves = scene.add.particles(0, 0, 'fx-leaf', {
      x: { min: 0, max: scene.physics.world.bounds.width },
      y: -20,
      lifespan: 6000,
      speedY: { min: 20, max: 45 },
      speedX: { min: -25, max: 10 },
      rotate: { min: 0, max: 360 },
      scale: { start: 0.7 * scale, end: 0.4 * scale },
      alpha: { start: 0.85, end: 0.2 },
      quantity: 1,
      frequency: quality === 'high' ? 400 : 900,
    });
    leaves.setDepth(45);
    emitters.push(leaves);
  }

  let fireflies: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  if (mapKey === 'forest' && scene.textures.exists('fx-firefly')) {
    fireflies = scene.add.particles(0, 0, 'fx-firefly', {
      x: { min: 40, max: scene.physics.world.bounds.width - 40 },
      y: { min: 40, max: scene.physics.world.bounds.height - 40 },
      lifespan: 2800,
      speed: { min: 4, max: 18 },
      scale: { start: 1.2, end: 0.2 },
      alpha: { start: 0.9, end: 0 },
      quantity: 1,
      frequency: quality === 'high' ? 180 : 400,
      blendMode: 'ADD',
      tint: 0xd4ff7a,
    });
    fireflies.setDepth(50);
    fireflies.stop();
    emitters.push(fireflies);
  }

  return {
    destroy: () => {
      for (const e of emitters) e.destroy();
    },
    setNight: (night: number) => {
      if (!fireflies) return;
      if (night > 0.55) {
        if (!fireflies.emitting) fireflies.start();
      } else if (fireflies.emitting) {
        fireflies.stop();
      }
    },
  };
}

export type CloudHandles = { destroy: () => void; update: (delta: number) => void };

export function createParallaxClouds(
  scene: Phaser.Scene,
  quality: QualityTier,
): CloudHandles {
  if (!scene.textures.exists('fx-cloud')) {
    return { destroy: () => undefined, update: () => undefined };
  }

  const clouds: Phaser.GameObjects.Image[] = [];
  const count = quality === 'high' ? 5 : 3;
  const boundsW = Math.max(800, scene.physics.world.bounds.width);
  const boundsH = Math.max(480, scene.physics.world.bounds.height);

  for (let i = 0; i < count; i++) {
    const img = scene.add.image(
      Math.random() * boundsW,
      40 + Math.random() * (boundsH * 0.45),
      'fx-cloud',
    );
    const layer = i % 2;
    img.setScrollFactor(layer === 0 ? 0.12 : 0.28);
    img.setAlpha(layer === 0 ? 0.28 : 0.18);
    img.setScale(1.6 + Math.random() * 1.4);
    img.setDepth(60 + layer);
    img.setData('speed', layer === 0 ? 6 : 12);
    clouds.push(img);
  }

  return {
    destroy: () => {
      for (const c of clouds) c.destroy();
    },
    update: (delta: number) => {
      const dt = delta / 1000;
      for (const c of clouds) {
        c.x += (c.getData('speed') as number) * dt;
        if (c.x > boundsW + 80) c.x = -80;
      }
    },
  };
}

export type DayNightHandles = {
  destroy: () => void;
  getNightFactor: () => number;
};

const DAY_AMBIENT = { r: 0.92, g: 0.9, b: 0.85 };
const DUSK_AMBIENT = { r: 0.75, g: 0.55, b: 0.45 };
const NIGHT_AMBIENT = { r: 0.22, g: 0.28, b: 0.48 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sampleAmbient(phase: number) {
  if (phase < 0.35) {
    const t = phase / 0.35;
    return {
      r: lerp(DAY_AMBIENT.r, DUSK_AMBIENT.r, t),
      g: lerp(DAY_AMBIENT.g, DUSK_AMBIENT.g, t),
      b: lerp(DAY_AMBIENT.b, DUSK_AMBIENT.b, t),
      night: t * 0.35,
    };
  }
  if (phase < 0.7) {
    const t = (phase - 0.35) / 0.35;
    return {
      r: lerp(DUSK_AMBIENT.r, NIGHT_AMBIENT.r, t),
      g: lerp(DUSK_AMBIENT.g, NIGHT_AMBIENT.g, t),
      b: lerp(DUSK_AMBIENT.b, NIGHT_AMBIENT.b, t),
      night: 0.35 + t * 0.65,
    };
  }
  const t = (phase - 0.7) / 0.3;
  return {
    r: lerp(NIGHT_AMBIENT.r, DAY_AMBIENT.r, t),
    g: lerp(NIGHT_AMBIENT.g, DAY_AMBIENT.g, t),
    b: lerp(NIGHT_AMBIENT.b, DAY_AMBIENT.b, t),
    night: Math.max(0, 1 - t),
  };
}

/** ~8 minute day-night loop controlling Light2D ambient + tint overlay. */
export function createDayNightCycle(
  scene: Phaser.Scene,
  lightsEnabled: boolean,
  onNight?: (night: number) => void,
): DayNightHandles {
  const CYCLE_MS = 8 * 60 * 1000;
  let elapsed = CYCLE_MS * 0.15;
  let nightFactor = 0;

  const overlay = scene.add.rectangle(
    0,
    0,
    scene.scale.width * 4,
    scene.scale.height * 4,
    0x0a1530,
    0,
  );
  overlay.setOrigin(0, 0);
  overlay.setScrollFactor(0);
  overlay.setDepth(55);
  overlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

  const tick = () => {
    elapsed = (elapsed + scene.game.loop.delta) % CYCLE_MS;
    const phase = elapsed / CYCLE_MS;
    const amb = sampleAmbient(phase);
    nightFactor = amb.night;
    if (lightsEnabled) {
      try {
        const color =
          ((Math.round(amb.r * 255) & 0xff) << 16) |
          ((Math.round(amb.g * 255) & 0xff) << 8) |
          (Math.round(amb.b * 255) & 0xff);
        scene.lights.setAmbientColor(color);
      } catch {
        /* ignore */
      }
    }
    overlay.setFillStyle(0x0a1530, nightFactor * 0.35);
    onNight?.(nightFactor);
  };

  scene.events.on('update', tick);

  return {
    destroy: () => {
      scene.events.off('update', tick);
      overlay.destroy();
    },
    getNightFactor: () => nightFactor,
  };
}
