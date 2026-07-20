import * as Phaser from 'phaser';
import { EventBus } from '@/game/EventBus';
import { DIALOGUE_SCRIPTS } from '@/game/dialogue/scripts';

/** Typewriter dialogue overlay. */
export class DialogueScene extends Phaser.Scene {
  private panel!: Phaser.GameObjects.Rectangle;
  private portrait!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private lines: { speaker: string; portrait?: string; text: string }[] = [];
  private index = 0;
  private shown = '';
  private full = '';
  private scriptId = '';
  private typing = false;
  private typeTimer?: Phaser.Time.TimerEvent;
  private onCompleteEvent?: string;
  private questNpcId?: string;

  constructor() {
    super('Dialogue');
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.panel = this.add
      .rectangle(w / 2, h - 70, w - 24, 120, 0x052e16, 0.92)
      .setStrokeStyle(2, 0x34d399)
      .setScrollFactor(0)
      .setDepth(200);

    this.portrait = this.add
      .image(40, h - 70, 'portrait-herald')
      .setDisplaySize(56, 56)
      .setScrollFactor(0)
      .setDepth(201);

    this.nameText = this.add
      .text(80, h - 118, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#6ee7b7',
      })
      .setScrollFactor(0)
      .setDepth(201);

    this.bodyText = this.add
      .text(80, h - 98, '', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ecfdf5',
        wordWrap: { width: w - 120 },
      })
      .setScrollFactor(0)
      .setDepth(201);

    this.hint = this.add
      .text(w - 20, h - 28, 'E / Space', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#a7f3d0',
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(201);

    this.input.keyboard!.on('keydown-E', () => this.advance());
    this.input.keyboard!.on('keydown-SPACE', () => this.advance());
    this.input.on('pointerdown', () => this.advance());

    EventBus.on('dialogue:open', this.openScript);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off('dialogue:open', this.openScript);
    });

    this.scene.setVisible(false);
    this.scene.setActive(false);
  }

  private openScript = (payload: { scriptId: string }) => {
    const script = DIALOGUE_SCRIPTS[payload.scriptId];
    if (!script) return;
    this.scriptId = script.id;
    this.lines = script.lines;
    this.index = 0;
    this.onCompleteEvent = script.onCompleteEvent;
    this.questNpcId = script.questNpcId;
    this.scene.setVisible(true);
    this.scene.setActive(true);
    EventBus.emit('input:block', true);
    this.showLine();
  };

  private showLine() {
    const line = this.lines[this.index];
    if (!line) {
      this.close();
      return;
    }
    this.nameText.setText(line.speaker);
    if (line.portrait && this.textures.exists(line.portrait)) {
      this.portrait.setTexture(line.portrait);
      this.portrait.setVisible(true);
    }
    this.full = line.text;
    this.shown = '';
    this.typing = true;
    this.bodyText.setText('');
    this.typeTimer?.remove(false);
    this.typeTimer = this.time.addEvent({
      delay: 18,
      repeat: Math.max(0, this.full.length - 1),
      callback: () => {
        this.shown = this.full.slice(0, this.shown.length + 1);
        this.bodyText.setText(this.shown);
        if (this.shown.length >= this.full.length) this.typing = false;
      },
    });
  }

  private advance() {
    if (!this.scene.isVisible()) return;
    if (this.typing) {
      this.typeTimer?.remove(false);
      this.typeTimer = undefined;
      this.shown = this.full;
      this.bodyText.setText(this.full);
      this.typing = false;
      return;
    }
    this.index += 1;
    if (this.index >= this.lines.length) this.close();
    else this.showLine();
  }

  private close() {
    this.scene.setVisible(false);
    this.scene.setActive(false);
    EventBus.emit('input:block', false);
    if (this.questNpcId) {
      EventBus.emit('quest:talk', { npcId: this.questNpcId });
    }
    if (this.onCompleteEvent === 'quest:talk') {
      /* already emitted */
    } else if (this.onCompleteEvent) {
      EventBus.emit(this.onCompleteEvent);
    }
    void this.scriptId;
  }
}
