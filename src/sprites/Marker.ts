import Phaser from 'phaser';

const RADIUS = 6;
const COLOR = 0xffffff;
const DURATION_MS = 600;

/**
 * A short-lived visual marker placed at a tap location
 * Renders as a ring that shrinks and fades out
 */
export class Marker extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, RADIUS);

    scene.add.existing(this);
    this.setStrokeStyle(1, COLOR);

    scene.tweens.add({
      targets: this,
      radius: 0,
      alpha: 0,
      duration: DURATION_MS,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
