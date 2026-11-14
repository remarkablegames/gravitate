import { Scene } from 'phaser';

import { KEY, LEVELS, RESOLUTION } from '../constants';

export class Boot extends Scene {
  private readonly isCover = new URLSearchParams(window.location.search).has(
    'cover',
  );
  private readonly level =
    Number(new URLSearchParams(window.location.search).get('level')) || 0;

  constructor() {
    super(KEY.SCENE.BOOT);
  }

  preload() {
    this.load.spritesheet(KEY.SPRITESHEET.PLAYER, 'sprites/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image(KEY.IMAGE.ARROW, 'sprites/arrow.png');
    this.load.image(KEY.IMAGE.TILES, 'tilemaps/tileset.png');

    // The cover only needs the shared sprites and tileset
    if (this.isCover) {
      return;
    }

    this.load.audio(KEY.AUDIO.DEATH, ['sounds/death.ogg', 'sounds/death.mp3']);
    this.load.audio(KEY.AUDIO.JUMP, ['sounds/jump.ogg', 'sounds/jump.mp3']);
    this.load.audio(KEY.AUDIO.LAND, ['sounds/land.ogg', 'sounds/land.mp3']);
    this.load.audio(KEY.AUDIO.SHIFT, ['sounds/swing.ogg', 'sounds/swing.mp3']);
    this.load.audio(KEY.AUDIO.EXIT, [
      'sounds/powerup.ogg',
      'sounds/powerup.mp3',
    ]);
    this.load.audio(KEY.AUDIO.WALK, ['sounds/walk.ogg', 'sounds/walk.mp3']);

    // Load initial level
    const { tilemap } = LEVELS[this.level] ?? LEVELS[0];
    this.load.tilemapTiledJSON(tilemap, `tilemaps/${tilemap}.json`);
  }

  create() {
    if (this.isCover) {
      // Render the cover at a true 16:9 resolution without changing the game config
      this.scale.setGameSize(RESOLUTION.COVER.WIDTH, RESOLUTION.COVER.HEIGHT);
      this.scene.start(KEY.SCENE.COVER);
      return;
    }

    // Music loads in the background so it doesn't delay the game starting
    this.scene.launch(KEY.SCENE.MUSIC);
    this.scene.start(KEY.SCENE.GAME, { level: this.level });
  }
}
