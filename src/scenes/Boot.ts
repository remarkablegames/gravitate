import { Scene } from 'phaser';

import { KEY } from '../constants';

export class Boot extends Scene {
  constructor() {
    super(KEY.SCENE.BOOT);
  }

  preload() {
    this.load.spritesheet(KEY.SPRITESHEET.PLAYER, 'sprites/player.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.image(KEY.IMAGE.TILES, 'tilemaps/tileset.png');

    this.load.tilemapTiledJSON(KEY.TILEMAP.LEVEL_0, 'tilemaps/level0.json');

    this.load.image(KEY.IMAGE.ARROW, 'sprites/arrow.png');
  }

  create() {
    this.scene.start(KEY.SCENE.MAIN);
  }
}
