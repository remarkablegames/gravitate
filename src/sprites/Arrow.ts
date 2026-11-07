import Phaser from 'phaser';

import { ARROW_DIRECTION, type ArrowDirection, KEY } from '../constants';

const DIRECTION_ANGLE: Record<ArrowDirection, number> = {
  up: 0,
  down: Math.PI,
  left: -Math.PI / 2,
  right: Math.PI / 2,
};

export class Arrow extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    direction: ArrowDirection = ARROW_DIRECTION.UP,
    texture = KEY.IMAGE.ARROW,
    frame = 0,
  ) {
    super(scene, x, y, texture, frame);

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.setOrigin(0.5);
    this.setScale(8 / this.width);
    this.setRotation(DIRECTION_ANGLE[direction]);
    this.setImmovable(true);
    this.body.setAllowGravity(false);
  }
}
