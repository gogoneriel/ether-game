import type * as Phaser from 'phaser';
import { EventBus } from '@/game/EventBus';

const MUTE_KEY = 'liber-game-mute';

/** Thin audio helper bound to a Phaser scene's sound manager. */
export class GameAudio {
  private scene: Phaser.Scene;
  private music?: Phaser.Sound.BaseSound;
  private unlocked = false;
  private muted = false;
  private mapKey: 'town' | 'forest' = 'town';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.muted =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem(MUTE_KEY) === '1';
    EventBus.on('audio:mute', this.onMute);
    EventBus.on('audio:map', this.onMap);
  }

  destroy() {
    EventBus.off('audio:mute', this.onMute);
    EventBus.off('audio:map', this.onMap);
    this.music?.stop();
  }

  private onMute = (muted: boolean) => {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (this.music) {
      if (muted) this.music.pause();
      else this.music.resume();
    }
  };

  private onMap = (map: 'town' | 'forest') => {
    this.mapKey = map;
    if (this.unlocked) this.playMusic(map);
  };

  tryUnlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playMusic(this.mapKey);
  }

  playMusic(map: 'town' | 'forest') {
    this.mapKey = map;
    const key = map === 'forest' ? 'music-forest' : 'music-town';
    if (this.music) {
      this.music.stop();
      this.music.destroy();
      this.music = undefined;
    }
    if (this.muted) return;
    if (!this.scene.cache.audio.exists(key)) return;
    this.music = this.scene.sound.add(key, { loop: true, volume: 0.22 });
    this.music.play();
  }

  sfx(key: 'sfx-step' | 'sfx-interact' | 'sfx-ui', volume = 0.35) {
    if (this.muted || !this.unlocked) return;
    if (!this.scene.cache.audio.exists(key)) return;
    this.scene.sound.play(key, { volume });
  }

  duck(ducked: boolean) {
    if (!this.music || this.muted) return;
    const snd = this.music as Phaser.Sound.WebAudioSound;
    if ('setVolume' in snd) snd.setVolume(ducked ? 0.08 : 0.22);
  }
}

export function isGameMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
