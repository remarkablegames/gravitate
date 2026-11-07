import Phaser from 'phaser';

export class Exit extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');

    scene.add.existing(this);
    scene.physics.world.enable(this);

    this.setOrigin(0.5);
    this.setVisible(false);
    this.setImmovable(true);
    this.body.setSize(20, 14);
    this.body.setAllowGravity(false);
  }
}
