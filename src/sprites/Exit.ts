import Phaser from 'phaser';

const WIDTH = 20;
const HEIGHT = 14;

export class Exit extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number, rotation = 0) {
    super(scene, x, y, '');

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.setVisible(false);
    this.setImmovable(true);
    this.body.setAllowGravity(false);
    this.setOrigin(0.5);
    this.body.setSize(WIDTH, HEIGHT);

    // Swap hitbox width and height when rotated (quarter turn)
    if (Math.abs(rotation) % 180 === 90) {
      this.body.setSize(HEIGHT, WIDTH);
    }
  }
}
