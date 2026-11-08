import Phaser from 'phaser';

import { DIRECTION, type Direction, KEY } from '../constants';

const DIRECTION_ANGLE: Record<Direction, number> = {
  up: 0,
  down: Math.PI,
  left: -Math.PI / 2,
  right: Math.PI / 2,
};

export class Arrow extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly direction: Direction;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: Direction = DIRECTION.UP,
    texture = KEY.IMAGE.ARROW,
    frame = 0,
  ) {
    super(scene, x, y, texture, frame);

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.direction = direction;
    this.setOrigin(0.5);
    this.setScale(8 / this.width);
    this.setRotation(DIRECTION_ANGLE[direction]);
    this.setImmovable(true);
    this.body.setAllowGravity(false);

    this.setAlpha(0.2);

    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }
}
