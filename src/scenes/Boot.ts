import { Scene } from 'phaser';

import { KEY, LEVELS } from '../constants';

export class Boot extends Scene {
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

    this.load.audio(KEY.AUDIO.DEATH, ['sounds/death.ogg', 'sounds/death.mp3']);
    this.load.audio(KEY.AUDIO.JUMP, ['sounds/jump.ogg', 'sounds/jump.mp3']);
    this.load.audio(KEY.AUDIO.LAND, ['sounds/land.ogg', 'sounds/land.mp3']);
    this.load.audio(KEY.AUDIO.SHIFT, ['sounds/swing.ogg', 'sounds/swing.mp3']);
    this.load.audio(KEY.AUDIO.EXIT, [
      'sounds/powerup.ogg',
      'sounds/powerup.mp3',
    ]);
    this.load.audio(KEY.AUDIO.WALK, ['sounds/walk.ogg', 'sounds/walk.mp3']);

    this.load.audio(KEY.MUSIC.TO_THE_SPACE, [
      'music/to_the_space.ogg',
      'music/to_the_space.mp3',
    ]);
    this.load.audio(KEY.MUSIC.STARWAY, [
      'music/starway.ogg',
      'music/starway.mp3',
    ]);
    this.load.audio(KEY.MUSIC.ALIENS, ['music/aliens.ogg', 'music/aliens.mp3']);

    LEVELS.forEach(({ tilemap }) => {
      this.load.tilemapTiledJSON(tilemap, `tilemaps/${tilemap}.json`);
    });
  }

  create() {
    const level = Number(
      new URLSearchParams(window.location.search).get('level'),
    );
    this.scene.start(KEY.SCENE.GAME, { level });
  }
}
