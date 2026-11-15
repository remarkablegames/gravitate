import Phaser from 'phaser';

export class Vignette extends Phaser.Filters.Vignette {
  constructor(
    camera: Phaser.Cameras.Scene2D.Camera,
    x = 0.5,
    y = 0.5,
    radius = Phaser.Math.FloatBetween(0.71, 0.8),
    strength = Phaser.Math.FloatBetween(0.05, 0.1),
  ) {
    super(camera, x, y, radius, strength);

    camera.filters.internal.add(this);
  }
}
