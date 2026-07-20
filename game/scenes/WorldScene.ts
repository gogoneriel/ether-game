import * as Phaser from 'phaser';
import {
  EventBus,
  type GameFacing,
  type GameMapKey,
  type GameSessionPayload,
  type PlayerMovePayload,
} from '@/game/EventBus';
import { GameAudio } from '@/game/audio/GameAudio';
import {
  DEFAULT_COSMETICS,
  DEFAULT_GEAR,
  normalizeCosmetics,
  resolveSheetKey,
  type GameCosmetics,
  type GameGear,
} from '@/game/cosmetics';
import { refineQualityForRenderer, type QualityTier } from '@/game/fx/quality';
import {
  applyWorldFX,
  createAmbientParticles,
  createDayNightCycle,
  createParallaxClouds,
  type AmbientHandles,
  type CloudHandles,
  type DayNightHandles,
} from '@/game/fx/HD2DPipeline';
import { TouchControls } from '@/game/input/TouchControls';
import { ensurePlayerSheet } from '@/game/playerAnims';
import {
  pushSample,
  sampleAt,
  type SnapSample,
} from '@/game/multiplayer/interpBuffer';
import { spawnOffsetForAddress } from '@/game/spawnOffset';
import { TILE } from '@/game/townMap';
import type { RemotePlayerPayload } from '@/game/EventBus';

type RemoteSprite = {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  sheetKey: string;
  facing: GameFacing;
  buffer: SnapSample[];
  removing: boolean;
  /** performance.now() of last snapshot sample — used for map-leave stale timeout. */
  lastSampleAt: number;
};

const REMOTE_STALE_MS = 3000;

type MapNpc = {
  id: string;
  texture: string;
  x: number;
  y: number;
  label: string;
  event: string;
  dialogueId?: string;
  sprite?: Phaser.Physics.Arcade.Sprite;
  shadow?: Phaser.GameObjects.Image;
  light?: Phaser.GameObjects.Light;
};

type WorldData = {
  mapKey?: GameMapKey;
  spawnName?: string;
};

