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

    LEVELS.forEach(({ tilemap }) => {
      this.load.tilemapTiledJSON(tilemap, `tilemaps/${tilemap}.json`);
    });
  }

  create() {
    this.scene.start(KEY.SCENE.GAME);
  }
}