export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerShadow!: Phaser.GameObjects.Image;
  private playerLight?: Phaser.GameObjects.Light;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private interactHint!: Phaser.GameObjects.Text;
  private nearbyNpc: MapNpc | null = null;
  private npcs: MapNpc[] = [];
  private session: GameSessionPayload | null = null;
  private facing: GameFacing = 'down';
  private remotes = new Map<string, RemoteSprite>();
  private lastBroadcast = 0;
  private lastSentX = Number.NaN;
  private lastSentY = Number.NaN;
  private lastSentFacing: GameFacing | null = null;
  private wasMoving = false;
  private lastStepSfx = 0;
  private sheetLoadToken = 0;
  private companion!: Phaser.GameObjects.Sprite;
  private companionSpeaking = false;
  private nameLabel!: Phaser.GameObjects.Text;
  private audio!: GameAudio;
  private mapKey: GameMapKey = 'town';
  private sheetKey = 'player-base';
  private cosmetics: GameCosmetics = { ...DEFAULT_COSMETICS };
  private gear: GameGear = { ...DEFAULT_GEAR };
  private transitionCool = 0;
  private transitioning = false;
  private lightsEnabled = false;
  private quality: QualityTier = 'high';
  private ambient?: AmbientHandles;
  private clouds?: CloudHandles;
  private dayNight?: DayNightHandles;
  private lampLights: Phaser.GameObjects.Light[] = [];
  private baseLampIntensity = 0.55;
  private touchControls?: TouchControls;
  private lastWorldTimeEmit = 0;
  /** Modal overlays block movement; world + remotes keep running. */
  private inputBlocked = false;
  /** Chat input focused — ignore keyboard, allow joystick. */
  private chatTyping = false;
  private spawnOffsetApplied = false;
  private pendingRoster: RemotePlayerPayload[] | null = null;
  private static readonly ZOOM_MIN = 0.55;
  private static readonly ZOOM_MAX = 2.2;
  private static readonly ZOOM_STEP = 0.15;
  private static readonly ZOOM_KEY = 'liber-game-zoom';

  constructor() {
    super('World');
  }

  init(data: WorldData) {
    this.mapKey = data.mapKey ?? 'town';
    this.registry.set('currentMap', this.mapKey);
    this.transitioning = false;
    this.transitionCool = 900;
    this.remotes.clear();
    this.npcs = [];
    this.lampLights = [];
    this.spawnOffsetApplied = false;
    this.pendingRoster = null;
  }

  create(data: WorldData) {
    this.mapKey = data.mapKey ?? this.mapKey ?? 'town';
    const spawnName = data.spawnName ?? 'player';

    const isWebGL = this.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;
    this.quality = refineQualityForRenderer(isWebGL);

    this.audio = new GameAudio(this);
    EventBus.emit('audio:map', this.mapKey);

    this.buildMap(spawnName);
    this.setupHD2D();

    this.nameLabel = this.add
      .text(this.player.x, this.player.y - 40, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ecfdf5',
        backgroundColor: '#052e16aa',
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5)
      .setDepth(1000);

    this.companion = this.add.sprite(
      this.player.x + 22,
      this.player.y - 28,
      'companion-drone',
    );
    this.companion.setDepth(15);
    this.companion.setVisible(false);
    if (this.lightsEnabled) this.companion.setPipeline('Light2D');

    this.interactHint = this.add
      .text(0, 0, 'Press E', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#fef3c7',
        backgroundColor: '#000000aa',
        padding: { x: 4, y: 2 },
      })
      .setDepth(1000)
      .setVisible(false);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.wasd;
    this.input.keyboard!.on('keydown-E', () => this.tryInteract());
    this.input.on('pointerdown', () => this.audio.tryUnlock());
    this.input.keyboard!.on('keydown', () => this.audio.tryUnlock());
    this.touchControls = new TouchControls(this, () => {
      this.audio.tryUnlock();
      this.tryInteract();
    });

    if (!this.scene.get('UIOverlay')) {
      this.scene.launch('UIOverlay');
    }
    if (!this.scene.get('Dialogue')) {
      this.scene.launch('Dialogue');
    }

    EventBus.on('game:session', this.onSession);
    EventBus.on('multiplayer:roster', this.onRoster);
    EventBus.on('multiplayer:snap', this.onSnapshot);
    EventBus.on('multiplayer:join', this.onRemoteJoin);
    EventBus.on('multiplayer:leave', this.onRemoteLeave);
    EventBus.on('multiplayer:reset', this.onMultiplayerReset);
    EventBus.on('companion:speak', this.onCompanionSpeak);
    EventBus.on('input:block', this.onInputBlock);
    EventBus.on('chat:typing', this.onChatTyping);
    EventBus.on('character:apply', this.onCharacterApply);
    EventBus.on('gear:apply', this.onGearApply);
    EventBus.on('camera:zoom-delta', this.onZoomDelta);
    EventBus.on('camera:zoom-set', this.onZoomSet);

    this.input.on('wheel', this.onWheel);
    this.input.keyboard?.on('keydown-PLUS', () => this.nudgeZoom(1));
    this.input.keyboard?.on('keydown-EQUALS', () => this.nudgeZoom(1));
    this.input.keyboard?.on('keydown-MINUS', () => this.nudgeZoom(-1));
    this.input.keyboard?.on('keydown-NUMPAD_ADD', () => this.nudgeZoom(1));
    this.input.keyboard?.on('keydown-NUMPAD_SUBTRACT', () => this.nudgeZoom(-1));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.touchControls?.destroy();
      this.touchControls = undefined;
      this.ambient?.destroy();
      this.clouds?.destroy();
      this.dayNight?.destroy();
      this.audio.destroy();
      this.input.off('wheel', this.onWheel);
      EventBus.off('game:session', this.onSession);
      EventBus.off('multiplayer:roster', this.onRoster);
      EventBus.off('multiplayer:snap', this.onSnapshot);
      EventBus.off('multiplayer:join', this.onRemoteJoin);
      EventBus.off('multiplayer:leave', this.onRemoteLeave);
      EventBus.off('multiplayer:reset', this.onMultiplayerReset);
      EventBus.off('companion:speak', this.onCompanionSpeak);
      EventBus.off('input:block', this.onInputBlock);
      EventBus.off('chat:typing', this.onChatTyping);
      EventBus.off('character:apply', this.onCharacterApply);
      EventBus.off('gear:apply', this.onGearApply);
      EventBus.off('camera:zoom-delta', this.onZoomDelta);
      EventBus.off('camera:zoom-set', this.onZoomSet);
    });

    EventBus.emit('world:ready', {
      map: this.mapKey,
      x: this.player.x,
      y: this.player.y,
    });
  }

  private setupHD2D() {
    applyWorldFX(this, this.cameras.main, this.quality);
    this.ambient = createAmbientParticles(this, this.mapKey, this.quality);
    this.clouds = createParallaxClouds(this, this.quality);
    this.dayNight = createDayNightCycle(this, this.lightsEnabled, (night) => {
      this.ambient?.setNight(night);
      const boost = 0.55 + night * 0.9;
      for (const lamp of this.lampLights) {
        lamp.intensity = this.baseLampIntensity * boost;
      }
      for (const npc of this.npcs) {
        if (npc.light) {
          npc.light.intensity = (npc.id === 'altar' ? 0.9 : 0.7) * (0.7 + night * 0.6);
        }
      }
      if (this.playerLight) {
        this.playerLight.intensity = 0.55 + night * 0.45;
      }
      const now = performance.now();
      if (now - this.lastWorldTimeEmit > 500) {
        this.lastWorldTimeEmit = now;
        EventBus.emit('world:time', { night, phaseHours: (1 - night) * 12 + 6 });
      }
    });
  }

  private tryEnableLights() {
    try {
      this.lights.enable();
      this.lights.setAmbientColor(0xe8e0d0);
      this.lightsEnabled = true;
    } catch {
      this.lightsEnabled = false;
    }
  }

  private makeShadow(x: number, y: number): Phaser.GameObjects.Image {
    const key = this.textures.exists('fx-soft') ? 'fx-soft' : this.sheetKey;
    const shadow = this.add.image(x, y + 22, key);
    shadow.setTint(0x000000);
    shadow.setAlpha(0.35);
    shadow.setScale(1.4, 0.45);
    shadow.setDepth(5);
    return shadow;
  }

  private buildMap(spawnName: string) {
    const tiledKey = this.mapKey === 'forest' ? 'map-forest' : 'map-town';
    const map = this.make.tilemap({ key: tiledKey });
    const liber = map.addTilesetImage('liber-town', 'liber-town');
    const sonetto = map.addTilesetImage('sonetto-town', 'sonetto-town');
    const tilesets = [liber, sonetto].filter(Boolean) as Phaser.Tilemaps.Tileset[];

    this.tryEnableLights();

    if (tilesets.length) {
      const ground = map.createLayer('ground', tilesets, 0, 0);
      ground?.setDepth(0);
      if (this.lightsEnabled) ground?.setPipeline('Light2D');
      const deco = map.createLayer('deco', tilesets, 0, 0);
      deco?.setDepth(1);
      if (this.lightsEnabled) deco?.setPipeline('Light2D');
    }

    this.walls = this.physics.add.staticGroup();
    const collision = map.getObjectLayer('collision')?.objects ?? [];
    for (const obj of collision) {
      const w = obj.width ?? TILE;
      const h = obj.height ?? TILE;
      const cx = (obj.x ?? 0) + w / 2;
      const cy = (obj.y ?? 0) + h / 2;
      const rect = this.add.rectangle(cx, cy, w, h, 0x000000, 0);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);
    }

    this.npcs = [];
    const npcLayer = map.getObjectLayer('npcs')?.objects ?? [];
    for (const obj of npcLayer) {
      const props = propsToRecord(obj.properties);
      const npc: MapNpc = {
        id: String(props.npcId || obj.name || 'npc'),
        texture: String(props.texture || 'npc-herald'),
        x: (obj.x ?? 0) + (obj.width ?? TILE) / 2,
        y: (obj.y ?? 0) + (obj.height ?? TILE) / 2,
        label: String(props.label || obj.name || 'NPC'),
        event: String(props.event || 'npc:dialogue'),
        dialogueId: props.dialogueId ? String(props.dialogueId) : undefined,
      };
      this.npcs.push(npc);
      npc.shadow = this.makeShadow(npc.x, npc.y);
      const sprite = this.physics.add.staticSprite(npc.x, npc.y, npc.texture, 0);
      sprite.setDepth(10 + npc.y);
      if (this.lightsEnabled) sprite.setPipeline('Light2D');
      if (this.anims.exists(`${npc.texture}-idle`)) {
        sprite.play(`${npc.texture}-idle`);
      }
      npc.sprite = sprite;
      this.add
        .text(npc.x, npc.y - 40, npc.label, {
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#fde68a',
          backgroundColor: '#052e16aa',
          padding: { x: 3, y: 1 },
        })
        .setOrigin(0.5)
        .setDepth(1000);

      if (this.lightsEnabled) {
        const color =
          npc.id === 'herald'
            ? 0xffc040
            : npc.id === 'altar'
              ? 0xb48cff
              : 0x80c060;
        npc.light = this.lights.addLight(npc.x, npc.y - 8, 140, color, 0.85);
        if (npc.id === 'altar') {
          this.tweens.add({
            targets: npc.light,
            intensity: 1.25,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        }
      }
    }

    const spawns = map.getObjectLayer('spawns')?.objects ?? [];
    const spawn = spawns.find((s) => s.name === spawnName) ?? spawns[0];
    const sx = spawn?.x ?? 14 * TILE + 32;
    const sy = spawn?.y ?? 9 * TILE + 32;

    const desiredSheet = resolveSheetKey(this.cosmetics, this.gear);
    this.sheetKey = this.textures.exists(desiredSheet)
      ? desiredSheet
      : 'player-base';
    this.playerShadow = this.makeShadow(sx, sy);
    this.player = this.physics.add.sprite(sx, sy, this.sheetKey, 0);
    if (desiredSheet !== this.sheetKey) {
      void ensurePlayerSheet(this, desiredSheet).then((loaded) => {
        if (!this.player) return;
        this.sheetKey = loaded;
        this.player.setTexture(loaded, 0);
        if (this.lightsEnabled) this.player.setPipeline('Light2D');
        this.playIdle();
      });
    }
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10 + sy);
    this.player.setSize(22, 16);
    this.player.setOffset(21, 40);
    if (this.lightsEnabled) this.player.setPipeline('Light2D');
    this.physics.add.collider(this.player, this.walls);
    this.playIdle();

    if (this.lightsEnabled) {
      this.playerLight = this.lights.addLight(sx, sy, 160, 0xfff5e0, 0.65);
      // Gate lamps
      const lampY = this.mapKey === 'town' ? TILE * 0.5 : map.heightInPixels - TILE * 0.5;
      const lampXs =
        this.mapKey === 'town'
          ? [13 * TILE + 32, 16 * TILE + 32]
          : [10 * TILE + 32, 13 * TILE + 32];
      for (const lx of lampXs) {
        const lamp = this.lights.addLight(lx, lampY, 120, 0xffaa55, this.baseLampIntensity);
        this.lampLights.push(lamp);
      }
      if (this.quality === 'lite' && this.lampLights.length > 1) {
        // keep one lamp on lite
        const drop = this.lampLights.pop();
        if (drop) this.lights.removeLight(drop);
      }
    }

    const transitions = map.getObjectLayer('transitions')?.objects ?? [];
    for (const obj of transitions) {
      const props = propsToRecord(obj.properties);
      const zone = this.add.zone(
        (obj.x ?? 0) + (obj.width ?? 0) / 2,
        (obj.y ?? 0) + (obj.height ?? 0) / 2,
        obj.width ?? TILE,
        obj.height ?? TILE,
      );
      this.physics.world.enable(zone, Phaser.Physics.Arcade.STATIC_BODY);
      this.physics.add.overlap(this.player, zone, () => {
        if (this.transitioning || this.transitionCool > 0) return;
        const targetMap = (props.targetMap as GameMapKey) || 'town';
        const targetSpawn = String(props.targetSpawn || 'player');
        this.transitionTo(targetMap, targetSpawn);
      });
    }

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.setZoom(this.readStoredZoom());
    EventBus.emit('camera:zoom', this.cameras.main.zoom);
    this.cameras.main.fadeIn(280, 0, 0, 0);
  }

  private readStoredZoom(): number {
    const fallback = this.quality === 'high' ? 0.85 : 0.78;
    try {
      const raw = localStorage.getItem(WorldScene.ZOOM_KEY);
      if (!raw) return fallback;
      const z = Number(raw);
      if (!Number.isFinite(z)) return fallback;
      return Phaser.Math.Clamp(z, WorldScene.ZOOM_MIN, WorldScene.ZOOM_MAX);
    } catch {
      return fallback;
    }
  }

  private persistZoom(z: number) {
    try {
      localStorage.setItem(WorldScene.ZOOM_KEY, String(z));
    } catch {
      /* ignore */
    }
  }

  private applyZoom(z: number) {
    const next = Phaser.Math.Clamp(z, WorldScene.ZOOM_MIN, WorldScene.ZOOM_MAX);
    this.cameras.main.setZoom(next);
    this.persistZoom(next);
    EventBus.emit('camera:zoom', next);
  }

  private nudgeZoom(steps: number) {
    this.applyZoom(this.cameras.main.zoom + steps * WorldScene.ZOOM_STEP);
  }

  private onZoomDelta = (payload: { delta: number }) => {
    if (!payload || typeof payload.delta !== 'number') return;
    this.nudgeZoom(payload.delta);
  };

  private onZoomSet = (payload: number | { zoom: number }) => {
    const zoom = typeof payload === 'number' ? payload : payload?.zoom;
    if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return;
    this.applyZoom(zoom);
  };

  private onWheel = (
    _pointer: Phaser.Input.Pointer,
    _gos: unknown,
    _dx: number,
    dy: number,
  ) => {
    if (Math.abs(dy) < 1) return;
    this.nudgeZoom(dy > 0 ? -1 : 1);
  };

  private transitionTo(targetMap: GameMapKey, targetSpawn: string) {
    this.transitioning = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      EventBus.emit('world:map-change', { map: targetMap });
      this.scene.restart({ mapKey: targetMap, spawnName: targetSpawn });
    });
  }

  private onSession = (session: GameSessionPayload) => {
    this.session = session;
    this.nameLabel.setText(session.displayName || shortAddr(session.address));
    this.companion.setVisible(session.isTeam);
    if (session.cosmetics) {
      this.cosmetics = normalizeCosmetics(session.cosmetics);
    }
    if (session.gear) {
      this.gear = { ...DEFAULT_GEAR, ...session.gear };
    }
    this.applySheet();

    if (!this.spawnOffsetApplied && this.player) {
      this.spawnOffsetApplied = true;
      const { dx, dy } = spawnOffsetForAddress(session.address);
      if (dx !== 0 || dy !== 0) {
        this.player.setPosition(this.player.x + dx, this.player.y + dy);
        this.playerShadow.setPosition(this.player.x, this.player.y + 22);
        this.nameLabel.setPosition(this.player.x, this.player.y - 40);
        if (this.playerLight) {
          this.playerLight.x = this.player.x;
          this.playerLight.y = this.player.y - 10;
        }
      }
      EventBus.emit('world:ready', {
        map: this.mapKey,
        x: this.player.x,
        y: this.player.y,
      });
    }

    if (this.pendingRoster) {
      const pending = this.pendingRoster;
      this.pendingRoster = null;
      for (const p of pending) this.ensureRemote(p);
    }
  };

  private onCharacterApply = (cosmetics: GameCosmetics) => {
    this.cosmetics = normalizeCosmetics(cosmetics);
    this.applySheet();
  };

  private onGearApply = (gear: GameGear) => {
    this.gear = { ...DEFAULT_GEAR, ...gear };
    this.applySheet();
  };

  private applySheet() {
    if (!this.player) return;
    const next = resolveSheetKey(this.cosmetics, this.gear);
    if (next === this.sheetKey && this.textures.exists(next)) {
      this.playIdle();
      return;
    }
    // Show legacy base while the variant sheet loads.
    if (!this.textures.exists(next) && this.textures.exists('player-base')) {
      this.sheetKey = 'player-base';
      this.player.setTexture('player-base', 0);
      if (this.lightsEnabled) this.player.setPipeline('Light2D');
      this.playIdle();
    }
    const token = ++this.sheetLoadToken;
    void ensurePlayerSheet(this, next).then((loaded) => {
      if (token !== this.sheetLoadToken || !this.player) return;
      this.sheetKey = loaded;
      this.player.setTexture(loaded, 0);
      if (this.lightsEnabled) this.player.setPipeline('Light2D');
      this.playIdle();
    });
  }

  private applyRemoteSheet(remote: RemoteSprite, sheet: string) {
    if (sheet === remote.sheetKey && this.textures.exists(sheet)) return;
    if (!this.textures.exists(sheet) && this.textures.exists('player-base')) {
      if (remote.sheetKey !== 'player-base') {
        remote.sheetKey = 'player-base';
        remote.sprite.setTexture('player-base', 0);
        if (this.lightsEnabled) remote.sprite.setPipeline('Light2D');
      }
    }
    void ensurePlayerSheet(this, sheet).then((loaded) => {
      if (!remote.sprite.active) return;
      remote.sheetKey = loaded;
      remote.sprite.setTexture(loaded, 0);
      if (this.lightsEnabled) remote.sprite.setPipeline('Light2D');
    });
  }

  private onCompanionSpeak = (payload: { speaking: boolean }) => {
    this.companionSpeaking = payload.speaking;
  };

  private onInputBlock = (blocked: boolean) => {
    this.inputBlocked = blocked;
    if (blocked) this.player?.setVelocity(0, 0);
    this.audio.duck(blocked);
  };

  private onChatTyping = (typing: boolean) => {
    this.chatTyping = typing;
    if (this.input.keyboard) {
      this.input.keyboard.enabled = !typing;
    }
  };

  private onRoster = (players: RemotePlayerPayload[]) => {
    if (!this.session) {
      this.pendingRoster = players;
      return;
    }
    // Create-only — never destroy from roster (server leave is authoritative).
    for (const p of players) this.ensureRemote(p);
  };

  private onSnapshot = (payload: {
    ts?: number;
    players: RemotePlayerPayload[];
  }) => {
    if (!this.session) return;
    const now = performance.now();
    for (const p of payload.players) {
      if (p.map && p.map !== this.mapKey) continue;
      const key = p.address.toLowerCase();
      if (key === this.session.address.toLowerCase()) continue;
      let remote = this.remotes.get(key);
      if (!remote) {
        this.ensureRemote(p);
        remote = this.remotes.get(key);
        if (!remote) continue;
      }
      if (p.displayName) remote.label.setText(p.displayName);
      if (p.sheetKey && p.sheetKey !== remote.sheetKey) {
        this.applyRemoteSheet(remote, p.sheetKey);
      }
      pushSample(remote.buffer, {
        x: p.x,
        y: p.y,
        facing: p.facing,
        t: now,
      });
      remote.facing = p.facing;
      remote.lastSampleAt = now;
    }
  };

  private onRemoteJoin = (p: RemotePlayerPayload) => {
    this.ensureRemote(p);
  };

  private fadeRemoveRemote(key: string) {
    const remote = this.remotes.get(key);
    if (!remote || remote.removing) return;
    remote.removing = true;
    this.tweens.add({
      targets: [remote.sprite, remote.label, remote.shadow],
      alpha: 0,
      duration: 280,
      onComplete: () => {
        remote.sprite.destroy();
        remote.shadow.destroy();
        remote.label.destroy();
        this.remotes.delete(key);
      },
    });
  }

  private onRemoteLeave = (address: string) => {
    this.fadeRemoveRemote(address.toLowerCase());
  };

  private onMultiplayerReset = () => {
    for (const [key, remote] of this.remotes) {
      remote.sprite.destroy();
      remote.shadow.destroy();
      remote.label.destroy();
      this.remotes.delete(key);
    }
    this.pendingRoster = null;
  };

  /** Create remote if missing; never reposition existing from presence/roster. */
  private ensureRemote(p: RemotePlayerPayload) {
    const self = this.session?.address.toLowerCase();
    const key = p.address.toLowerCase();
    if (self && key === self) return;
    if (p.map && p.map !== this.mapKey) return;
    if (this.remotes.has(key)) {
      const existing = this.remotes.get(key)!;
      if (p.displayName) existing.label.setText(p.displayName);
      if (p.sheetKey && p.sheetKey !== existing.sheetKey) {
        this.applyRemoteSheet(existing, p.sheetKey);
      }
      // Seed buffer if empty so they appear immediately.
      if (existing.buffer.length === 0) {
        const t = performance.now();
        pushSample(existing.buffer, {
          x: p.x,
          y: p.y,
          facing: p.facing,
          t,
        });
        existing.lastSampleAt = t;
      }
      return;
    }
    const desired = p.sheetKey || 'player-base';
    const initialSheet = this.textures.exists(desired)
      ? desired
      : this.textures.exists('player-base')
        ? 'player-base'
        : desired;
    const shadow = this.makeShadow(p.x, p.y);
    const sprite = this.add
      .sprite(p.x, p.y, initialSheet, 0)
      .setDepth(10 + p.y);
    if (this.lightsEnabled) sprite.setPipeline('Light2D');
    sprite.setAlpha(0);
    this.tweens.add({ targets: sprite, alpha: 1, duration: 300 });
    const label = this.add
      .text(p.x, p.y - 40, p.displayName || shortAddr(p.address), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#bfdbfe',
        backgroundColor: '#0c1a2eaa',
        padding: { x: 3, y: 1 },
      })
      .setOrigin(0.5)
      .setDepth(1000);
    const now = performance.now();
    const remote: RemoteSprite = {
      sprite,
      shadow,
      label,
      sheetKey: initialSheet,
      facing: p.facing,
      buffer: [],
      removing: false,
      lastSampleAt: now,
    };
    pushSample(remote.buffer, {
      x: p.x,
      y: p.y,
      facing: p.facing,
      t: performance.now(),
    });
    this.remotes.set(key, remote);
    if (desired !== initialSheet || !this.textures.exists(desired)) {
      this.applyRemoteSheet(remote, desired);
    }
  }

  update(_time: number, delta: number) {
    if (this.transitioning) return;
    if (this.transitionCool > 0) this.transitionCool -= delta;

    this.clouds?.update(delta);

    const speed = 280;
    let vx = 0;
    let vy = 0;
    if (!this.inputBlocked) {
      if (!this.chatTyping) {
        if (this.cursors.left.isDown || this.wasd.A.isDown) {
          vx = -speed;
          this.facing = 'left';
        } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
          vx = speed;
          this.facing = 'right';
        }
        if (this.cursors.up.isDown || this.wasd.W.isDown) {
          vy = -speed;
          this.facing = 'up';
        } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
          vy = speed;
          this.facing = 'down';
        }
      }
      const joy = this.touchControls?.getVector();
      if (joy && (joy.x !== 0 || joy.y !== 0)) {
        vx = joy.x * speed;
        vy = joy.y * speed;
        if (Math.abs(joy.x) > Math.abs(joy.y)) {
          this.facing = joy.x < 0 ? 'left' : 'right';
        } else if (joy.y !== 0) {
          this.facing = joy.y < 0 ? 'up' : 'down';
        }
      }
    }
    this.player.setVelocity(vx, vy);
    this.player.setDepth(10 + this.player.y);
    this.playerShadow.setPosition(this.player.x, this.player.y + 22);
    this.playerShadow.setDepth(5);
    this.nameLabel.setPosition(this.player.x, this.player.y - 40);
    if (this.playerLight) {
      this.playerLight.x = this.player.x;
      this.playerLight.y = this.player.y - 10;
    }

    if (vx !== 0 || vy !== 0) {
      this.playWalk();
      if (_time - this.lastStepSfx > 280) {
        this.lastStepSfx = _time;
        this.audio.sfx('sfx-step', 0.2);
      }
    } else {
      this.playIdle();
    }

    if (this.companion.visible) {
      const bob = this.companionSpeaking
        ? Math.sin(_time / 80) * 3
        : Math.sin(_time / 200) * 1.5;
      this.companion.setPosition(this.player.x + 22, this.player.y - 28 + bob);
      this.companion.setAlpha(this.companionSpeaking ? 1 : 0.85);
      this.companion.setDepth(10 + this.player.y + 1);
    }

    for (const npc of this.npcs) {
      if (npc.sprite) npc.sprite.setDepth(10 + npc.y);
      if (npc.shadow) npc.shadow.setDepth(5);
    }

    const frameNow = performance.now();
    for (const [key, remote] of this.remotes) {
      if (remote.removing) continue;
      // Map leave / packet loss: fade out if no samples for REMOTE_STALE_MS.
      if (frameNow - remote.lastSampleAt > REMOTE_STALE_MS) {
        this.fadeRemoveRemote(key);
        continue;
      }
      const sample = sampleAt(remote.buffer, frameNow);
      if (sample) {
        remote.sprite.x = sample.x;
        remote.sprite.y = sample.y;
        remote.facing = sample.facing;
        const walk = `${remote.sheetKey}-walk-${sample.facing}`;
        const idle = `${remote.sheetKey}-idle-${sample.facing}`;
        if (sample.moving && this.anims.exists(walk)) {
          remote.sprite.play(walk, true);
        } else if (this.anims.exists(idle)) {
          remote.sprite.play(idle, true);
        }
      }
      remote.sprite.setDepth(10 + remote.sprite.y);
      remote.shadow.setPosition(remote.sprite.x, remote.sprite.y + 22);
      remote.shadow.setDepth(5);
      remote.label.setPosition(remote.sprite.x, remote.sprite.y - 40);
    }
    void delta;

    this.updateNpcProximity();

    if (!this.session) return;
    const moving = vx !== 0 || vy !== 0;
    const dx = Math.abs(this.player.x - this.lastSentX);
    const dy = Math.abs(this.player.y - this.lastSentY);
    const posChanged =
      !Number.isFinite(this.lastSentX) || dx > 1 || dy > 1;
    const facingChanged = this.facing !== this.lastSentFacing;
    const stopped = this.wasMoving && !moving;
    const due = frameNow - this.lastBroadcast > 100;
    if (due && (stopped || ((moving || facingChanged) && (posChanged || facingChanged)))) {
      this.lastBroadcast = frameNow;
      this.lastSentX = this.player.x;
      this.lastSentY = this.player.y;
      this.lastSentFacing = this.facing;
      EventBus.emit('player:local-move', {
        address: this.session.address,
        displayName: this.session.displayName,
        x: this.player.x,
        y: this.player.y,
        facing: this.facing,
        map: this.mapKey,
        sheetKey: this.sheetKey,
        ts: Date.now(),
      } satisfies PlayerMovePayload);
    }
    this.wasMoving = moving;
  }

  private playWalk() {
    const key = `${this.sheetKey}-walk-${this.facing}`;
    if (this.anims.exists(key)) this.player.play(key, true);
  }

  private playIdle() {
    const key = `${this.sheetKey}-idle-${this.facing}`;
    if (this.anims.exists(key)) this.player.play(key, true);
  }

  private updateNpcProximity() {
    let nearest: MapNpc | null = null;
    let best = Infinity;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.x,
        npc.y,
      );
      const interactRadius = this.touchControls?.isEnabled() ? 110 : 72;
      if (d < interactRadius && d < best) {
        best = d;
        nearest = npc;
      }
    }
    this.nearbyNpc = nearest;
    if (nearest) {
      this.interactHint.setVisible(true);
      this.interactHint.setPosition(nearest.x, nearest.y - 56);
      this.interactHint.setText(
        this.touchControls?.isEnabled()
          ? `Tap E · ${nearest.label}`
          : `E · ${nearest.label}`,
      );
      this.interactHint.setScale(1 + Math.sin(this.time.now / 200) * 0.04);
    } else {
      this.interactHint.setVisible(false);
    }
  }

  private tryInteract() {
    if (!this.nearbyNpc) return;
    this.audio.sfx('sfx-interact');
    const npc = this.nearbyNpc;
    this.tweens.add({
      targets: this.interactHint,
      scale: 1.15,
      yoyo: true,
      duration: 80,
    });
    if (npc.dialogueId) {
      EventBus.emit('dialogue:open', { scriptId: npc.dialogueId });
      return;
    }
    EventBus.emit(npc.event as 'npc:open-vote');
  }
}

function propsToRecord(
  properties: unknown,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!Array.isArray(properties)) return out;
  for (const p of properties) {
    if (p && typeof p === 'object' && 'name' in p && 'value' in p) {
      const item = p as { name: string; value: string | number | boolean };
      out[item.name] = item.value;
    }
  }
  return out;
}

function shortAddr(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
